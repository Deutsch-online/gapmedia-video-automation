import copy,importlib.util,json,sys,unittest
from pathlib import Path
from unittest.mock import Mock,patch
ROOT=Path(__file__).parents[1]
sys.path.insert(0,str(ROOT/'ai-cast'))
from cinematic_lina import SOURCE,SOURCES,deliver_preview,prompt,grammar_source
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
        original=p['scenes']
        p['scenes']=[original[i] for i in (0,3,4,1,2,5,6,7,8)]
        p['scenes'][3]={**p['scenes'][3],'de':'Sehr gut, Lina!','fa':'آفرین، لینا!'}
        prior=copy.deepcopy(p)
        prior['language_error']['wrong']=prior['language_error']['wrong'].lower().rstrip('!')
        prior['language_error']['correct']=prior['language_error']['correct'].lower().rstrip('.')
        with self.assertRaisesRegex(ValueError,'new language distinction'):
            m.validate_plan(p,23,[prior])
        p['scenes'][1]['de']='Das ist aber lustig!'
        with self.assertRaisesRegex(ValueError,'actual correct German|correct immediately'):
            m.validate_plan(p,23,[])

    def test_correction_repetition_and_encouragement_are_immediate(self):
        p=self.plan();p['episode']=23
        with self.assertRaisesRegex(ValueError,'correct immediately'):
            m.validate_plan(p,23,[])
        original=p['scenes']
        p['scenes']=[original[i] for i in (0,3,4,1,2,5,6,7,8)]
        p['scenes'][3]={**p['scenes'][3],'de':'Sehr gut, Lina!','fa':'آفرین، لینا!'}
        m.validate_plan(p,23,[])
        missing=copy.deepcopy(p);missing['scenes'][3]['de']='Dann essen wir jetzt.'
        with self.assertRaisesRegex(ValueError,'encourage'):
            m.validate_plan(missing,23,[])
        wrong_turn=copy.deepcopy(p);wrong_turn['scenes'][2]['speaker']='oma'
        with self.assertRaisesRegex(ValueError,'immediately repeat|corrected phrase herself'):
            m.validate_plan(wrong_turn,23,[])

    def test_separate_speaker_inputs_preserve_identity_and_are_stable_across_resume(self):
        import tempfile,hashlib
        from PIL import Image
        from cinematic_design import speaker_references
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);source=root/'reference.png'
            Image.new('RGB',(100,140),'teal').save(source)
            sha=hashlib.sha256(source.read_bytes()).hexdigest()
            refs=speaker_references(source,root/'refs',sha)
            self.assertNotEqual(refs['lina'],refs['oma'])
            before={k:v.read_bytes() for k,v in refs.items()}
            again=speaker_references(source,root/'refs',sha)
            self.assertEqual(before,{k:v.read_bytes() for k,v in again.items()})
            with self.assertRaisesRegex(ValueError,'reference changed'):
                speaker_references(source,root/'other','different-reference')
            refs['oma'].write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError,'cache changed'):
                speaker_references(source,root/'refs',sha)

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

    def test_two_role_voices_have_distinct_cache_identity(self):
        girl={'speaker':'lina','de':'Guten Morgen!'}
        grandma={'speaker':'oma','de':'Guten Morgen!'}
        self.assertNotEqual(m.narration_signature(girl),m.narration_signature(grandma))

    def test_source_fallback_retains_verified_matching_context_and_actual_url(self):
        outcomes=[RuntimeError('403')]*(len(SOURCES)-1)+[{**self.source,'url':SOURCES[-1]}]
        fetch=Mock(side_effect=list(outcomes))
        self.assertEqual(grammar_source(fetch,22)['url'],SOURCES[-1])
        fetch.assert_called_with(22,preferred_url=SOURCES[-1],strict_preferred=True)
        with patch.object(m,'research_source',side_effect=list(outcomes)):
            plan=m.make_plan(self.state)
        self.assertEqual(plan['documented_basis']['report_url'],SOURCES[-1])
        with self.assertRaisesRegex(RuntimeError,'All approved'):
            grammar_source(Mock(side_effect=RuntimeError('403')),22)

    def test_hourly_credit_wait_never_bypasses_the_day_or_live_quota_gate(self):
        config=json.loads((ROOT/'.cinematic-series.json').read_text())
        with patch.object(m,'due',return_value=(True,'daily-slot','2026-11-12')):
            self.assertFalse(m.gate_decision(self.state,config,recovery_only=True,quota_check={'status':'verified','can_admit_minimum_stage':False})[0])
            self.assertTrue(m.gate_decision(self.state,config,recovery_only=True,quota_check={'status':'verified','can_admit_minimum_stage':True})[0])
        with patch.object(m,'due',return_value=(False,'daily-production-already-started','2026-11-12')):
            self.assertFalse(m.gate_decision(self.state,config,recovery_only=True,quota_check={'status':'verified','can_admit_minimum_stage':True})[0])
        self.assertEqual(self.state['attempts'],{})
