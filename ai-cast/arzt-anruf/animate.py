import hashlib,json,os,pathlib,shutil,subprocess,urllib.request
from gradio_client import Client,handle_file
root=pathlib.Path('renders/arzt-anruf');takes=root/'takes';takes.mkdir(exist_ok=True)
events=json.loads((root/'timing.json').read_text())
request=json.loads(pathlib.Path('.arzt-anruf-motion.json').read_text())
token=os.environ['HF_TOKEN']
client=Client('multimodalart/ltx2-audio-to-video',token=token)
beats={
1:'The LEFT woman hesitates with worried eyebrows, looks at the phone on the table, speaks quietly to her friend. The RIGHT man listens with lips closed, then gently answers and nods. Subtle expressive acting, no exaggerated mouth.',
2:'The RIGHT man gently points to the notebook on the table while explaining. The LEFT woman listens, nods, picks up the existing pen carefully, and briefly responds. The notebook remains on the table.',
3:'The LEFT woman gently taps the single existing phone lying flat on the table and speaks toward it in speakerphone mode. The RIGHT man remains a silent supportive listener with closed mouth. During the silent portion both listen attentively to the phone; nobody else appears.',
4:'The LEFT woman looks briefly confused, politely asks a question toward the phone, listens silently, then gives a short answer. The RIGHT man is silent with closed lips throughout, watches her supportively. The phone stays flat on the table.',
5:'Both first listen quietly to the phone with lips closed. The LEFT woman then repeats the appointment time with growing relief and looks at the notebook. The RIGHT man speaks briefly near the end with a small reassuring smile. This is an ongoing conversation, without an ending transition.'
}
for n in request['scenes']:
 audio=root/f'condition-{n:02d}.wav'
 subprocess.run(['ffmpeg','-v','error','-y','-ss',str((n-1)*12),'-i',str(root/'conditioning.wav'),'-t','12','-ar','24000','-ac','1',str(audio)],check=True)
 times=[]
 for e in events:
  if e['scene']==n:
   if e['role']=='reception':times.append(f"At {e['speech_start']-(n-1)*12:.2f} to {e['speech_end']-(n-1)*12:.2f} seconds BOTH are listening silently with mouths closed.")
   else:
    who='LEFT woman' if e['role']=='learner' else 'RIGHT man'
    times.append(f"At {e['speech_start']-(n-1)*12:.2f} to {e['speech_end']-(n-1)*12:.2f} seconds only the {who} speaks, lips synchronized to the input audio.")
 prompt='Warm hand-painted 2D storybook animation in the exact same sunlit kitchen. The two adult friends remain seated at the wooden table, preserving their identities, clothing and exact screen sides. A single phone lies flat in speakerphone position, one notebook and one pen. Fixed camera, stable eyes, natural small facial movements and hand gestures. '+beats[n]+' '+' '.join(times)+' Keep every kitchen object, table, window, cupboard and plant visible through the LAST frame. Continuous single shot that looks like the middle of a scene. Clean blank surfaces and clothing.'
 negative='subtitles, captions, writing, text, lettering, logos, watermark, words, garbled symbols, fade out, fade to white, white screen, blank background, disappearing room, transition, scene cut, huge open mouth, crossed eyes, flicker, deformed face, extra fingers, additional phone, phone held to ear, standing up, third person'
 seed=3510+n
 signature=hashlib.sha256((prompt+negative+str(seed)).encode()+audio.read_bytes()+pathlib.Path('ai-cast/arzt-anruf/reference.png').read_bytes()).hexdigest()
 receipt=takes/f'raw-{n:02d}.json';video=takes/f'raw-{n:02d}.mp4'
 if receipt.exists():
  record=json.loads(receipt.read_text())
  if record.get('signature')!=signature:raise ValueError('Cached take signature mismatch')
  if record.get('status')=='uncertain':raise ValueError('Uncertain prior GPU submission; do not replay automatically')
  if record.get('status')=='generated' and video.exists() and record['sha256']==hashlib.sha256(video.read_bytes()).hexdigest():
   shutil.copyfile(video,root/video.name);print('Reused verified take',n,flush=True);continue
 req=urllib.request.Request('https://huggingface.co/api/spaces/zero-gpu/quota',headers={'Authorization':'Bearer '+token})
 with urllib.request.urlopen(req,timeout=30) as response:q=json.load(response)
 remaining=q.get('current')
 if not isinstance(remaining,(int,float)) or remaining<115:raise ValueError('Included quota cannot cover 85 seconds plus reserve; no paid fallback')
 record={'scene':n,'signature':signature,'status':'uncertain','included_quota_before':remaining,'gpu_declared_seconds':85,'paid_route':False,'seed':seed}
 receipt.write_text(json.dumps(record,indent=2))
 try:
  result=client.predict(handle_file('ai-cast/arzt-anruf/reference.png'),handle_file(str(audio)),prompt,negative,12.0,seed,api_name='/generate')
  output=result[0]
  if isinstance(output,dict):output=output.get('video',output).get('path') if isinstance(output.get('video',output),dict) else output.get('video')
  shutil.copyfile(output,video)
  record.update(status='generated',sha256=hashlib.sha256(video.read_bytes()).hexdigest())
  shutil.copyfile(video,root/video.name)
  print('Generated genuine story take',n,flush=True)
 finally:receipt.write_text(json.dumps(record,indent=2))
