import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'ai-cast'))
spec = importlib.util.spec_from_file_location('comedy_series', ROOT / 'ai-cast/cinematic-series.py')
series = importlib.util.module_from_spec(spec)
spec.loader.exec_module(series)


class EntertainmentTests(unittest.TestCase):
    def plan(self):
        state = series.load_json(series.STATE)
        state['next_episode'] = 31
        state['pending'] = None
        state['history'] = [h for h in state['history'] if h.get('episode', 0) < 31]
        with patch.object(series, 'research_source', side_effect=AssertionError('fiction needs no research service')), \
             patch.object(series, 'beatapi_free_models', side_effect=AssertionError('authored comedy needs no model')):
            return series.make_plan(state), state

    def test_original_comedy_needs_no_lesson_or_external_provider(self):
        plan, _ = self.plan()
        self.assertEqual(plan['content_mode'], 'original-comedy')
        self.assertNotIn('language_error', plan)
        self.assertEqual(len(plan['scenes']), 9)
        self.assertEqual(plan['duration_seconds'], 45)
        self.assertIsNone(plan['research_source'])

    def test_comedy_retains_duration_staging_and_disclosure_checks(self):
        plan, state = self.plan()
        for field, value in [('duration_seconds', 40), ('fiction_disclosure', ''), ('setting_type', 'school-entrance')]:
            broken = copy.deepcopy(plan)
            broken[field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                series.validate_plan(broken, 31, state['history'])

    def test_comedy_cannot_be_replayed_or_bypass_legacy_teaching_contract(self):
        plan, state = self.plan()
        config = series.load_json(series.CONFIG)
        from cinematic_story_bank import select_story
        bank = series.load_json(ROOT / 'ai-cast/lina-oma-story-bank.json')
        bank['stories'] = [p for p in bank['stories'] if p['story_id'] == plan['story_id']]
        self.assertIsNone(select_story(bank, 32, 45, None, state['history'] + [plan], config, series.validate_plan))
        config['entertainment']['enabled'] = False
        with self.assertRaises(ValueError):
            series.validate_plan(plan, 31, state['history'], config)


if __name__ == '__main__':
    unittest.main()
