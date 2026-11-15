import copy,sys,unittest
from datetime import datetime,timedelta,timezone
from pathlib import Path
from unittest.mock import Mock
sys.path.insert(0,str(Path(__file__).parents[1]/'ai-cast'))
from paid_episode_completion import PaidCalls,verify_request,digest


class PaidFinalScopeTests(unittest.TestCase):
    def setUp(self):
        self.plan={'episode':23,'story_id':'lina-oma-water-spoon-holiday-v1','scenes':[{'de':'exact same final story'}]}
        self.request={'id':'owner-paid-test','authorization':'explicit-owner-paid-continuation','status':'approved',
            'episode':23,'story_id':self.plan['story_id'],'scenes':[8],'plan_sha':digest(self.plan),
            'max_calls':1,'max_request_units':480,'max_total_units':480,'purchase_credits':False,
            'expires_at':(datetime.now(timezone.utc)+timedelta(hours=1)).isoformat()}

    def guard(self):
        self.request.update(status='running',active_run='run:1')
        self.saved=[]
        return PaidCalls(self.request,'run:1',lambda:self.saved.append(copy.deepcopy(self.request)),lambda:{'base':2400,'current':502})

    def test_exact_single_clip_plan_and_expiration_are_required(self):
        verify_request(self.request,self.plan)
        for key,value in [('scenes',[7,8]),('max_total_units',481),('max_calls',2),('purchase_credits',True),('status','running')]:
            with self.assertRaises(RuntimeError):verify_request({**self.request,key:value},self.plan)
        with self.assertRaises(RuntimeError):verify_request(self.request,{**self.plan,'changed':True})
        with self.assertRaises(RuntimeError):verify_request({**self.request,'expires_at':datetime.now(timezone.utc).isoformat()},self.plan)

    def test_one_intent_is_saved_before_the_only_submission(self):
        guard=self.guard()
        def submit():
            self.assertEqual(self.saved[-1]['calls'][-1]['status'],'reserved')
            return 'result'
        self.assertEqual(guard.run(submit,480,(23,8)),'result')
        with self.assertRaises(RuntimeError):guard.run(submit,480,(23,8))
        self.assertEqual(len(self.request['calls']),1)

    def test_images_other_clips_and_other_runs_cannot_spend(self):
        guard=self.guard();submit=Mock()
        for units,scene in [(120,(23,8)),(480,(23,0)),(480,(22,8)),(720,(23,8)),(480,None)]:
            with self.assertRaises(RuntimeError):guard.run(submit,units,scene)
        self.request['active_run']='other:1'
        with self.assertRaises(RuntimeError):guard.run(submit,480,(23,8))
        submit.assert_not_called()

    def test_unknown_result_is_never_replayed(self):
        guard=self.guard();submit=Mock(side_effect=TimeoutError('unknown result'))
        with self.assertRaises(TimeoutError):guard.run(submit,480,(23,8))
        self.assertEqual(self.request['calls'][0]['status'],'failed-or-uncertain')
        with self.assertRaises(RuntimeError):guard.run(submit,480,(23,8))
        submit.assert_called_once()


if __name__=='__main__':unittest.main()
