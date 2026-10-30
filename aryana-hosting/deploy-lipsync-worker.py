"""Provision one private ZeroGPU worker; never request hourly paid hardware."""
import hashlib,json,os,subprocess,time,shutil,traceback
from pathlib import Path
from huggingface_hub import HfApi,CommitOperationAdd
from huggingface_hub.utils import HfHubHTTPError
from gradio_client import Client,handle_file

root=Path('aryana-hosting');source=root/'lipsync-worker';out=root/'lipsync-worker-trial';out.mkdir(parents=True,exist_ok=True)
api=HfApi(token=os.environ['HF_TOKEN']);report={'status':'checking','purchase_requested':False,'hourly_gpu_requested':False,'funding':'existing_hf_credits','max_test_reserved_credit_usd':0.7,'tests':[]}
def save():
 (out/'report.json').write_text(json.dumps(report,indent=2));print('ARYANA_LIPSYNC_WORKER '+json.dumps(report),flush=True)
try:
 who=api.whoami()
 if who.get('name')!='afgtakrun' or not who.get('isPro'):raise RuntimeError('Verified PRO owner required')
 repo='afgtakrun/aryana-live-lipsync';created=False
 try:
  info=api.space_info(repo)
  if 'aryana-neural-worker' not in (info.tags or []):raise RuntimeError('Existing destination is not this worker')
 except HfHubHTTPError as e:
  if e.response.status_code!=404:raise
  api.create_repo(repo,repo_type='space',space_sdk='gradio',private=True);created=True
 # ZeroGPU consumes only the account's existing allowance/credits per invocation.
 api.request_space_hardware(repo,hardware='zero-a10g')
 lock={'musetalk':api.model_info('TMElyralab/MuseTalk').sha,'vae':api.model_info('stabilityai/sd-vae-ft-mse').sha,'whisper':api.model_info('openai/whisper-tiny').sha,'reference_sha256':hashlib.sha256((root/'assets/idle.mp4').read_bytes()).hexdigest()}
 (source/'model-lock.json').write_text(json.dumps(lock,indent=2))
 files={name:source/name for name in ['app.py','requirements.txt','packages.txt','README.md','NOTICE','model-lock.json']};files['reference.mp4']=root/'assets/idle.mp4'
 commit=api.create_commit(repo,repo_type='space',operations=[CommitOperationAdd(path_in_repo=name,path_or_fileobj=str(path)) for name,path in files.items()],commit_message='Install cached mouth-only Aryana speech worker '+os.environ['GITHUB_SHA'][:12])
 report.update(status='building',repo=repo,private=True,created=created,worker_commit=commit.oid,model_lock=lock);save()
 deadline=time.monotonic()+1200
 while time.monotonic()<deadline:
  runtime=api.get_space_runtime(repo);stage=str(runtime.stage)
  if stage in ['BUILD_ERROR','RUNTIME_ERROR','CONFIG_ERROR']:raise RuntimeError('Worker stage '+stage)
  if stage=='RUNNING' and runtime.raw.get('sha')==commit.oid:break
  time.sleep(8)
 else:raise RuntimeError('Worker build deadline exceeded')
 client=Client(repo,token=os.environ['HF_TOKEN'],verbose=False,download_files='/tmp/aryana-musetalk-downloads')
 started=time.time();ready=client.predict(api_name='/prepare')
 report.update(status='prepared',warmup_seconds=round(time.time()-started,2),preparation=ready);save()
 for name,voice,text in [('fa','fa-IR-DilaraNeural','لب‌هایم با صدایم هماهنگ است.'),('en','en-US-AvaNeural','This is a fresh live reply.')]:
  import edge_tts,asyncio
  audio=out/(name+'.mp3');asyncio.run(edge_tts.Communicate(text,voice).save(str(audio)))
  began=time.time();value,metrics=client.predict(handle_file(str(audio)),0 if name=='fa' else 15,api_name='/speak');elapsed=time.time()-began
  if isinstance(value,dict):value=value.get('path')
  video=out/(name+'.mp4');shutil.copyfile(value,video)
  media=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
  audio_duration=float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',str(audio)]))['format']['duration'])
  duration=float(media['format']['duration'])
  if abs(duration-audio_duration)>.2 or not any(s['codec_type']=='audio' for s in media['streams']):raise RuntimeError('Speech and rendered video duration mismatch')
  report['tests'].append({'language':name,'phrase':text,'roundtrip_seconds':round(elapsed,3),'audio_seconds':audio_duration,'video_seconds':duration,'metrics':metrics,'sha256':hashlib.sha256(video.read_bytes()).hexdigest()});save()
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(video),'-vf','fps=3,scale=192:-1,tile=6x2','-frames:v','1',str(out/(name+'-review.jpg'))],check=True)
 report.update(status='tested_for_review',worst_reply_roundtrip_seconds=max(x['roundtrip_seconds'] for x in report['tests']));save()
except Exception as e:
 report.update(status='failed',error_type=type(e).__name__,error=str(e).replace(os.environ.get('HF_TOKEN',''),'[REDACTED]')[:500]);save();raise
