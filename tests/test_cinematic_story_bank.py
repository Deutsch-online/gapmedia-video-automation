import copy
import importlib.util
import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

ROOT=Path(__file__).parents[1]
sys.path.insert(0,str(ROOT/'ai-cast'))
from cinematic_story_bank import select_story
spec=importlib.util.spec_from_file_location('bank_series',ROOT/'ai-cast/cinematic-series.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)


class StoryBankTests(unittest.TestCase):
    def setUp(self):
        self.bank=json.loads((ROOT/'ai-cast/story-bank.json').read_text())
        self.config=json.loads((ROOT/'.cinematic-series.json').read_text())
        self.config.pop('next_story',None)

    def source(self,url):
        return {'url':url,'retrieved_at':'2026-11-05T19:00:00+00:00',
                'excerpt':'Official context fixture for offline validation tests. '*4}

    def test_every_authored_variant_passes_unchanged_production_validation(self):
        for item in self.bank['stories']:
            for seconds in (45,60):
                with self.subTest(story=item['story_id'],seconds=seconds):
                    config=copy.deepcopy(self.config)
                    if seconds==60:config['duration_from_episode']=19
                    plan=select_story({'version':1,'stories':[item]},18,seconds,
                                      self.source(item['research_urls'][0]),[],config,m.validate_plan)
                    self.assertEqual(len(plan['scenes'])*5,seconds)
                    self.assertEqual(plan['story_provider'],'project-authored-bank-v1')

    def test_no_repeat_across_duration_variants_or_titles(self):
        item=self.bank['stories'][0]
        history=[{'story_id':item['story_id'],'title_de':'different'}]
        self.assertIsNone(select_story(self.bank,19,45,self.source(item['research_urls'][0]),history,self.config,m.validate_plan))
        history=[{'story_id':'different','title_de':item['title_de'].upper()}]
        self.assertIsNone(select_story(self.bank,19,45,self.source(item['research_urls'][0]),history,self.config,m.validate_plan))

    def test_mismatched_topic_and_unsupported_duration_never_get_substituted(self):
        item=self.bank['stories'][0];bank={'version':1,'stories':[item]}
        self.assertIsNone(select_story(bank,18,45,self.source('https://www.goethe.de/de/spr/ueb/lua.html'),[],self.config,m.validate_plan))
        self.assertIsNone(select_story(bank,18,65,self.source(item['research_urls'][0]),[],self.config,m.validate_plan))

    def test_missing_live_research_and_invalid_story_fail_closed(self):
        item=self.bank['stories'][0];source=self.source(item['research_urls'][0])
        with self.assertRaisesRegex(ValueError,'freshly fetched'):
            select_story(self.bank,18,45,{'url':source['url']},[],self.config,m.validate_plan)
        broken=copy.deepcopy(item);broken['scenes'][0]['speaker']='invented'
        with self.assertRaises(ValueError):
            select_story({'version':1,'stories':[broken]},18,45,source,[],self.config,m.validate_plan)

    def test_specific_owner_request_is_not_overridden(self):
        config=copy.deepcopy(self.config)
        config['next_story']={'from_episode':18,'story_id':'specific-owner-story','duration_seconds':45}
        self.assertIsNone(select_story(self.bank,18,45,self.source(self.bank['stories'][0]['research_urls'][0]),[],config,m.validate_plan))

    def test_make_plan_works_without_any_text_provider_key(self):
        state=m.new_state();state['next_episode']=18
        state['history']=[{'episode':15,'story_id':'doctor-appointment-language-anxiety-v1',
                           'title_de':'Already delivered doctor story','scenes':[]}]
        source=self.source(self.bank['stories'][0]['research_urls'][0])
        with patch.dict(os.environ,{},clear=True),patch.object(m,'research_source',return_value=source), \
             patch.object(m,'beatapi_free_models',side_effect=AssertionError('must not call external model')), \
             patch.object(m,'beatapi_story_request',side_effect=AssertionError('must not call external model')):
            plan=m.make_plan(state)
        self.assertEqual(plan['story_id'],self.bank['stories'][0]['story_id'])
        self.assertEqual(plan['research_source'],source)

    def test_failed_planning_does_not_consume_production_start(self):
        import cinematic_budget as budget
        config=copy.deepcopy(self.config);state=m.new_state();state['next_episode']=18
        with patch.object(m,'load_json',side_effect=[config,state]),patch.object(m,'checkpoint'), \
             patch.object(budget,'preflight',return_value={'status':'verified','can_admit_minimum_stage':True}), \
             patch.object(budget,'time_policy',return_value={'reserve_seconds':30}), \
             patch.object(m,'bot'),patch.object(m,'make_plan',side_effect=RuntimeError('Story providers exhausted')), \
             patch.object(m,'render') as render:
            with self.assertRaisesRegex(RuntimeError,'Story providers'):m.production(force=True)
        self.assertEqual(state['attempts'],{})
        self.assertIsNone(state['pending']);render.assert_not_called()
        self.assertEqual(sum(x['count'] for x in state['planning_failures'].values()),1)
        self.assertTrue(all(not x['gpu_requested'] for x in state['planning_failures'].values()))

    def test_used_initial_topic_can_select_an_unused_topic_with_fresh_official_source(self):
        state=m.new_state();state['next_episode']=19
        bus=next(item for item in self.bank['stories'] if item['story_id']=='project-bus-stop-v1')
        state['history']=[{'episode':15,'story_id':'doctor-appointment-language-anxiety-v1','title_de':'Old doctor','scenes':[]},
                          {'episode':18,'story_id':bus['story_id'],'title_de':bus['title_de'],'scenes':[]}]
        source_bus=self.source(bus['research_urls'][0])
        source_rail=self.source(self.bank['stories'][0]['research_urls'][0])
        def research(episode,preferred_url=None,strict_preferred=False):
            return source_rail if strict_preferred else source_bus
        with patch.object(m,'research_source',side_effect=research) as fetched, \
             patch.object(m,'beatapi_free_models',side_effect=AssertionError('no model required')):
            plan=m.make_plan(state)
        self.assertEqual(plan['story_id'],'project-rail-direction-v1')
        self.assertTrue(fetched.call_args.kwargs['strict_preferred'])
        self.assertEqual(plan['research_source'],source_rail)


if __name__=='__main__':unittest.main()
