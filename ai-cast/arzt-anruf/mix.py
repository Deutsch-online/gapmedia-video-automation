import array,hashlib,json,subprocess,sys,wave
from pathlib import Path
root=Path('renders/arzt-anruf');cache=root/'cache'
plan=json.loads(Path('ai-cast/arzt-anruf/story.json').read_text())
turns=[t for r in plan['rounds'] for t in r['turns']]
chunks=[];durations=[]
for i,t in enumerate(turns):
 p=cache/f'{i:02}';b=p.with_suffix('.mp3').read_bytes();j=json.loads(p.with_suffix('.json').read_text())
 if j['text']!=t['text'] or j['audio_sha256']!=hashlib.sha256(b).hexdigest() or j['voice_id']!=plan['voices'][t['role']]['id']:raise ValueError('Audio provenance mismatch')
 wav=p.with_suffix('.wav')
 command=['ffmpeg','-v','error','-y','-i',str(p.with_suffix('.mp3'))]
 if t['role']=='reception':command+=['-af','highpass=f=300,lowpass=f=3400']
 subprocess.run(command+['-ar','48000','-ac','1','-c:a','pcm_s16le',str(wav)],check=True)
 with wave.open(str(wav)) as f:a=array.array('h',f.readframes(f.getnframes()))
 if sys.byteorder!='little':a.byteswap()
 chunks.append(a);durations.append(len(a)/48000)
full=array.array('h',[0])*2880000
condition=array.array('h',[0])*2880000
events=[];i=0
for r,scene in enumerate(plan['rounds']):
 ts=scene['turns'];ds=durations[i:i+len(ts)];minimum=sum(ds)+.20*len(ts)+.10
 if minimum>12:raise ValueError(f'Scene {r+1} natural speech requires {minimum:.3f}s; no stretching or clipping')
 gap=(12-sum(ds))/len(ts)
 cursor=r*12
 for t,d in zip(ts,ds):
  start=cursor+.08;on=round(start*48000);samples=chunks[i]
  full[on:on+len(samples)]=samples
  if t['role']!='reception':condition[on:on+len(samples)]=samples
  events.append({**t,'start':cursor,'end':cursor+d+gap,'speech_start':start,'speech_end':start+d,'scene':r+1})
  cursor+=d+gap;i+=1
for filename,data in [('story.wav',full),('conditioning.wav',condition)]:
 if len(data)!=2880000:raise ValueError('Audio must have exactly 60s of samples')
 if sys.byteorder!='little':data.byteswap()
 with wave.open(str(root/filename),'wb') as f:f.setparams((1,2,48000,0,'NONE','not compressed'));f.writeframes(data.tobytes())
subprocess.run(['ffmpeg','-v','error','-y','-i',str(root/'story.wav'),'-af','loudnorm=I=-16:TP=-1.5:LRA=9','-c:a','aac','-b:a','192k','-t','60',str(root/'story.m4a')],check=True)
(root/'timing.json').write_text(json.dumps(events,ensure_ascii=False,indent=2))
(root/'audio-report.json').write_text(json.dumps({'duration':60,'included_characters':sum(len(t['text']) for t in turns),'voices':plan['voices'],'natural_speech_durations':durations,'no_speed_changes_after_synthesis':True,'reception_excluded_from_visible_lip_conditioning':True},indent=2))
print('Natural 60-second story audio prepared.')
