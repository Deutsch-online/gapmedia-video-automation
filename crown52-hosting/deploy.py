import os,json,time,hmac,hashlib,base64,urllib.request,tarfile,gzip
from pathlib import Path
from huggingface_hub import HfApi,SpaceHardware
from huggingface_hub.errors import RepositoryNotFoundError
from cryptography.hazmat.primitives import serialization,hashes
from cryptography.hazmat.primitives.asymmetric import padding
here=Path(__file__).resolve().parent;api=HfApi(token=os.environ['HF_TOKEN']);owner=api.whoami()['name'];repo=owner+'/live-crown-52';mode=json.loads((here/'request.json').read_text())['mode'];build=os.environ['GITHUB_SHA'];out=Path('hosting-delivery');out.mkdir(exist_ok=True)
try:
 info=api.space_info(repo)
 if mode=='bootstrap':raise RuntimeError('Space already exists; refusing to overwrite an existing application')
except RepositoryNotFoundError:
 if mode!='bootstrap':raise RuntimeError('Bootstrap deployment is missing')
 api.create_repo(repo,repo_type='space',space_sdk='docker',space_hardware=SpaceHardware.CPU_BASIC,private=False);info=api.space_info(repo)
def free_runtime():
 r=api.get_space_runtime(repo)
 if r.hardware not in (None,'cpu-basic') or r.requested_hardware not in (None,'cpu-basic') or 'cpu-basic' not in (r.hardware,r.requested_hardware):raise RuntimeError('Only explicitly free CPU-basic is permitted')
 return r
free_runtime();url=str(info.host).rstrip('/')
# Reuse the owner's existing ElevenLabs connection; no key enters public files.
eleven_key=os.environ.get('ELEVEN_API_KEY','')
if not eleven_key:raise RuntimeError('Existing ElevenLabs credential unavailable')
req=urllib.request.Request('https://api.elevenlabs.io/v1/voices',headers={'xi-api-key':eleven_key})
try:
 with urllib.request.urlopen(req,timeout=25) as response:voices=json.load(response).get('voices',[])
except Exception:raise RuntimeError('Could not verify the existing ElevenLabs voice connection') from None
preferred=['Sarah','Rachel','Bella','Charlotte','Matilda','Jessica','Alice','Lily']
voice=next((v for name in preferred for v in voices if v.get('name')==name or v.get('name','').startswith(name+' -')),None) or next((v for v in voices if v.get('labels',{}).get('gender')=='female'),None)
if not voice:raise RuntimeError('No available female ElevenLabs voice found')
fa_model='eleven_v3'
try:
 req=urllib.request.Request('https://api.elevenlabs.io/v1/models',headers={'xi-api-key':eleven_key})
 with urllib.request.urlopen(req,timeout=25) as response:models=json.load(response)
 candidates=[m for m in models if m.get('can_do_text_to_speech',True) and any(l.get('language_id') in ('fa','fas','fa-IR') for l in m.get('languages',[]))]
 if candidates:fa_model=next((m['model_id'] for m in candidates if m.get('model_id')=='eleven_v3'),candidates[0]['model_id'])
except Exception:pass
print('CROWN61_PERSIAN_MODEL '+fa_model,flush=True)
sample_text='Hi, glad you are here. Ready for a quick question?'
probe=urllib.request.Request('https://api.elevenlabs.io/v1/text-to-speech/'+voice['voice_id']+'?output_format=mp3_44100_128',data=json.dumps({'text':sample_text,'model_id':'eleven_v3','voice_settings':{'stability':.55,'similarity_boost':.75,'style':.18,'use_speaker_boost':True,'speed':.96}}).encode(),headers={'xi-api-key':eleven_key,'Content-Type':'application/json','Accept':'audio/mpeg'})
try:
 with urllib.request.urlopen(probe,timeout=30) as response:voice_sample=response.read(3000000)
except Exception:raise RuntimeError('Female ElevenLabs speech test failed; current app not replaced') from None
if len(voice_sample)<100:raise RuntimeError('Invalid ElevenLabs speech sample')
print('CROWN52_VOICE_SELECTED '+json.dumps({'provider':'ElevenLabs','name':voice['name'],'daily_character_limit':5000}),flush=True)
if mode=='repair':
 from huggingface_hub import hf_hub_download
 marker=Path(hf_hub_download(repo_id=repo,repo_type='space',filename='README.md',token=os.environ['HF_TOKEN'])).read_text()
 if 'App namespace: crown52-v1' not in marker:raise RuntimeError('Existing Space is not this app')
if not url.startswith('https://') or not url.endswith('.hf.space'):raise RuntimeError('Unexpected Space origin')
admin=hmac.new(os.environ['HF_TOKEN'].encode(),('live-crown52-admin-v1:'+repo).encode(),hashlib.sha256).hexdigest()
public=serialization.load_pem_public_key((here/'delivery-public.pem').read_bytes());sealed=public.encrypt(admin.encode(),padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),algorithm=hashes.SHA256(),label=None))
folder=Path('hosting-app');folder.mkdir(exist_ok=True)
with tarfile.open(here/'bootstrap.tar.gz') as t:
 for m in t.getmembers():
  p=Path(m.name)
  if p.is_absolute() or '..' in p.parts or m.issym() or m.islnk():raise RuntimeError('Invalid bootstrap archive')
 t.extractall(folder)
