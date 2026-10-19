import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('budget', Path(__file__).parents[1] / 'ai-cast/cinematic_budget.py')
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)


class BudgetTests(unittest.TestCase):
    def setUp(self):
        b.set_scene(6, 0)

    def test_low_allowance_blocks_before_billable_call(self):
        with patch.object(b, 'read_quota', return_value=152):
            with self.assertRaisesRegex(RuntimeError, 'credit approval required'):
                b.guard('token', 480)

    def test_allowance_read_failure_does_not_enable_billing(self):
        with patch.object(b, 'read_quota', side_effect=ValueError('bad response')):
            with self.assertRaisesRegex(RuntimeError, 'cannot verify'):
                b.guard('token', 480)

    def test_included_allowance_and_anonymous_access(self):
        with patch.object(b, 'read_quota', return_value=600) as read:
            b.guard(None, 480)
            read.assert_not_called()
            b.guard('token', 480)

    def test_authorization_cannot_leak_to_other_episodes_or_finished_takes(self):
        with patch.dict(os.environ, {'CINEMATIC_CREDIT_APPROVAL': 'episode5-final15s-20261019'}):
            for episode, index, allowed in [(5, 8, False), (5, 9, True), (5, 11, True), (5, 12, False), (6, 9, False)]:
                b.set_scene(episode, index)
                self.assertEqual(b.credit_authorized(), allowed)


if __name__ == '__main__':
    unittest.main()
