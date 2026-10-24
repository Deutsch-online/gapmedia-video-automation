import importlib.util,json,os,sys,tempfile,types,unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('effects',Path(__file__).with_name('generate_hf.py'));effects=importlib.util.module_from_spec(spec);spec.loader.exec_module(effects)
PLAN=json.loads(Path(__file__).with_name('request.json').read_text())
class Response:
 def __enter__(self):return self
 def __exit__(self,*args):pass
 def read(self):return b'{}'
class Tests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.old=os.getcwd();os.chdir(self.tmp.name);Path('live-effects').mkdir();Path('live-effects/request.json').write_text(json.dumps(PLAN))
 def tearDown(self):os.chdir(self.old);self.tmp.cleanup()
 def run_with(self,fn):
  with patch.dict(os.environ,{'HF_TOKEN':'test-placeholder','GITHUB_RUN_ATTEMPT':'1','GITHUB_RUN_ID':'123'}),patch.dict(sys.modules,{'huggingface_hub':types.SimpleNamespace(InferenceClient=lambda **kw:types.SimpleNamespace(text_to_video=fn))}),patch.object(effects.urllib.request,'urlopen',return_value=Response()):effects.main()
 def test_exactly_four_and_completed_cache_is_reused(self):
  calls=[]
  self.run_with(lambda *a,**kw:calls.append(kw) or b'x'*10001);self.assertEqual(len(calls),4)
  self.run_with(lambda *a,**kw:self.fail('Completed clip resubmitted'))
  self.assertTrue(all(c['num_frames']==81 for c in calls))
 def test_unknown_outcome_stops_batch_and_cannot_resubmit(self):
  calls=[]
  def fail(*a,**kw):calls.append(1);raise TimeoutError()
  with self.assertRaises(RuntimeError):self.run_with(fail)
  with self.assertRaises(RuntimeError):self.run_with(fail)
  self.assertEqual(calls,[1])
 def test_wider_scope_rejected(self):
  plan=json.loads(json.dumps(PLAN));plan['max_billable_calls']=5
  with self.assertRaises(ValueError):effects.validate(plan)
if __name__=='__main__':unittest.main()
