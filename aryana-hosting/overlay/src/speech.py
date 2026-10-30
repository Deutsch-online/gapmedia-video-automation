"""Generate complete speech; apply the private Aryana tone profile when configured."""
import asyncio
import signal
import base64
import subprocess
import tempfile
import json
import os
from pathlib import Path
import ssl
import sys

import edge_tts
signal.signal(signal.SIGTERM,lambda *_:sys.exit(143))

if os.environ.get('SSL_CERT_FILE'):
    import edge_tts.communicate as transport
    transport._SSL_CTX = ssl.create_default_context(cafile=os.environ['SSL_CERT_FILE'])

async def synthesize(request):
    text = request['text']
    if not isinstance(text, str) or not 1 <= len(text) <= 1000:
        raise ValueError('Invalid sentence')
    voice = 'en-US-AvaNeural' if request.get('language') == 'en' else 'fa-IR-DilaraNeural'
    target = Path(request['output'])
    target.parent.mkdir(parents=True, exist_ok=True)
    encoded_profile=os.environ.get('ARYANA_VOICE_PROFILE_B64')
    with tempfile.TemporaryDirectory(prefix='.aryana-speech-',dir=str(target.parent)) as work:
        staged=Path(work)/'result.mp3'
        source=Path(work)/'base.mp3' if encoded_profile else staged
        await asyncio.wait_for(edge_tts.Communicate(
            text, voice=voice, rate='-8%',
            proxy=os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy'),
        ).save(str(source)), timeout=45)
        if encoded_profile:
            from voice_clone import convert
            profile=json.loads(base64.b64decode(encoded_profile,validate=True))
            wave=Path(work)/'converted.wav'
            convert(source,wave,profile,os.environ.get('ARYANA_CLONE_ASSETS','/opt/aryana-voice-assets'))
            subprocess.run(['ffmpeg','-v','error','-y','-i',str(wave),'-af','loudnorm=I=-16:TP=-1.5:LRA=11','-codec:a','libmp3lame','-b:a','128k',str(staged)],check=True,timeout=30)
        if not 1000 < staged.stat().st_size < 2_000_000:
            raise ValueError('Invalid generated audio')
        probe=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(staged)],check=True,capture_output=True,text=True,timeout=10)
        if not .15<float(probe.stdout.strip())<180:raise ValueError('Invalid speech duration')
        os.replace(staged,target)
    return {'voice': 'Aryana custom tone' if encoded_profile else voice, 'bytes': target.stat().st_size}

def warmup(request):
    encoded=os.environ.get('ARYANA_VOICE_PROFILE_B64')
    if not encoded:return {'warmed':True,'clone':False}
    from voice_clone import convert
    profile=json.loads(base64.b64decode(encoded,validate=True))
    sample=Path(request['sample']);directory=Path(request['directory']);directory.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.voice-warm-',dir=str(directory)) as temp:
        source=Path(temp)/'source.wav';output=Path(temp)/'warm.wav'
        subprocess.run(['ffmpeg','-v','error','-y','-i',str(sample),'-t','1.5','-ar','22050','-ac','1',str(source)],check=True,timeout=20)
        convert(source,output,profile,os.environ.get('ARYANA_CLONE_ASSETS','/opt/aryana-voice-assets'))
    return {'warmed':True,'clone':True}

def worker():
    print(json.dumps({'ready':True}),flush=True)
    for line in sys.stdin:
        if len(line)>20000:continue
        request=None
        try:
            request=json.loads(line)
            result=warmup(request) if request.get('action')=='warmup' else asyncio.run(synthesize(request))
            print(json.dumps({'id':request['id'],'ok':True,'result':result}),flush=True)
        except Exception:
            print(json.dumps({'id':request.get('id') if isinstance(request,dict) else None,'ok':False}),flush=True)

if __name__ == '__main__':
    if '--worker' in sys.argv:worker()
    else:print(json.dumps(asyncio.run(synthesize(json.loads(sys.stdin.read(16000))))))
