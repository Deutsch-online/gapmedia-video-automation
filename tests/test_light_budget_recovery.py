import copy,importlib.util,io,json,sys,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).parents[1];sys.path.insert(0,str(ROOT/'ai-cast'))
spec=importlib.util.spec_from_file_location('light_recovery_series',ROOT/'ai-cast/cinematic-series.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
import cinematic_budget as budget

class BudgetRecoveryTests(unittest.TestCase):
    def test_hourly_tick_only_admits_an_existing_budget_wait(self):
        config={'time_budget':{'mode':'verified-included-only'}}
        state={'pending':None,'attempts':{'2026-11-09':1}}
        ready={'status':'verified','can_admit_minimum_stage':True}
        before=copy.deepcopy(state)
        with patch.object(m,'due',return_value=(True,'daily-berlin-slot','2026-11-10')):
            self.assertEqual(m.gate_decision(state,config,recovery_only=True,quota_check=ready)[1],'not-waiting-for-budget-recovery')
            self.assertEqual(state,before)
            state['pending']={'time_budget_blocked':True}
            blocked={'status':'verified','can_admit_minimum_stage':False}
            self.assertFalse(m.gate_decision(state,config,recovery_only=True,quota_check=blocked)[0])
            self.assertTrue(m.gate_decision(state,config,recovery_only=True,quota_check=ready)[0])
            self.assertFalse(m.gate_decision(state,config,quota_check={'status':'unverified'})[0])
        with patch.object(m,'due',return_value=(False,'daily-production-already-started','2026-11-10')):
            self.assertFalse(m.gate_decision(state,config,recovery_only=True,quota_check=ready)[0])

    def test_reset_uses_the_actual_timezone_aware_service_timestamp(self):
        for stamp,valid in [('2099-11-10T10:19:08.716Z',True),('2099-11-10T10:19:08',False),('2020-01-01T00:00:00Z',False)]:
            with patch.object(budget.urllib.request,'urlopen',return_value=io.BytesIO(json.dumps({'resetsAt':stamp}).encode())):
                if valid:
                    reset=budget.read_reset_at('private-test')
                    self.assertEqual(reset.isoformat(),'2099-11-10T10:19:08.716000+00:00')
                else:
                    with self.assertRaises(ValueError):budget.read_reset_at('private-test')

if __name__=='__main__':unittest.main()