(folder/'public/narrator-preview.mp3').write_bytes(voice_sample)
def read_public(source,timeout=30):
 for attempt in range(4):
  try:
   with urllib.request.urlopen(source,timeout=timeout) as response:return response.read(32000000)
  except Exception:
   if attempt==3:raise
   time.sleep(.5*(attempt+1))
# Reusable bilingual files are generated once per script/voice/model and verified on reuse.
scripts=json.loads((here/'narration-scripts.mjs').read_text().split('=',1)[1].strip().rstrip(';'))
old_manifest={}
try:old_manifest=json.loads(read_public(url+'/narration-manifest.json',10))
except Exception:pass
manifest={}
audio_by_script={}
for language,items in scripts.items():
 for kind,text in items.items():
  name='narration-'+kind+'-'+language+'.mp3';model_id=fa_model if language=='fa' else 'eleven_v3'
  text_hash=hashlib.sha256(text.encode()).hexdigest();old=old_manifest.get(name,{})
  audio=audio_by_script.get((language,text_hash,model_id))
  if old.get('natural_profile')==70 and old.get('text_sha')==text_hash and old.get('voice')==voice['voice_id'] and old.get('model')==model_id:
   try:
    candidate=read_public(url+'/'+name,15)
    if len(candidate)>100 and hashlib.sha256(candidate).hexdigest()==old.get('sha256'):audio=candidate
   except Exception:pass
  if audio is None:
   settings={'stability':.5,'similarity_boost':.75,'speed':.96}
   req=urllib.request.Request('https://api.elevenlabs.io/v1/text-to-speech/'+voice['voice_id']+'?output_format=mp3_44100_128',data=json.dumps({'text':text,'model_id':model_id,'language_code':language,'voice_settings':settings}).encode(),headers={'xi-api-key':eleven_key,'Content-Type':'application/json','Accept':'audio/mpeg'})
   try:
    with urllib.request.urlopen(req,timeout=90) as response:audio=response.read(3000000)
   except urllib.error.HTTPError as error:raise RuntimeError('Bilingual ElevenLabs sample failed HTTP '+str(error.code)+' language='+language+' model='+model_id) from None
   if len(audio)<100:raise RuntimeError('Invalid narrator sample: '+name)
  audio_by_script[(language,text_hash,model_id)]=audio
  (folder/'public'/name).write_bytes(audio)
  manifest[name]={'natural_profile':70,'voice':voice['voice_id'],'model':model_id,'language':language,'text_sha':text_hash,'sha256':hashlib.sha256(audio).hexdigest(),'size':len(audio)}
(folder/'public/narration-manifest.json').write_text(json.dumps(manifest))
print('CROWN61_BILINGUAL_AUDIO_READY '+json.dumps({'languages':list(scripts),'files':len(manifest)}),flush=True)

if mode in ('bootstrap','repair'):
 api.add_space_secret(repo,key='CROWN_ADMIN_TOKEN',value=admin)
 api.add_space_variable(repo,key='PUBLIC_URL',value=url)
elif mode=='persist':
 # Recover the in-progress game before a rebuild; no hidden decks enter public source.
 try:
  req=urllib.request.Request(url+'/api/admin/state',headers={'Authorization':'Bearer '+admin})
  with urllib.request.urlopen(req,timeout=20) as r:state=json.load(r)
  backup=json.dumps({'state':state['state'],'revision':state['revision']},ensure_ascii=False,separators=(',',':'))
  protected_backup=base64.b64encode(gzip.compress(backup.encode(),mtime=0)).decode('ascii')
  for attempt in range(4):
   try:
    api.add_space_secret(repo,key='CROWN_RECOVERY_GZIP',value=protected_backup)
    break
   except Exception as error:
    status=getattr(getattr(error,'response',None),'status_code','unknown')
    if attempt==3:raise RuntimeError('Recovery secret update failed HTTP '+str(status)+'; backup bytes='+str(len(backup.encode()))) from None
    time.sleep(2**attempt)
  print('CROWN52_BACKUP_PROTECTED bytes='+str(len(backup.encode()))+' compressed='+str(len(protected_backup)),flush=True)
 except Exception as e:raise RuntimeError('Could not protect the current game before media persistence: '+(str(e) if isinstance(e,RuntimeError) else type(e).__name__)) from None
