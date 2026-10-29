"""Publish the Neon LIVE Arena on explicitly free HF CPU-basic hardware only.

Secrets stay in process memory or Space secrets. The private control URL is sent
only to the already-configured private Telegram owner, never to build logs.
"""
import hashlib
import hmac
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'neon-live-arena'
REPORT=Path('/tmp/neon-live-deployment.json')


def write_report(value):
    REPORT.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')


def telegram(token,method,payload):
    req=urllib.request.Request('https://api.telegram.org/bot'+token+'/'+method,
        data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=20) as response:data=json.load(response)
    if not data.get('ok'):raise RuntimeError('Private Telegram operation failed')
    return data['result']


def free_runtime(api,repo):
    runtime=api.get_space_runtime(repo)
    if runtime.hardware not in (None,'cpu-basic') or runtime.requested_hardware not in (None,'cpu-basic') or 'cpu-basic' not in (runtime.hardware,runtime.requested_hardware):
        raise RuntimeError('Refusing non-free hardware; no upgrade requested')
    return runtime


def deployment_ready(runtime,health,build,space_commit):
    stage=str(getattr(runtime.stage,'value',runtime.stage))
    return stage=='RUNNING' and runtime.raw.get('sha')==space_commit and health.get('ok') is True and health.get('version')=='neon-live-arena-v1' and health.get('build')==build


