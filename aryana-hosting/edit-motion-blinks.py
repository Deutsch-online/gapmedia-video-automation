import json,sys,subprocess,os
from pathlib import Path
import cv2,numpy as np

source=Path(sys.argv[1]);target=Path(sys.argv[2])
rows=json.loads(Path(str(source)+'.frames.json').read_text())
cap=cv2.VideoCapture(str(source));fps=cap.get(cv2.CAP_PROP_FPS);frames=[]
while True:
 ok,f=cap.read()
 if not ok:break
 frames.append(f)
cap.release()
if len(rows)!=len(frames):raise RuntimeError('Face detection gap; refuse editing')
scores=np.array([r['blink'] for r in rows]);events=[];active=None
for i,b in enumerate(scores):
 if b>=0.45 and active is None:active=i
 if b<0.45 and active is not None:events.append([active,i-1]);active=None
if active is not None:events.append([active,len(scores)-1])
# Keep the first clearly closed, short natural blink. Remove the other eyelid dips.
eligible=[e for e in events if max(scores[e[0]:e[1]+1])>=0.65 and (e[1]-e[0]+1)/fps<=0.4]
kept=eligible[:1] if os.environ.get('ARYANA_KEEP_BLINK','1')=='1' else [];cuts=[]
for start,end in events:
 if [start,end] in kept:continue
 while start>0 and scores[start-1]>0.22:start-=1
 while end+1<len(scores) and scores[end+1]>0.22:end+=1
 cuts.append([max(0,start-1),min(len(frames)-1,end+1)])
merged=[]
for start,end in cuts:
 if merged and start<=merged[-1][1]+1:merged[-1][1]=max(end,merged[-1][1])
 else:merged.append([start,end])
drop={i for a,b in merged for i in range(a,b+1)}
indices=[i for i in range(len(frames)) if i not in drop]
if len(indices)<fps*2:raise RuntimeError('Insufficient open-eye motion; refuse tiny loop')
h,w=frames[0].shape[:2];intermediate=target.with_suffix('.avi')
writer=cv2.VideoWriter(str(intermediate),cv2.VideoWriter_fourcc(*'MJPG'),fps,(w,h))
previous=None;bridges=0
for idx in indices:
 frame=frames[idx]
 if previous is not None and idx>previous+1:
  # Interpolate only across edited joins. Native blink frames keep their original timing.
  a=frames[previous];b=frame
  ga=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY);gb=cv2.cvtColor(b,cv2.COLOR_BGR2GRAY)
  flow=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
  ab=flow.calc(ga,gb,None);ba=flow.calc(gb,ga,None)
  xx,yy=np.meshgrid(np.arange(w,dtype=np.float32),np.arange(h,dtype=np.float32))
  for t in (1/3,2/3):
   wa=cv2.remap(a,xx-t*ab[:,:,0],yy-t*ab[:,:,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT)
   wb=cv2.remap(b,xx-(1-t)*ba[:,:,0],yy-(1-t)*ba[:,:,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT)
   writer.write(cv2.addWeighted(wa,1-t,wb,t,0))
  bridges+=1
 writer.write(frame);previous=idx
writer.release()
subprocess.run(['ffmpeg','-v','error','-y','-i',str(intermediate),'-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(target)],check=True)
intermediate.unlink()
report={'source_seconds':len(frames)/fps,'output_seconds':(len(indices)+bridges*2)/fps,'detected_eyelid_dips':len(events),'kept_native_blinks':len(kept),'removed_intervals':[[a/fps,(b+1)/fps] for a,b in merged],'join_bridges':bridges,'native_frame_speed_preserved':True,'speech_media_modified':False}
Path(str(target)+'.edit.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
