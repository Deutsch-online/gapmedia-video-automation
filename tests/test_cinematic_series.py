import copy
import importlib.util
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

spec = importlib.util.spec_from_file_location('series', Path(__file__).parents[1] / 'ai-cast/cinematic-series.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
CONFIG = {'time': '17:30', 'max_daily_attempts': 2}

class SeriesTests(unittest.TestCase):
    def test_new_episode_requires_visible_props_and_physical_action(self):
        plan = json.loads((m.ROOT / 'ai-cast/everyday-pilot.json').read_text())
        plan['episode'] = 4
        with self.assertRaisesRegex(ValueError, 'visible objects'):
            m.validate_plan(plan, 4, [])
        for scene in plan['scenes']:
            scene['visible_objects'] = ['reusable shopping bag']
            scene['object_action'] = 'The speaker lifts the reusable bag into clear view.'
        self.assertIs(m.validate_plan(plan, 4, []), plan)
        plan['scenes'][3]['object_action'] = ''
        with self.assertRaisesRegex(ValueError, 'physical action'):
            m.validate_plan(plan, 4, [])

    def test_first_episode_is_a_full_minute_with_13_unique_actions(self):
        plan = m.validate_plan(m.first_episode(), 1, [])
        self.assertEqual(len(plan['scenes']) * 5, 65)
        self.assertEqual(len(set(s['motion'] for s in plan['scenes'])), 13)
        self.assertTrue(plan['cliffhanger'])
        self.assertEqual({s['speaker'] for s in plan['scenes']}, set(m.VOICES))

    def test_berlin_summer_and_winter_slot(self):
        state = m.new_state()
        # The summer clock is UTC+2 and the winter clock is UTC+1.
        for month, hour in [(7, 15), (12, 16)]:
            self.assertFalse(m.due(state, CONFIG, datetime(2026, month, 15, hour, 29, tzinfo=timezone.utc))[0])
            self.assertTrue(m.due(state, CONFIG, datetime(2026, month, 15, hour, 30, tzinfo=timezone.utc))[0])

    def test_dst_transition_dates(self):
        for day, hour in [(datetime(2026, 3, 29, 15, 30, tzinfo=timezone.utc), 17),
                          (datetime(2026, 10, 25, 16, 30, tzinfo=timezone.utc), 17)]:
            self.assertEqual(m.local_date(day).hour, hour)
            self.assertTrue(m.due(m.new_state(), CONFIG, day)[0])

    def test_delivered_day_cannot_be_replayed_even_by_force(self):
        state = m.new_state()
        state['deliveries']['2026-10-15'] = {'episode': 1, 'message_id': 123}
        self.assertEqual(m.due(state, CONFIG, datetime(2026, 10, 15, 18, tzinfo=timezone.utc), force=True)[1], 'already-delivered')

    def test_unknown_delivery_never_replays_next_day(self):
        state = m.new_state()
        state['pending'] = {'status': 'dispatching', 'date': '2026-10-14'}
        self.assertEqual(m.due(state, CONFIG, datetime(2026, 10, 15, 18, tzinfo=timezone.utc), force=True)[1], 'delivery-needs-reconciliation')

    def test_failed_render_retries_same_episode_with_bounded_attempts(self):
        state = m.new_state()
        state['pending'] = {'status': 'render-failed', 'plan': m.first_episode()}
        state['attempts']['2026-10-15'] = 1
        now = datetime(2026, 10, 15, 18, tzinfo=timezone.utc)
        self.assertTrue(m.due(state, CONFIG, now)[0])
        state['attempts']['2026-10-15'] = 2
        self.assertEqual(m.due(state, CONFIG, now)[1], 'daily-attempt-limit')
        self.assertEqual(state['next_episode'], 1)
        self.assertTrue(m.due(state, CONFIG, datetime(2026, 10, 16, 18, tzinfo=timezone.utc))[0])

    def test_missing_translation_or_animation_is_rejected(self):
        for key in ['fa', 'motion', 'scene']:
            plan = m.first_episode()
            plan['scenes'][0][key] = ''
            with self.assertRaises(ValueError):
                m.validate_plan(plan, 1, [])

    def test_duplicate_story_and_malformed_shot_count_rejected(self):
        plan = m.first_episode()
        with self.assertRaises(ValueError):
            m.validate_plan(plan, 1, [copy.deepcopy(plan)])
        plan['scenes'].pop()
        with self.assertRaises(ValueError):
            m.validate_plan(plan, 1, [])

    def test_subtitle_control_injection_and_unknown_assets_rejected(self):
        for key, value in [('fa', 'متن{\\pos(0,0)}'), ('asset', '../../file')]:
            plan = m.first_episode()
            plan['scenes'][0][key] = value
            with self.assertRaises(ValueError):
                m.validate_plan(plan, 1, [])

    def test_broken_state_fails_closed(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'state.json'
            path.write_text('{broken')
            with self.assertRaises(json.JSONDecodeError):
                m.load_json(path, m.new_state())

import io
import os
import unittest
from unittest.mock import patch

class ProviderDiagnosticsTests(unittest.TestCase):
    def test_beatapi_never_selects_a_paid_model_or_unlisted_free_model(self):
        from unittest.mock import MagicMock
        catalog = json.dumps({'data': {'enabled': True, 'models': [
            {'id': 'glm-5.3-flash'}, {'id': 'glm-5.3-flash-free'}]}})
        def fresh_response(*_args, **_kwargs):
            response = MagicMock()
            response.__enter__.return_value = io.StringIO(catalog)
            return response
        with patch.object(m.urllib.request, 'urlopen', side_effect=fresh_response):
            with patch.dict(os.environ, {'BEATAPI_FREE_MODEL': 'glm-5.3-flash'}):
                with self.assertRaisesRegex(ValueError, '-free suffix'):
                    m.beatapi_free_model()
            with patch.dict(os.environ, {'BEATAPI_FREE_MODEL': 'missing-free'}):
                with self.assertRaisesRegex(ValueError, 'not currently listed'):
                    m.beatapi_free_model()
            with patch.dict(os.environ, {'BEATAPI_FREE_MODEL': 'glm-5.3-flash-free'}):
                self.assertEqual(m.beatapi_free_model(), 'glm-5.3-flash-free')

    def test_beatapi_free_text_precedes_other_story_providers(self):
        state = m.new_state()
        state['next_episode'] = 2
        plan = m.first_episode()
        plan['episode'] = 2
        response = {'choices': [{'message': {'content': json.dumps(plan)}}]}
        with patch.dict(os.environ, {'BEATAPI_API_KEY': 'test-key'}, clear=True), \
             patch.object(m, 'beatapi_free_model', return_value='glm-5.3-flash-free'), \
             patch.object(m, 'request_json', return_value=response) as request:
            self.assertEqual(m.make_plan(state)['episode'], 2)
        self.assertEqual(request.call_args.args[1]['model'], 'glm-5.3-flash-free')
        self.assertEqual(request.call_args.args[2]['Authorization'], 'Bearer test-key')

    def test_http_status_and_message_preserved_but_credentials_removed(self):
        body = b'{"error":{"code":"invalid_api_key","message":"key=private-value https://example.com/?key=private-value"}}'
        error = m.urllib.error.HTTPError('https://example.com', 401, 'Unauthorized', {}, io.BytesIO(body))
        with patch.dict(os.environ, {'GROQ_API_KEY': 'private-value'}):
            detail = m.provider_error(error)
        self.assertIn('HTTP 401', detail)
        self.assertIn('invalid_api_key', detail)
        self.assertNotIn('private-value', detail)
        self.assertNotIn('example.com', detail)

    def test_html_failure_does_not_dump_body(self):
        error = m.urllib.error.HTTPError('https://example.com', 403, 'Forbidden', {}, io.BytesIO(b'<html>secret body</html>'))
        self.assertEqual(m.provider_error(error), 'HTTPError HTTP 403')

    def test_failed_primary_falls_back_and_reports_status(self):
        state = m.new_state()
        state['next_episode'] = 2
        plan = m.first_episode()
        plan['episode'] = 2
        error = m.urllib.error.HTTPError('https://example.com', 429, 'Limit', {}, io.BytesIO(b'{"error":{"message":"Quota exceeded"}}'))
        response = {'choices': [{'message': {'content': m.json.dumps(plan)}}]}
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-one', 'GROQ_API_KEY': 'test-two'}), patch.object(m, 'groq_model', return_value='available-model'), patch.object(m, 'request_json', side_effect=[error, response]) as request, patch('builtins.print') as report:
            self.assertEqual(m.make_plan(state)['episode'], 2)
        self.assertEqual(request.call_count, 2)
        self.assertIn('HTTP 429', report.call_args.args[0])


class RecoveryTests(unittest.TestCase):
    def test_manual_recovery_is_one_extra_attempt_and_preserves_delivery_guards(self):
        state = m.new_state()
        date = '2026-10-16'
        now = datetime(2026, 10, 16, 18, tzinfo=timezone.utc)
        state['attempts'][date] = 2
        self.assertEqual(m.due(state, CONFIG, now)[1], 'daily-attempt-limit')
        state['manual_recovery'] = {date: 100}
        self.assertTrue(m.due(state, CONFIG, now)[0])
        state['attempts'][date] = 3
        self.assertEqual(m.due(state, CONFIG, now, force=True)[1], 'daily-attempt-limit')
        state['attempts'][date] = 2
        state['deliveries'][date] = {'episode': 2, 'message_id': 1}
        self.assertEqual(m.due(state, CONFIG, now, force=True)[1], 'already-delivered')

    def test_groq_selects_only_available_supported_model(self):
        from unittest.mock import MagicMock
        response = MagicMock()
        response.__enter__.return_value = io.StringIO('{"data":[{"id":"whisper-large-v3"},{"id":"openai/gpt-oss-120b"}]}')
        with patch.dict(os.environ, {}, clear=True), patch.object(m.urllib.request, 'urlopen', return_value=response):
            self.assertEqual(m.groq_model('test'), 'openai/gpt-oss-120b')
        response.__enter__.return_value = io.StringIO('{"data":[{"id":"whisper-large-v3"}]}')
        with patch.dict(os.environ, {}, clear=True), patch.object(m.urllib.request, 'urlopen', return_value=response):
            with self.assertRaises(ValueError):
                m.groq_model('test')


class QuotaRecoveryTests(unittest.TestCase):
    def test_waits_for_reset_then_allows_only_one_continuation(self):
        state = m.new_state()
        date = '2026-10-16'
        state['attempts'][date] = 3
        state['manual_recovery'] = {date: 1}
        state['pending'] = {'status': 'render-failed', 'plan': m.first_episode()}
        state['quota_recovery'] = {'date': date, 'not_before': '2026-10-16T10:50:00+00:00'}
        config = {'time': '07:30', 'max_daily_attempts': 2}
        before = datetime(2026, 10, 16, 10, 49, tzinfo=timezone.utc)
        ready = datetime(2026, 10, 16, 10, 50, tzinfo=timezone.utc)
        self.assertEqual(m.due(state, config, before, force=True)[1], 'waiting-for-gpu-quota')
        self.assertTrue(m.due(state, config, ready)[0])
        state['attempts'][date] = 4
        self.assertEqual(m.due(state, config, ready, force=True)[1], 'daily-attempt-limit')
        state['attempts'][date] = 3
        state['pending']['status'] = 'dispatching'
        self.assertEqual(m.due(state, config, ready)[1], 'delivery-needs-reconciliation')
        state['deliveries'][date] = {'message_id': 1}
        self.assertEqual(m.due(state, config, ready)[1], 'already-delivered')


class ExactDurationTests(unittest.TestCase):
    def test_provider_reset_time_and_midnight_wait(self):
        now = datetime(2026, 10, 16, 6, 24, tzinfo=timezone.utc)
        self.assertEqual(m.gpu_retry_at('quota: Try again in 4:16:20.', now).isoformat(),
                         '2026-10-16T10:42:20+00:00')
        state = m.new_state()
        state['pending'] = {'status': 'render-failed'}
        state['quota_recovery'] = {'date': '2026-10-16', 'not_before': '2026-10-17T01:00:00+00:00'}
        self.assertEqual(m.due(state, CONFIG, datetime(2026, 10, 17, 0, 30, tzinfo=timezone.utc), force=True)[1], 'waiting-for-gpu-quota')

    @unittest.skipUnless(m.shutil.which('ffmpeg') and m.shutil.which('ffprobe'), 'media tools required')
    def test_default_sixty_seconds_and_explicit_sixty_five_preserve_audio(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'episode.mp4'
            m.command(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i',
                       'testsrc2=size=64x64:rate=30:duration=60', '-f', 'lavfi', '-i',
                       'sine=frequency=440:sample_rate=96000:duration=60', '-c:v', 'libx264', '-preset', 'ultrafast',
                       '-c:a', 'aac', '-t', '60', path])
            self.assertEqual(m.conform_duration(path), 60)
            info = m.ffprobe(path)
            self.assertEqual(float(info['format']['duration']), 60)
            self.assertEqual({x['codec_type'] for x in info['streams']}, {'video', 'audio'})
            self.assertEqual(m.conform_duration(path), 60)
            long = Path(d) / 'exception.mp4'
            m.command(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i',
                       'testsrc2=size=64x64:rate=30:duration=65', '-f', 'lavfi', '-i',
                       'sine=frequency=440:sample_rate=96000:duration=65', '-c:v', 'libx264', '-preset', 'ultrafast',
                       '-c:a', 'aac', '-t', '65', long])
            self.assertEqual(m.conform_duration(long, 65), 65)
            with self.assertRaisesRegex(RuntimeError, 'exactly 60 seconds'):
                m.conform_duration(long)
            with self.assertRaisesRegex(RuntimeError, 'exactly 65 seconds'):
                m.conform_duration(path, 65)


class PlatformDeliveryTests(unittest.TestCase):
    def test_receipt_is_saved_before_starting_next_platform(self):
        state = m.new_state()
        state['pending'] = {'status': 'rendering'}
        events = []
        def checkpoint(st):
            events.append(('checkpoint', st['pending']['status'], dict(st['pending'].get('platform_receipts', {}))))
        def bot(action, file, platform):
            events.append(('send', platform))
            return {'message_id': 11 if platform == 'tiktok' else 12}
        with tempfile.TemporaryDirectory() as d, patch.object(m, 'export_platforms', return_value={'tiktok': 'tt.mp4', 'instagram': 'ig.mp4'}), patch.object(m, 'checkpoint', side_effect=checkpoint), patch.object(m, 'bot', side_effect=bot):
            self.assertEqual(m.deliver_platforms(state, str(Path(d) / 'master.mp4')), {'tiktok': 11, 'instagram': 12})
        first_receipt = events.index(('checkpoint', 'exporting', {'tiktok': 11}))
        self.assertLess(first_receipt, events.index(('send', 'instagram')))

    def test_confirmed_platform_is_not_sent_again(self):
        state = m.new_state()
        state['pending'] = {'status': 'exporting', 'platform_receipts': {'tiktok': 11}}
        with tempfile.TemporaryDirectory() as d, patch.object(m, 'export_platforms', return_value={'tiktok': 'tt.mp4', 'instagram': 'ig.mp4'}), patch.object(m, 'checkpoint'), patch.object(m, 'bot', return_value={'message_id': 12}) as bot:
            self.assertEqual(m.deliver_platforms(state, str(Path(d) / 'master.mp4')), {'tiktok': 11, 'instagram': 12})
            self.assertEqual(bot.call_count, 1)
            self.assertEqual(bot.call_args.args[2], 'instagram')

    def test_unconfirmed_upload_prevents_replay(self):
        state = m.new_state()
        state['pending'] = {'status': 'dispatching'}
        with patch.object(m, 'bot') as bot:
            with self.assertRaises(RuntimeError):
                m.deliver_platforms(state, 'master.mp4')
            bot.assert_not_called()


class EverydayLifeTests(unittest.TestCase):
    def test_future_story_defaults_to_twelve_shots_with_explicit_exception_only(self):
        plan = m.load_json(m.ROOT / 'ai-cast/everyday-pilot.json')
        plan['episode'] = 7
        for scene in plan['scenes']:
            scene['visible_objects'] = ['shopping bag']
            scene['object_action'] = 'The speaker raises the shopping bag into view.'
        removed_scene = plan['scenes'].pop(-2)
        plan['duration_seconds'] = 60
        with self.assertRaisesRegex(ValueError, 'research source'):
            m.validate_plan(plan, 7, [])
        plan['research_source'] = {'url': 'https://invalid.example/', 'excerpt': 'fabricated'}
        plan['mood'] = 'comic'
        with self.assertRaisesRegex(ValueError, 'research source'):
            m.validate_plan(plan, 7, [])
        plan['research_source']['url'] = m.TRUSTED_RESEARCH[0][1]
        plan['marta_goal'] = 'Marta wants to find the right shopping bag at the counter.'
        plan['marta_decision'] = 'Marta picks up the bag and asks for the item herself.'
        plan['visual_payoff'] = 'Marta places the correct bag on the counter and laughs.'
        self.assertIs(m.validate_plan(plan, 7, []), plan)
        passive = copy.deepcopy(plan)
        passive['scenes'][0]['speaker'] = 'lukas'
        with self.assertRaisesRegex(ValueError, 'opening problem'):
            m.validate_plan(passive, 7, [])
        plan['duration_seconds'] = 65
        with self.assertRaisesRegex(ValueError, 'duration'):
            m.validate_plan(plan, 7, [])
        plan['scenes'].insert(-1, removed_scene)
        self.assertIs(m.validate_plan(plan, 7, [], {'duration_exceptions': [7]}), plan)

    def test_cartoon_pilot_is_a_new_nonrepeating_story(self):
        state = m.new_state()
        state['next_episode'] = 3
        state['history'] = [m.first_episode()]
        plan = m.make_plan(state)
        self.assertEqual(plan['series_version'], 'wg-alltag-v1')
        self.assertEqual(plan['episode'], 3)
        self.assertEqual(len(plan['scenes']), 13)
        self.assertTrue(all(not s.get('asset') for s in plan['scenes']))
        self.assertIn('3D CARTOON', m.STYLE)

    def test_new_season_rejects_missing_practical_resolution_and_old_assets(self):
        plan = m.load_json(m.ROOT / 'ai-cast/everyday-pilot.json')
        for field in ('visual_hook', 'everyday_problem', 'practical_resolution'):
            broken = copy.deepcopy(plan)
            broken[field] = ''
            with self.assertRaises(ValueError):
                m.validate_plan(broken, 3, [])
        plan['scenes'][0]['asset'] = 'conversation.png'
        with self.assertRaises(ValueError):
            m.validate_plan(plan, 3, [])

    def test_later_episodes_use_only_everyday_life_memory(self):
        state = m.new_state()
        state['next_episode'] = 4
        state['history'] = [m.first_episode(), m.load_json(m.ROOT / 'ai-cast/everyday-pilot.json')]
        plan = copy.deepcopy(state['history'][-1])
        plan['episode'] = 4
        # Provider-prompt test; isolate repetition validation from the prompt being checked.
        response = {'candidates': [{'content': {'parts': [{'text': m.json.dumps(plan)}]}}]}
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-one'}), patch.object(m, 'validate_plan', return_value=plan), patch.object(m, 'request_json', return_value=response) as request:
            m.make_plan(state)
        prompt = request.call_args.args[1]['contents'][0]['parts'][0]['text']
        self.assertIn('everyday-life series', prompt)
        self.assertIn('Natural speech and credible actions only', prompt)
        memory = prompt.split('Story history: ')[1]
        self.assertNotIn('Eine unerwartete Fahrt', memory)
        self.assertIn(state['history'][-1]['title_de'], memory)


class SpeechTimingTests(unittest.TestCase):
    def speech_module(self):
        spec = importlib.util.spec_from_file_location('speech', m.ROOT / 'ai-cast/cinematic_speech.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    @unittest.skipUnless(m.shutil.which('ffmpeg'), 'media tools required')
    def test_model_and_mix_share_exact_five_second_audio_with_one_leading_delay(self):
        import wave
        speech = self.speech_module()
        with tempfile.TemporaryDirectory() as d:
            raw, aligned = Path(d) / 'raw.wav', Path(d) / 'aligned.wav'
            m.command(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i',
                       'sine=frequency=440:duration=1', str(raw)])
            speech.aligned_audio(raw, aligned)
            with wave.open(str(aligned)) as wav:
                self.assertEqual(wav.getframerate(), 48000)
                self.assertEqual(wav.getnframes(), 240000)
                self.assertEqual(wav.readframes(4800), bytes(9600))
                self.assertNotEqual(wav.readframes(24000), bytes(48000))

    def test_generic_cached_motion_is_not_accepted_and_audio_changes_force_new_take(self):
        speech = self.speech_module()
        with tempfile.TemporaryDirectory() as d:
            png, audio, clip = [Path(d) / name for name in ('image.png', 'aligned.wav', 'clip.mp4')]
            png.write_bytes(b'image')
            audio.write_bytes(b'aligned-speech-one')
            clip.write_bytes(b'old-generic-motion')
            def generate(*args):
                clip.write_bytes(b'audio-conditioned-take')
            with patch.object(speech, 'generate', side_effect=generate) as call, patch.object(speech, 'probe', return_value={'format': {'duration': '5.0'}}):
                speech.ensure_clip(png, audio, clip, 'natural gesture', 42)
                self.assertEqual(call.call_count, 1)
                speech.ensure_clip(png, audio, clip, 'natural gesture', 42)
                self.assertEqual(call.call_count, 1)
                audio.write_bytes(b'aligned-speech-two')
                speech.ensure_clip(png, audio, clip, 'natural gesture', 42)
                self.assertEqual(call.call_count, 2)


class PauseMusicTests(unittest.TestCase):
    def module(self):
        spec = importlib.util.spec_from_file_location('pause_music', m.ROOT / 'ai-cast/cinematic_music.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_brief_word_gaps_are_not_music_windows(self):
        music = self.module()
        result = type('Result', (), {'stderr': 'silence_start: 0\\nsilence_end: 0.5\\nsilence_start: 1.2\\nsilence_end: 1.45\\nsilence_start: 2.5\\nsilence_end: 4.0\\n'})()
        with patch.object(music, 'run', return_value=result):
            protected = music.protected_speech('voice.mp4', 4)
        self.assertEqual(protected, [[0.35, 2.75]])
        self.assertEqual(music.music_windows(protected, 4), [[2.75, 4]])

    @unittest.skipUnless(m.shutil.which('ffmpeg'), 'media tools required')
    def test_real_music_stem_is_zero_during_speech_and_audible_during_pauses(self):
        import wave
        import array
        music = self.module()
        with tempfile.TemporaryDirectory() as d:
            track, output = Path(d) / 'track.wav', Path(d) / 'gated.wav'
            m.command(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i',
                       'sine=frequency=440:duration=4', str(track)])
            report = music.gated_track(track, output, [[0, 2]], 4)
            self.assertEqual(report['nonzero_music_samples_during_protected_speech'], 0)
            with wave.open(str(output)) as wav:
                self.assertEqual(wav.getnframes(), 192000)
                samples = array.array('h', wav.readframes(wav.getnframes()))
            self.assertFalse(any(samples[:192000]))
            self.assertTrue(any(samples[240000:]))
            

class RequestedFullEpisodeTests(unittest.TestCase):
    def test_explicit_additional_episode_preserves_delivered_day_and_is_bounded(self):
        state = m.new_state()
        state['next_episode'] = 3
        state['deliveries']['2026-10-16'] = {'episode': 2, 'message_id': 2438}
        config = {'time': '00:00', 'max_daily_attempts': 2,
                  'manual_request': {'id': 'full-episode3-approved-style', 'episode': 3}}
        now = datetime(2026, 10, 16, 18, tzinfo=timezone.utc)
        go, reason, slot = m.due(state, config, now)
        self.assertTrue(go)
        self.assertEqual(slot, '2026-10-16#full-episode3-approved-style')
        self.assertEqual(state['deliveries']['2026-10-16']['message_id'], 2438)
        state['attempts'][slot] = 2
        self.assertEqual(m.due(state, config, now)[1], 'daily-attempt-limit')
        state['next_episode'] = 4
        self.assertEqual(m.due(state, config, now, force=True)[1], 'already-delivered')

    def test_manual_request_does_not_bypass_unknown_upload(self):
        state = m.new_state()
        state['next_episode'] = 3
        state['pending'] = {'status': 'dispatching'}
        config = {'time': '00:00', 'manual_request': {'id': 'full-preview', 'episode': 3}}
        self.assertEqual(m.due(state, config, datetime(2026, 10, 16, 18, tzinfo=timezone.utc), force=True)[1], 'delivery-needs-reconciliation')

if __name__ == '__main__':
    unittest.main()
