"""Prepare a reviewed one-minute candidate using existing HF credits only."""
import hashlib,json,math,os,re,shutil,subprocess,time,urllib.request
from pathlib import Path
from gradio_client import Client,handle_file

root=Path.cwd();out=root/'aryana-hosting/motion-minute-v3';out.mkdir(parents=True,exist_ok=True)
token=os.environ['HF_TOKEN'];cfg=json.loads((root/'aryana-hosting/motion-request.json').read_text())
assert cfg.get('use_existing_hf_credits') is True and cfg.get('purchase_credits') is False
assert cfg.get('max_generations')==16 and cfg.get('max_credit_usd')==4
report={'funding':'existing_hf_credits','purchase_requested':False,'auto_deploy':False,'max_credit_usd':4,'max_generations':16,'attempts':[],'accepted':[],'status':'building'}
def save():
 (out/'report.json').write_text(json.dumps(report,indent=2));print('ARYANA_MOTION '+json.dumps(report),flush=True)
def get(path):
 with urllib.request.urlopen(urllib.request.Request('https://huggingface.co'+path,headers={'Authorization':'Bearer '+token}),timeout=30) as r:return json.load(r)
def analyze(path):
 subprocess.run(['python','aryana-hosting/analyze-motion.py',str(path)],check=True)
 return json.loads(Path(str(path)+'.analysis.json').read_text())
