import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import Mock,patch

ROOT=Path(__file__).parents[1]
sys.path.insert(0,str(ROOT/'ai-cast'))
import cinematic_design as design
import cinematic_ltx2 as ltx
import cinematic_speech as speech
from cinematic_story_bank import select_story
spec=importlib.util.spec_from_file_location('design_series',ROOT/'ai-cast/cinematic-series.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)


class DesignTests(unittest.TestCase):
    def setUp(self):
        self.config=json.loads((ROOT/'.cinematic-series.json').read_text())

    def test_approved_profile_is_active_for_next_episodes_and_keeps_budget(self):
        self.assertTrue(design.enabled(self.config,19))
        self.assertFalse(design.enabled(self.config,18))
        self.assertEqual(self.config['time_budget']['mode'],'verified-included-only')
        self.assertEqual(self.config['time'],'07:30')
        self.assertEqual(self.config['visual_profile']['de_font_size'],design.DE_SIZE)
        self.assertEqual(self.config['visual_profile']['fa_font_size'],design.FA_SIZE)

    def test_picture_fills_the_vertical_frame_without_white_padding(self):
        value=design.full_frame_layout()
        self.assertIn('1080:1920',value)
        self.assertNotIn('pad=',value)

    def test_original_adult_cast_uses_one_clear_speaking_face_and_real_actions(self):
        bank=json.loads((ROOT/'ai-cast/story-bank.json').read_text())
        config=dict(self.config);config.pop('next_story',None)
        source={'url':bank['stories'][-1]['research_urls'][0],
                'excerpt':'Official context fixture. '*8,'retrieved_at':'2026-11-08T07:00:00+00:00'}
        plan=select_story(bank,20,45,source,[],config,m.validate_plan)
        for scene in plan['scenes']:
            prompt=design.still_prompt(plan,scene)
            self.assertIn('realistic human anatomy',prompt)
            self.assertIn('ONLY',prompt)
            self.assertIn('off camera',prompt)
            self.assertIn(scene['object_action'],prompt)
            self.assertNotIn('warm hand-illustrated',prompt)
            motion=design.speaking_motion(scene)
            self.assertIn(scene['speaker'],motion)
            self.assertIn('lips close during silence',motion)
            self.assertIn('One small intentional gesture',motion)

    def test_all_story_subtitles_keep_large_bold_type_in_the_lower_safe_area(self):
        from PIL import Image
        bank=json.loads((ROOT/'ai-cast/story-bank.json').read_text())
        with tempfile.TemporaryDirectory() as directory:
            for story in bank['stories']:
                for index,scene in enumerate(story['scenes']):
                    target=Path(directory)/'caption.png'
                    report=design.caption_card(scene['de'],scene['fa'],target)
                    with Image.open(target) as image:bounds=image.getbbox()
                    self.assertGreaterEqual(design.CARD[1],1200)
                    self.assertLessEqual(design.CARD[0]+design.CARD[2],912)
                    self.assertLessEqual(design.CARD[1]+design.CARD[3],1610)
                    self.assertGreaterEqual(bounds[0],48)
                    self.assertLessEqual(bounds[2],913)
                    self.assertGreaterEqual(bounds[1],design.CARD[1])
                    self.assertLessEqual(bounds[3],design.CARD[1]+design.CARD[3]+5)
                    self.assertTrue(report['bold'])
                    self.assertGreaterEqual(report['de_size'],48)
                    self.assertGreaterEqual(report['fa_size'],40)

    def test_unreadably_long_caption_fails_instead_of_tiny_text(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError,'Shorten'):
                design.caption_card('sehr lang '*60,'ترجمهٔ طولانی '*60,Path(directory)/'bad.png')

    def test_caption_only_edit_reuses_image_but_changed_action_invalidates_it(self):
        import copy
        bank=json.loads((ROOT/'ai-cast/story-bank.json').read_text())
        plan=copy.deepcopy(bank['stories'][0]);scene=plan['scenes'][0]
        before=design.image_signature('reference',design.still_prompt(plan,scene),42)
        scene['fa']='ترجمهٔ اصلاح‌شدهٔ همان جمله'
        self.assertEqual(before,design.image_signature('reference',design.still_prompt(plan,scene),42))
        scene['object_action']='Marta safely places the note on the bench and points to the timetable.'
        self.assertNotEqual(before,design.image_signature('reference',design.still_prompt(plan,scene),42))

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'),'media tools required')
    def test_real_glass_mux_preserves_vertical_picture_duration_and_audio(self):
        with tempfile.TemporaryDirectory() as directory:
            folder=Path(directory)
            design.prepare_captions({'scenes':[{'de':'Ich frage noch einmal.','fa':'یک بار دیگر می‌پرسم.'}]},folder)
            output=folder/'sample.mp4'
            graph='[0:v]'+design.full_frame_layout()+'[v];'+design.glass_filters('v',2,3)
            subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','testsrc2=size=64x96:rate=30:duration=1',
                '-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=1',
                '-loop','1','-i',str(folder/'caption-00.png'),'-loop','1','-i',str(folder/'glass-mask.png'),
                '-filter_complex_threads','1','-filter_complex',graph,'-map','[captioned]','-map','1:a',
                '-c:v','libx264','-preset','ultrafast','-c:a','aac','-t','1',str(output)],check=True)
            info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(output)]))
            video=next(s for s in info['streams'] if s['codec_type']=='video')
            self.assertEqual((video['width'],video['height'],video['nb_frames']),(1080,1920,'30'))
            self.assertTrue(any(s['codec_type']=='audio' for s in info['streams']))
            self.assertEqual(float(info['format']['duration']),1)


