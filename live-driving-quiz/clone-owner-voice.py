"""Local owner-authorised tone conversion. Private reference/audio never leave this host."""
import base64,contextlib,hashlib,io,json,os,re,sys,tempfile,wave
from pathlib import Path
root=Path(os.environ.get('QUIZ_CLONE_ASSETS','/home/node/owner-voice-assets'))
for name,checksum in [('checkpoint.pth','9652c27e92b6b2a91632590ac9962ef7ae2b712e5c5b7f4c34ec55ee2b37ab9e'),('config.json','9dfff60350b8c63f2c664efd92a61b2516efb22671466960f0e5dfebd881fa47')]:
    if hashlib.sha256((root/name).read_bytes()).hexdigest()!=checksum:raise RuntimeError('Voice asset integrity failed')
sys.path.insert(0,str(root))
import numpy as np
import soundfile as sf
import torch
from openvoice.api import ToneColorConverter,OpenVoiceBaseClass
torch.set_num_threads(2);torch.set_num_interop_threads(1)
with contextlib.redirect_stdout(sys.stderr):
    converter=ToneColorConverter.__new__(ToneColorConverter);OpenVoiceBaseClass.__init__(converter,str(root/'config.json'),device='cpu');converter.watermark_model=None;converter.version=getattr(converter.hps,'_version_','v2');converter.load_ckpt(str(root/'checkpoint.pth'))
target=None;target_key=None
for line in sys.stdin:
    request={}
    try:
        if len(line)>12000000:raise ValueError('Oversized conversion')
        request=json.loads(line);reference=base64.b64decode(request['reference'],validate=True);audio=base64.b64decode(request['audio'],validate=True)
        if not re.fullmatch('[a-f0-9]{64}',request['referenceHash']) or hashlib.sha256(reference).hexdigest()!=request['referenceHash']:raise ValueError('Reference integrity')
        for data,minimum,maximum in [(reference,5,60),(audio,.15,120)]:
            with wave.open(io.BytesIO(data)) as wav:
                if wav.getframerate()!=22050 or wav.getnchannels()!=1 or wav.getsampwidth()!=2 or not minimum<=wav.getnframes()/22050<=maximum:raise ValueError('Invalid voice PCM')
        with tempfile.TemporaryDirectory(prefix='owner-voice-') as directory,contextlib.redirect_stdout(sys.stderr):
            os.chmod(directory,0o700);directory=Path(directory);source=directory/'source.wav';source.write_bytes(audio)
            if target_key!=request['referenceHash']:
                values,rate=sf.read(io.BytesIO(reference));paths=[]
                for i,part in enumerate(np.array_split(values,3)):
                    path=directory/f'reference-{i}.wav';sf.write(path,part,rate);paths.append(str(path))
                target=converter.extract_se(paths);target_key=request['referenceHash']
            source_se=converter.extract_se(str(source));values=converter.convert(str(source),source_se,target,output_path=None,message='FahrFit owner voice')
            if not np.isfinite(values).all():raise ValueError('Invalid converted voice')
            output=io.BytesIO();sf.write(output,values,22050,format='WAV',subtype='PCM_16');result=output.getvalue()
        print(json.dumps({'id':request['id'],'audio':base64.b64encode(result).decode(),'duration_ms':round(len(values)/22050*1000)}),flush=True)
    except Exception:
        if os.environ.get('QUIZ_CLONE_DEBUG')=='1':
            import traceback;traceback.print_exc(file=sys.stderr)
        print(json.dumps({'id':request.get('id'),'error':'owner_voice_unavailable'}),flush=True)
