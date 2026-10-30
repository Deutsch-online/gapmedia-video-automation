"""Deploy independent Aryana to free HF CPU; private owner Telegram handoff."""
import uuid,base64,hashlib,hmac,io,json,os,shutil,subprocess,sys,time,urllib.error,urllib.request,zipfile
from pathlib import Path
from cryptography.hazmat.primitives import serialization,hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
ROOT=Path.cwd();REPORT=Path('/tmp/aryana-hf-report.json');APP=Path('/tmp/aryana-host-app')
report={'status':'preparing','paid_requested':False,'gpu_requested':False}
def write():REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2))
def b64(s):return base64.b64decode(s,validate=True)
def tg(method,payload):
 req=urllib.request.Request('https://api.telegram.org/bot'+os.environ['TELEGRAM_BOT_TOKEN']+'/'+method,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=30) as r:d=json.load(r)
 if not d.get('ok'):raise RuntimeError('Telegram request rejected')
 return d['result']
def reconstruct(chat):
 # Previously delivered encrypted archive: decrypt only inside this trusted runner.
 bot=os.environ['TELEGRAM_BOT_TOKEN'];aad=(os.environ['GITHUB_REPOSITORY']+':delivery/aryana-20261029:aryana-20261029-v1').encode()
 folder=ROOT/'aryana-delivery';key=json.loads((folder/'key.json').read_text());meta=json.loads((folder/'package.json').read_text())
 wrap=hashlib.sha256(b'aryana-private-wrap-v1\0'+bot.encode()).digest()
 secret=json.loads(AESGCM(wrap).decrypt(b64(key['wrap_nonce']),b64(key['wrapped_private']),aad))
 if secret['chat_id']!=str(chat):raise RuntimeError('Owner destination mismatch')
 private=serialization.load_pem_private_key(secret['private_pem'].encode(),password=None)
 aes=private.decrypt(b64(meta['sealed_key']),padding.OAEP(mgf=padding.MGF1(hashes.SHA256()),algorithm=hashes.SHA256(),label=None))
 cipher=(folder/'package.enc').read_bytes()
 if hashlib.sha256(cipher).hexdigest()!=meta['cipher_sha256']:raise RuntimeError('Cipher integrity failure')
 data=AESGCM(aes).decrypt(b64(meta['nonce']),cipher,aad)
 if hashlib.sha256(data).hexdigest()!=meta['plain_sha256']:raise RuntimeError('Archive integrity failure')
 APP.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(io.BytesIO(data)) as z:
  if z.testzip():raise RuntimeError('Archive failure')
  for name in z.namelist():
   p=Path(name)
   if p.parts[0]!='aryana-live' or p.is_absolute() or '..' in p.parts or '.private' in p.parts or '.env' in p.parts:raise RuntimeError('Private or invalid archive path')
   if name.endswith('/'):continue
   dest=APP/Path(*p.parts[1:]);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(z.read(name))
 overlay=ROOT/'aryana-hosting/overlay'
 for p in overlay.rglob('*'):
  if p.is_file():
   if p.is_symlink() or any(x in p.parts for x in ('.private','.env','node_modules','.git')):raise RuntimeError('Invalid overlay')
   dest=APP/p.relative_to(overlay);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
 # The asset manifest explicitly binds the introduction to the new character.
 manifest=json.loads((ROOT/'aryana-hosting/assets.json').read_text())
 for relative in manifest['delete']:(APP/relative).unlink(missing_ok=True)
 for relative,entry in manifest['files'].items():
  if Path(relative).is_absolute() or '..' in Path(relative).parts:raise RuntimeError('Invalid asset path')
  asset=(ROOT/'aryana-hosting/assets'/entry['file']).read_bytes()
  if hashlib.sha256(asset).hexdigest()!=entry['sha256']:raise RuntimeError('Asset integrity failed')
  dest=APP/relative;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(asset)
 profile_meta=json.loads((ROOT/'aryana-hosting/voice-profile.json').read_text())
 profile_key=private.decrypt(b64(profile_meta['sealed_key']),padding.OAEP(mgf=padding.MGF1(hashes.SHA256()),algorithm=hashes.SHA256(),label=None))
 profile_cipher=b64((ROOT/'aryana-hosting/voice-profile.enc.b64').read_text())
 profile=AESGCM(profile_key).decrypt(b64(profile_meta['nonce']),profile_cipher,aad+b':voice-profile-v1')
 if hashlib.sha256(profile).hexdigest()!=profile_meta['sha256']:raise RuntimeError('Voice profile integrity failed')
 document=json.loads(profile)
 if document.get('version')!=1 or document.get('method')!='OpenVoice-V2':raise RuntimeError('Invalid voice profile')
 return manifest,profile

