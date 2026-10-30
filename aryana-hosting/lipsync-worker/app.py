"""Private, cached MuseTalk 1.5 worker for Aryana's fresh spoken replies.

Audio conditioning and positional encoding follow Tencent Music MuseTalk (MIT).
Only the mouth region is composited; the approved face and body video remain.
"""
import spaces
import gradio as gr
import cv2,json,math,os,subprocess,tempfile,threading,time,urllib.request
from pathlib import Path
import numpy as np
import torch
from diffusers import AutoencoderKL,UNet2DConditionModel
from transformers import AutoFeatureExtractor,WhisperModel
from huggingface_hub import hf_hub_download
import mediapipe as mp

CONFIG=json.loads(Path('model-lock.json').read_text());DTYPE=torch.float16;FPS=24;BATCH=8
torch.set_num_threads(2)
config_file=hf_hub_download('TMElyralab/MuseTalk','musetalkV15/musetalk.json',revision=CONFIG['musetalk'])
weights=hf_hub_download('TMElyralab/MuseTalk','musetalkV15/unet.pth',revision=CONFIG['musetalk'])
UNET=UNet2DConditionModel(**json.loads(Path(config_file).read_text()))
UNET.load_state_dict(torch.load(weights,map_location='cpu',weights_only=True));UNET=UNET.eval().half().to('cuda')
VAE=AutoencoderKL.from_pretrained('stabilityai/sd-vae-ft-mse',revision=CONFIG['vae'],torch_dtype=DTYPE).eval().to('cuda')
WHISPER=WhisperModel.from_pretrained('openai/whisper-tiny',revision=CONFIG['whisper'],torch_dtype=DTYPE).eval().to('cuda')
EXTRACTOR=AutoFeatureExtractor.from_pretrained('openai/whisper-tiny',revision=CONFIG['whisper'])
positions=torch.arange(5000,dtype=torch.float32).unsqueeze(1);div=torch.exp(torch.arange(0,384,2)*(-math.log(10000.0)/384))
PE=torch.zeros(1,5000,384);PE[0,:,0::2]=torch.sin(positions*div);PE[0,:,1::2]=torch.cos(positions*div)
AVATAR=None;LOCK=threading.Lock()
TASK=Path('/tmp/face_landmarker.task')
if not TASK.exists():urllib.request.urlretrieve('https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',TASK)

@spaces.GPU(duration=180,size='large')
@torch.inference_mode()
def encode_avatar(crops):
 result=[];generator=torch.Generator(device='cuda').manual_seed(42)
 for start in range(0,len(crops),BATCH):
  array=np.stack(crops[start:start+BATCH])[:,:,:,::-1].copy()
  image=torch.from_numpy(array).permute(0,3,1,2).to(device='cuda',dtype=DTYPE)/127.5-1
  masked=image.clone();masked[:,:,128:,:]=-1
  a=VAE.encode(masked).latent_dist.sample(generator=generator)*VAE.config.scaling_factor
  b=VAE.encode(image).latent_dist.sample(generator=generator)*VAE.config.scaling_factor
  result.append(torch.cat([a,b],dim=1).cpu())
 return torch.cat(result,dim=0)

def prepare():
 global AVATAR
 with LOCK:
  if AVATAR is not None:return {'ready':True,'cached':True,'frames':len(AVATAR['frames'])}
  started=time.monotonic();frames=[];boxes=[];masks=[];crops=[]
  options=mp.tasks.vision.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=str(TASK)),running_mode=mp.tasks.vision.RunningMode.VIDEO,num_faces=1)
  cap=cv2.VideoCapture('reference.mp4');n=0;previous=None;missing=0
  with mp.tasks.vision.FaceLandmarker.create_from_options(options) as detector:
   while True:
    ok,frame=cap.read()
    if not ok:break
    h,w=frame.shape[:2]
    detected=detector.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)),round(n*1000/FPS))
    if not detected.face_landmarks:
     missing+=1
     if previous is None or missing>8:raise RuntimeError('Reference face tracking failed')
     box,mask=previous
    else:
     p=detected.face_landmarks[0];x1=max(0,int(min(p[234].x,p[454].x)*w));x2=min(w,int(max(p[234].x,p[454].x)*w))
     nose=(.25*p[6].y+.75*p[1].y)*h;bottom=min(h,int(p[152].y*h));top=max(0,int(2*nose-bottom))
     box=(x1,top,x2,bottom);fw=x2-x1;fh=bottom-top
     if fw<50 or fh<70:raise RuntimeError('Invalid reference face crop')
     mouth_x=((p[61].x+p[291].x)/2*w-x1)/fw*256
     mouth_y=((p[13].y+p[14].y)/2*h-top)/fh*256
     radius_x=max(30,int(abs(p[291].x-p[61].x)*w/fw*256*.82))
     mask=np.zeros((256,256),dtype=np.float32)
     cv2.ellipse(mask,(int(mouth_x),int(mouth_y+5)),(min(105,radius_x),42),0,0,360,1,-1)
     mask=cv2.GaussianBlur(mask,(21,21),0)[:,:,None];previous=(box,mask)
    x1,y1,x2,y2=box
    crops.append(cv2.resize(frame[y1:y2,x1:x2],(256,256),interpolation=cv2.INTER_LANCZOS4))
    ok,jpeg=cv2.imencode('.jpg',frame,[cv2.IMWRITE_JPEG_QUALITY,95])
    if not ok:raise RuntimeError('Reference frame encoding failed')
    frames.append(jpeg);boxes.append(box);masks.append(mask);n+=1
  cap.release()
  if len(frames)<FPS*50:raise RuntimeError('Reference motion is incomplete')
  latents=encode_avatar(crops)
  AVATAR={'frames':frames,'boxes':boxes,'masks':masks,'latents':latents}
  return {'ready':True,'cached':False,'frames':len(frames),'preparation_seconds':round(time.monotonic()-started,2)}

