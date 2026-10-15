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

if __name__ == '__main__':
    unittest.main()
