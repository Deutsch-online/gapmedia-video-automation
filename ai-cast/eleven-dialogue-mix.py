"""Prepare the actual two-voice audio; does not claim native video generation."""
import array
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import wave

root=Path('renders/eleven-dialogue-60s');cache=root/'cache'
plan=json.loads(Path('ai-cast/eleven-dialogue-60s.json').read_text())
events=[];chunks=[];durations=[]
for i in range(20):
    audio=cache/f'{i:02}.mp3';receipt=json.loads((cache/f'{i:02}.json').read_text())
    turn=plan['rounds'][i//4]['turns'][i%4]
    if (receipt['audio_sha256']!=hashlib.sha256(audio.read_bytes()).hexdigest() or
            receipt['text']!=turn['text'] or receipt['role']!=turn['role'] or receipt['voice_id']!=plan['voices'][turn['role']]['id']):
        raise ValueError('Unmatched actual ElevenLabs dialogue cache')
    wav=cache/f'{i:02}.wav'
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(audio),'-ar','48000','-ac','1','-c:a','pcm_s16le',str(wav)],check=True)
    with wave.open(str(wav)) as source:
        samples=array.array('h',source.readframes(source.getnframes()))
    if sys.byteorder!='little':samples.byteswap()
    chunks.append(samples);durations.append(len(samples)/48000)
mixed=array.array('h',[0])*(60*48000)
for r,round_ in enumerate(plan['rounds']):
    ds=durations[r*4:r*4+4]
    slots=[max(ds[0]+.3,2),max(ds[1]+.3,3),max(ds[2]+.3,3.2),max(ds[3]+.25,1)]
    if sum(slots)>12:raise ValueError('Natural dialogue does not fit the twelve-second lesson; no audio stretching permitted')
    spare=12-sum(slots);slots[1]+=spare*.5;slots[2]+=spare*.5
    cursor=r*12
    for t,slot in enumerate(slots):
        i=r*4+t;onset=round((cursor+.12)*48000);samples=chunks[i]
        mixed[onset:onset+len(samples)]=samples
        events.append({'start':cursor,'end':cursor+slot,'speech_start':cursor+.12,'speech_end':cursor+.12+ds[t],
                       'role':round_['turns'][t]['role'],'text':round_['turns'][t]['text'],
                       'correct':round_['correct'],'fa':round_['fa'],'round':r+1})
        cursor+=slot
if len(mixed)!=2880000:raise RuntimeError('Exact one-minute audio sample count changed')
if sys.byteorder!='little':mixed.byteswap()
with wave.open(str(root/'arzttermin-dialogue-60s.wav'),'wb') as output:
    output.setparams((1,2,48000,0,'NONE','not compressed'));output.writeframes(mixed.tobytes())
subprocess.run(['ffmpeg','-y','-v','error','-i',str(root/'arzttermin-dialogue-60s.wav'),'-af','loudnorm=I=-16:TP=-1.5:LRA=9','-c:a','aac','-b:a','192k','-ar','48000','-t','60',str(root/'arzttermin-dialogue-60s.m4a')],check=True)
(root/'timing.json').write_text(json.dumps(events,ensure_ascii=False,indent=2))
(root/'script.txt').write_text('\n\n'.join(f'{r["topic"]}\n'+ '\n'.join(t['role']+': '+t['text'] for t in r['turns']) for r in plan['rounds']))
(root/'status.json').write_text(json.dumps({'kind':'prepared-dialogue-audio-only','duration_seconds':60,'voice_provider':'ElevenLabs','voices':['Lily','Roger'],'language':'de','video_created':False,'native_video_blocker':'Starter account: video API returns 402 paid_plan_required; Pro or above is required','paid_video_requested':False,'cloning':False,'published':False},indent=2))
print('Two actual German ElevenLabs voices prepared, exactly 60 seconds. Native video remains blocked by the account plan.')