@spaces.GPU(duration=120,size='large')
@torch.inference_mode()
def generate_mouths(mel,sample_count,latents):
 states=WHISPER.encoder(mel.to(device='cuda',dtype=DTYPE),output_hidden_states=True).hidden_states
 feature=torch.stack(states,dim=2)[:,:math.floor(sample_count/16000*50)]
 pad=math.ceil(50/FPS);feature=torch.cat([torch.zeros_like(feature[:,:pad*2]),feature,torch.zeros_like(feature[:,:pad*6])],dim=1)
 chunks=[]
 for i in range(len(latents)):
  offset=math.floor(i*50/FPS);chunk=feature[:,offset:offset+10]
  if chunk.shape[1]!=10:raise RuntimeError('Audio feature alignment failed')
  chunks.append(chunk.reshape(1,50,384))
 audio=torch.cat(chunks);audio=audio+PE[:,:50].to(device='cuda',dtype=DTYPE)
 results=[]
 for start in range(0,len(latents),BATCH):
  predicted=UNET(latents[start:start+BATCH].to(device='cuda',dtype=DTYPE),torch.tensor([0],device='cuda'),encoder_hidden_states=audio[start:start+BATCH]).sample
  image=VAE.decode(predicted/VAE.config.scaling_factor).sample
  image=(image/2+.5).clamp(0,1).permute(0,2,3,1).float().cpu().numpy()
  results.extend((image[:,:,:,::-1]*255).round().astype(np.uint8))
 return results

def speak(audio_path,offset_seconds=0):
 prepare();started=time.monotonic();work=Path(tempfile.mkdtemp(prefix='aryana-speech-'));wav=work/'audio.wav'
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(audio_path),'-ar','16000','-ac','1',str(wav)],check=True)
 import soundfile as sf
 samples,sr=sf.read(wav,dtype='float32');duration=len(samples)/sr
 if not .2<=duration<=8:raise gr.Error('Each speech segment must be between 0.2 and 8 seconds')
 count=math.ceil(duration*FPS);begin=int(float(offset_seconds)%60*FPS)
 ids=[(begin+i)%len(AVATAR['frames']) for i in range(count)]
 mel=EXTRACTOR(samples,return_tensors='pt',sampling_rate=16000).input_features
 mouths=generate_mouths(mel,len(samples),AVATAR['latents'][ids]);avi=work/'motion.avi'
 first=cv2.imdecode(AVATAR['frames'][ids[0]],cv2.IMREAD_COLOR);h,w=first.shape[:2]
 writer=cv2.VideoWriter(str(avi),cv2.VideoWriter_fourcc(*'MJPG'),FPS,(w,h))
 for idx,mouth in zip(ids,mouths):
  frame=cv2.imdecode(AVATAR['frames'][idx],cv2.IMREAD_COLOR);x1,y1,x2,y2=AVATAR['boxes'][idx]
  mouth=cv2.resize(mouth,(x2-x1,y2-y1),interpolation=cv2.INTER_LANCZOS4)
  alpha=cv2.resize(AVATAR['masks'][idx],(x2-x1,y2-y1))[:,:,None]
  frame[y1:y2,x1:x2]=(mouth*alpha+frame[y1:y2,x1:x2]*(1-alpha)).round().astype(np.uint8)
  writer.write(frame)
 writer.release();video=work/'reply.mp4'
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(avi),'-i',str(wav),'-map','0:v:0','-map','1:a:0','-vf','scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,setsar=1','-c:v','libx264','-preset','veryfast','-crf','20','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','aac','-b:a','128k','-movflags','+faststart',str(video)],check=True)
 avi.unlink();metrics={'audio_seconds':duration,'video_frames':count,'render_wall_seconds':round(time.monotonic()-started,3),'model':'MuseTalk 1.5','edited_region':'mouth_only'}
 return str(video),metrics

def status():return {'ready':AVATAR is not None,'model':'MuseTalk 1.5','delivery':'audio_conditioned_reply_video','reference_sha256':CONFIG['reference_sha256'],'gpu_per_prepare_max_seconds':180,'gpu_per_reply_max_seconds':120}
with gr.Blocks(title='Aryana private lip-sync worker') as demo:
 gr.Markdown('آزمایش خصوصی لب‌خوانی آریانا')
 ready=gr.JSON();gr.Button('آماده‌سازی چهره').click(prepare,outputs=ready,api_name='prepare')
 audio=gr.Audio(type='filepath');offset=gr.Number(value=0,label='زمان شروع حرکت')
 result=gr.File();metrics=gr.JSON()
 gr.Button('ساخت پاسخ هماهنگ').click(speak,inputs=[audio,offset],outputs=[result,metrics],api_name='speak',concurrency_limit=1)
 gr.Button('وضعیت').click(status,outputs=ready,api_name='status',queue=False)
demo.queue(default_concurrency_limit=1).launch(max_file_size='12mb',show_error=True)