def free(api,repo):
 runtime=api.get_space_runtime(repo)
 if runtime.hardware not in (None,'cpu-basic') or runtime.requested_hardware not in (None,'cpu-basic') or 'cpu-basic' not in (runtime.hardware,runtime.requested_hardware):raise RuntimeError('Refusing paid or unknown hardware')
 return runtime

def fetch(url,admin=None,payload=None):
 headers={'User-Agent':'Aryana-Deployment/1.0'}
 if admin:headers['x-aryana-key']=admin
 if payload is not None:headers['Content-Type']='application/json'
 req=urllib.request.Request(url,data=None if payload is None else json.dumps(payload).encode(),headers=headers)
 with urllib.request.urlopen(req,timeout=180 if url.endswith('/api/connect') else 110 if url.endswith('/api/comment') else 25) as r:return r.status,r.read(),r.headers.get_content_type()

def send_media(chat,method,field,file,mime,caption):
 boundary='aryana-'+uuid.uuid4().hex
 parts=[]
 for name,value in {'chat_id':str(chat),'caption':caption}.items():
  parts.append(('--'+boundary+'\r\nContent-Disposition: form-data; name="'+name+'"\r\n\r\n'+value+'\r\n').encode())
 parts.extend([('--'+boundary+'\r\nContent-Disposition: form-data; name="'+field+'"; filename="'+file.name+'"\r\nContent-Type: '+mime+'\r\n\r\n').encode(),file.read_bytes(),('\r\n--'+boundary+'--\r\n').encode()])
 req=urllib.request.Request('https://api.telegram.org/bot'+os.environ['TELEGRAM_BOT_TOKEN']+'/'+method,data=b''.join(parts),headers={'Content-Type':'multipart/form-data; boundary='+boundary})
 with urllib.request.urlopen(req,timeout=60) as r:result=json.load(r)
 if not result.get('ok'):raise RuntimeError('Telegram media delivery failed')
 return result['result']['message_id']