else:raise RuntimeError('Unknown deployment mode')
api.add_space_secret(repo,key='CROWN_ELEVEN_API_KEY',value=eleven_key)
api.add_space_variable(repo,key='CROWN_ELEVEN_VOICE_ID',value=voice['voice_id'])
api.add_space_variable(repo,key='CROWN_ELEVEN_VOICE_NAME',value=voice['name'])
api.add_space_variable(repo,key='CROWN_ELEVEN_FA_MODEL',value=fa_model)
if mode in ('persist','repair'):
 for asset in json.loads((folder/'assets-manifest.json').read_text()):
  source=('https://huggingface.co/spaces/'+repo+'/resolve/main/public/assets/'+asset['name']) if mode=='repair' else (url+'/assets/'+asset['name'])
  data=read_public(source,60)
  if len(data)!=asset['size'] or hashlib.sha256(data).hexdigest()!=asset['sha256']:raise RuntimeError('Public media checksum differs: '+asset['name'])
  p=folder/'public/assets'/asset['name'];p.parent.mkdir(exist_ok=True);p.write_bytes(data)

for name in ('game.mjs','game-engine.mjs','language.mjs','game-audio.mjs','water.css','water.mjs','portrait.css','compact.css','card-motion.mjs','fun-art.mjs','fun-styles.mjs','playing-cards.mjs','playing-cards.css','gift-names.mjs','live-extras.css','index.html','gift-art.json','supporters.mjs','live-events.mjs','football-engine.mjs','football-ui.mjs','football.css','football-crests.json','league-voice.mjs','league-audio.json','audio-credits.html','showcase-portraits.json','narration-scripts.mjs','free-play.mjs','bubble-arena.mjs','bubble-arena.css','bubble-stages.mjs','question-bank.mjs','welcome-scripts.mjs','quiz-narrator.mjs'):
 (folder/'public'/name).write_text((here/name).read_text())
(folder/'server.mjs').write_text((here/'server.mjs').read_text())
(folder/'live-bridge.mjs').write_text((here/'live-bridge.mjs').read_text())
docker=(folder/'Dockerfile').read_text()
if 'server.mjs assets-manifest.json' not in docker:raise RuntimeError('Unexpected container copy layout')
(folder/'Dockerfile').write_text(docker.replace('server.mjs assets-manifest.json','server.mjs live-bridge.mjs assets-manifest.json').replace('WORKDIR /home/node/app','RUN apt-get update && apt-get install -y --no-install-recommends espeak-ng && rm -rf /var/lib/apt/lists/*\nWORKDIR /home/node/app'))

(folder/'MOTION_SPEC.md').write_text((here/'MOTION_SPEC.md').read_text())
from concurrent.futures import ThreadPoolExecutor
def gift_art(asset):
 if not (asset['url'].startswith('https://raw.githubusercontent.com/tao-Isaman/tiktok-live-gift/main/public/gifts/') or asset['url'].startswith('https://p16-webcast.tiktokcdn.com/img/')) or '/' in asset['name'] or not asset['name'].endswith('.webp'):raise RuntimeError('Invalid gift art source')

 sources=[url+'/gifts/'+asset['name'],'https://huggingface.co/spaces/'+repo+'/resolve/main/public/gifts/'+asset['name'],asset['url']]
 if mode=='repair':sources=[sources[1],sources[2]]
 data=None
 for source in sources:
  try:
   candidate=read_public(source)
   if candidate[:4]==b'RIFF' and candidate[8:12]==b'WEBP' and len(candidate)==asset['size'] and hashlib.sha256(candidate).hexdigest()==asset['sha256']:
    data=candidate;break
  except Exception:pass
 if data is None:raise RuntimeError('Verified gift image unavailable: '+asset['name'])
 target=folder/'public/gifts'/asset['name'];target.parent.mkdir(exist_ok=True);target.write_bytes(data)
with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(gift_art,json.loads((here/'gift-art.json').read_text())['files']))
api.add_space_variable(repo,key='CROWN_BUILD_SHA',value=build)
commit=api.upload_folder(repo_id=repo,repo_type='space',folder_path=str(folder),commit_message='Deploy Crown52 '+mode+' '+build[:12])
if str(api.get_space_runtime(repo).stage)=='PAUSED':api.restart_space(repo_id=repo)
receipt={'url':url,'screen_url':url+'/screen','repo':repo,'mode':mode,'build':build,'hardware':'cpu-basic','sealed_admin':base64.b64encode(sealed).decode()};(out/'delivery.json').write_text(json.dumps(receipt));print('CROWN52_DEPLOYED '+json.dumps({k:v for k,v in receipt.items() if k!='sealed_admin'}),flush=True)
started=time.monotonic()
for _ in range(95):
 runtime=free_runtime()
 try:
  with urllib.request.urlopen(url+'/health',timeout=15) as r:health=json.load(r)
  if health.get('app')=='crown52' and health.get('build')==build and runtime.raw.get('sha')==commit.oid:
   if mode in ('persist','repair') and health.get('assetsInstalled')!=health.get('assetsExpected'):raise RuntimeError('Persistent media is missing')
   print('CROWN52_READY '+url,flush=True);break
 except Exception:pass
 if time.monotonic()-started>45 and str(runtime.stage) in ('BUILD_ERROR','RUNTIME_ERROR','CONFIG_ERROR') and runtime.raw.get('sha')==commit.oid:raise RuntimeError('Hosting failed: '+str(runtime.stage))
 time.sleep(7)
else:raise RuntimeError('Hosting readiness timeout')



