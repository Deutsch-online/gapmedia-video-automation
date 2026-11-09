import sys,tempfile,types,unittest,json,importlib.util
from pathlib import Path
from unittest.mock import Mock,patch
ROOT=Path(__file__).parents[1];sys.path.insert(0,str(ROOT/'ai-cast'))
import cinematic_longcat as hq
import cinematic_speech as speech
import cinematic_budget as budget
import cinematic_ltx2 as ltx

class HighQualityTests(unittest.TestCase):
    SOURCE="import spaces\ndef _check_duration(*args, **kwargs):\n    return 240\n@spaces.GPU(duration=_check_duration,size='xlarge')\ndef generate(): pass\n"
    def test_verified_hardware_maximum_and_fail_closed_changes(self):
        self.assertEqual(hq.verify_contract(self.SOURCE),480)
        for source in (self.SOURCE.replace('240','300'),self.SOURCE.replace('xlarge','large'),self.SOURCE.replace('return 240','return sum(args)'),self.SOURCE.replace('spaces.GPU','fake.GPU')):
            with self.assertRaises(RuntimeError):hq.verify_contract(source)

    def test_bounded_acceleration_native_720p_and_same_audio_with_bounded_reservation(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);raw=root/'raw.mp4';raw.write_bytes(b'provider fixture')
            client=types.SimpleNamespace(predict=Mock(return_value=(str(raw),42)))
            with patch.dict(sys.modules,{'shots':types.SimpleNamespace(client=Mock(return_value=client)),
                 'gradio_client':types.SimpleNamespace(handle_file=lambda p:p)}), \
                 patch.object(hq,'verify_live_contract'),patch.object(ltx,'reject_whiteout'), \
                 patch.object(speech,'probe',return_value={'streams':[{'codec_type':'video','width':720,'height':1280}]}), \
                 patch.object(budget,'run_gpu',side_effect=lambda fn,required_seconds:fn()) as guard:
                hq.generate_take(root/'frame.png',root/'final-aligned.wav',root/'out.mp4','Small gesture.',10)
            args=client.predict.call_args.args
            self.assertEqual(args[1],str(root/'final-aligned.wav'))
            self.assertEqual(args[3],'720p');self.assertEqual(args[6],'DBCache fast')
            guard.assert_called_once();self.assertEqual(guard.call_args.kwargs['required_seconds'],720)
            self.assertNotEqual(speech.model_identity('longcat-hq'),speech.model_identity('gradio'))
            self.assertNotEqual(speech.model_identity('longcat-hq'),speech.model_identity('ltx2'))

    def test_required_comic_story_is_selected_with_complete_visible_reversal(self):
        spec=importlib.util.spec_from_file_location('comedy_series',ROOT/'ai-cast/cinematic-series.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        from cinematic_story_bank import select_story
        config=json.loads((ROOT/'.cinematic-series.json').read_text())
        bank=json.loads((ROOT/'ai-cast/story-bank.json').read_text())
        story=next(s for s in bank['stories'] if s['story_id']==config['next_story']['story_id'])
        source={'url':story['research_urls'][0],'excerpt':'Official source context. '*8,'retrieved_at':'2026-11-08T09:00:00+00:00'}
        plan=select_story(bank,20,45,source,[],config,module.validate_plan)
        self.assertEqual(plan['story_id'],'project-b1-jobcenter-breath-v2')
        self.assertEqual(len(plan['scenes']),9)
        self.assertIn('language certificate',plan['scenes'][0]['visible_objects'])
        self.assertIn('rental contract',plan['scenes'][6]['visible_objects'])
        self.assertIn('water glass',plan['scenes'][8]['object_action'])
        self.assertEqual(plan['documented_basis']['report_url'],source['url'])
        import copy
        invented=copy.deepcopy(plan);invented.pop('documented_basis')
        with self.assertRaisesRegex(ValueError,'documented migrant problem'):
            module.validate_plan(invented,20,[],config)
        self.assertEqual(config['time_budget']['mode'],'verified-included-only')
        self.assertEqual(config['max_daily_attempts'],1)
        plan.pop('comedy_beats')
        with self.assertRaisesRegex(ValueError,'Comedy requires'):
            module.validate_plan(plan,20,[],config)

if __name__=='__main__':unittest.main()
