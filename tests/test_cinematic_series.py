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

if __name__ == '__main__':
    unittest.main()
