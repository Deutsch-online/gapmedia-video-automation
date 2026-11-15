import copy,importlib.util,json,sys,tempfile,unittest
from datetime import datetime,timedelta,timezone
from pathlib import Path
from unittest.mock import Mock,patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'ai-cast'))
import cinematic_readiness as r
import cinematic_budget as budget


class ReadinessTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
        self.now=datetime(2026,11,15,7,tzinfo=timezone.utc)

    def test_fresh_real_observations_are_not_claimed_as_proven_causes(self):
        feedback={'status':'available','updated_at':self.now.isoformat(),'evidence_level':'observational',
            'experiments':[{'change':'Show the spoon immediately','measure':'Same-age completion','evidence':'hypothesis'}],
            'reference_candidates':[{'id':'real-post','views':503,'relative_to_median':1.1}]}
        fetch=Mock(side_effect=[{},feedback])
        review=r.collect_review(fetch,self.now,self.root)
        self.assertEqual(review['status'],'available');self.assertFalse(review['causal_explanation_verified'])
        self.assertFalse(review['visual_reviewed']);self.assertEqual(review['prior_post_observations'][0]['views'],503)
        self.assertEqual(r.collect_review(fetch,self.now,self.root),review);self.assertEqual(fetch.call_count,2)

    def test_missing_or_stale_analytics_are_recorded_without_invented_results(self):
        for suffix,fetch in [('missing',Mock(side_effect=RuntimeError('unavailable'))),
                             ('stale',Mock(side_effect=[{}, {'status':'available','updated_at':(self.now-timedelta(days=2)).isoformat()}]))]:
            result=r.collect_review(fetch,self.now,self.root/suffix)
            self.assertTrue(result['attempted']);self.assertEqual(result['status'],'unavailable')
            self.assertEqual(result['prior_post_observations'],[]);self.assertFalse(result['causal_explanation_verified'])

    def samples(self):
        r.save(self.root/'run.json',{'entries':[{'status':'completed','maximum_seconds':units,'charged_bound':cost}
                    for units,cost in [(120,50)]*3+[(480,170)]*9]})

    def test_whole_episode_fit_includes_last_request_headroom_and_reserve(self):
        self.samples();work={'images':2,'videos':9,'cached_videos':0}
        value=r.forecast(work,2400,self.root)
        self.assertTrue(value['admitted']);self.assertEqual(value['reserve_units'],30)
        self.assertAlmostEqual(value['required_units_with_headroom'],2262)
        self.assertFalse(value['full_episode_guaranteed'])
        self.assertFalse(r.forecast(work,2200,self.root)['admitted'])

    def test_no_history_uses_published_bounds_and_cpu_finish_needs_no_gpu_budget(self):
        self.assertFalse(r.forecast({'images':2,'videos':9},2400,self.root)['admitted'])
        finish=r.forecast({'images':0,'videos':0},0,self.root)
        self.assertTrue(finish['admitted']);self.assertEqual(finish['required_units_with_headroom'],0)

    def test_direct_render_cannot_skip_the_matching_daily_review_and_budget_proof(self):
        config={'production_readiness':{'enabled':True,'from_episode':24}}
        plan={'episode':24,'story_id':'exact-story'};path=self.root/'proof.json'
        with patch.object(r,'proof_path',return_value=path):
            with self.assertRaises(RuntimeError):r.assert_prepared(plan,config)
            r.save(path,{'plan_sha':r.digest(plan),'day':r.berlin_day(),'review_attempted':True,'admitted':True})
            r.assert_prepared(plan,config)
            with self.assertRaises(RuntimeError):r.assert_prepared({**plan,'changed':True},config)

    def test_insufficient_whole_episode_forecast_never_claims_a_production_start(self):
        spec=importlib.util.spec_from_file_location('readiness_series',ROOT/'ai-cast/cinematic-series.py')
        m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
        config=m.load_json(m.CONFIG);config['production_readiness']={'enabled':True,'from_episode':24}
        state=m.new_state();state['next_episode']=24
        plan=copy.deepcopy(json.loads((ROOT/'ai-cast/lina-oma-story-bank.json').read_text())['stories'][1]);plan['episode']=24
        review={'day':'2026-11-15','status':'unavailable','attempted':True,'next_test':{'change':'one test'}}
        quota={'status':'verified','remaining_seconds':2400,'can_admit_minimum_stage':True}
        with patch.object(m,'load_json',side_effect=lambda path,*args:config if path==m.CONFIG else state), \
             patch.object(m,'due',return_value=(True,'daily','2026-11-15')),patch.object(m,'make_plan',return_value=plan), \
             patch.object(m,'validate_plan'),patch.object(m,'bot'),patch.object(m,'checkpoint'), \
             patch.object(m,'render') as render,patch.object(r,'collect_review',return_value=review), \
             patch.object(r,'prepare',return_value={'admitted':False}),patch.object(budget,'time_policy',return_value={'mode':'verified-included-only'}), \
             patch.object(budget,'preflight',return_value=quota),patch.object(budget,'read_reset_at',return_value=self.now+timedelta(days=1)):
            m.production(force=True)
        self.assertEqual(state['attempts'],{});render.assert_not_called()
        self.assertTrue(state['pending']['time_budget_blocked'])


if __name__=='__main__':unittest.main()
