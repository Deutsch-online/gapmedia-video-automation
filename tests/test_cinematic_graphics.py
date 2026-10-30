import copy
import importlib.util
import json
import math
import shutil
import subprocess
import sys
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'ai-cast'))
import cinematic_graphics as graphics

spec = importlib.util.spec_from_file_location('series_graphics_test', ROOT / 'ai-cast/cinematic-series.py')
series = importlib.util.module_from_spec(spec)
spec.loader.exec_module(series)


def story():
    return json.loads((ROOT / 'ai-cast/doctor-appointment-45s.json').read_text())


class DoctorStoryTests(unittest.TestCase):
    def test_live_next_episode_uses_doctor_story_and_cannot_substitute_the_train(self):
        state = series.load_json(ROOT / '.cinematic-series-state.json')
        config = series.load_json(ROOT / '.cinematic-series.json')
        # This is the actual unplanned episode at integration time, including
        # all previous dialogue for repetition checks. No model or GPU call.
        state = copy.deepcopy(state)
        state['next_episode'] = 15
        state['history'] = [h for h in state['history'] if h['episode'] < 15]
        source = {'url': story()['research_url'], 'excerpt': 'Arztbesuch'}
        with patch.object(series, 'research_source', return_value=source), \
             patch.object(series, 'request_json') as llm:
            plan = series.make_plan(state)
        self.assertEqual(plan['story_id'], config['next_story']['story_id'])
        self.assertEqual(plan['episode'], 15)
        series.validate_plan(plan, 15, state['history'], config)
        llm.assert_not_called()
        replacement = copy.deepcopy(state['history'][-1])
        replacement['episode'] = 15
        with self.assertRaisesRegex(ValueError, 'owner-requested doctor story'):
            series.validate_plan(replacement, 15, state['history'], config)
        for field in ('graphic_story', 'duration_seconds'):
            broken = copy.deepcopy(plan)
            broken.pop(field)
            with self.assertRaisesRegex(ValueError, 'all app graphics'):
                series.validate_plan(broken, 15, state['history'], config)

    def test_doctor_research_failure_never_falls_back_to_an_unrelated_story(self):
        state = series.new_state()
        state['next_episode'] = 15
        with patch.object(series, 'research_source', side_effect=RuntimeError('source unavailable')), \
             patch.object(series, 'request_json') as llm:
            with self.assertRaisesRegex(RuntimeError, 'source unavailable'):
                series.make_plan(state)
        llm.assert_not_called()

    def test_official_source_uses_native_node_without_accepting_a_wrong_topic(self):
        source = series.TRUSTED_RESEARCH[0]
        html = '<main>' + ('Useful official context. ' * 5) + source[2] + (' everyday dialogue.' * 10) + '</main>'
        with patch.object(series, 'official_page', side_effect=[OSError(), html]) as fetch:
            result = series.research_source(14, preferred_url=source[1])
        self.assertEqual(result['url'], source[1])
        self.assertEqual(result['transport'], 'node')
        self.assertIn('Arztbesuch', result['excerpt'])
        self.assertEqual([c.args[1] for c in fetch.call_args_list], ['urllib', 'node'])
        with patch.object(series, 'official_page', return_value='<main>Unrelated page</main>'):
            with self.assertRaisesRegex(RuntimeError, 'unavailable'):
                series.research_source(14, preferred_url=source[1])
        with patch.object(series.subprocess, 'run') as run:
            with self.assertRaisesRegex(ValueError, 'approved'):
                series.official_page('https://unapproved.example/', 'node')
            run.assert_not_called()

    def test_owner_story_has_problem_friend_six_steps_and_a_complete_45s_ending(self):
        plan = story()
        plan['research_source'] = {'url': plan['research_url']}
        series.validate_plan(plan, 10, [])
        self.assertEqual([s['speaker'] for s in plan['scenes'][:3]], ['marta', 'lukas', 'marta'])
        self.assertEqual([s['graphic_step'] for s in plan['scenes'][3:]], list(graphics.STEPS))
        self.assertIn('bestätigt', plan['scenes'][-1]['de'].lower())
        self.assertTrue(all(len(s['de']) < 51 for s in plan['scenes']))

    def test_graphics_cannot_skip_a_step_or_masquerade_as_a_real_booking(self):
        for mutate in (
            lambda p: p['graphic_story'].update(real_booking=True),
            lambda p: p['graphic_story'].update(disclosure_de=''),
            lambda p: p['scenes'][3].update(graphic_step='confirmed'),
            lambda p: p.update(duration_seconds=60),
        ):
            plan = story()
            mutate(plan)
            with self.assertRaises(ValueError):
                graphics.validate_graphic_story(plan)

    def test_requested_story_does_not_need_an_llm_and_is_bound_to_live_matching_research(self):
        state = series.new_state()
        state['next_episode'] = 10
        before = copy.deepcopy(state)
        source = {'url': story()['research_url'], 'excerpt': 'Arztbesuch', 'retrieved_at': 'test'}
        with patch.object(series, 'research_source', return_value=source) as fetch, \
             patch.object(series, 'request_json') as llm:
            plan = series.make_plan(state)
        self.assertEqual(plan['episode'], 10)
        self.assertEqual(state, before)
        fetch.assert_called_once_with(10, preferred_url=source['url'])
        llm.assert_not_called()
        with patch.object(series, 'research_source', return_value={'url': series.TRUSTED_RESEARCH[1][1]}):
            with self.assertRaisesRegex(RuntimeError, 'matching official source'):
                series.make_plan(state)

    def test_completed_story_is_not_repeated_when_provider_is_unavailable(self):
        state = series.new_state()
        state.update(next_episode=11, history=[story()])
        with patch.dict(series.os.environ, {'CINEMATIC_FREE_PLANNING_ONLY': 'on'}, clear=True), \
             patch.object(series, 'research_source', return_value={'url': story()['research_url']}), \
             patch.object(series, 'social_learning_context', return_value={}), \
             patch.object(series, 'report_story_attempts'):
            with self.assertRaisesRegex(RuntimeError, 'exhausted'):
                series.make_plan(state)

    def test_json_formatting_is_repaired_without_inventing_a_character(self):
        plan = story()
        plan['scenes'][0]['speaker'] = ' Marta '
        result = series.parse_story_response('\ufeff```json\n' + json.dumps(plan) + '\n```')
        self.assertEqual(result['scenes'][0]['speaker'], 'marta')
        plan['scenes'][0]['speaker'] = 'doctor'
        result = series.parse_story_response(json.dumps(plan))
        result['research_source'] = {'url': result['research_url']}
        with self.assertRaises(ValueError):
            series.validate_plan(result, 10, [])
        for raw in ('[]', 'null', 'Story: {}', '{"scenes":[null]}', 'x' * 100001):
            with self.assertRaises((ValueError, json.JSONDecodeError)):
                series.parse_story_response(raw)

    @unittest.skipUnless(shutil.which('ffmpeg'), 'FFmpeg required')
    def test_confirmation_and_full_speech_leave_no_audible_tap(self):
        import array
        with tempfile.TemporaryDirectory() as tmp:
            with patch('cinematic_music.protected_speech', return_value=[[0, 5]]):
                for scene in story()['scenes'][3:]:
                    graphic = graphics.prepare_step(scene, 'unused.wav', tmp, 0)
                    self.assertIsNone(graphic['tap_at'])
                    with wave.open(str(graphic['audio'])) as wav:
                        self.assertFalse(any(array.array('h', wav.readframes(wav.getnframes()))))

    @unittest.skipUnless(shutil.which('ffmpeg'), 'FFmpeg required')
    def test_graphic_mux_retains_150_frames_five_seconds_and_speech(self):
        import array
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            video, audio = folder / 'source.mp4', folder / 'speech.wav'
            subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i',
                'testsrc2=size=90x160:rate=30:duration=5', '-c:v', 'libx264',
                '-preset', 'ultrafast', str(video)], check=True)
            # A synthetic tone stands in for measured speech in this mux test only.
            samples = array.array('h', [int(3000 * math.sin(i * .1)) if 4800 < i < 96000 else 0 for i in range(240000)])
            if sys.byteorder != 'little':
                samples.byteswap()
            with wave.open(str(audio), 'wb') as wav:
                wav.setparams((1, 2, 48000, 0, 'NONE', 'not compressed'))
                wav.writeframes(samples.tobytes())
            graphic = graphics.prepare_step(story()['scenes'][3], audio, folder, 3)
            self.assertGreater(graphic['tap_at'], 2.25)
            with wave.open(str(graphic['audio'])) as wav:
                taps = array.array('h', wav.readframes(wav.getnframes()))
            if sys.byteorder != 'little':
                taps.byteswap()
            for a, b in graphic['protected_speech']:
                self.assertFalse(any(taps[math.floor(a * 48000):math.ceil(b * 48000)]))
            self.assertTrue(any(taps))
            final = folder / 'part.mp4'
            subprocess.run(['ffmpeg', '-v', 'error', '-i', str(video), '-i', str(audio),
                '-i', str(graphic['panel']), '-i', str(graphic['ring']), '-i', str(graphic['audio']),
                '-filter_complex', graphics.filters(graphic), '-map', '[v]', '-map', '[a]',
                '-t', '5', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', str(final)], check=True)
            info = series.ffprobe(final)
            stream = next(s for s in info['streams'] if s['codec_type'] == 'video')
            self.assertEqual((stream['width'], stream['height'], int(stream['nb_frames'])), (1080, 1920, 150))
            self.assertEqual(float(info['format']['duration']), 5)
            self.assertTrue(any(s['codec_type'] == 'audio' for s in info['streams']))


if __name__ == '__main__':
    unittest.main()
