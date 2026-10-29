"""Download a pinned public Apache-2.0 CPU conversation model, with checksum."""
import hashlib,sys,urllib.request
from pathlib import Path
path=Path(sys.argv[1]);path.parent.mkdir(parents=True,exist_ok=True)
expected='7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5'
if path.exists():
 with path.open('rb') as file:
  if hashlib.file_digest(file,'sha256').hexdigest()==expected:print('Local chat model validated');sys.exit(0)
url='https://huggingface.co/Qwen/Qwen3-4B-GGUF/resolve/bc640142c66e1fdd12af0bd68f40445458f3869b/Qwen3-4B-Q4_K_M.gguf'
hash=hashlib.sha256()
with urllib.request.urlopen(url,timeout=180) as response,path.with_suffix('.part').open('wb') as output:
 while data:=response.read(1024*1024):output.write(data);hash.update(data)
if hash.hexdigest()!=expected:raise ValueError('Chat model checksum mismatch')
path.with_suffix('.part').replace(path);print('CPU chat model checksum verified')