def accept(raw,name):
 stats=analyze(raw)
 if stats['missing_face_frames'] or stats['duration']<3:raise RuntimeError('Insufficient usable face motion')
 target=out/(name+'.mp4')
 elapsed=sum(x['seconds'] for x in report['accepted'])
 last_blink=max((x.get('last_blink_end',-8) for x in report['accepted']),default=-8)
 edit_env=dict(os.environ,ARYANA_KEEP_BLINK='1' if elapsed-last_blink>=8 else '0')
 subprocess.run(['python','aryana-hosting/edit-motion-blinks.py',str(raw),str(target)],check=True,env=edit_env)
 stats=analyze(target)
 if stats['missing_face_frames'] or len(stats['blink_events'])>1 or any(e['duration']>0.4 for e in stats['blink_events']):raise RuntimeError('Edited blink quality gate failed')
 report['accepted'].append({'file':target.name,'seconds':stats['duration'],'blink_events':len(stats['blink_events']),'blinks_per_minute':stats['blinks_per_minute'],'last_blink_end':elapsed+stats['blink_events'][-1]['start']+stats['blink_events'][-1]['duration'] if stats['blink_events'] else last_blink,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
 save()
def error_text(e):
 s=str(e).replace(token,'[REDACTED]');return re.sub(r'https?://\S+','[URL]',s)[:400]

identity=get('/api/whoami-v2')
if identity.get('name')!='afgtakrun' or not identity.get('isPro'):raise RuntimeError('Expected PRO account not verified')
report['quota_before']=get('/api/spaces/zero-gpu/quota').get('current')
with urllib.request.urlopen('https://huggingface.co/spaces/Lightricks/LTX-2.5/raw/main/app.py',timeout=30) as r:source=r.read()
if hashlib.sha256(source).hexdigest()!='9cb16da2545228511423c0d3394519445ddc035f9e7a3e4410eddf04afbeecdb':raise RuntimeError('Reviewed GPU implementation changed')
# Fixed 896x512 input, conv decoder, fixed 121 frames.
# Reviewed reservation: int(30 + pixels/1_500_000 + 8) = 75 xlarge seconds.
reservation=int(min(400,max(60,30+896*512*121/1500000+8)))
report['max_reserved_credit_per_attempt_usd']=reservation*2/600
if cfg['max_generations']*report['max_reserved_credit_per_attempt_usd']>cfg['max_credit_usd']:raise RuntimeError('Credit ceiling would be exceeded')
image=root/'aryana-hosting/assets/aryana.png'
if hashlib.sha256(image.read_bytes()).hexdigest()!='54683d700d019ea2a7ba0b96f81438276d422fa82db9c2150d85a07dae72a6a0':raise RuntimeError('Reference changed')
existing=root/'aryana-hosting/ltx25-candidates/idle-ltx25-probe.mp4'
if hashlib.sha256(existing.read_bytes()).hexdigest()!='81902439e25666909afc8464ae67acf74ea76828eb2351f61a42e95c8941fa4b':raise RuntimeError('Reviewed existing clip changed')
previous_dir=root/'aryana-hosting/motion-minute-v2'
previous_report=json.loads((previous_dir/'report.json').read_text())
for clip in previous_report['accepted']:
 source_clip=previous_dir/clip['file']
 if hashlib.sha256(source_clip.read_bytes()).hexdigest()!=clip['sha256']:raise RuntimeError('Approved checkpoint changed')
 shutil.copyfile(source_clip,out/clip['file']);report['accepted'].append(clip)
report['resumed_edited_seconds']=sum(x['seconds'] for x in report['accepted'])
save()
gestures=[
 'She makes one small nod, relaxes her shoulders and gives a restrained closed-mouth smile.',
 'She briefly glances a little to her left, returns her gaze to the lens, and rests calmly.',
 'She gently shifts her shoulders against the chair and tilts her head slightly, then straightens.',
 'She listens attentively, makes a tiny acknowledging nod and briefly smiles with closed lips.',
 'She briefly glances a little to her right, returns to the camera and relaxes her posture.',
 'She raises her eyebrows slightly in interest, makes a gentle nod and returns to a neutral expression.',
 'She subtly adjusts her seated posture, breathes naturally and gives a soft closed-mouth smile.',
 'She gently tilts her head to the other side, listens calmly, then faces straight forward.',
 'She makes a small relaxed shoulder adjustment, a brief nod and an attentive steady gaze.',
 'She listens with a mild smile, briefly looks aside and returns her gaze directly to the lens.',
 'She naturally breathes, slightly straightens her back, smiles softly and relaxes again.',
 'She makes a tiny nod of acknowledgment and a small shoulder shift, keeping a calm expression.'
]
base='A continuous photoreal camera recording of this exact adult woman seated in this same teal chair, wearing this same teal hoodie. Preserve her facial identity, proportions, hairstyle and clothing. Locked eye-level camera, constant head-to-waist framing and lighting. She listens silently with relaxed closed lips and a steady attentive gaze. '
ending=' Gentle restrained motion, relaxed open eyes. Finish with her head upright, shoulders relaxed, and gaze forward in the original pose.'
client=Client('Lightricks/LTX-2.5',token=token,verbose=False,download_files='/tmp/aryana-minute-downloads')
failures=0
for i,gesture in enumerate((gestures*2)[:16]):
 if sum(x['seconds'] for x in report['accepted'])>=66:break
 began=time.time();job=None;name='take-%02d'%(i+11)
 try:
  job=client.submit(base+gesture+ending,handle_file(str(image)),896,512,5.0,15403+i*173,'conv',False,False,False,api_name='/run')
  result=job.result(timeout=600);value=result[0] if isinstance(result,(tuple,list)) else result
  if isinstance(value,dict):value=value.get('video') or value.get('path')
  if isinstance(value,dict):value=value.get('path')
  raw=out/(name+'-raw.mp4')
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(value),'-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(raw)],check=True)
  accept(raw,name)
  report['attempts'].append({'take':name,'status':'accepted','wall_seconds':round(time.time()-began,2)})
 except Exception as e:
  if job:
   try:job.cancel()
   except Exception:pass
  failures+=1;report['attempts'].append({'take':name,'status':'failed','error':error_text(e),'wall_seconds':round(time.time()-began,2)})
  if failures>=4:report['stopped_reason']='four_failed_candidates_no_more_credit_spending';save();break
 save()
total=sum(x['seconds'] for x in report['accepted']);report['unique_edited_source_seconds']=round(total,3)
if total>=66:
 files=report['accepted'];args=['ffmpeg','-v','error','-y','-filter_complex_threads','1']
 for x in files:args+=['-i',str(out/x['file'])]
 filters=[];previous='0:v';running=files[0]['seconds']
 for i,x in enumerate(files[1:],1):
  label='j'+str(i);offset=running-0.125
  filters.append('['+previous+']['+str(i)+':v]xfade=transition=fade:duration=0.125:offset='+str(offset)+'['+label+']')
  previous=label;running+=x['seconds']-0.125
 final=out/'idle-minute.mp4'
 subprocess.run(args+['-filter_complex',';'.join(filters),'-map','['+previous+']','-t','60','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(final)],check=True)
 stats=analyze(final)
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(final),'-vf','fps=1/5,scale=192:-1,tile=6x2','-frames:v','1',str(out/'minute-review.jpg')],check=True)
 report['final']={'file':final.name,'duration':stats['duration'],'blink_events':len(stats['blink_events']),'blinks_per_minute':stats['blinks_per_minute'],'missing_face_frames':stats['missing_face_frames'],'sha256':hashlib.sha256(final.read_bytes()).hexdigest()}
 report['status']='ready_for_visual_review' if 59.9<=stats['duration']<=60.1 and stats['missing_face_frames']==0 and stats['blinks_per_minute']<=16 else 'final_quality_gate_failed'
else:report['status']='insufficient_accepted_motion_no_deployment'
report['quota_after']=get('/api/spaces/zero-gpu/quota').get('current');save()
