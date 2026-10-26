"""Read-only bot identity + free female Persian TTS check. Never print secrets."""
import asyncio,json,os,urllib.request
from pathlib import Path
root=Path('/tmp/teacher-agent-preflight');root.mkdir(exist_ok=True)
report={'bots':[],'takrun_ready':False,'voice':{}}
for name in ['TAKRUN_BOT_TOKEN','TAKRUN_TELEGRAM_BOT_TOKEN','TELEGRAM_TAKRUN_TOKEN','TELEGRAM_BOT_TOKEN']:
 token=os.environ.get(name,'').strip()
 if not token:report['bots'].append({'secret':name,'configured':False});continue
 try:
  with urllib.request.urlopen(f'https://api.telegram.org/bot{token}/getMe',timeout=15) as r:d=json.load(r)
  username=d.get('result',{}).get('username','');entry={'secret':name,'configured':True,'valid':d.get('ok') is True,'username':username}
  if username.lower()=='takrun_bot':
   report['takrun_ready']=True
   with urllib.request.urlopen(f'https://api.telegram.org/bot{token}/getWebhookInfo',timeout=15) as r:hook=json.load(r).get('result',{})
   from urllib.parse import urlparse
   entry['webhook_host']=urlparse(hook.get('url','')).hostname or None
  report['bots'].append(entry)
 except Exception:report['bots'].append({'secret':name,'configured':True,'valid':False})
async def test_voice():
 import edge_tts,importlib.metadata,time
 start=time.monotonic()
 try:
  await asyncio.wait_for(edge_tts.Communicate('یک سوال داریم. یک بار دیگر بخوانید. لطفاً پاسخ درست را انتخاب کنید.',voice='fa-IR-DilaraNeural',rate='-10%').save(str(root/'female-persian.mp3')),timeout=45)
  report['voice']={'ok':(root/'female-persian.mp3').stat().st_size>1024,'voice':'fa-IR-DilaraNeural','seconds':round(time.monotonic()-start,2),'edge_tts_version':importlib.metadata.version('edge-tts')}
 except Exception as e:report['voice']={'ok':False,'voice':'fa-IR-DilaraNeural','error_type':type(e).__name__,'edge_tts_version':importlib.metadata.version('edge-tts')}
asyncio.run(test_voice())
(root/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
