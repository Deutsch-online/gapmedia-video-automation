import sys,json,subprocess,hashlib
from pathlib import Path
import cv2,numpy as np

root=Path('aryana-hosting/motion-minute-v3');report=json.loads((root/'report.json').read_text())
release=Path('aryana-hosting/motion-release');release.mkdir(parents=True,exist_ok=True)
fps=24;size=(512,896)
def bridge(a,b,count=4):
 ga=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY);gb=cv2.cvtColor(b,cv2.COLOR_BGR2GRAY)
 dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
 forward=dis.calc(ga,gb,None);backward=dis.calc(gb,ga,None)
 h,w=ga.shape;xx,yy=np.meshgrid(np.arange(w,dtype=np.float32),np.arange(h,dtype=np.float32))
 def warp(frame,flow,amount):
  amount=np.float32(amount)
  mx=xx-amount*flow[:,:,0];my=yy-amount*flow[:,:,1]
  for _ in range(3):
   f=cv2.remap(flow,mx,my,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT)
   mx=xx-amount*f[:,:,0];my=yy-amount*f[:,:,1]
  return cv2.remap(frame,mx,my,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT)
 return [cv2.addWeighted(warp(a,forward,t),1-t,warp(b,backward,1-t),t,0) for t in np.linspace(0,1,count+2)[1:-1]]

out=release/'working.avi';writer=cv2.VideoWriter(str(out),cv2.VideoWriter_fourcc(*'MJPG'),fps,size)
first=None;last=None;count=0;previews=[];joins=[]
for take in report['accepted']:
 assert hashlib.sha256((root/take['file']).read_bytes()).hexdigest()==take['sha256']
 cap=cv2.VideoCapture(str(root/take['file']));ok,frame=cap.read()
 if not ok:raise RuntimeError('Empty source')
 if first is None:first=frame.copy()
 if last is not None:
  fs=bridge(last,frame)
  if count+len(fs)>1436:break
  previews.append(fs[len(fs)//2]);joins.append(count/fps)
  for f in fs:writer.write(f);count+=1
 while ok and count<1436:
  writer.write(frame);last=frame;count+=1;ok,frame=cap.read()
 cap.release()
 if count>=1436:break
if count!=1436:raise RuntimeError('Insufficient unique edited frames')
loop=bridge(last,first,3)+[first]
for f in loop:writer.write(f);count+=1
writer.release()
target=str(release/'idle.mp4')
subprocess.run(['ffmpeg','-v','error','-y','-i',str(out),'-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',target],check=True)
out.unlink()
while len(previews)%4:previews.append(np.zeros_like(previews[0]))
small=[cv2.resize(f,(192,336)) for f in previews]
cv2.imwrite(str(release/'joins-review.jpg'),np.vstack([np.hstack(small[i:i+4]) for i in range(0,len(small),4)]))
Path(target+'.assembly.json').write_text(json.dumps({'duration':count/fps,'frames':count,'cross_dissolves':False,'motion_interpolated_joins':joins,'loop_join_interpolated':True,'source_frames_repeated_as_short_loop':False},indent=2))
print(json.dumps({'file':target,'duration':count/fps,'joins':len(joins)}))

subprocess.run([sys.executable,'aryana-hosting/analyze-motion.py',target],check=True)
stats=json.loads(Path(target+'.analysis.json').read_text())
assert stats['duration']==60 and stats['missing_face_frames']==0 and len(stats['blink_events'])<=12 and all(e['duration']<=0.4 for e in stats['blink_events'])
manifest={'status':'reviewed_ready','duration':stats['duration'],'blink_events':len(stats['blink_events']),'missing_face_frames':stats['missing_face_frames'],'sha256':hashlib.sha256(Path(target).read_bytes()).hexdigest(),'gpu_calls_in_assembly':0,'source_funding':'existing_hf_credits','cross_dissolves':False}
(release/'release.json').write_text(json.dumps(manifest,indent=2));print('ARYANA_MOTION_RELEASE '+json.dumps(manifest),flush=True)
