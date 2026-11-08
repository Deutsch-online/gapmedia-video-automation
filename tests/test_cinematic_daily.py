import importlib.util
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1] / 'ai-cast'))
spec = importlib.util.spec_from_file_location('daily_series', Path(__file__).parents[1] / 'ai-cast/cinematic-series.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
CONFIG = {'time': '07:30', 'timezone': 'Europe/Berlin', 'daily_episodes': 1,
          'schedule_mode': 'daily-berlin-budget', 'max_daily_attempts': 1}


class DailyTests(unittest.TestCase):
    def test_winter_and_summer_start_at_0730_berlin(self):
        for stamp in ('2026-11-05T06:30:00+00:00', '2026-07-05T05:30:00+00:00',
                      '2026-03-29T05:30:00+00:00', '2026-10-25T06:30:00+00:00'):
            with self.subTest(stamp=stamp):
                self.assertTrue(m.due(m.new_state(), CONFIG, datetime.fromisoformat(stamp))[0])
        self.assertEqual(m.due(m.new_state(), CONFIG, datetime(2026,11,5,6,29,tzinfo=timezone.utc))[1], 'before-daily-slot')

    def test_other_dst_wakeup_and_force_cannot_repeat_production(self):
        state=m.new_state();state['attempts']['2026-07-05']=1
        with patch.object(m, 'approved_credit', return_value=True):
            self.assertFalse(m.due(state, CONFIG, datetime(2026,7,5,6,30,tzinfo=timezone.utc), force=True)[0])

    def test_old_manual_keys_and_completed_delivery_count_toward_same_day(self):
        state=m.new_state();state['attempts']['2026-11-05#old-request']=1
        now=datetime(2026,11,5,8,tzinfo=timezone.utc)
        self.assertFalse(m.due(state, CONFIG, now)[0])
        state['attempts'].clear();state['deliveries']['2026-11-05#old-request']={}
        self.assertEqual(m.due(state, CONFIG, now)[1], 'already-delivered')

    def test_budget_failure_does_not_allow_same_day_quota_recovery_extra_attempt(self):
        state=m.new_state();state['attempts']['2026-11-05']=1
        state['pending']={'status':'render-failed'}
        state['quota_recovery']={'date':'2026-11-05','not_before':'2026-11-05T07:00:00+00:00'}
        self.assertFalse(m.due(state, CONFIG, datetime(2026,11,5,10,tzinfo=timezone.utc))[0])

    def test_next_day_resumes_existing_plan_only_after_provider_reset(self):
        state=m.new_state();state['attempts']['2026-11-04']=1
        state['pending']={'status':'render-failed', 'plan':{'episode':18}}
        state['quota_recovery']={'date':'2026-11-04','not_before':'2026-11-05T07:00:00+00:00'}
        self.assertFalse(m.due(state, CONFIG, datetime(2026,11,5,6,30,tzinfo=timezone.utc))[0])
        self.assertTrue(m.due(state, CONFIG, datetime(2026,11,5,7,1,tzinfo=timezone.utc))[0])
        self.assertEqual(state['pending']['plan']['episode'],18)

    def test_unresolved_send_never_restarts_production(self):
        state=m.new_state();state['pending']={'status':'dispatching'}
        self.assertEqual(m.due(state, CONFIG, datetime(2026,11,5,8,tzinfo=timezone.utc))[1], 'delivery-needs-reconciliation')

    def test_unverified_allowance_stops_before_start_and_before_any_story_or_bot_call(self):
        import cinematic_budget as budget
        state=m.new_state()
        with patch.object(m,'load_json',side_effect=[CONFIG,state]), patch.object(m,'checkpoint'), \
             patch.object(budget,'time_policy',return_value={'reserve_seconds':30}), \
             patch.object(budget,'preflight',return_value={'status':'unverified','can_admit_minimum_stage':False}), \
             patch.object(m,'make_plan') as plan, patch.object(m,'bot') as bot:
            m.production(force=True)
        self.assertEqual(state['attempts'],{})
        plan.assert_not_called();bot.assert_not_called()

    def test_budget_exhaustion_saves_pending_without_claiming_or_requesting_paid_credit(self):
        import cinematic_budget as budget
        state=m.new_state();plan=m.first_episode()
        with patch.object(m,'load_json',side_effect=[CONFIG,state]), patch.object(m,'checkpoint'), \
             patch.object(budget,'time_policy',return_value={'reserve_seconds':30}), \
             patch.object(budget,'preflight',return_value={'status':'verified','can_admit_minimum_stage':True}), \
             patch.object(m,'make_plan',return_value=plan),patch.object(m,'validate_plan'), \
             patch.object(m,'approved_credit') as approved,patch.object(m,'close_credit_attempt'), \
             patch.object(m,'render',side_effect=RuntimeError('quota: no included time')),patch.object(m,'bot') as bot:
            with self.assertRaisesRegex(RuntimeError,'quota'):m.production(force=True)
        approved.assert_not_called()
        self.assertEqual([call.args[0] for call in bot.call_args_list],['verify'])
        self.assertTrue(state['pending']['time_budget_blocked'])
        self.assertEqual(state['pending']['status'],'render-failed')
        self.assertEqual(sum(state['attempts'].values()),1)
        self.assertNotIn('credit_approval_required',state['pending'])

    def test_deployed_config_wires_schedule_to_verified_allowance_only(self):
        import cinematic_budget as budget
        config=m.load_json(Path(__file__).parents[1]/'.cinematic-series.json')
        self.assertEqual(m.due(m.new_state(),config,datetime(2026,11,5,6,29,tzinfo=timezone.utc))[1],'before-daily-slot')
        with patch.dict('os.environ',{'HF_TOKEN':'account'}), patch.object(budget,'read_quota',return_value=100):
            result=budget.preflight()
        self.assertTrue(result['strict_time_budget'])
        self.assertFalse(result['can_admit_minimum_stage'])
        self.assertIsNone(result['fallback'])


if __name__ == '__main__':unittest.main()

class ExplicitOwnerRequestTests(unittest.TestCase):
    def test_extra_request_is_scoped_single_use_and_never_automatic(self):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        from cinematic_daily import owner_included_slot,daily_slot
        now=datetime(2026,11,8,12,tzinfo=ZoneInfo('Europe/Berlin'))
        grant={'id':'owner-test-20261108','episode':20,'story_id':'exact-story','berlin_day':'2026-11-08','expires_at':'2026-11-08T23:00:00+00:00','included_only':True}
        config={'schedule_mode':'daily-berlin-budget','timezone':'Europe/Berlin','daily_episodes':1,'time':'07:30','time_budget':{'mode':'verified-included-only'},'next_story':{'story_id':'exact-story'},'owner_included_request':grant}
        state={'next_episode':20,'attempts':{'2026-11-08':1},'deliveries':{'2026-11-08':19},'pending':None}
        self.assertFalse(daily_slot(state,config,now,True)[0])
        self.assertIsNone(owner_included_slot(state,config,now,False))
        accepted=owner_included_slot(state,config,now,True)
        self.assertEqual(accepted,(True,'explicit-owner-included-request','2026-11-08#owner-test-20261108'))
        state['attempts'][accepted[2]]=1
        self.assertIsNone(owner_included_slot(state,config,now,True))
        self.assertEqual(state['attempts']['2026-11-08'],1)
        state['attempts'].pop(accepted[2]);state['pending']={'status':'dispatching','plan':{'story_id':'exact-story'}}
        self.assertIsNone(owner_included_slot(state,config,now,True))
        state['pending']=None
        for key,value in [('episode',21),('story_id','another-story'),('berlin_day','2026-11-09'),('expires_at','2026-11-08T09:00:00+00:00'),('included_only',False)]:
            old=grant[key];grant[key]=value
            self.assertIsNone(owner_included_slot(state,config,now,True))
            grant[key]=old
