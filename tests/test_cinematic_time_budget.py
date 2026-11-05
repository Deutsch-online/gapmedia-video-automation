import importlib.util
import json
import os
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).parents[1] / 'ai-cast'))
from cinematic_time_budget import TimeBudget
spec = importlib.util.spec_from_file_location('strict_budget', Path(__file__).parents[1] / 'ai-cast/cinematic_budget.py')
b = importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
POLICY={'mode':'verified-included-only','reserve_seconds':30,'minimum_stage_seconds':120}


class TimeBudgetTests(unittest.TestCase):
    def test_low_balance_blocks_before_callback_and_preserves_safety_margin(self):
        with tempfile.TemporaryDirectory() as directory:
            budget=TimeBudget(199,30,Path(directory)/'budget.json');callback=Mock()
            with self.assertRaisesRegex(RuntimeError,'cannot cover'):
                budget.run(callback,170,199,lambda:0)
            callback.assert_not_called()

    def test_verified_debit_releases_unused_reservation(self):
        with tempfile.TemporaryDirectory() as directory:
            budget=TimeBudget(700,30,Path(directory)/'budget.json')
            budget.run(lambda:'ok',480,700,lambda:600)
            self.assertEqual(budget.data['spent_seconds'],100)
            self.assertEqual(budget.run(lambda:'second',480,600,lambda:550),'second')
            self.assertEqual(budget.data['spent_seconds'],150)

    def test_reset_does_not_expand_original_run_limit(self):
        with tempfile.TemporaryDirectory() as directory:
            budget=TimeBudget(240,30,Path(directory)/'budget.json')
            budget.run(lambda:None,170,240,lambda:2400)
            with self.assertRaisesRegex(RuntimeError,'cannot cover'):
                budget.run(lambda:self.fail('must not request GPU'),170,2400,lambda:2200)

    def test_unreadable_settlement_keeps_entire_maximum(self):
        with tempfile.TemporaryDirectory() as directory:
            budget=TimeBudget(400,30,Path(directory)/'budget.json')
            budget.run(lambda:None,170,400,Mock(side_effect=ValueError()))
            self.assertEqual(budget.data['spent_seconds'],170)

    def test_uncertain_request_is_journaled_before_call_and_not_replayed(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'budget.json';budget=TimeBudget(400,30,path)
            def fail():
                self.assertEqual(json.loads(path.read_text())['entries'][0]['status'],'reserved')
                raise TimeoutError()
            with self.assertRaises(TimeoutError):budget.run(fail,170,400,lambda:400)
            self.assertEqual(budget.data['spent_seconds'],170)
            saved=json.loads(path.read_text());saved['entries'][0]['status']='reserved';path.write_text(json.dumps(saved))
            with self.assertRaisesRegex(RuntimeError,'unresolved'):TimeBudget(2400,30,path)

    def test_strict_route_never_tries_anonymous_or_approved_paid_fallback(self):
        callback=Mock();build=types.SimpleNamespace(TOKEN='previous')
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ,{'HF_TOKEN':'account'}), \
             patch.dict(sys.modules,{'build':build}), patch.object(b,'time_policy',return_value=POLICY), \
             patch.object(b,'journal_path',return_value=Path(directory)/'budget.json'), \
             patch.object(b,'read_quota',return_value=100), patch.object(b,'credit_authorized',return_value=True):
            b._TIME_SESSION=None
            with self.assertRaisesRegex(RuntimeError,'cannot cover'):b.run_gpu(callback,170)
            callback.assert_not_called();self.assertEqual(build.TOKEN,'previous')

    def test_actual_route_failure_is_not_retried_and_token_is_restored(self):
        callback=Mock(side_effect=RuntimeError('provider unavailable'));build=types.SimpleNamespace(TOKEN='previous')
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ,{'HF_TOKEN':'account'}), \
             patch.dict(sys.modules,{'build':build}), patch.object(b,'time_policy',return_value=POLICY), \
             patch.object(b,'journal_path',return_value=Path(directory)/'budget.json'), patch.object(b,'read_quota',return_value=600):
            b._TIME_SESSION=None
            with self.assertRaisesRegex(RuntimeError,'provider unavailable'):b.run_gpu(callback,170)
            callback.assert_called_once();self.assertEqual(build.TOKEN,'previous')

    def test_missing_quota_or_key_never_admits_remote_generation(self):
        callback=Mock();build=types.SimpleNamespace(TOKEN='previous')
        with patch.dict(os.environ,{},clear=True), patch.dict(sys.modules,{'build':build}), patch.object(b,'time_policy',return_value=POLICY):
            with self.assertRaisesRegex(RuntimeError,'configured account'):b.run_gpu(callback,170)
        callback.assert_not_called()


if __name__ == '__main__':unittest.main()