def main():
 from huggingface_hub import HfApi,CommitOperationAdd,SpaceHardware
 from huggingface_hub.errors import RepositoryNotFoundError
 identity=tg('getMe',{})
 if identity.get('username','').lower()!='afgsocial_bot':raise RuntimeError('Bot identity mismatch')
 chat=os.getenv('TELEGRAM_REVIEW_CHAT_ID') or os.environ['TELEGRAM_CHAT_ID'];owner=tg('getChat',{'chat_id':chat})
 if owner.get('type')!='private':raise RuntimeError('Private owner destination required')
 manifest,profile=reconstruct(owner['id'])
 subprocess.run(['npm','ci','--ignore-scripts','--no-audit','--no-fund'],cwd=APP,check=True)
 subprocess.run(['npm','test'],cwd=APP,check=True)
 subprocess.run([sys.executable,'-m','compileall','-q',str(APP/'src'),str(APP/'tools')],check=True)
 api=HfApi(token=os.environ['HF_TOKEN']);account=api.whoami()['name'];repo=account+'/aryana-live-studio'
 try:space=api.space_info(repo)
 except RepositoryNotFoundError:
  api.create_repo(repo,repo_type='space',space_sdk='docker',space_hardware=SpaceHardware.CPU_BASIC,private=False);space=api.space_info(repo)
 free(api,repo);url=str(space.host).rstrip('/')
 state_repo=account+'/aryana-live-private-state'
 api.create_repo(state_repo,repo_type='dataset',private=True,exist_ok=True)
 if not api.repo_info(state_repo,repo_type='dataset').private:raise RuntimeError('Persistent state must be private')
 api.add_space_secret(repo,key='ARYANA_STATE_TOKEN',value=os.environ['HF_TOKEN'])
 api.add_space_variable(repo,key='ARYANA_STATE_REPO',value=state_repo)
 if not url.startswith('https://') or not url.endswith('.hf.space'):raise RuntimeError('Invalid host')
 admin=hmac.new(os.environ['TELEGRAM_BOT_TOKEN'].encode(),('aryana-admin-v1:'+repo).encode(),hashlib.sha256).hexdigest()
 build=os.environ['GITHUB_SHA'];api.add_space_secret(repo,key='ARYANA_ADMIN_TOKEN',value=admin);api.add_space_secret(repo,key='ARYANA_VOICE_PROFILE_B64',value=base64.b64encode(profile).decode());api.add_space_variable(repo,key='PUBLIC_URL',value=url);api.add_space_variable(repo,key='ARYANA_BUILD_SHA',value=build)
 front='---\ntitle: Aryana LIVE Studio\nemoji: 🎙️\ncolorFrom: green\ncolorTo: blue\nsdk: docker\napp_port: 7860\npinned: false\n---\n\n'
 operations=[]
 for p in sorted(APP.rglob('*')):
  if not p.is_file() or any(x in p.parts for x in ('node_modules','.git','.private','.venv','__pycache__')):continue
  relative=p.relative_to(APP).as_posix()
  if relative=='.env':raise RuntimeError('Private runtime data in source')
  payload=(front+p.read_text()).encode() if relative=='README.md' else str(p)
  operations.append(CommitOperationAdd(path_in_repo=relative,path_or_fileobj=payload))
 uploaded=api.create_commit(repo,repo_type='space',operations=operations,commit_message='Deploy independent Aryana '+build[:12])
 report.update(status='building',repo=repo,url=url,build=build,portrait_sha256=manifest['files']['public/assets/aryana.png']['sha256']);write()
 deadline=time.monotonic()+900
 while time.monotonic()<deadline:
  runtime=free(api,repo);stage=str(getattr(runtime.stage,'value',runtime.stage));report['space_stage']=stage;write()
  if stage in ('BUILD_ERROR','CONFIG_ERROR','RUNTIME_ERROR'):raise RuntimeError('Space build or runtime failed')
  try:
   _,raw,_=fetch(url+'/health');health=json.loads(raw)
   if stage=='RUNNING' and runtime.raw.get('sha')==uploaded.oid and health.get('build')==build and health.get('version')=='aryana-host-v1':break
  except (OSError,ValueError):pass
  time.sleep(8)
 else:raise RuntimeError('Space readiness timeout')
 try:fetch(url+'/api/state');raise RuntimeError('Private state accessible without key')
 except urllib.error.HTTPError as e:
  if e.code!=401:raise
 _,raw,_=fetch(url+'/api/session')
 if json.loads(raw)!={'requiresToken':True}:raise RuntimeError('Public session leaked a key')
 _,raw,_=fetch(url+'/api/state',admin)
 if 'settings' not in json.loads(raw) or not json.loads(raw).get('capabilities',{}).get('voiceClone'):raise RuntimeError('Owner authentication failed')
 _,image,mime=fetch(url+'/assets/aryana.png')
 if mime!='image/png' or hashlib.sha256(image).hexdigest()!=report['portrait_sha256']:raise RuntimeError('Portrait verification failed')
 _,page,_=fetch(url+'/live')
 if b'live.js' not in page:raise RuntimeError('Output page unavailable')
 _,mobile,_=fetch(url+'/mobile')
 if mobile!=page or b'AI-Generated' not in page:raise RuntimeError('Clean mobile output unavailable')
 for name in ('mpfb.glb','talkinghead.bundle.mjs','headworklet.min.mjs','model-en-mixed.bin'):
  _,asset,_=fetch(url+'/assets/avatar/'+name)
  if len(asset)<1000:raise RuntimeError('Animated avatar asset missing')
 report['animated_3d_assets_verified']=True
 report['mobile_output_url']=url+'/mobile'
 _,owner_raw,_=fetch(url+'/api/state',admin)
 original_mode=json.loads(owner_raw)['settings'].get('avatarMode','animated')
 try:
  _,clip_raw,_=fetch(url+'/api/thanks',admin,{})
  clip_state=json.loads(clip_raw)['state']
  clip=next((x for x in reversed(clip_state['utterances']) if x['text']=='بسیار تشکر!' and x.get('video')=='/assets/reaction-thanks.mp4'),None)
  for _ in range(45):
   if clip:break
   time.sleep(1);_,queued_raw,_=fetch(url+'/api/state',admin)
   clip=next((x for x in reversed(json.loads(queued_raw)['utterances']) if x['text']=='بسیار تشکر!' and x.get('video')=='/assets/reaction-thanks.mp4'),None)
  if not clip:raise RuntimeError('Prepared portrait reaction did not queue')
  for asset in (clip['audio'],clip['video']):
   _,data,_=fetch(url+asset)
   if hashlib.sha256(data).hexdigest()!=manifest['files']['public'+asset]['sha256']:raise RuntimeError('Reaction media mismatch')
  report['recorded_portrait_reaction_verified']=True
 finally:
  fetch(url+'/api/stop',admin,{})
  fetch(url+'/api/settings',admin,{'avatarMode':original_mode})
 # Verify the websocket is output-only: no private logs/settings.
 check="""import WebSocket from 'ws';const w=new WebSocket(process.env.ARYANA_CHECK_URL.replace('https:','wss:')+'/events');const t=setTimeout(()=>process.exit(2),15000);w.on('message',r=>{const s=JSON.parse(r);clearTimeout(t);w.close();process.exit(('settings'in s||'log'in s||'lastError'in s)?3:0)});w.on('error',()=>process.exit(4));"""
 subprocess.run(['node','--input-type=module','-e',check],cwd=APP,env=dict(os.environ,ARYANA_CHECK_URL=url),check=True,timeout=20)
 report.update(status='ready',screen_url=url+'/live',owner_auth_verified=True,public_privacy_verified=True,portrait_verified=True,introduction_video=(APP/'public/assets/introduction.mp4').exists(),live_lip_sync=False)
 # Verify actual remote Edge speech, but report network restrictions honestly.
 speech={}
 for language,text in [('fa','سلام، خوش آمدید!'),('en','Hello, welcome to our live!')]:
  try:
   fetch(url+'/api/say',admin,{'text':text});end=time.monotonic()+180;valid=False
   while time.monotonic()<end:
    _,raw,_=fetch(url+'/api/state',admin);state=json.loads(raw);item=next((i for i in reversed(state['utterances']) if i.get('text')==text),None)
    if item:
     _,audio,mime=fetch(url+item['audio']);valid=len(audio)>1000 and mime=='audio/mpeg';break
    if state.get('speech')=='error':break
    time.sleep(2)
   speech[language]=valid
  except (OSError,ValueError):speech[language]=False
 report['live_speech_verified']=speech;write()
 if not all(speech.values()):raise RuntimeError('Bilingual live speech verification failed')
 _,owner_raw,_=fetch(url+'/api/state',admin);owner_state=json.loads(owner_raw)
 fetch(url+'/api/settings',admin,{'volume':owner_state['settings']['volume']})
 conversation_verified=False
 try:
  _,reply_raw,_=fetch(url+'/api/comment',admin,{'text':'یک جملهٔ کوتاه و مؤدبانه برای شروع لایف بگو.'})
  reply_state=json.loads(reply_raw).get('state',{})
  conversation_verified=reply_state.get('capabilities',{}).get('conversation')=='local' and reply_state.get('conversationStatus')=='ready'
 except (OSError,ValueError):pass
 report['local_conversation_verified']=conversation_verified
 deadline=time.monotonic()+65
 while time.monotonic()<deadline:
  if api.file_exists(state_repo,'state.json',repo_type='dataset'):break
  time.sleep(3)
 else:raise RuntimeError('Private state write was not verified')
 report['private_state_write_verified']=True
 report['live_speech_verified']=speech;report['custom_voice_profile_configured']=True;report['private_state_repo']=state_repo;report['private_state_verified']=True;write()
 warning='' if all(speech.values()) else '\nتولید صدای دلخواه روی این سرور در آزمون شبکه تأیید نشد؛ صدای معرفی آماده پخش می‌شود.'
 message='🎙️ واکنش تشکر با چهرهٔ اختصاصی آریانا اضافه شد.\n\n🔐 پنل خصوصی:\n'+url+'/?studio=1#'+admin+'\n\nدکمهٔ «تشکر با چهرهٔ اختصاصی» را بزنید. کلیپ حدود دو ثانیه با صدای اختصاصی می‌گوید «بسیار تشکر!». در حالت چهرهٔ اختصاصی، نام‌های عددی یا نامطمئن نیز همین تشکر عمومی را دریافت می‌کنند؛ نام‌های واقعی پاسخ نام‌دار قبلی را دارند. کلیپ فقط برای همین جمله است و برای پاسخ‌های تازه حرکت لب تولید نمی‌کند.\n\n🎥 خروجی استودیو: '+url+'/live\n📱 موبایل: '+url+'/mobile\n\nبرچسب خروجی AI-Generated است. این یک واکنش آماده است؛ حرکت طبیعی و پیوستهٔ چهرهٔ اختصاصی هنوز فعال نیست. مدل سه‌بعدی آزمایشی همچنان جداگانه قابل انتخاب است. لینک مدیریت را خصوصی نگه دارید.'+warning
 sent=tg('sendMessage',{'chat_id':chat,'text':message,'link_preview_options':{'is_disabled':True}});report['telegram_message_id']=sent['message_id'];report['private_link_delivered']=True;write();
 if json.loads((ROOT/'aryana-hosting/request.json').read_text()).get('send_samples',True):
  report['sample_audio_message_id']=send_media(chat,'sendAudio','audio',APP/'public/assets/voice-preview.mp3','audio/mpeg','نمونهٔ جملهٔ تازه با صدای اختصاصی آریانا؛ تبدیل رنگ صدا با OpenVoice V2.');report['sample_video_message_id']=send_media(chat,'sendVideo','video',APP/'public/assets/introduction.mp4','video/mp4','چهرهٔ مستقل آریانا، با صدای تبدیل‌شده از نمونهٔ شما.')
 write();print('ARYANA_READY '+json.dumps(report))
if __name__=='__main__':
 try:main()
 except Exception as e:
  report.update(status='failed',error_type=type(e).__name__,http_status=getattr(getattr(e,'response',None),'status_code',getattr(e,'code',None)));write();print('ARYANA_DEPLOY_FAILED '+json.dumps(report));sys.exit(1)