def deploy():
    from huggingface_hub import HfApi,CommitOperationAdd,SpaceHardware
    from huggingface_hub.errors import RepositoryNotFoundError
    token=os.environ['HF_TOKEN'];bot_token=os.environ['TELEGRAM_BOT_TOKEN']
    chat=os.getenv('TELEGRAM_REVIEW_CHAT_ID') or os.environ['TELEGRAM_CHAT_ID']
    info=telegram(bot_token,'getChat',{'chat_id':chat})
    if info.get('type')!='private':raise RuntimeError('Private owner delivery required')
    api=HfApi(token=token);owner=api.whoami()['name'];repo=owner+'/neon-live-arena'
    try:space=api.space_info(repo)
    except RepositoryNotFoundError:
        api.create_repo(repo,repo_type='space',space_sdk='docker',space_hardware=SpaceHardware.CPU_BASIC,private=False)
        space=api.space_info(repo)
    free_runtime(api,repo)
    url=str(space.host).rstrip('/')
    if not url.startswith('https://') or not url.endswith('.hf.space'):raise RuntimeError('Unexpected hosting URL')
    admin=hmac.new(bot_token.encode(),('neon-admin-v1:'+repo).encode(),hashlib.sha256).hexdigest()
    api.add_space_secret(repo,key='LUDO_ADMIN_TOKEN',value=admin)
    api.add_space_variable(repo,key='PUBLIC_URL',value=url)
    build=os.getenv('GITHUB_SHA','manual')
    api.add_space_variable(repo,key='LUDO_BUILD_SHA',value=build)
    paths=subprocess.check_output(['git','ls-files','-z','--','neon-live-arena'],cwd=ROOT).decode().split('\0')
    operations=[]
    for relative in filter(None,paths):
        file=ROOT/relative
        if file.is_symlink() or not file.resolve().is_relative_to(APP.resolve()):raise RuntimeError('Unexpected source path')
        name=file.relative_to(APP).as_posix()
        if name in ('settings.json','.runtime.json') or 'node_modules' in file.parts:raise RuntimeError('Private runtime file in source')
        operations.append(CommitOperationAdd(path_in_repo=name,path_or_fileobj=str(file)))
    uploaded=api.create_commit(repo,repo_type='space',operations=operations,commit_message='Deploy tested Neon LIVE Arena source '+build[:12])
    report={'repo':repo,'url':url,'hardware':'cpu-basic','paid_requested':False,'gpu_requested':False,'build':build,'status':'building'}
    write_report(report)
    ready=False
    deadline=time.monotonic()+12*60
    while time.monotonic()<deadline:
        runtime=free_runtime(api,repo)
        stage=str(getattr(runtime.stage,'value',runtime.stage))
        report['space_stage']=stage
        if stage in ('BUILD_ERROR','CONFIG_ERROR','RUNTIME_ERROR'):raise RuntimeError('Free Space build/runtime failed')
        try:
            with urllib.request.urlopen(url+'/health',timeout=15) as response:health=json.load(response)
            if deployment_ready(runtime,health,build,uploaded.oid):
                ready=True;break
        except (OSError,ValueError):pass
        time.sleep(8)
    if not ready:raise RuntimeError('Free Space did not become ready within the bounded deployment window')
    report.update(status='ready',screen_url=url+'/dance',deployed_at=datetime.now(timezone.utc).isoformat())
    write_report(report)
    # Verify the delivered entry and real assets, not just a container health route.
    with urllib.request.urlopen(url+'/?studio=1',timeout=20) as response:
        if 'Neon LIVE Arena' not in response.read().decode():raise RuntimeError('Studio page verification failed')
    for asset in ('dancer.glb','head-scan.glb','dance-motion.glb'):
        with urllib.request.urlopen(url+'/models/'+asset,timeout=20) as response:
            if response.headers.get_content_type()!='model/gltf-binary' or response.read(4)!=b'glTF':raise RuntimeError('Human asset verification failed')
    check_env=dict(os.environ,NEON_CHECK_URL=url,NEON_CHECK_TOKEN=admin)
    check="""import WebSocket from 'ws';
const ws=new WebSocket(process.env.NEON_CHECK_URL.replace(/^https:/,'wss:')+'/events');
const timer=setTimeout(()=>{ws.terminate();process.exit(2)},20000);
ws.on('open',()=>ws.send(JSON.stringify({type:'auth',token:process.env.NEON_CHECK_TOKEN})));
ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='auth'){clearTimeout(timer);ws.close();process.exit(m.ok?0:3)}});
ws.on('error',()=>process.exit(4));"""
    subprocess.run(['node','--input-type=module','-e',check],cwd=APP,env=check_env,check=True,timeout=25)
    report['studio_verified']=True;report['human_assets_verified']=True;report['owner_auth_verified']=True
    write_report(report)
    control=url+'/?studio=1#'+admin
    message=telegram(bot_token,'sendMessage',{'chat_id':chat,'link_preview_options':{'is_disabled':True},'text':
        '💃 Neon LIVE Arena آماده است.\n\n🎥 صحنهٔ رقص برای LIVE Studio / OBS:\n'+url+'/dance'+
        '\n\n🔐 پنل خصوصی استودیو:\n'+control+
        '\n\nمدل انسانی با لباس بافت‌دار، چهرهٔ اسکن‌شده و رقص ضبط‌شده منتشر شد. چهرهٔ این اسکن چشم‌های بسته و حالت ثابت دارد.'+
        '\nخروجی را با اندازهٔ 1080 × 1920 اضافه کنید. لینک مدیریت را خصوصی نگه دارید.'})
    report['private_link_delivered']=True;report['telegram_message_id']=message.get('message_id');write_report(report)
    print('NEON_LIVE_READY: '+json.dumps(report))


if __name__=='__main__':
    try:deploy()
    except Exception as exc:
        report=json.loads(REPORT.read_text()) if REPORT.exists() else {}
        status=getattr(getattr(exc,'response',None),'status_code',None)
        if isinstance(exc,urllib.error.HTTPError):status=exc.code
        report.update(status='blocked',error_type=type(exc).__name__,http_status=status,paid_requested=False,gpu_requested=False)
        if type(exc) is RuntimeError and str(exc) in ('Private owner delivery required','Refusing non-free hardware; no upgrade requested','Unexpected hosting URL','Unexpected source path','Private runtime file in source','Free Space build/runtime failed','Free Space did not become ready within the bounded deployment window','Private Telegram operation failed','Studio page verification failed','Human asset verification failed'):
            report['reason']=str(exc)
        write_report(report)
        print('NEON_LIVE_BLOCKED: '+json.dumps(report))
        sys.exit(1)

