"""Natural ElevenLabs speech; no cloning or automatic overage purchases."""
import os,json,urllib.request,urllib.error
from pathlib import Path
class VoiceUnavailable(RuntimeError):pass

def configured():
 return os.getenv('ARYANA_VOICE_PROVIDER')=='elevenlabs'

def request(path,payload=None):
 key=os.environ.get('ELEVENLABS_API_KEY','').strip()
 if not key:raise VoiceUnavailable('elevenlabs_key_missing')
 req=urllib.request.Request('https://api.elevenlabs.io'+path,data=json.dumps(payload).encode() if payload is not None else None,headers={'xi-api-key':key,'content-type':'application/json','accept':'audio/mpeg' if payload is not None else 'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=45) as response:return response.read()
 except urllib.error.HTTPError as error:
  if error.code in (401,403):raise VoiceUnavailable('elevenlabs_access_denied') from None
  if error.code in (402,429):raise VoiceUnavailable('elevenlabs_quota_or_rate_limit') from None
  raise VoiceUnavailable('elevenlabs_unavailable') from None

def allowance():
 data=json.loads(request('/v1/user/subscription'));limit=data.get('character_limit');used=data.get('character_count')
 if not isinstance(limit,(int,float)) or not isinstance(used,(int,float)):raise VoiceUnavailable('elevenlabs_quota_unknown')
 return max(0,limit-used)

def settings():
 voice=os.environ.get('ELEVENLABS_VOICE_ID','');model=os.environ.get('ELEVENLABS_MODEL_ID','')
 if not voice or not model or not all(c.isalnum() or c in '_-' for c in voice+model):raise VoiceUnavailable('elevenlabs_voice_not_selected')
 return voice,model

def warmup():
 settings()
 if allowance()<1:raise VoiceUnavailable('elevenlabs_quota_empty')
 return {'warmed':True,'clone':False,'provider':'elevenlabs'}

def synthesize(text,language,target):
 voice,model=settings()
 if allowance()<len(text):raise VoiceUnavailable('elevenlabs_quota_empty')
 data=request('/v1/text-to-speech/'+voice+'?output_format=mp3_44100_128',{'text':text,'model_id':model,'language_code':'en' if language=='en' else 'fa','voice_settings':{'stability':.5,'similarity_boost':.75,'speed':1.0}})
 if not 1000<len(data)<2_000_000:raise VoiceUnavailable('elevenlabs_invalid_audio')
 Path(target).write_bytes(data)
 return {'provider':'elevenlabs','voice':'ElevenLabs natural','bytes':len(data)}

def select_configuration(api_key):
 key=str(api_key).strip()
 if not 12<=len(key)<=400 or any(ch.isspace() for ch in key):raise VoiceUnavailable('elevenlabs_key_missing')
 def get(path):
  req=urllib.request.Request('https://api.elevenlabs.io'+path,headers={'xi-api-key':key})
  try:
   with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)
  except urllib.error.HTTPError as error:
   raise VoiceUnavailable('elevenlabs_access_denied' if error.code in (401,403) else 'elevenlabs_unavailable') from None
 models=get('/v1/models')
 compatible=[model for model in models if model.get('can_do_text_to_speech') and {'fa','en'}.issubset({language.get('language_id') for language in model.get('languages',[])})]
 order=['eleven_v4_turbo','eleven_v4','eleven_v3','eleven_flash_v2_5','eleven_multilingual_v2']
 compatible.sort(key=lambda model:order.index(model['model_id']) if model['model_id'] in order else len(order))
 if not compatible:raise VoiceUnavailable('elevenlabs_persian_model_unavailable')
 voices=get('/v1/voices').get('voices',[])
 candidates=[v for v in voices if v.get('category')!='cloned' and v.get('labels',{}).get('gender')=='female']
 def rank(v):
  labels=v.get('labels',{});native=str(labels.get('language','')).lower() in ['fa','persian','farsi','dari'];return (not native,str(v.get('name','')).lower()!='sarah',v.get('category')!='premade')
 candidates.sort(key=rank)
 if not candidates:raise VoiceUnavailable('elevenlabs_female_voice_unavailable')
 quota=get('/v1/user/subscription');available=max(0,quota.get('character_limit',0)-quota.get('character_count',0))
 if available<300:raise VoiceUnavailable('elevenlabs_quota_empty')
 return {'voice_id':candidates[0]['voice_id'],'model_id':compatible[0]['model_id'],'remaining_characters':available}

def configure_space(request):
 config=select_configuration(request.get('api_key',''))
 from huggingface_hub import HfApi
 token=os.getenv('ARYANA_STATE_TOKEN');api=HfApi(token=token)
 if not token or api.whoami()['name']!='afgtakrun':raise VoiceUnavailable('elevenlabs_secure_storage_unavailable')
 repo='afgtakrun/aryana-live-studio'
 api.add_space_secret(repo_id=repo,key='ELEVENLABS_API_KEY',value=request['api_key'].strip())
 api.add_space_variable(repo_id=repo,key='ELEVENLABS_VOICE_ID',value=config['voice_id'])
 api.add_space_variable(repo_id=repo,key='ELEVENLABS_MODEL_ID',value=config['model_id'])
 api.add_space_variable(repo_id=repo,key='ARYANA_VOICE_PROVIDER',value='elevenlabs')
 return {'provider':'elevenlabs','status':'restart_pending','remaining_characters':config['remaining_characters']}
