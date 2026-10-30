import asyncio,hashlib,json,os,re,subprocess,time,urllib.request
from pathlib import Path
from gradio_client import Client,handle_file
import edge_tts

root=Path('aryana-hosting');out=root/'neural-lipsync-trial';out.mkdir(parents=True,exist_ok=True)
token=os.environ['HF_TOKEN'];report={'generation_limit':1,'funding':'existing_hf_credits','purchase_requested':False,'max_reserved_credit_usd':0.30,'status':'preparing','on_air':False}
def save():
 (out/'report.json').write_text(json.dumps(report,indent=2));print('ARYANA_NEURAL_LIPSYNC '+json.dumps(report),flush=True)
def get(path):
 with urllib.request.urlopen(urllib.request.Request('https://huggingface.co'+path,headers={'Authorization':'Bearer '+token}),timeout=25) as r:return json.load(r)
who=get('/api/whoami-v2')
if who.get('name')!='afgtakrun' or not who.get('isPro'):raise RuntimeError('Expected owner PRO access required')
with urllib.request.urlopen('https://huggingface.co/spaces/fffiloni/LatentSync/raw/main/app.py',timeout=25) as r:source=r.read()
if hashlib.sha256(source).hexdigest()!='7931900cbf9510fd147a1882200ade849df12bc42b9c71a1fccaf46523c1fed2':raise RuntimeError('Reviewed GPU service changed')
audio=out/'fresh-phrase.mp3';text='لب‌هایم با صدایم هماهنگ است.'
asyncio.run(edge_tts.Communicate(text,'fa-IR-DilaraNeural').save(str(audio)))
audio_seconds=float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',str(audio)]))['format']['duration'])
if audio_seconds>7.5:raise RuntimeError('Test sentence exceeds model input limit')
video=out/'source.mp4'
subprocess.run(['ffmpeg','-v','error','-y','-i',str(root/'assets/idle.mp4'),'-t',str(audio_seconds+.08),'-r','25','-an','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(video)],check=True)
report.update(status='submitting',audio_seconds=audio_seconds,phrase=text,quota_before=get('/api/spaces/zero-gpu/quota').get('current'));save()
job=None;started=time.time()
try:
 client=Client('fffiloni/LatentSync',token=token,verbose=False,download_files='/tmp/aryana-neural-downloads')
 job=client.submit({'video':handle_file(str(video))},handle_file(str(audio)),api_name='/generate_lip_sync_video')
 value=job.result(timeout=300)
 if isinstance(value,(tuple,list)):value=value[0]
 if isinstance(value,dict):value=value.get('video') or value.get('path')
 if isinstance(value,dict):value=value.get('path')
 target=out/'result.mp4'
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(value),'-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',str(target)],check=True)
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(target)]))
 report.update(status='generated_for_review',wall_seconds=round(time.time()-started,2),video_seconds=float(info['format']['duration']),has_audio=any(s['codec_type']=='audio' for s in info['streams']),sha256=hashlib.sha256(target.read_bytes()).hexdigest())
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(target),'-vf','fps=3,scale=192:-1,tile=6x2','-frames:v','1',str(out/'review.jpg')],check=True)
except Exception as error:
 if job:
  try:job.cancel()
  except Exception:pass
 detail=re.sub(r'https?://\S+','[URL]',str(error).replace(token,'[REDACTED]'))[:450]
 report.update(status='failed',wall_seconds=round(time.time()-started,2),error=detail)
finally:
 report['quota_after']=get('/api/spaces/zero-gpu/quota').get('current');save()
