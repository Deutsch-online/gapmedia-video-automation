"""Download pinned public SadTalker CPU-preview assets with SHA-256 validation."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
from pathlib import Path
import subprocess
from urllib.request import urlopen

REVISION = 'cd4c0465ae0b54a6f85af57f5c65fec9fe23e7f8'
MODEL_REVISION = 'df6f230f2fbec618d69e47229ea32dd224fc9c5c'
MODEL_BASE = f'https://huggingface.co/vinthony/SadTalker-V002rc/resolve/{MODEL_REVISION}/'
FILES = [
    (MODEL_BASE+'SadTalker_V0.0.2_256.safetensors', 'checkpoints/SadTalker_V0.0.2_256.safetensors', 'c211f5d6de003516bf1bbda9f47049a4c9c99133b1ab565c6961e5af16477bff'),
    (MODEL_BASE+'mapping_00109-model.pth.tar', 'checkpoints/mapping_00109-model.pth.tar', '84a8642468a3fcfdd9ab6be955267043116c2bec2284686a5262f1eaf017f64c'),
    ('https://github.com/xinntao/facexlib/releases/download/v0.1.0/alignment_WFLW_4HG.pth', 'gfpgan/weights/alignment_WFLW_4HG.pth', 'bbfd137307a4c7debd5c283b9b0ce539466cee417ac0a155e184d857f9f2899c'),
    ('https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth', 'gfpgan/weights/detection_Resnet50_Final.pth', '6d1de9c2944f2ccddca5f5e010ea5ae64a39845a86311af6fdf30841b0a5a16d'),
]

def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as source:
        while data:=source.read(1024*1024):
            h.update(data)
    return h.hexdigest()

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--directory',required=True)
    args=p.parse_args()
    root=Path(args.directory).resolve()
    root.parent.mkdir(parents=True,exist_ok=True)
    if not (root/'.git').is_dir():
        subprocess.run(['git','clone','--filter=blob:none','https://github.com/OpenTalker/SadTalker.git',str(root)],check=True)
    head=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()
    if head!=REVISION:
        dirty=subprocess.check_output(['git','-C',str(root),'status','--porcelain'],text=True).strip()
        if dirty:
            raise RuntimeError('Existing model checkout has local changes; select a new directory.')
        subprocess.run(['git','-C',str(root),'fetch','origin',REVISION,'--depth=1'],check=True)
        subprocess.run(['git','-C',str(root),'checkout',REVISION],check=True)

    def download(row):
        url,name,expected=row
        target=root/name;target.parent.mkdir(parents=True,exist_ok=True)
        if target.exists() and digest(target)==expected:
            print('Verified:',name,flush=True)
            return
        temporary=target.with_name(target.name+'.partial')
        try:
            with urlopen(url,timeout=120) as response,temporary.open('wb') as out:
                while data:=response.read(1024*1024):
                    out.write(data)
            if digest(temporary)!=expected:
                raise RuntimeError('Asset SHA-256 mismatch: '+name)
            temporary.replace(target)
            print('Downloaded and verified:',name,flush=True)
        finally:
            temporary.unlink(missing_ok=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(download,FILES))
    print('CPU preview models ready:',root)

if __name__=='__main__':
    main()
