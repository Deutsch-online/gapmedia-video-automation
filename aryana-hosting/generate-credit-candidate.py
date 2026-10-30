"""One explicitly authorized prepaid HF-credit probe; no purchases or live deployment."""
import hashlib,json,math,os,re,shutil,subprocess,time,urllib.request
from pathlib import Path
from gradio_client import Client,handle_file
root=Path.cwd();out=root/'aryana-hosting/credit-candidates';out.mkdir(parents=True,exist_ok=True)
token=os.environ['HF_TOKEN'];report={'paid_requested':True,'funding':'existing_hf_credits','purchase_requested':False,'generation_limit':1,'upper_bound_credit_usd':0.80,'clips':[]};start=time.time()
def get(path):
 with urllib.request.urlopen(urllib.request.Request('https://huggingface.co'+path,headers={'Authorization':'Bearer '+token}),timeout=25) as r:return json.load(r)
def quota():
 value=get('/api/spaces/zero-gpu/quota').get('current')
 if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value):raise RuntimeError('Cannot verify included GPU allowance')
 return value
def save():
 (out/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
 print('ARYANA_GPU_PROGRESS '+json.dumps(report),flush=True)
identity=get('/api/whoami-v2')
if identity.get('name')!='afgtakrun' or not identity.get('isPro'):raise RuntimeError('Expected PRO account was not verified')
config=json.loads((root/'aryana-hosting/credit-request.json').read_text())
if config.get('use_existing_hf_credits') is not True or config.get('max_generations')!=1 or config.get('max_credit_usd')!=0.8 or config.get('purchase_credits') is not False:raise RuntimeError('Explicit bounded prepaid-credit request required')
# Verify the remote function still reserves at most 240 xlarge seconds before submitting.
import ast
with urllib.request.urlopen('https://huggingface.co/spaces/victor/LongCat-Video-Avatar-1.5/raw/main/app.py',timeout=25) as response:
 app_source=response.read().decode()
tree=ast.parse(app_source)
duration=next(n for n in ast.walk(tree) if isinstance(n,ast.FunctionDef) and n.name=='_check_duration')
returns=[n for n in ast.walk(duration) if isinstance(n,ast.Return)]
if len(returns)!=1 or not isinstance(returns[0].value,ast.Constant) or returns[0].value.value!=240:raise RuntimeError('Remote GPU duration changed; refused')
decorators=[d for n in ast.walk(tree) if isinstance(n,ast.FunctionDef) for d in n.decorator_list if isinstance(d,ast.Call) and isinstance(d.func,ast.Attribute) and d.func.attr=='GPU']
if not any(any(k.arg=='size' and isinstance(k.value,ast.Constant) and k.value.value=='xlarge' for k in d.keywords) and any(k.arg=='duration' and isinstance(k.value,ast.Name) and k.value.id=='_check_duration' for k in d.keywords) for d in decorators):raise RuntimeError('Remote GPU allocation changed; refused')
report['quota_before']=quota();save()
image=root/'aryana-hosting/assets/aryana.png';assert hashlib.sha256(image.read_bytes()).hexdigest()=='54683d700d019ea2a7ba0b96f81438276d422fa82db9c2150d85a07dae72a6a0'
silence=out/'idle-driving.wav';subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t','6',str(silence)],check=True)
plans=[('idle-credit-probe',silence,'The same adult woman seated in the same chair, listening silently with relaxed closed lips. Her eyes stay comfortably open with a steady attentive gaze. Gentle breathing, one tiny slow head turn and return, a faint closed-mouth smile. Consistent facial proportions, hairstyle, clothing and lighting, locked camera.')]
try:
 client=Client('victor/LongCat-Video-Avatar-1.5',token=token,verbose=False,download_files='/tmp/aryana-gpu-downloads')
 for name,audio,prompt in plans:
  remaining=quota()
  # The user explicitly authorized existing HF credits after included quota exhaustion.
  # One attempt only, no retries, no purchase or hardware upgrade calls.
  began=time.time();job=None
  try:
   job=client.submit(handle_file(str(image)),handle_file(str(audio)),prompt,'480p',42,'Clean speech (fast)','DBCache faster',api_name='/generate')
   result=job.result(timeout=600)
   value=result[0] if isinstance(result,(tuple,list)) else result
   if isinstance(value,dict):value=value.get('video') or value.get('path')
   if isinstance(value,dict):value=value.get('path')
   source=Path(value);target=out/(name+'.mp4')
   subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-an','-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(target)],check=True)
   probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(target)]))
   stream=next(s for s in probe['streams'] if s['codec_type']=='video')
   subprocess.run(['ffmpeg','-v','error','-y','-i',str(target),'-vf','fps=1,scale=270:-1,tile=6x1','-frames:v','1',str(out/(name+'-review.jpg'))],check=True)
   report['clips'].append({'name':name,'status':'generated','elapsed_seconds':round(time.time()-began,2),'duration':float(probe['format']['duration']),'width':stream['width'],'height':stream['height'],'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'remaining_seconds':quota()});save()
  except Exception as e:
   if job:
    try:job.cancel()
    except Exception:pass
   detail=str(e).replace(token,'[REDACTED]');detail=re.sub(r'https?://\S+','[URL]',detail)
   report['clips'].append({'name':name,'status':'failed','error':detail[:500],'elapsed_seconds':round(time.time()-began,2)});save();break
finally:
 silence.unlink(missing_ok=True);report['elapsed_seconds']=round(time.time()-start,2)
 try:report['quota_after']=quota()
 except Exception:report['quota_after']=None
 save()
