import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('budget', Path(__file__).parents[1] / 'ai-cast/cinematic_budget.py')
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)


class BudgetTests(unittest.TestCase):
    def test_cpu_finish_cannot_call_any_gpu_route_even_with_credit(self):
        from unittest.mock import Mock
        callback = Mock()
        with patch.dict(os.environ, {'CINEMATIC_CACHED_ONLY': 'on', 'HF_TOKEN':'account'}):
            with self.assertRaisesRegex(RuntimeError, 'cannot request GPU'):
                b.run_gpu(callback, 480)
        callback.assert_not_called()

    def test_hf_included_is_first_and_token_is_restored(self):
        import types, sys
        build = types.SimpleNamespace(TOKEN='previous')
        with patch.dict(os.environ, {'HF_TOKEN':'account-token'}), patch.dict(sys.modules, {'build':build}), patch.object(b,'guard') as guard:
            observed=[]
            self.assertEqual(b.run_gpu(lambda: observed.append(build.TOKEN) or 'ok',480),'ok')
            self.assertEqual(observed,['account-token'])
            guard.assert_called_once_with('account-token',480,allow_credit=False)
            self.assertEqual(build.TOKEN,'previous')

    def test_low_account_allowance_uses_explicit_anonymous_route(self):
        import types, sys
        build = types.SimpleNamespace(TOKEN='previous')
        with patch.dict(os.environ, {'HF_TOKEN':'account-token'}), patch.dict(sys.modules, {'build':build}), patch.object(b,'read_quota',return_value=0):
            observed=[]
            b.run_gpu(lambda: observed.append(build.TOKEN),480)
            self.assertEqual(observed,[False], 'False disables implicit account-token discovery; None is insufficient')
            self.assertEqual(build.TOKEN,'previous')

    def test_gpu_failure_tries_next_route_then_reports_exhaustion(self):
        import types, sys
        build = types.SimpleNamespace(TOKEN=None)
        with patch.dict(os.environ, {'HF_TOKEN':'account-token'}), patch.dict(sys.modules, {'build':build}), patch.object(b,'guard'):
            observed=[]
            def call():
                observed.append(build.TOKEN)
                raise RuntimeError('Unavailable account-token')
            with self.assertRaisesRegex(RuntimeError,'All eligible free GPU routes exhausted') as error:
                b.run_gpu(call,480)
            self.assertEqual(observed,['account-token',False])
            self.assertNotIn('account-token',str(error.exception))

    def test_even_scoped_credit_approval_waits_until_free_routes_fail(self):
        import types, sys
        build = types.SimpleNamespace(TOKEN='previous')
        with patch.dict(os.environ, {'HF_TOKEN':'account-token'}), patch.dict(sys.modules, {'build':build}), patch.object(b,'read_quota',return_value=0), patch.object(b,'credit_authorized',return_value=True):
            observed=[]
            def call():
                observed.append(build.TOKEN)
                if build.TOKEN is False:
                    raise RuntimeError('quota: anonymous spent')
                return 'scoped-approved'
            self.assertEqual(b.run_gpu(call,480),'scoped-approved')
            self.assertEqual(observed,[False,'account-token'])

    def test_read_only_preflight_does_not_claim_full_video_fits(self):
        with patch.object(b,'read_quota',return_value=600):
            result=b.preflight('token')
            self.assertEqual(result['remaining_seconds'],600)
            self.assertTrue(result['can_admit_one_speaking_take'])
            self.assertFalse(result['generation_requested'])
        with patch.object(b,'read_quota',side_effect=ValueError()):
            self.assertEqual(b.preflight('token')['status'],'unverified')

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
