"""CPU tone conversion for Aryana; private profile never leaves server memory."""
import contextlib,hashlib,json,os,sys
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
ASSET_HASHES={'checkpoint.pth':'9652c27e92b6b2a91632590ac9962ef7ae2b712e5c5b7f4c34ec55ee2b37ab9e','config.json':'9dfff60350b8c63f2c664efd92a61b2516efb22671466960f0e5dfebd881fa47'}
def converter(root):
 root=Path(root)
 for name,digest in ASSET_HASHES.items():
  if hashlib.sha256((root/name).read_bytes()).hexdigest()!=digest:raise ValueError('Voice model integrity failed')
 sys.path.insert(0,str(root))
 from openvoice.api import ToneColorConverter,OpenVoiceBaseClass
 torch.set_num_threads(2)
 torch.set_num_interop_threads(1)
 with contextlib.redirect_stdout(sys.stderr):
  c=ToneColorConverter.__new__(ToneColorConverter)
  OpenVoiceBaseClass.__init__(c,str(root/'config.json'),device='cpu')
  c.watermark_model=None
  c.version=getattr(c.hps,'_version_','v2')
  c.load_ckpt(str(root/'checkpoint.pth'))
 return c

def read_profile(profile):
 if isinstance(profile,str):profile=json.loads(profile)
 if profile.get('version')!=1 or profile.get('method')!='OpenVoice-V2':raise ValueError('Unknown voice profile')
 values=np.asarray(profile.get('embedding'),dtype=np.float32)
 if values.shape!=(1,256,1) or not np.isfinite(values).all() or float(np.abs(values).max())>100:raise ValueError('Invalid private voice profile')
 return torch.tensor(values)

def convert(source,output,profile,assets):
 target=read_profile(profile);c=converter(assets)
 with contextlib.redirect_stdout(sys.stderr):
  source_se=c.extract_se(str(source))
  result=c.convert(str(source),source_se,target,output_path=None,message='Aryana AI voice')
 if not np.isfinite(result).all() or len(result)<11025 or float(np.max(np.abs(result)))<1e-5:raise ValueError('Invalid converted voice')
 import librosa
 original,_=librosa.load(str(source),sr=22050)
 if abs(len(result)-len(original))>2205:raise ValueError('Voice conversion changed duration')
 sf.write(output,result,22050,subtype='PCM_16')
 return {'method':'OpenVoice V2 tone conversion','seconds':round(len(result)/22050,3),'reference_uploaded':False,'exact_clone_claim':False}

if __name__=='__main__':
 request=json.loads(sys.stdin.read(200000))
 result=convert(request['source'],request['output'],request['profile'],request['assets'])
 print(json.dumps(result))
