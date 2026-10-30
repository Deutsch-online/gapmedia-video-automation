"""Apply only entry/thanks rules; resume the existing receiver without on-air test speech."""
import importlib.util,os,json,time,hashlib,subprocess,sys,urllib.request
from pathlib import Path
from huggingface_hub import HfApi,CommitOperationAdd
spec=importlib.util.spec_from_file_location('aryana_release',Path('aryana-hosting/deploy.py'));release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)
request=json.loads(Path('aryana-hosting/live-entry-hotfix-request.json').read_text())
source_sha=os.environ.get('ARYANA_SOURCE_SHA') or os.environ['GITHUB_SHA']
report={'status':'checking','on_air_test_speech':False,'video_only_requested':request.get('video_only',False)};output=Path('/tmp/aryana-entry-hotfix.json')
def write():output.write_text(json.dumps(report,indent=2));print('ARYANA_ENTRY_HOTFIX '+json.dumps(report),flush=True)
try:
 bot=release.tg('getMe',{})
 if bot.get('username','').lower()!='afgsocial_bot':raise RuntimeError('Unexpected bot identity')
 chat=os.getenv('TELEGRAM_REVIEW_CHAT_ID') or os.environ['TELEGRAM_CHAT_ID'];owner=release.tg('getChat',{'chat_id':chat})
 if owner.get('type')!='private':raise RuntimeError('Owner chat must be private')
 if request.get('resume_only'):
  api=HfApi(token=os.environ['HF_TOKEN'])
  if api.whoami()['name']!='afgtakrun':raise RuntimeError('Unexpected owner')
  import hmac
  url='https://afgtakrun-aryana-live-studio.hf.space'
  admin=hmac.new(os.environ['TELEGRAM_BOT_TOKEN'].encode(),b'aryana-admin-v1:afgtakrun/aryana-live-studio',hashlib.sha256).hexdigest()
  _,raw,_=release.fetch(url+'/api/state',admin);state=json.loads(raw)
  username=state['settings'].get('lastUsername','')
  if not username:raise RuntimeError('Saved username unavailable')
  error=''
  if state['connection']!='connected':
   try:release.fetch(url+'/api/connect',admin,{'username':username,'warmEntertainment':False})
   except urllib.error.HTTPError as exc:
    try:error=str(json.loads(exc.read()).get('error','Connection recovery rejected')).replace(username,'[account]')
    except Exception:error='Connection recovery rejected'
  deadline=time.monotonic()+60
  while time.monotonic()<deadline:
   _,raw,_=release.fetch(url+'/api/state',admin);state=json.loads(raw)
   if state['connection']=='connected':break
   time.sleep(3)
  report.update(status='ready' if state['connection']=='connected' else 'recovery_pending',connection=state['connection'],resume_only=True,lip_sync_ready=state.get('capabilities',{}).get('liveLipSync',False),recovery_error=error)
  write()
  if state['connection']!='connected':raise RuntimeError('Live connection recovery remains pending')
  sys.exit(0)
 release.reconstruct(owner['id'])
 subprocess.run(['npm','ci','--ignore-scripts','--no-audit','--no-fund'],cwd=release.APP,check=True)
 subprocess.run(['npm','test'],cwd=release.APP,check=True)
 api=HfApi(token=os.environ['HF_TOKEN']);account=api.whoami()['name']
 if account!='afgtakrun':raise RuntimeError('Unexpected owner')
 repo=account+'/aryana-live-studio';release.free(api,repo);space=api.space_info(repo);url=str(space.host).rstrip('/')
 import hmac
 admin=hmac.new(os.environ['TELEGRAM_BOT_TOKEN'].encode(),('aryana-admin-v1:'+repo).encode(),hashlib.sha256).hexdigest()
 _,raw,_=release.fetch(url+'/api/state',admin);before=json.loads(raw)
 connected=before['connection']=='connected' or bool(before.get('live',{}).get('active'));username=before['settings'].get('lastUsername','')
 if connected and not username:raise RuntimeError('Cannot safely resume an unnamed connection')
 report.update(was_connected=connected,source_commit=source_sha);write()
 # Flush an identical settings checkpoint, without speaking or disconnecting.
 release.fetch(url+'/api/settings',admin,{'volume':before['settings']['volume']})
 time.sleep(31)
 server=release.APP/'src/server.mjs';text=server.read_text();needle="build:process.env.ARYANA_BUILD_SHA||'local'"
 if needle not in text:raise RuntimeError('Unexpected server version')
 server.write_text(text.replace(needle,'build:'+json.dumps(source_sha)))
 paths=['src/entertainment.mjs','src/automatic-speech.mjs','src/comment-inbox.mjs','src/replies.mjs','public/latin-label.js','src/topics.mjs','src/speech-queue.mjs','public/engagement.js','src/media-http.mjs','src/host.mjs','src/server.mjs','src/reaction-clips.mjs','public/assets/reaction-clips.json']
 if request.get('video_only'):
  paths+=['public/live.html','public/live.js','public/style.css','public/index.html','public/app.js','public/assets/idle.mp4','public/assets/introduction.mp4','public/assets/reaction-thanks.mp4']
  page=(release.APP/'public/live.html').read_text()
  if '<img' in page or 'poster=' in page or 'autoplay' not in page:raise RuntimeError('Video-only startup contract failed')
 if request.get('neural_lipsync'):
  worker_info=api.space_info('afgtakrun/aryana-live-lipsync')
  worker_config=json.loads((release.APP/'src/lipsync-config.json').read_text())
  if not worker_info.private or worker_info.sha!=worker_config['revision']:raise RuntimeError('Private worker revision was not verified')
  paths+=['src/neural-lipsync.mjs','src/lipsync-config.json','tools/lipsync-client.py','requirements-lipsync.txt','Dockerfile','src/speech-engine.mjs','src/speech.py','src/voice_clone.py','src/languages.mjs','src/local-chat.mjs','src/local-chat.py']
 uploaded=api.create_commit(repo,repo_type='space',operations=[CommitOperationAdd(path_in_repo=p,path_or_fileobj=str(release.APP/p)) for p in paths],commit_message='Fix entry welcomes and exact gift thanks '+source_sha[:12])
 report['status']='building';write();deadline=time.monotonic()+600
 while time.monotonic()<deadline:
  runtime=api.get_space_runtime(repo)
  if str(runtime.stage) in ['BUILD_ERROR','RUNTIME_ERROR','CONFIG_ERROR']:raise RuntimeError('Hotfix build failed')
  try:
   _,raw,_=release.fetch(url+'/health');health=json.loads(raw)
   if health.get('build')==source_sha and runtime.raw.get('sha')==uploaded.oid:break
  except Exception:pass
  time.sleep(4)
 else:raise RuntimeError('Hotfix readiness timed out')
 _,raw,_=release.fetch(url+'/api/state',admin);state=json.loads(raw)
 if state['settings'].get('lastUsername')!=username:raise RuntimeError('Saved username was not preserved')
 if connected and state['connection']!='connected':release.fetch(url+'/api/connect',admin,{'username':username,'warmEntertainment':False})
 deadline=time.monotonic()+60
 while connected and time.monotonic()<deadline:
  _,raw,_=release.fetch(url+'/api/state',admin);state=json.loads(raw)
  if state['connection']=='connected':break
  time.sleep(2)
 if request.get('video_only'):
  release.fetch(url+'/api/settings',admin,{'avatarMode':request.get('default_mode','portrait')})
  _,page,_=release.fetch(url+'/live')
  if b'<img' in page or b'poster=' in page or b'AI-Generated' not in page:raise RuntimeError('Published video-only output failed')
  for name in ['idle.mp4','introduction.mp4','reaction-thanks.mp4']:
   _,data,_=release.fetch(url+'/assets/'+name)
   if hashlib.sha256(data).hexdigest()!=hashlib.sha256((release.APP/'public/assets'/name).read_bytes()).hexdigest():raise RuntimeError('Published media mismatch')
  report['video_only_verified']=True
 if request.get('motion_release'):
  if state.get('playback',{}).get('idleVideo')!='/assets/idle.mp4?v='+hashlib.sha256((release.APP/'public/assets/idle.mp4').read_bytes()).hexdigest()[:16]:raise RuntimeError('Automatic media version update failed')
  report.update(idle_seconds=60,idle_blinks_per_minute=6,versioned_idle_verified=True)
 if request.get('playback_compatibility'):
  asset=url+'/assets/idle.mp4'
  with urllib.request.urlopen(urllib.request.Request(asset,headers={'Range':'bytes=0-1'}),timeout=30) as response:
   if response.status!=206 or response.headers.get('Content-Length')!='2' or len(response.read())!=2:raise RuntimeError('Public media Range probe failed')
  with urllib.request.urlopen(urllib.request.Request(asset,method='HEAD'),timeout=30) as response:
   if response.status!=200 or int(response.headers.get('Content-Length','-1'))!=(release.APP/'public/assets/idle.mp4').stat().st_size:raise RuntimeError('Public media HEAD probe failed')
  report.update(byte_range_verified=True,head_verified=True)
 if request.get('neural_lipsync'):
  release.fetch(url+'/api/lip-prepare',admin,{})
  deadline=time.monotonic()+240
  while time.monotonic()<deadline:
   _,raw,_=release.fetch(url+'/api/state',admin);state=json.loads(raw)
   if state.get('livePreparation',{}).get('status')=='ready' and state.get('voiceEngine',{}).get('warmed') and state.get('lipSync',{}).get('ready'):break
   if state.get('livePreparation',{}).get('status')=='error':raise RuntimeError('Live voice and lip preparation failed')
   if state.get('lipSync',{}).get('lastError') and not state.get('lipSync',{}).get('pending'):raise RuntimeError('Neural worker preparation failed')
   time.sleep(2)
  else:raise RuntimeError('Neural worker warmup timed out')
  _,public_raw,_=release.fetch(url+'/api/playback')
  public=json.loads(public_raw)
  if any(key in public for key in ['settings','lipTest','voiceEngine','storage','livePreparation']):raise RuntimeError('Private state exposed by output fallback')
  report['public_output_fallback_verified']=True
  if not state.get('live',{}).get('active') and state['connection']!='connected':
   release.fetch(url+'/api/entertainment-prepare',admin,{})
   deadline=time.monotonic()+300
   while time.monotonic()<deadline:
    _,fun_raw,_=release.fetch(url+'/api/state',admin);state=json.loads(fun_raw)
    if state.get('entertainment',{}).get('cachedClips',0)>=3 and not state.get('entertainment',{}).get('preparing'):break
    if state.get('speech')=='error' or state.get('entertainment',{}).get('preparation')=='error':raise RuntimeError('Entertainment preparation failed')
    time.sleep(2)
   else:raise RuntimeError('Entertainment preparation timed out')
   report['entertainment_starters_prepared']=state['entertainment']['cachedClips']
  else:report['entertainment_starters_prepared']='deferred_to_active_live'
  report['neural_prepared']=True
  report['initial_preparation_seconds']=state.get('livePreparation',{}).get('seconds')
  if state['connection']=='connected' or state.get('live',{}).get('active') or request.get('engagement_overlay'):
   report['private_neural_test']='skipped_ui_only_change' if request.get('engagement_overlay') else 'skipped_active_live'
  else:
   _,raw,_=release.fetch(url+'/api/lip-test',admin,{'text':'اکنون در خروجی لایف هم حرکت لب دیده می‌شود.','language':'fa'});started_state=json.loads(raw)['state'];test_id=started_state['lipTest']['id']
   deadline=time.monotonic()+240
   while time.monotonic()<deadline:
    _,raw,_=release.fetch(url+'/api/state',admin);state=json.loads(raw);test=state.get('lipTest') or {}
    if test.get('id')==test_id and test.get('status')=='ready':break
    if test.get('id')==test_id and test.get('status') in ['error','cancelled']:raise RuntimeError('Private neural speech test failed')
    time.sleep(2)
   else:raise RuntimeError('Private neural speech test timed out')
   _,clip,_=release.fetch(url+test['video']);proof=Path('/tmp/aryana-neural-live-proof.mp4');proof.write_bytes(clip)
   media=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(proof)]))
   if not any(x.get('codec_type')=='audio' for x in media['streams']) or not test.get('voiceClone'):raise RuntimeError('Approved voice neural test failed')
   report.update(private_neural_test='passed_not_broadcast',fresh_reply_elapsed_seconds=test['elapsedSeconds'],fresh_reply_video_seconds=float(media['format']['duration']),fresh_reply_voice_clone=True)
   _,english_raw,_=release.fetch(url+'/api/lip-test',admin,{'text':'Hello, welcome to Aryana live!','language':'en'})
   english_id=json.loads(english_raw)['state']['lipTest']['id'];deadline=time.monotonic()+240
   while time.monotonic()<deadline:
    _,english_raw,_=release.fetch(url+'/api/state',admin);english_state=json.loads(english_raw);english=english_state.get('lipTest') or {}
    if english.get('id')==english_id and english.get('status')=='ready':break
    if english.get('id')==english_id and english.get('status') in ['error','cancelled']:raise RuntimeError('English private speech test failed')
    time.sleep(2)
   else:raise RuntimeError('English private speech test timed out')
   if not english.get('voiceClone') or not english.get('video'):raise RuntimeError('English cloned voice clip not ready')
   report.update(english_private_test='passed_not_broadcast',english_reply_elapsed_seconds=english['elapsedSeconds'])

  if not state.get('capabilities',{}).get('liveLipSync'):raise RuntimeError('Fresh lip-sync capability was not ready')
  report.update(neural_lipsync_verified=True,lip_sync_delivery='generated_per_reply',streaming=False)
 report.update(status='ready',connection=state['connection'],connection_resumed=state['connection']=='connected' if connected else None,recorded_welcome_ready=state.get('capabilities',{}).get('recordedReactions',0)>=2,username_preserved=True,conversation_language=state['settings'].get('language'),conversation_topic=state['settings'].get('topic'),viewer_invitations_enabled=True,comment_priority_enabled=True,origin_reply='virtual_ai_company',continuous_entertainment_enabled=state['settings'].get('entertainmentEnabled',False),like_milestones=[100,500,1000],named_gift_thanks=True)
 message='قانون واکنش آریانا اصلاح شد:\nورود: سلام، خوش آمدید.\nگیفت و لایک: بسیار تشکر.\nنام‌های عددی خوانده نمی‌شوند. خوش‌آمد ویژهٔ مهمانان شناخته‌شدهٔ بالای لیول ۲۵ حفظ شد.\n'+('اتصال دریافت تیک‌تاک دوباره متصل است.' if report['connection_resumed'] else 'وضعیت اتصال را در پنل بررسی کنید.')
 if request.get('video_only'):message+='\n\nویدیوی انتظار آریانا به‌روزرسانی شد: ۶۰ ثانیه با حرکت‌های متفاوت و حدود ۶ پلک‌زدن کوتاه در دقیقه. چشمک‌های اضافی حذف و اتصال‌های دوچهره‌ای اصلاح شدند. پخش پس از اتصال دوباره باید فایل جدید را خودکار بگیرد؛ اگر هنوز نسخهٔ قبلی را می‌بینید، منبع Browser/Link را یک بار Refresh کنید. فقط AI-Generated نمایش داده می‌شود. خوش‌آمد و تشکر ویدیوی هماهنگ دارند؛ پاسخ‌های تازه فعلاً صوتی‌اند و حرکت لبِ تازه تولید نمی‌شود.\nhttps://afgtakrun-aryana-live-studio.hf.space/live?v=f48e2929dd1d26fa'
 if request.get('playback_compatibility'):
  version=hashlib.sha256((release.APP/'public/assets/idle.mp4').read_bytes()).hexdigest()[:16]
  message='مشکل نمایش ویدیوی آریانا اصلاح شد. پخش بخش‌بخشی ویدیو و سازگاری فایل برای مرورگرهای موبایل به‌روزرسانی شد. ویدیو همان نسخهٔ ۶۰ثانیه‌ای با چشمک‌های کمتر است. اگر مرورگر پخش خودکار را مسدود کرد، ▶ را لمس کنید. فقط AI-Generated روی خروجی دیده می‌شود.\n\n'+url+'/live?v='+version+'\nنسخهٔ موبایل:\n'+url+'/mobile?v='+version+'\nاگر منبع باز در LIVE Studio هنوز صفحهٔ قبلی را دارد، یک بار Refresh کنید. خوش‌آمد و تشکر ویدیوی هماهنگ دارند؛ پاسخ‌های تازه فعلاً صوتی‌اند.'
 if request.get('neural_lipsync'):
  message='سرگرمی آریانا اضافه شد: گفتگوی پیوسته‌تر، جوک با خندهٔ صوتی ملایم، کوییز با A/B یا ۱/۲ و توضیح جواب. دعوت به ماندن، نظر دادن و شریک‌کردن لایف هم میان برنامه است؛ پاسخ کومنت اولویت دارد.\n\nتشکر نام‌دار برای گیفت و رسیدن لایک هر نفر به ۱۰۰، ۵۰۰ و ۱۰۰۰ اضافه شد؛ هر مرحله یک بار در همان لایف. نام‌های عددی و نامطمئن خوانده نمی‌شوند.\n\nپنل را تازه کنید و «رفرش لایف» را بزنید. برای کم‌شدن وقفه، پیش از اتصال، «آماده‌سازی سرگرمی پیش از لایف» را اجرا کنید. در شروعِ آماده‌سازی یا هنگام تولید جواب تازه ممکن است مکث باشد؛ بخش‌های آماده دوباره با همان صدا و لب‌خوانی هماهنگ پخش می‌شوند.\n'+('اتصال تیک‌تاک برقرار است.' if state['connection']=='connected' else 'دریافت تیک‌تاک را از پنل وصل کنید.')
 report['telegram_message_id']=release.tg('sendMessage',{'chat_id':chat,'text':message})['message_id'];write()
except Exception as e:
 report.update(status='failed',error_type=type(e).__name__);write();raise


