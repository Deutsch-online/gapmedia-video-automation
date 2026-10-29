"""Generate complete speech; apply the private Aryana tone profile when configured."""
import asyncio
import base64
import subprocess
import tempfile
import json
import os
from pathlib import Path
import ssl
import sys

import edge_tts

if os.environ.get('SSL_CERT_FILE'):
    import edge_tts.communicate as transport
    transport._SSL_CTX = ssl.create_default_context(cafile=os.environ['SSL_CERT_FILE'])

async def main():
    request = json.loads(sys.stdin.read(16000))
    text = request['text']
    if not isinstance(text, str) or not 1 <= len(text) <= 1000:
        raise ValueError('Invalid sentence')
    voice = 'en-US-AvaNeural' if request.get('language') == 'en' else 'fa-IR-DilaraNeural'
    target = Path(request['output'])
    target.parent.mkdir(parents=True, exist_ok=True)
    encoded_profile=os.environ.get('ARYANA_VOICE_PROFILE_B64')
    with tempfile.TemporaryDirectory(prefix='aryana-speech-') as work:
        source=Path(work)/'base.mp3' if encoded_profile else target
        await asyncio.wait_for(edge_tts.Communicate(
            text, voice=voice, rate='-8%',
            proxy=os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy'),
        ).save(str(source)), timeout=45)
        if encoded_profile:
            from voice_clone import convert
            profile=json.loads(base64.b64decode(encoded_profile,validate=True))
            wave=Path(work)/'converted.wav'
            convert(source,wave,profile,os.environ.get('ARYANA_CLONE_ASSETS','/opt/aryana-voice-assets'))
            subprocess.run(['ffmpeg','-v','error','-y','-i',str(wave),'-af','loudnorm=I=-16:TP=-1.5:LRA=11','-codec:a','libmp3lame','-b:a','128k',str(target)],check=True,timeout=30)
    if not 1000 < target.stat().st_size < 2_000_000:
        raise ValueError('Invalid generated audio')
    print(json.dumps({'voice': 'Aryana custom tone' if encoded_profile else voice, 'bytes': target.stat().st_size}))

if __name__ == '__main__':
    asyncio.run(main())
