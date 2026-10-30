"""Owner-authenticated MuseTalk client. Credentials stay in the server environment."""
import json,os,signal,sys,tempfile,time,subprocess,wave,math,shutil
from pathlib import Path
from gradio_client import Client,handle_file

job=None
def cancel(signum,frame):
 if job:
  try:job.cancel()
  except Exception:pass
 raise SystemExit(130)
signal.signal(signal.SIGTERM,cancel)
def execute(client,api,*args):
 global job
 job=client.submit(*args,api_name=api)
 try:return job.result(timeout=240)
 finally:job=None
def main():
 data=json.loads(sys.stdin.read());space=data['space']
 if space!='afgtakrun/aryana-live-lipsync':raise ValueError('Unapproved worker')
 token=os.environ.get('ARYANA_LIPSYNC_TOKEN') or os.environ.get('ARYANA_STATE_TOKEN')
 if not token:raise ValueError('Worker access is not configured')
 started=time.monotonic();client=Client(space,token=token,verbose=False,download_files='/tmp/aryana-lip-downloads')
 status=client.predict(api_name='/status')
 if status.get('reference_sha256')!=data['reference_sha256']:raise ValueError('Worker reference does not match this host')
 if not status.get('ready'):execute(client,'/prepare')
 if data['action']=='prepare':return {'ok':True,'ready':True,'wall_seconds':time.monotonic()-started}
 audio=Path(data['audio']);output=Path(data['output'])
 with tempfile.TemporaryDirectory(prefix='aryana-live-lip-') as temp:
  work=Path(temp);full=work/'full.wav'
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(audio),'-ar','16000','-ac','1','-c:a','pcm_s16le',str(full)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  with wave.open(str(full),'rb') as w:
   sr=w.getframerate();count=w.getnframes();pcm=w.readframes(count)
  duration=count/sr
  if not 0<duration<=30:raise ValueError('Audio is too long')
  parts=[];core_samples=6*sr;context=int(.25*sr)
  for number,start in enumerate(range(0,count,core_samples)):
   end=min(count,start+core_samples);left=max(0,start-context);right=min(count,end+context)
   segment=work/('audio-%02d.wav'%number)
   with wave.open(str(segment),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(pcm[left*2:right*2])
   value,metrics=execute(client,'/speak',handle_file(str(segment)),(float(data.get('offset_seconds',0))+left/sr)%60)
   if isinstance(value,dict):value=value.get('path')
   if metrics.get('edited_region')!='mouth_only':raise ValueError('Unexpected render mode')
   part=work/('part-%02d.mp4'%number)
   subprocess.run(['ffmpeg','-v','error','-y','-i',str(value),'-ss',str((start-left)/sr),'-t',str((end-start)/sr),'-an','-c:v','libx264','-preset','veryfast','-crf','20','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-movflags','+faststart',str(part)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
   parts.append(part)
  listing=work/'parts.txt';listing.write_text(''.join("file '"+str(p)+"'\n" for p in parts))
  subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(listing),'-i',str(audio),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-movflags','+faststart',str(output)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  media=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(output)]))
  seconds=float(media['format']['duration'])
  if abs(seconds-duration)>.2:raise ValueError('Output timing mismatch')
  return {'ok':True,'video_seconds':seconds,'has_audio':any(s['codec_type']=='audio' for s in media['streams']),'reference_sha256':data['reference_sha256'],'segments':len(parts),'wall_seconds':time.monotonic()-started}
try:
 result=main();print('ARYANA_LIPSYNC_RESULT '+json.dumps(result),flush=True)
except Exception:
 print('ARYANA_LIPSYNC_RESULT '+json.dumps({'ok':False,'code':'worker_failed'}),flush=True);sys.exit(1)
