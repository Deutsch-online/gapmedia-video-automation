import sys,json,math
from pathlib import Path
import cv2,mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

path=sys.argv[1]
cap=cv2.VideoCapture(path)
fps=cap.get(cv2.CAP_PROP_FPS)
opts=vision.FaceLandmarkerOptions(base_options=python.BaseOptions(model_asset_path='/tmp/aryana-face-landmarker.task'),running_mode=vision.RunningMode.VIDEO,output_face_blendshapes=True,output_facial_transformation_matrixes=True,num_faces=1)
rows=[];missing=0
with vision.FaceLandmarker.create_from_options(opts) as detector:
 n=0
 while True:
  ok,frame=cap.read()
  if not ok:break
  rgb=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)
  result=detector.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB,data=rgb),round(n*1000/fps))
  if result.face_blendshapes:
   b={c.category_name:c.score for c in result.face_blendshapes[0]}
   rows.append({'frame':n,'time':n/fps,'blink':(b.get('eyeBlinkLeft',0)+b.get('eyeBlinkRight',0))/2,'jaw':b.get('jawOpen',0)})
  else:missing+=1
  n+=1
Path(path+'.frames.json').write_text(json.dumps(rows))
events=[];active=None
for r in rows:
 if r['blink']>=0.45 and active is None:active=r['time']
 if r['blink']<0.45 and active is not None:
  events.append({'start':round(active,3),'duration':round(r['time']-active,3)});active=None
if active is not None:events.append({'start':round(active,3),'duration':round(n/fps-active,3)})
report={'file':Path(path).name,'duration':round(n/fps,3),'fps':fps,'frames':n,'missing_face_frames':missing,'blink_threshold':0.45,'blink_events':events,'blinks_per_minute':round(len(events)*60/(n/fps),1),'max_jaw_open':round(max((r['jaw'] for r in rows),default=0),3),'note':'Blink detector is an estimate; identity and motion still require visual review.'}
Path(path+'.analysis.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
