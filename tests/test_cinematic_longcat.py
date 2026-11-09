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

class LightProfileTests(unittest.TestCase):
    def test_light_requests_480p_and_keeps_the_full_published_reservation(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);raw=root/'raw.mp4';raw.write_bytes(b'fixture')
            client=types.SimpleNamespace(predict=Mock(return_value=str(raw)))
            with patch.dict(sys.modules,{'shots':types.SimpleNamespace(client=lambda _:client),
                 'gradio_client':types.SimpleNamespace(handle_file=lambda p:p)}), \
                 patch.object(hq,'verify_live_contract'),patch.object(ltx,'reject_whiteout'), \
                 patch.object(speech,'probe',return_value={'streams':[{'codec_type':'video','width':512,'height':864}]}), \
                 patch.object(budget,'run_gpu',side_effect=lambda fn,required_seconds:fn()) as guard:
                hq.generate_take(root/'still.png',root/'same-wav.wav',root/'out.mp4','Same motion.',1,light=True)
            self.assertEqual(client.predict.call_args.args[3],'480p')
            self.assertEqual(client.predict.call_args.args[6],'DBCache faster')
            self.assertEqual(client.predict.call_args.args[1],str(root/'same-wav.wav'))
            self.assertEqual(guard.call_args.kwargs['required_seconds'],480)

    def test_completed_high_resolution_cache_is_preserved_but_changed_audio_is_not(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);image=root/'still.png';audio=root/'audio.wav';output=root/'take.mp4'
            image.write_bytes(b'image');audio.write_bytes(b'approved audio');output.write_bytes(b'valid take fixture')
            saved={'audio_sha256':speech.audio_sha(audio),'image_sha256':speech.audio_sha(image),
                   'model':speech.model_identity('longcat-hq'),'motion':'wave','seed':5,'timing':'aligned-wav-native-speed-v1'}
            marker=output.with_suffix('.speech.json');marker.write_text(json.dumps(saved))
            info={'streams':[{'codec_type':'video','width':736,'height':1248}],'format':{'duration':'5'}}
            with patch.object(speech,'generate') as generate,patch.object(speech,'probe',return_value=info):
                speech.ensure_clip(image,audio,output,'wave',5,backend_name='longcat-light')
                generate.assert_not_called()
                self.assertEqual(json.loads(marker.read_text()),saved)
                audio.write_bytes(b'changed words')
                speech.ensure_clip(image,audio,output,'wave',5,backend_name='longcat-light')
                generate.assert_called_once()
            self.assertEqual(json.loads(marker.read_text())['model'],speech.model_identity('longcat-light'))


if __name__=='__main__':unittest.main()
