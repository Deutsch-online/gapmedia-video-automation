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

    def test_old_environment_permissions_no_longer_authorize_spending(self):
        for permission in ('episode5-final15s-20261019', 'door-style-preview-20261019'):
            with patch.dict(os.environ, {'CINEMATIC_CREDIT_APPROVAL': permission}):
                b.set_scene(5, 9)
                self.assertFalse(b.credit_authorized())

    def test_only_claimed_same_run_and_plan_can_spend(self):
        import tempfile, json, hashlib
        from pathlib import Path
        plan = {'episode': 6, 'scenes': [{'de': 'Hallo', 'fa': 'سلام'}]}
        digest = hashlib.sha256(json.dumps(plan, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
        with tempfile.TemporaryDirectory() as directory:
            old = os.getcwd()
            try:
                os.chdir(directory)
                Path('.cinematic-series-state.json').write_text(json.dumps({'pending': {'plan': plan}}))
                request = {'status': 'running', 'active_run': '100:1', 'plan_sha': digest, 'episode': 6, 'scenes': [0]}
                def save():
                    Path('.cinematic-credit-request.json').write_text(json.dumps(request))
                save()
                with patch.dict(os.environ, {'GITHUB_RUN_ID': '100', 'GITHUB_RUN_ATTEMPT': '1'}):
                    b.set_scene(6, 0)
                    self.assertTrue(b.credit_authorized())
                    b.set_scene(6, 1)
                    self.assertFalse(b.credit_authorized())
                    b.set_scene(6, 0)
                    request['active_run'] = '101:1'; save()
                    self.assertFalse(b.credit_authorized())
                    request['active_run'] = '100:1'; request['status'] = 'approved'; save()
                    self.assertFalse(b.credit_authorized())
            finally:
                os.chdir(old)


if __name__ == '__main__':
    unittest.main()
