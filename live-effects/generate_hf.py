"""One explicitly authorized batch; never retry a submission with an unknown outcome."""
import hashlib,json,os,sys,urllib.request
from datetime import datetime,timezone
from pathlib import Path

IDS={'ice-dragon','fire-dragon'}
MODEL='Wan-AI/Wan2.2-I2V-A14B'
def now(): return datetime.now(timezone.utc).isoformat()
def validate(plan):
 if plan.get('request_id')!='live-crown-dragons-reference-20261024-v2' or plan.get('authorize_credit') is not True: raise ValueError('Missing scoped credit authorization')
 if plan.get('max_billable_calls')!=2 or plan.get('num_frames')!=81: raise ValueError('Unexpected batch scope')
 clips=plan.get('clips',[])
 if len(clips)!=2 or {c['id'] for c in clips}!=IDS: raise ValueError('Exactly two reference corrections required')
 if any(not c.get('prompt') or len(c['prompt'])>6000 for c in clips): raise ValueError('Invalid prompt')
 return plan

def main():
 plan=validate(json.loads(Path('live-effects/request.json').read_text()))
 root=Path('renders/live-effects')/plan['request_id'];root.mkdir(parents=True,exist_ok=True)
 digest=hashlib.sha256(json.dumps(plan,sort_keys=True).encode()).hexdigest()
 token=os.environ.get('HF_TOKEN','')
 if not token: raise RuntimeError('HF_TOKEN is absent from this GitHub Actions run; no generation requested')
 req=urllib.request.Request('https://huggingface.co/api/whoami-v2',headers={'Authorization':'Bearer '+token})
 try:
  with urllib.request.urlopen(req,timeout=30) as response: json.load(response)
 except Exception as e: raise RuntimeError('Hugging Face authentication preflight failed: '+type(e).__name__) from None
 print('Hugging Face account authentication verified. Batch: two 81-frame reference correction clips; no Telegram delivery.',flush=True)
 if '--preflight' in sys.argv:return
 if os.environ.get('GITHUB_RUN_ATTEMPT','1')!='1':raise RuntimeError('Automatic re-submission is disabled on workflow reruns; reconcile receipts first')
 from huggingface_hub import InferenceClient
 client=InferenceClient(provider='fal-ai',api_key=token,timeout=900)
 for clip in plan['clips']:
  out=root/(clip['id']+'.mp4');receipt=root/(clip['id']+'.json')
  if receipt.exists():
   previous=json.loads(receipt.read_text())
   if previous.get('plan_sha')!=digest:raise RuntimeError('Cached clip scope differs; no generation requested')
   if previous.get('status')=='complete' and out.exists():
    print(clip['id']+': reuse completed provider clip',flush=True);continue
   raise RuntimeError(clip['id']+': previous submission outcome needs reconciliation; no automatic retry')
  record={'clip':clip['id'],'plan_sha':digest,'model':MODEL,'provider':'fal-ai via Hugging Face','started_at':now(),'status':'submitted','run_id':os.environ.get('GITHUB_RUN_ID')}
  receipt.write_text(json.dumps(record,indent=2))
  print(clip['id']+': submitting ONE authorized video request',flush=True)
  try:
   data=client.image_to_video(Path('live-effects/keyframes')/(clip['id']+'.jpg'),prompt=clip['prompt'],model=MODEL,num_frames=81,num_inference_steps=27,seed=clip['seed'],resolution='720p',frames_per_second=16,num_interpolated_frames=1,adjust_fps_for_interpolation=True,negative_prompt=plan['negative_prompt'])
   if not isinstance(data,bytes) or len(data)<10000:raise RuntimeError('Provider did not return a video file')
   temp=out.with_suffix('.mp4.part');temp.write_bytes(data);temp.replace(out)
   record.update(status='complete',completed_at=now(),bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
   receipt.write_text(json.dumps(record,indent=2));print(clip['id']+': provider video saved',flush=True)
  except Exception as e:
   status=getattr(getattr(e,'response',None),'status_code',None)
   record.update(status='unresolved',error_type=type(e).__name__,http_status=status,stopped_at=now())
   receipt.write_text(json.dumps(record,indent=2))
   raise RuntimeError(f'{clip["id"]}: provider stopped ({type(e).__name__}, HTTP {status}); no retry and no further clips submitted') from None
if __name__=='__main__':main()
