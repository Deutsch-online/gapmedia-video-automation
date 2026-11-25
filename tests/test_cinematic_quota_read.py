import io,json,sys,unittest,urllib.error
from pathlib import Path
from datetime import datetime,timezone,timedelta
from unittest.mock import Mock,patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'ai-cast'))
import cinematic_budget as budget


class QuotaReadTests(unittest.TestCase):
    def test_read_only_transient_failures_recover_without_gpu(self):
        body=io.BytesIO(json.dumps({'current':1700}).encode())
        failures=[urllib.error.URLError('network'),urllib.error.HTTPError('https://example.test',503,'unavailable',{},None),body]
        with patch.object(budget.urllib.request,'urlopen',side_effect=failures) as read,patch.object(budget.time,'sleep') as sleep:
            self.assertEqual(budget.read_quota('fixture'),1700)
        self.assertEqual(read.call_count,3);self.assertEqual(sleep.call_count,2)

    def test_authentication_failure_is_not_retried(self):
        with patch.object(budget.urllib.request,'urlopen',side_effect=urllib.error.HTTPError('https://example.test',401,'unauthorized',{},None)) as read,patch.object(budget.time,'sleep') as sleep:
            with self.assertRaises(urllib.error.HTTPError):budget.read_quota('fixture')
        read.assert_called_once();sleep.assert_not_called()

    def test_failed_read_never_calls_generation(self):
        import types
        fn=Mock()
        with patch.dict(sys.modules,{'build':types.SimpleNamespace(TOKEN='old')}),patch.dict(budget.os.environ,{'HF_TOKEN':'fixture'}),patch.object(budget,'time_policy',return_value={'reserve_seconds':30}),patch.object(budget,'read_quota',side_effect=OSError('unavailable')):
            with self.assertRaises(budget.QuotaVerificationError):budget.run_gpu(fn,480)
        fn.assert_not_called()

    def test_verification_failure_has_retry_interval_and_no_invented_reset(self):
        now=datetime(2026,11,25,17,tzinfo=timezone.utc);reset=Mock()
        record=budget.recovery_record(budget.QuotaVerificationError('unavailable'),'2026-11-25',now,reset)
        self.assertEqual(record['kind'],'verification-unavailable')
        self.assertEqual(datetime.fromisoformat(record['not_before']),now+timedelta(minutes=5))
        self.assertFalse(record['reset_verified']);reset.assert_not_called()

    def test_actual_reset_and_unavailable_reset_remain_distinct(self):
        now=datetime(2026,11,25,17,tzinfo=timezone.utc)
        record=budget.recovery_record(RuntimeError('quota: low'),'2026-11-25',now,lambda:now+timedelta(hours=1))
        self.assertTrue(record['reset_verified']);self.assertEqual(record['kind'],'included-quota')
        def unavailable():raise OSError('unavailable')
        record=budget.recovery_record(RuntimeError('quota: low'),'2026-11-25',now,unavailable)
        self.assertFalse(record['reset_verified']);self.assertEqual(record['kind'],'reset-unverified')


if __name__=='__main__':unittest.main()
