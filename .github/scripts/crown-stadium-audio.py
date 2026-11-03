import os,json,base64,urllib.request,urllib.error,subprocess
from pathlib import Path
root=Path('crown52-hosting');out=root/'audio';out.mkdir(exist_ok=True);key=os.environ.get('ELEVEN_API_KEY','')
if not key:raise RuntimeError('Existing ElevenLabs credential unavailable')
def call(path,payload=None):
 req=urllib.request.Request('https://api.elevenlabs.io'+path,data=None if payload is None else json.dumps(payload).encode(),headers={'xi-api-key':key,'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=240) as r:return r.read(12000000)
 except urllib.error.HTTPError as e:raise RuntimeError('ElevenLabs HTTP '+str(e.code)+'; no paid retry') from None
 except Exception:raise RuntimeError('ElevenLabs request failed; no paid retry') from None
before=json.loads(call('/v1/user/subscription'))
if int(before.get('character_limit',0))-int(before.get('character_count',0))<5000:raise RuntimeError('Generation budget reserve not available')
requests=[('football-stadium-happy-v45.mp3','/v1/music?output_format=mp3_44100_128',{'prompt':'Original joyful high-energy FOOTBALL STADIUM CELEBRATION instrumental,128 BPM major key. A catchy triumphant brass hook, driving stadium tom drums, powerful steady kick, syncopated rhythmic handclaps, bright rhythmic electric guitar and upbeat bass. The happy excitement of scoring a winning goal and a football highlights broadcast. Clean polished sports-game production. Full musical groove immediately, constant uplifting energy, no slow cinematic intro, no quiet ambient piano, no dark tension. Instrumental only, no singing, no spoken words, no whistles or ticking clocks. Loop-friendly sixteen-bar groove with matching energy at start and end. Leave room for a live host voice.','music_length_ms':30000,'force_instrumental':True,'model_id':'music_v1'}),('card-paper-flutter-a-v45.mp3','/v1/sound-generation?output_format=mp3_44100_128',{'text':'Close-up real foley of a flexible deck of playing cards being fanned and rapidly fluttered through the fingers, a continuous rich frrrrshhh papery rustle and soft airy turnover swish, followed by a soft papery settling. Organic uneven flowing paper friction. Warm dry recording. No clicks, no taps, no clock ticking, no beeps, no music, no voice.','duration_seconds':1.8,'prompt_influence':0.55,'model_id':'eleven_text_to_sound_v2'}),('card-paper-flutter-b-v45.mp3','/v1/sound-generation?output_format=mp3_44100_128',{'text':'A real physical playing card gently flexes, then a small fan of cards turns over twice in one fluid flourish. A broad soft papery fwoosh-frrrrshh sound with layered fluttering paper texture and a quiet soft landing. Lively premium card-game foley, close and dry, continuous airy paper motion. No sharp impacts, no clock, no metronome, no ticking, no electronic chimes, no music, no speech.','duration_seconds':2.2,'prompt_influence':0.55,'model_id':'eleven_text_to_sound_v2'})]
for name,endpoint,payload in requests:
 p=out/name
 if p.exists():continue
 data=call(endpoint,payload)
 if len(data)<1000:raise RuntimeError('Empty audio output')
 p.write_bytes(data)
 print('ASSET_SAVED '+name,flush=True)
assets=json.loads((root/'league-audio.json').read_text())
for name,key_name,level in [('football-stadium-happy-v45.mp3','music',-17),('card-paper-flutter-a-v45.mp3','flip',-19),('card-paper-flutter-b-v45.mp3','flipAlt',-19)]:
 source=out/name;target=source.with_suffix('.ogg');subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-af',f'loudnorm=I={level}:TP=-2:LRA=9,afade=t=in:d=0.015','-ar','22050','-c:a','libvorbis','-q:a','4',str(target)],check=True);assets[key_name]='data:audio/ogg;base64,'+base64.b64encode(target.read_bytes()).decode()
assets.update(version=2,duration=30,bpm=128,musicSource={'provider':'ElevenLabs','model':'music_v1','style':'joyful football stadium celebration','seconds':30},flipSource={'provider':'ElevenLabs','model':'eleven_text_to_sound_v2','style':'continuous papery flutter and soft swish','seconds':[1.8,2.2]});assets['credits']=[c for c in assets.get('credits',[]) if c.get('artist')!='Alexander Holm']+[{'artist':'ElevenLabs generation','work':'Original football stadium instrumental and two paper-card flutter effects','source':'https://elevenlabs.io','generationModel':'music_v1 / eleven_text_to_sound_v2'}];(root/'league-audio.json').write_text(json.dumps(assets,separators=(',',':')))
after=json.loads(call('/v1/user/subscription'));receipt={'provider':'ElevenLabs','musicSeconds':30,'cardEffectsSeconds':[1.8,2.2],'observedQuotaDelta':max(0,int(after.get('character_count',0))-int(before.get('character_count',0))),'paidRetries':0};(out/'stadium45-receipt.json').write_text(json.dumps(receipt));print('STADIUM45_READY '+json.dumps(receipt))
