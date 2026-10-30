"""Install a verified Higgsfield CLI and check access without generation or login."""
import hashlib,io,json,os,subprocess,tarfile,urllib.request,urllib.parse,selectors,time,re
from pathlib import Path
out=Path('/tmp/aryana-higgsfield');out.mkdir(exist_ok=True)
url='https://github.com/higgsfield-ai/cli/releases/download/v1.2.3/hf_1.2.3_linux_amd64.tar.gz'
data=urllib.request.urlopen(url,timeout=60).read()
if hashlib.sha256(data).hexdigest()!='0ed594ae42646d494b9eaeec4359211f6cfd653ce4f790aa4ca6a48c1a431529':raise RuntimeError('CLI checksum mismatch')
with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
 for member in archive.getmembers():
  name=Path(member.name).name
  if member.isfile() and name in ['hf','LICENSE','THIRD-PARTY-NOTICES.txt']:
   (out/('higgsfield' if name=='hf' else name)).write_bytes(archive.extractfile(member).read())
cli=out/'higgsfield';cli.chmod(0o755)
def run(args):
 try:return subprocess.run([str(cli),*args],capture_output=True,text=True,timeout=40)
 except subprocess.TimeoutExpired:return None
version=run(['version'])
account=run(['account','status','--json'])
help_result=run(['auth','login','--help'])
if help_result and help_result.returncode==0:(out/'auth-login-help.txt').write_text(help_result.stdout)
models=run(['model','list','--json'])
report={'cli_verified':True,'version':version.stdout.strip()[:150] if version and version.returncode==0 else None,'authenticated':bool(account and account.returncode==0),'model_catalog_available':bool(models and models.returncode==0),'generation_requested':False,'billing_requested':False,'credential_names_configured':{name:bool(os.environ.get(name)) for name in ['HIGGSFIELD_TOKEN','HIGGSFIELD_API_KEY']}}
if not report['authenticated']:
 detail=((account.stdout+account.stderr).lower() if account else '')
 report['access_status']='login_required' if any(x in detail for x in ['not authenticated','session expired','login','log in','not logged','authentication required','no credentials']) else 'not_verified'
if report['model_catalog_available']:
 (out/'model-catalog.json').write_text(models.stdout)
 schema=run(['model','get','seedance_2_5','--json'])
 report['preferred_model_verified']=bool(schema and schema.returncode==0)
 if report['preferred_model_verified']:(out/'seedance-schema.json').write_text(schema.stdout)
account_help=run(['account','--help'])
if account_help and account_help.returncode==0:print('HIGGSFIELD_ACCOUNT_HELP\\n'+account_help.stdout[:4000])
if account and account.returncode!=0:
 safe=(account.stdout+' '+account.stderr).lower()
 report['account_failure_kind']='unknown_command' if 'unknown command' in safe else ('authentication' if any(x in safe for x in ['not authenticated','not logged','login','log in','session expired','auth']) else 'other')
# Inspect the official login transport without authorizing an account; never print URLs/state/code.
probe=subprocess.Popen([str(cli),'auth','login','--port','19365'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
selector=selectors.DefaultSelector();selector.register(probe.stdout,selectors.EVENT_READ);captured='';deadline=time.monotonic()+5
while time.monotonic()<deadline and probe.poll() is None:
 for key,_ in selector.select(.2):
  captured+=key.fileobj.readline()
probe.terminate()
try:tail,_=probe.communicate(timeout=3)
except subprocess.TimeoutExpired:
 probe.kill();tail,_=probe.communicate()
captured+=tail or ''
urls=re.findall(r'https?://[^\\s\\x1b]+',captured)
report['login_transport']=[]
for url in urls:
 parsed=urllib.parse.urlparse(url);item={'host':parsed.hostname,'path':parsed.path,'query_keys':list(urllib.parse.parse_qs(parsed.query))}
 for values in urllib.parse.parse_qs(parsed.query).values():
  for value in values:
   callback=urllib.parse.urlparse(value)
   if callback.hostname in ['127.0.0.1','localhost']:item['callback_path']=callback.path;item['callback_port']=callback.port
 report['login_transport'].append(item)
(out/'report.json').write_text(json.dumps(report,indent=2))
print('ARYANA_HIGGSFIELD_PREFLIGHT '+json.dumps(report))
if help_result and help_result.returncode==0:print('HIGGSFIELD_AUTH_HELP\n'+help_result.stdout[:6000])