class LtxContractTests(unittest.TestCase):
    SOURCE="import spaces\n@spaces.GPU(duration=85,size='xlarge')\ndef generate(): pass\n"
    def test_provider_hardware_multiplier_is_reserved(self):
        self.assertEqual(ltx.verify_contract(self.SOURCE),170)
        for text in [self.SOURCE.replace('85','120'),self.SOURCE.replace('xlarge','large'),'def generate(): pass']:
            with self.assertRaisesRegex(RuntimeError,'no GPU'):ltx.verify_contract(text)

    def test_one_predict_receives_the_exact_audio_and_five_second_duration(self):
        import cinematic_budget as budget
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);video=root/'provider.mp4';video.write_bytes(b'provider-fixture')
            client=types.SimpleNamespace(predict=Mock(return_value=(str(video),42)))
            fake_shots=types.SimpleNamespace(client=Mock(return_value=client))
            fake_gradio=types.SimpleNamespace(handle_file=lambda value:value)
            with patch.dict(sys.modules,{'shots':fake_shots,'gradio_client':fake_gradio}), \
                 patch.object(ltx,'verify_live_contract'),patch.object(ltx,'reject_whiteout'), \
                 patch.object(budget,'run_gpu',side_effect=lambda callback,required_seconds:callback()) as guard:
                ltx.generate_take(root/'duo.png',root/'actual-aligned.wav',root/'result.mp4',
                                  'Only the LEFT woman speaks.',42)
            guard.assert_called_once();self.assertEqual(guard.call_args.kwargs['required_seconds'],170)
            args=client.predict.call_args.args
            self.assertEqual(args[1],str(root/'actual-aligned.wav'))
            self.assertEqual(args[4],5.0)
            self.assertEqual((root/'result.mp4').read_bytes(),video.read_bytes())
            client.predict.assert_called_once()

    def test_new_backend_cannot_reuse_legacy_single_person_cache_identity(self):
        self.assertNotEqual(speech.model_identity('ltx2'),speech.model_identity('gradio'))

    @unittest.skipUnless(shutil.which('ffmpeg'),'media tools required')
    def test_empty_white_take_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'white.mp4'
            subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','color=white:size=32x48:rate=24:duration=0.25',
                            '-c:v','libx264',str(path)],check=True)
            with self.assertRaisesRegex(RuntimeError,'empty white'):ltx.reject_whiteout(path)


if __name__=='__main__':unittest.main()
