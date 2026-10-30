"""Read provider/account metadata only. Never generate, purchase or print credentials."""
import concurrent.futures,json,math,os,urllib.error,urllib.request
from datetime import datetime,timezone
from pathlib import Path
report={'checked_at':datetime.now(timezone.utc).isoformat(),'generation_requested':False,'billing_requested':False,'configured_credentials':{name:bool(os.environ.get(name)) for name in ['HF_TOKEN','FAL_KEY','MINIMAX_API_KEY','REPLICATE_API_TOKEN','RUNPOD_API_KEY']}}
token=os.environ.get('HF_TOKEN','')
def get(path,auth=False):
 headers={'Authorization':'Bearer '+token} if auth and token else {}
 try:
  with urllib.request.urlopen(urllib.request.Request('https://huggingface.co'+path,headers=headers),timeout=25) as response:return json.load(response)
 except urllib.error.HTTPError as e:return {'audit_error':'http_'+str(e.code)}
 except Exception as e:return {'audit_error':type(e).__name__}
if token:
 identity=get('/api/whoami-v2',True)
 report['hf_account']={'verified':identity.get('name')=='afgtakrun','pro':identity.get('isPro') if isinstance(identity.get('isPro'),bool) else None,'error':identity.get('audit_error')}
 if report['hf_account']['verified']:
  quota=get('/api/spaces/zero-gpu/quota',True)
  current=quota.get('current')
  report['hf_included_quota']={'verified':not isinstance(current,bool) and isinstance(current,(float,int)) and math.isfinite(current),'remaining_seconds':max(0,current) if not isinstance(current,bool) and isinstance(current,(float,int)) and math.isfinite(current) else None,'error':quota.get('audit_error')}
 else:report['hf_included_quota']={'verified':False,'remaining_seconds':None,'error':'account_not_verified'}
spaces=['fahrfit-driving-live','ludo-live-nations','live-rings-studio','nations-live-race','live-crown-52','neon-live-arena','aryana-live-studio']
def inspect(name):
 data=get('/api/spaces/afgtakrun/'+name,False);runtime=data.get('runtime') or {};hardware=runtime.get('hardware') or {}
 return {'space':name,'stage':runtime.get('stage'),'current_hardware':hardware.get('current'),'requested_hardware':hardware.get('requested'),'error':data.get('audit_error')}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:report['spaces']=list(pool.map(inspect,spaces))
Path('/tmp/aryana-resource-audit.json').write_text(json.dumps(report,indent=2))
print('ARYANA_RESOURCE_AUDIT '+json.dumps(report))
