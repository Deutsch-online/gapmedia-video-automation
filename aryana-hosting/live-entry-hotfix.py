"""Apply only entry/thanks rules; resume the existing receiver without on-air test speech."""
import importlib.util,os,json,time,hashlib,subprocess,sys
from pathlib import Path
from huggingface_hub import HfApi,CommitOperationAdd
spec=importlib.util.spec_from_file_location('aryana_release',Path('aryana-hosting/deploy.py'));release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)
report={'status':'checking','on_air_test_speech':False};output=Path('/tmp/aryana-entry-hotfix.json')
def write():output.write_text(json.dumps(report,indent=2));print('ARYANA_ENTRY_HOTFIX '+json.dumps(report),flush=True)
try:
 bot=release.tg('getMe',{})
 if bot.get('username','').lower()!='afgsocial_bot':raise RuntimeError('Unexpected bot identity')
 chat=os.getenv('TELEGRAM_REVIEW_CHAT_ID') or os.environ['TELEGRAM_CHAT_ID'];owner=release.tg('getChat',{'chat_id':chat})
 if owner.get('type')!='private':raise RuntimeError('Owner chat must be private')
 release.reconstruct(owner['id'])
 subprocess.run(['npm','ci','--ignore-scripts','--no-audit','--no-fund'],cwd=release.APP,check=True)
 subprocess.run(['npm','test'],cwd=release.APP,check=True)
 api=HfApi(token=os.environ['HF_TOKEN']);account=api.whoami()['name']
 if account!='afgtakrun':raise RuntimeError('Unexpected owner')
 repo=account+'/aryana-live-studio';release.free(api,repo);space=api.space_info(repo);url=str(space.host).rstrip('/')
 import hmac
 admin=hmac.new(os.environ['TELEGRAM_BOT_TOKEN'].encode(),('aryana-admin-v1:'+repo).encode(),hashlib.sha256).hexdigest()
 _,raw,_=release.fetch(url+'/api/state',admin);before=json.loads(raw)
 connected=before['connection']=='connected';username=before['settings'].get('lastUsername','')
 if connected and not username:raise RuntimeError('Cannot safely resume an unnamed connection')
 report.update(was_connected=connected,source_commit=os.environ['GITHUB_SHA']);write()
 # Flush an identical settings checkpoint, without speaking or disconnecting.
 release.fetch(url+'/api/settings',admin,{'volume':before['settings']['volume']})
 time.sleep(31)
 server=release.APP/'src/server.mjs';text=server.read_text();needle="build:process.env.ARYANA_BUILD_SHA||'local'"
 if needle not in text:raise RuntimeError('Unexpected server version')
 server.write_text(text.replace(needle,'build:'+json.dumps(os.environ['GITHUB_SHA'])))
 paths=['src/host.mjs','src/server.mjs','src/reaction-clips.mjs','public/assets/reaction-clips.json']
 uploaded=api.create_commit(repo,repo_type='space',operations=[CommitOperationAdd(path_in_repo=p,path_or_fileobj=str(release.APP/p)) for p in paths],commit_message='Fix entry welcomes and exact gift thanks '+os.environ['GITHUB_SHA'][:12])
 report['status']='building';write();deadline=time.monotonic()+600
 while time.monotonic()<deadline:
  runtime=api.get_space_runtime(repo)
  if str(runtime.stage) in ['BUILD_ERROR','RUNTIME_ERROR','CONFIG_ERROR']:raise RuntimeError('Hotfix build failed')
  try:
   _,raw,_=release.fetch(url+'/health');health=json.loads(raw)
   if health.get('build')==os.environ['GITHUB_SHA'] and runtime.raw.get('sha')==uploaded.oid:break
  except Exception:pass
  time.sleep(4)
 else:raise RuntimeError('Hotfix readiness timed out')
 _,raw,_=release.fetch(url+'/api/state',admin);state=json.loads(raw)
 if state['settings'].get('lastUsername')!=username:raise RuntimeError('Saved username was not preserved')
 if connected and state['connection']!='connected':release.fetch(url+'/api/connect',admin,{'username':username})
 deadline=time.monotonic()+60
 while connected and time.monotonic()<deadline:
  _,raw,_=release.fetch(url+'/api/state',admin);state=json.loads(raw)
  if state['connection']=='connected':break
  time.sleep(2)
 report.update(status='ready',connection=state['connection'],connection_resumed=state['connection']=='connected' if connected else None,recorded_welcome_ready=state.get('capabilities',{}).get('recordedReactions',0)>=2,username_preserved=True)
 message='قانون واکنش آریانا اصلاح شد:\nورود: سلام، خوش آمدید.\nگیفت و لایک: بسیار تشکر.\nنام‌های عددی خوانده نمی‌شوند. خوش‌آمد ویژهٔ مهمانان شناخته‌شدهٔ بالای لیول ۲۵ حفظ شد.\n'+('اتصال دریافت تیک‌تاک دوباره متصل است.' if report['connection_resumed'] else 'وضعیت اتصال را در پنل بررسی کنید.')
 report['telegram_message_id']=release.tg('sendMessage',{'chat_id':chat,'text':message})['message_id'];write()
except Exception as e:
 report.update(status='failed',error_type=type(e).__name__);write();raise
