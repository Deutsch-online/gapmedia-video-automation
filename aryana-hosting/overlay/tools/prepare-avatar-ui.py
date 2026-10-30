"""Fetch immutable, integrity-checked CC0/MIT avatar assets; no paid services."""
import hashlib,json,urllib.request,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1];build=root/'tools/avatar-build';out=root/'public/assets/avatar';out.mkdir(parents=True,exist_ok=True)
for entry in json.loads((build/'assets.json').read_text()):
 name=Path(entry['path']).name
 target=(build/'vendor'/name) if name in ['talkinghead.mjs','retargeter.mjs','dynamicbones.mjs'] else out/name
 target.parent.mkdir(parents=True,exist_ok=True)
 if not target.exists() or hashlib.sha256(target.read_bytes()).hexdigest()!=entry['sha256']:
  data=urllib.request.urlopen('https://raw.githubusercontent.com/met4citizen/'+entry['repo']+'/'+entry['revision']+'/'+entry['path'],timeout=120).read()
  if hashlib.sha256(data).hexdigest()!=entry['sha256']:raise RuntimeError('Avatar asset integrity failure: '+name)
  target.write_bytes(data)
subprocess.run(['npm','ci','--ignore-scripts','--prefix',str(build)],check=True)
subprocess.run([str(build/'node_modules/.bin/esbuild'),str(build/'vendor/talkinghead.mjs'),'--bundle','--format=esm','--minify','--outfile='+str(out/'talkinghead.bundle.mjs')],check=True)
