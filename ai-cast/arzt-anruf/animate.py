import hashlib,json,os,pathlib,shutil,subprocess,urllib.request
from gradio_client import Client,handle_file
root=pathlib.Path('renders/arzt-anruf');takes=root/'short-takes';takes.mkdir(exist_ok=True)
events=json.loads((root/'timing.json').read_text())
request=json.loads(pathlib.Path('.arzt-anruf-motion.json').read_text())
token=os.environ['HF_TOKEN']
for n in request['clips']:
 start=(n-1)*5;audio=root/f'condition-short-{n:02d}.wav'
 subprocess.run(['ffmpeg','-v','error','-y','-ss',str(start),'-i',str(root/'conditioning.wav'),'-t','5','-ar','24000','-ac','1',str(audio)],check=True)
 directions=[]
 for e in events:
  if e['speech_end']<=start or e['speech_start']>=start+5:continue
  begin=max(0,e['speech_start']-start);end=min(5,e['speech_end']-start)
  if e['role']=='reception':directions.append(f'{begin:.1f}-{end:.1f}s: both listen, mouths closed.')
  else:
   who='left woman' if e['role']=='learner' else 'right man'
   directions.append(f'{begin:.1f}-{end:.1f}s: only {who} speaks; the other listens with closed lips.')
 action='The woman is nervous and hesitant.' if start<12 else 'Small supportive nods and restrained gestures.'
 if 12<=start<24:action='The man gently points to the notebook; the woman nods.'
 if 24<=start<48:action='They use the phone flat on the table in speakerphone mode. They never pick it up.'
 if start>=48:action='The woman gradually looks relieved. A small natural smile.'
 prompt='Locked shot. Warm 2D storybook illustration animated with subtle natural movement. EXACTLY TWO adults seated at the kitchen table: woman in mustard cardigan LEFT, man in blue RIGHT. Same kitchen, same framing, single phone and notebook on the table. Nobody in foreground. '+action+' '+' '.join(directions)+' Stable eyes, small mouth shapes, preserve the background and both people throughout all frames. Continuous ongoing scene.'
 negative='third person, foreground person, other people, subtitles, text, letters, logo, watermark, title, end card, ending, fade, white screen, blank screen, transition, camera movement, scene cut, extra phone, extra hands, distorted face, huge mouth'
 seed=3610+n
 sig=hashlib.sha256((prompt+negative+str(seed)).encode()+audio.read_bytes()).hexdigest()
 receipt=takes/f'clip-{n:02d}.json';video=takes/f'clip-{n:02d}.mp4'
 if receipt.exists():
  record=json.loads(receipt.read_text())
  if record.get('signature')!=sig:raise ValueError('Cached signature mismatch')
  if record.get('status')=='uncertain':raise ValueError('Uncertain earlier submission; no replay')
  if video.exists() and record.get('sha256')==hashlib.sha256(video.read_bytes()).hexdigest():
   shutil.copyfile(video,root/video.name);print('Reused',n,flush=True);continue
 req=urllib.request.Request('https://huggingface.co/api/spaces/zero-gpu/quota',headers={'Authorization':'Bearer '+token})
 with urllib.request.urlopen(req,timeout=30) as r:q=json.load(r)
 remaining=q.get('current')
 credential=token if isinstance(remaining,(int,float)) and remaining>=115 else False
 route='included' if credential else 'explicit-anonymous-free'
 client=Client('multimodalart/ltx2-audio-to-video',token=credential)
 print('Eligible free route:',route,flush=True)
 record={'clip':n,'signature':sig,'status':'uncertain','included_quota_before':remaining,'gpu_declared_seconds':85,'paid_route':False,'route':route,'seed':seed}
 receipt.write_text(json.dumps(record,indent=2))
 try:
  result=client.predict(handle_file('ai-cast/arzt-anruf/reference.png'),handle_file(str(audio)),prompt,negative,5.0,seed,api_name='/generate')
  output=result[0]
  if isinstance(output,dict):output=output.get('video',output).get('path') if isinstance(output.get('video',output),dict) else output.get('video')
  shutil.copyfile(output,video);shutil.copyfile(video,root/video.name)
  record.update(status='generated',sha256=hashlib.sha256(video.read_bytes()).hexdigest())
  print('Generated native five-second clip',n,flush=True)
 finally:receipt.write_text(json.dumps(record,indent=2))
