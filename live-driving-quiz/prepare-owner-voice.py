"""Pinned public OpenVoice V2 CPU assets, downloaded only while building the image."""
import hashlib,io,sys,tarfile,urllib.request
from pathlib import Path
root=Path(sys.argv[1]);root.mkdir(parents=True,exist_ok=True)
items={'config.json':('9dfff60350b8c63f2c664efd92a61b2516efb22671466960f0e5dfebd881fa47','https://huggingface.co/myshell-ai/OpenVoiceV2/resolve/f36e7edfe1684461a8343844af60babc2efbb727/converter/config.json'),'checkpoint.pth':('9652c27e92b6b2a91632590ac9962ef7ae2b712e5c5b7f4c34ec55ee2b37ab9e','https://huggingface.co/myshell-ai/OpenVoiceV2/resolve/f36e7edfe1684461a8343844af60babc2efbb727/converter/checkpoint.pth')}
for name,(checksum,url) in items.items():
    path=root/name
    if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest()!=checksum:
        with urllib.request.urlopen(url,timeout=180) as response:data=response.read()
        if hashlib.sha256(data).hexdigest()!=checksum:raise RuntimeError('Voice model checksum mismatch')
        path.write_bytes(data)
with urllib.request.urlopen('https://codeload.github.com/myshell-ai/OpenVoice/tar.gz/74a1d147b17a8c3092dd5430504bd83ef6c7eb23',timeout=60) as response:source=response.read()
# The source archive is pinned by both commit and SHA-256.
if hashlib.sha256(source).hexdigest()!= 'a0bc7e5b2968ab7f8898d237b2b36f7de46710cbc3901f97dff29781eeae8abd':raise RuntimeError('Voice source checksum mismatch')
with tarfile.open(fileobj=io.BytesIO(source),mode='r:gz') as archive:
    for member in archive.getmembers():
        parts=Path(member.name).parts[1:]
        if not member.isfile() or '..' in parts or not parts:continue
        if (parts[0]=='openvoice' and member.name.endswith('.py')) or (len(parts)==1 and parts[0].startswith('LICENSE')):
            path=root.joinpath(*parts);path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(archive.extractfile(member).read())
print('Pinned MIT OpenVoice CPU assets ready; no personal recordings included')
