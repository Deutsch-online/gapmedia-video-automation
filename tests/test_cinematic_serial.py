import copy
import importlib.util
import json
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch

ROOT = Path(__file__).parents[1]
spec = importlib.util.spec_from_file_location('serial_series', ROOT/'ai-cast/cinematic-series.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class SerialTests(TestCase):
    def setUp(self):
        self.config = json.loads((ROOT/'.cinematic-series.json').read_text())
        # Preserve the historical first-job contract below the new cast boundary.
        self.config['lina_oma_series']['from_episode']=9999
        self.config['next_story']={'from_episode':21,'story_id':'marta-first-job-s01e01-recipe-v1','duration_seconds':45}
        original_load=m.load_json
        reader=patch.object(m,'load_json',side_effect=lambda path,*args: copy.deepcopy(self.config) if path==m.CONFIG else original_load(path,*args))
        reader.start()
        self.addCleanup(reader.stop)
        self.bank = json.loads((ROOT/'ai-cast/story-bank.json').read_text())
        self.story = next(x for x in self.bank['stories'] if x['story_id'] == 'marta-first-job-s01e01-recipe-v1')
        self.state = m.new_state()
        self.state['next_episode'] = 21
        self.state['history'] = [{'story_id':'doctor-appointment-language-anxiety-v1','scenes':[]}]
        self.source = {'url':self.story['research_urls'][0],
                       'excerpt':'Government guidance on applications and German CV documents. '*4,
                       'retrieved_at':'2026-11-11T14:00:00+00:00'}

    def test_approved_chapter_needs_no_text_provider_and_keeps_causal_ending(self):
        with patch.object(m,'research_source',return_value=self.source), \
             patch.object(m,'beatapi_free_models',side_effect=AssertionError('external story fallback')):
            plan = m.make_plan(self.state)
        self.assertEqual(plan['story_id'],self.story['story_id'])
        self.assertEqual(plan['duration_seconds'],45)
        self.assertEqual(plan['serial_chapter'],1)
        self.assertIn('Kuchenrezept',plan['scenes'][3]['de'])
        self.assertIn('Lebenslauf',plan['scenes'][3]['de'])
        self.assertIn('kaputt',plan['scenes'][-1]['de'])
        self.assertEqual(plan['documented_basis']['report_url'],self.source['url'])

    def test_following_chapter_cannot_be_replaced_by_an_unapproved_story(self):
        self.state['next_episode']=22
        self.state['history'].append(copy.deepcopy(self.story))
        with patch.object(m,'research_source') as research, \
             patch.object(m,'beatapi_free_models') as provider:
            with self.assertRaisesRegex(RuntimeError,'owner-approved script'):
                m.make_plan(self.state)
        research.assert_not_called()
        provider.assert_not_called()
