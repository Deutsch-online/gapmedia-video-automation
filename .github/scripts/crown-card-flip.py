import os,json,base64,urllib.request,urllib.error
from pathlib import Path
root=Path('crown52-hosting');out=root/'audio';out.mkdir(exist_ok=True)
key=os.environ.get('ELEVEN_API_KEY','')
if not key:raise RuntimeError('Existing ElevenLabs credential is not configured')
def call(path,payload=None):
    req=urllib.request.Request('https://api.elevenlabs.io'+path,data=None if payload is None else json.dumps(payload).encode(),headers={'xi-api-key':key,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=90) as r:return r.read(2000000)
    except urllib.error.HTTPError as e:raise RuntimeError('ElevenLabs HTTP '+str(e.code)) from None
    except Exception:raise RuntimeError('ElevenLabs request failed; no paid retry') from None
asset=out/'card-flip-elevenlabs.mp3'
if not asset.exists():
    before=json.loads(call('/v1/user/subscription'))
    if int(before.get('character_limit',0))-int(before.get('character_count',0))<500:raise RuntimeError('Insufficient remaining generation quota')
    audio=call('/v1/sound-generation?output_format=mp3_44100_128',{'text':'One close-miked playing card quickly flexes and flips over, a crisp papery fwap with a short clean airy swish and a tiny card-edge snap. Dry premium digital card-game foley. A single isolated flip, no music, no voice, no beeps, no chimes, no background noise.','duration_seconds':0.8,'prompt_influence':0.35,'model_id':'eleven_text_to_sound_v2'})
    if len(audio)<1000:raise RuntimeError('Generated flip audio is empty')
    asset.write_bytes(audio)
    after=json.loads(call('/v1/user/subscription'))
    (out/'elevenlabs-flip-receipt.json').write_text(json.dumps({'provider':'ElevenLabs','model':'eleven_text_to_sound_v2','requestedSeconds':0.8,'observedQuotaDelta':max(0,int(after.get('character_count',0))-int(before.get('character_count',0))),'paidRetries':0}))
assets=json.loads((root/'league-audio.json').read_text());assets['flip']='data:audio/mpeg;base64,'+base64.b64encode(asset.read_bytes()).decode();assets['flipSource']={'provider':'ElevenLabs','model':'eleven_text_to_sound_v2','seconds':0.8};(root/'league-audio.json').write_text(json.dumps(assets,separators=(',',':')))
print('CARD_FLIP_READY '+json.dumps({'bytes':asset.stat().st_size,'requestedSeconds':0.8,'paidRetries':0}))
