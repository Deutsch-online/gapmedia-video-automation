"""Owner-authenticated build diagnostics; never print configured secret values."""
import json,os,re,urllib.request
from huggingface_hub import HfApi
secret=os.environ['HF_TOKEN'];api=HfApi(token=secret);repo=api.whoami()['name']+'/fahrfit-driving-live'
lines=[]
try:
 req=urllib.request.Request('https://huggingface.co/api/spaces/'+repo+'/logs/build',headers={'Authorization':'Bearer '+secret})
 with urllib.request.urlopen(req,timeout=8) as response:
  for raw in response:
   value=raw.decode('utf8','replace').strip()
   if value.startswith('data:'):
    value=value[5:].strip()
    try:
     data=json.loads(value);value=str(data.get('data',data.get('message',data.get('log',data))))
    except (ValueError,AttributeError):pass
    lines.extend(value.splitlines())
   if len(lines)>5000:break
except Exception as error:
 print('BUILD_LOG_FETCH:',type(error).__name__,getattr(error,'code',None))
for line in lines[-100:]:
 line=line.replace(secret,'[redacted]');line=re.sub(r'hf_[A-Za-z0-9]{12,}','[redacted]',line);line=re.sub(r'\x1b\[[0-9;]*m','',line)
 print('BUILD_DIAGNOSTIC:',line[:1500])
print('BUILD_LOG_CAPTURED_LINES:',len(lines))
