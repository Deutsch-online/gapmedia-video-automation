import asyncio,base64,json,os,subprocess
from pathlib import Path
from urllib.request import Request,urlopen
from huggingface_hub import HfApi,InferenceClient,CommitOperationAdd,hf_hub_download

root=Path('/tmp/host-video');root.mkdir(exist_ok=True)
token=os.environ['HF_TOKEN'];api=HfApi(token=token);repo=api.whoami()['name']+'/nations-race-gamer-character'
raw_name='english-host-back-v2-silent.mp4';final_name='english-host-back-v2.mp4'
existing=set(api.list_repo_files(repo,repo_type='dataset'))
prompt='''Photorealistic live-action video, fixed rear-view camera directly behind a fictional adult female esports presenter, age 28, seated at her gaming desk and talking into a headset microphone while watching her racing game monitor. Her face is completely hidden for the entire shot: only the back of her dark brown hair, back of her headphones and back of her shoulders can be seen. She always faces forward toward the computer monitor, never turns around and never reveals her cheek or profile. No mirrors or reflective surfaces. Wearing a modest teal long-sleeved sweater. She behaves like a lively English-speaking gaming host: gently shifts her upper body left and then right, makes a small relaxed hand gesture next to the keyboard, and nods her head once and then again naturally while addressing her audience through the headset microphone. Subtle continuous breathing and shoulder motion, natural hair movement, realistic human proportions. A large monitor physically in front of her displays a colorful car racing game. Cozy RGB-lit gaming room, violet and cyan accent lights, warm soft desk light, believable keyboard, mouse and chair. Stable medium-wide vertical composition includes back of head, shoulders, arms, desk and entire monitor. Continuous single shot, realistic motion, candid livestream photography, high detail, no titles or watermarks.'''
raw=root/raw_name
if raw_name in existing:
 raw.write_bytes(urlopen('https://huggingface.co/datasets/'+repo+'/resolve/main/'+raw_name,timeout=60).read());generated=False
else:
 # One video inference request; do not automatically retry or create a paid endpoint.
 data=InferenceClient(provider='fal-ai',api_key=token,timeout=600).text_to_video(prompt,model='Wan-AI/Wan2.2-T2V-A14B',num_frames=81,num_inference_steps=27,seed=394823,extra_body={'aspect_ratio':'9:16','resolution':'720p','frames_per_second':16,'enable_prompt_expansion':False,'negative_prompt':'visible face, front view, side profile, looking at camera, turning around, face reflection, cartoon, CGI, static still image, distorted hands, extra limbs, text overlay','enable_safety_checker':True,'enable_output_safety_checker':True})
 raw.write_bytes(data);generated=True
 api.upload_file(path_or_fileobj=str(raw),path_in_repo=raw_name,repo_id=repo,repo_type='dataset',commit_message='Save one generated rear-view host motion clip')
voice=root/'english-presenter-v2.mp3'
text="Welcome to the race! Choose your car, and get ready. Like or send a gift to help your driver move. Let's race!"
# Use the already validated natural English recording, avoiding a live TTS connection.
pack=json.loads(Path('live-race/dist/audio/voices.json').read_text());voice.write_bytes(base64.b64decode(pack['voices']['bright']['clips']['test'].split(',',1)[1]));text='Welcome to Nations Race. Select your car. Like or gift to move. Good luck, and enjoy the race!'
# Extend the real body/head motion with its reverse for a smooth short narration clip.
final=root/final_name
motion=root/'motion-loop.mp4'
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(raw),'-filter_complex','[0:v]split=2[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,fps=24,format=yuv420p[v]','-map','[v]','-an','-c:v','libx264','-preset','fast','-threads','2','-crf','20',str(motion)],check=True)
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-stream_loop','-1','-i',str(motion),'-i',str(voice),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','160k','-shortest','-movflags','+faststart',str(final)],check=True)
poster=root/'english-host-back-v2.jpg';subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(final),'-frames:v','1',str(poster)],check=True)
meta=root/'english-host-v2.json';meta.write_text(json.dumps({'fictional_adult':True,'face':'rear view, not shown','model':'Wan-AI/Wan2.2-T2V-A14B','provider':'fal-ai via Hugging Face','voice':'Jenny, natural synthetic English female presenter','spoken_text':text,'motion':'generated head nods and body shifts; forward/reverse extension','prompt':prompt},indent=2))
files=[(final_name,final),('english-presenter-v2.mp3',voice),('english-host-back-v2.jpg',poster),('english-host-v2.json',meta)]
api.create_commit(repo,repo_type='dataset',commit_message='Add rear-view animated English presenter with narration',operations=[CommitOperationAdd(path_in_repo=n,path_or_fileobj=str(p)) for n,p in files])
base='https://huggingface.co/datasets/'+repo+'/resolve/main/'
report={'video':base+final_name,'audio':base+voice.name,'poster':base+poster.name,'video_generation_requests':int(generated)}
bot=os.environ.get('TELEGRAM_BOT_TOKEN');chat=os.environ.get('TELEGRAM_CHAT_ID') or os.environ.get('TELEGRAM_REVIEW_CHAT_ID')
if bot and chat:
 body=json.dumps({'chat_id':chat,'text':'مجری خانم با گویندگی انگلیسی؛ صورت از پشت پنهان است، حرکت بدن و تکان سر دارد. شخصیت و صدا تولیدشده با هوش مصنوعی هستند.\n'+report['video']+'\nصدا:\n'+report['audio']}).encode()
 with urlopen(Request('https://api.telegram.org/bot'+bot+'/sendMessage',data=body,headers={'Content-Type':'application/json'}),timeout=30) as r:report['telegram_delivered']=bool(json.load(r).get('ok'))
print('ENGLISH_HOST_READY: '+json.dumps(report))
