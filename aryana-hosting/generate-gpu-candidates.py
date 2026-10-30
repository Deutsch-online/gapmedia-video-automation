"""Generate at most three bounded previews using included PRO allowance only."""
import hashlib,json,math,os,re,shutil,subprocess,time,urllib.request
from pathlib import Path
from gradio_client import Client,handle_file
root=Path.cwd();out=root/'aryana-hosting/gpu-candidates';out.mkdir(parents=True,exist_ok=True)
token=os.environ['HF_TOKEN'];report={'paid_requested':False,'generation_limit':3,'clips':[]};start=time.time()
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
report['quota_before']=quota();save()
image=root/'aryana-hosting/assets/aryana.png';assert hashlib.sha256(image.read_bytes()).hexdigest()=='54683d700d019ea2a7ba0b96f81438276d422fa82db9c2150d85a07dae72a6a0'
silence=out/'idle-driving.wav';subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t','6',str(silence)],check=True)
plans=[('intro',root/'aryana-hosting/assets/introduction.mp3','A single adult woman speaking warmly to camera. Accurate lip movement from the supplied audio, natural subtle blinking, stable facial identity. No other people, no camera motion.'),('idle',silence,'A single adult woman silently waiting and listening to the camera, with her lips closed. Natural subtle breathing, gentle blinking and tiny head movements, a warm relaxed expression. She is not talking. Stable facial identity, fixed camera, no text.'),('thanks',root/'aryana-hosting/assets/reaction-thanks.mp3','A single adult woman saying a short thank you warmly to camera. Accurate lip movement from the supplied audio, natural subtle blinking, gentle smile, stable facial identity. No other people, no camera motion.')]
try:
 client=Client('victor/LongCat-Video-Avatar-1.5',token=token,verbose=False,download_files='/tmp/aryana-gpu-downloads')
 for name,audio,prompt in plans:
  remaining=quota()
  # The app requests an xlarge 240-second slot, charged as up to 480 quota seconds.
  # Preserve 120 additional included seconds; never use previously approved paid episodes.
  if remaining<600:
   report['stopped_reason']='included_quota_below_600_seconds';break
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
