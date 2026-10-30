"""Install a verified Higgsfield CLI and check access without generation or login."""
import hashlib,io,json,os,subprocess,tarfile,urllib.request
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
 report['access_status']='login_required' if any(x in detail for x in ['not authenticated','session expired','login','log in']) else 'not_verified'
if report['model_catalog_available']:
 (out/'model-catalog.json').write_text(models.stdout)
 schema=run(['model','get','seedance_2_5','--json'])
 report['preferred_model_verified']=bool(schema and schema.returncode==0)
 if report['preferred_model_verified']:(out/'seedance-schema.json').write_text(schema.stdout)
(out/'report.json').write_text(json.dumps(report,indent=2))
print('ARYANA_HIGGSFIELD_PREFLIGHT '+json.dumps(report))
if help_result and help_result.returncode==0:print('HIGGSFIELD_AUTH_HELP\n'+help_result.stdout[:6000])
