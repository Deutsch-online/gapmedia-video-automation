import copy,importlib.util,json,sys,unittest
from pathlib import Path
from unittest.mock import Mock,patch
ROOT=Path(__file__).parents[1]
sys.path.insert(0,str(ROOT/'ai-cast'))
from cinematic_lina import SOURCE,deliver_preview,prompt
spec=importlib.util.spec_from_file_location('lina_series',ROOT/'ai-cast/cinematic-series.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)


class LinaTests(unittest.TestCase):
    def setUp(self):
        self.state=m.new_state();self.state['next_episode']=22
        self.source={'url':SOURCE,'retrieved_at':'2026-11-12T04:00:00+00:00',
                     'excerpt':'Goethe grammar context for beginner polite requests Ich möchte ein Eis. '*3}

    def plan(self):
        with patch.object(m,'research_source',return_value=self.source), \
             patch.object(m,'beatapi_free_models',side_effect=AssertionError('no story service for authored first episode')):
            return m.make_plan(self.state)

    def test_child_and_grandmother_are_selected_without_old_adult_story(self):
        p=self.plan()
        self.assertEqual(p['cast_profile'],'lina-oma-v1')
        self.assertEqual({s['speaker'] for s in p['scenes']},{'lina','oma'})
        self.assertEqual(len(p['scenes']),9)
        self.assertIn('ich bin ein ei',p['scenes'][0]['de'].casefold())
        self.assertIn('Ich möchte ein Ei',p['scenes'][4]['de'])
        self.assertIn('Käse',p['scenes'][-1]['de'])
        self.assertIn('eight-year-old',__import__('cinematic_design').still_prompt(p,p['scenes'][0]))
        self.assertNotIn('adult marta',p['scenes'][0]['scene'])

    def test_new_days_cannot_reuse_the_same_error_or_omit_the_correction(self):
        p=self.plan();p['episode']=23
        prior=copy.deepcopy(p)
        prior['language_error']['wrong']=prior['language_error']['wrong'].lower().rstrip('!')
        prior['language_error']['correct']=prior['language_error']['correct'].lower().rstrip('.')
        with self.assertRaisesRegex(ValueError,'new language distinction'):
            m.validate_plan(p,23,[prior])
        p['scenes'][3]['de']='Das ist aber lustig!'
        with self.assertRaisesRegex(ValueError,'actual correct German'):
            m.validate_plan(p,23,[])

    def test_preview_is_confirmed_once_before_video_and_uncertain_result_not_replayed(self):
        state={'pending':{}}
        info={'file':'sheet.jpg','sha256':'a'}
        saves=[]
        save=lambda value:saves.append(copy.deepcopy(value))
        send=Mock(return_value={'message_id':123})
        deliver_preview(state,info,save,send)
        self.assertEqual(saves[0]['pending']['image_preview']['status'],'dispatching')
        self.assertEqual(state['pending']['image_preview']['status'],'sent')
        deliver_preview(state,info,save,send);send.assert_called_once()
        with self.assertRaisesRegex(RuntimeError,'Images changed'):
            deliver_preview(state,{**info,'sha256':'b'},save,send)
        state={'pending':{}}
        uncertain=Mock(side_effect=TimeoutError('unknown delivery'))
        with self.assertRaises(TimeoutError):deliver_preview(state,info,save,uncertain)
        with self.assertRaisesRegex(RuntimeError,'uncertain'):
            deliver_preview(state,info,save,uncertain)
        uncertain.assert_called_once()

    def test_daily_planner_instructions_keep_one_error_and_the_new_speakers(self):
        text=prompt(23,self.source,[])
        self.assertIn('Only speakers lina and oma',text)
        self.assertIn('Lina repeats and uses that correction',text)
        self.assertIn('Never repeat a prior story',text)
        self.assertNotIn('speaker (marta or lukas)',text)
