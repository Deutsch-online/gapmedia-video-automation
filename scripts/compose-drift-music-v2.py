"""Original dark racing/phonk draft; entirely synthesized, no sampled recordings."""
from pathlib import Path
import numpy as np
from scipy import signal
from scipy.io import wavfile
import subprocess,json
sr=44100;bpm=129;beat=60/bpm;bars=16;length=bars*4*beat+1.1;n=int(length*sr);rng=np.random.default_rng(89129)
drums=np.zeros((n,2));bassbus=np.zeros(n);tones=np.zeros((n,2));duck=np.ones(n)
def put(bus,x,at,amp=1,pan=0):
 a=int(at*sr);m=min(len(x),len(bus)-a)
 if a<0 or m<=0:return
 if bus.ndim==1:bus[a:a+m]+=x[:m]*amp
 else:bus[a:a+m]+=x[:m,None]*amp*np.array([np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)])
def noise(dur):return rng.normal(0,1,int(dur*sr))
def filt(x,hz,kind='lowpass'):return signal.sosfilt(signal.butter(2,hz,fs=sr,btype=kind,output='sos'),x)
def kick():
 t=np.arange(int(.36*sr))/sr;freq=43+115*np.exp(-t*43);phase=2*np.pi*np.cumsum(freq)/sr
 return np.tanh(np.sin(phase)*2)*np.exp(-t*13)+filt(noise(.36),3000,'highpass')*.16*np.exp(-t*180)
def clap():
 t=np.arange(int(.19*sr))/sr;env=sum(np.exp(-np.maximum(0,t-d)*50)*(t>=d) for d in [0,.012,.024]);return filt(filt(noise(.19),900,'highpass'),8000)*env*.34+np.sin(2*np.pi*190*t)*np.exp(-t*40)*.18
def hat(long=False):
 d=.13 if long else .055;t=np.arange(int(d*sr))/sr;return filt(noise(d),7000,'highpass')*np.exp(-t*(25 if long else 85))
def sub(m,dur,slide=0):
 t=np.arange(int(dur*sr))/sr;freq=440*2**((m-69)/12)*(1+slide*np.exp(-t*22));phase=2*np.pi*np.cumsum(freq)/sr;x=np.sin(phase)+.24*np.sin(phase*2)+.12*np.sin(phase*3);x=filt(np.tanh(x*2),520);return x*np.minimum(1,t/.006)*np.minimum(1,np.maximum(0,dur-t)/.025)
def bell(m):
 t=np.arange(int(.4*sr))/sr;f=440*2**((m-69)/12);phase=2*np.pi*f*t;x=np.sin(phase+1.6*np.sin(phase*1.48)*np.exp(-t*12))+.35*np.sin(phase*1.83);return filt(x,3500)*np.exp(-t*13)*np.minimum(1,t/.002)
for bar in range(bars):
 start=bar*4*beat;breakdown=bar in [8,9];root=[28,28,31,26][(bar//2)%4]
 kicks=[0,1.5,2,3.25] if bar%2 else [0,.75,2,2.75,3.5]
 if breakdown:kicks=[0,2]
 for q in kicks:
  at=start+q*beat;put(drums,kick(),at,.86);a=int(at*sr);d=min(int(.2*sr),n-a);duck[a:a+d]=np.minimum(duck[a:a+d],.25+.75*(np.arange(d)/max(1,d))**.7)
 for q in [1,3]:put(drums,clap(),start+q*beat,.65)
 for k in range(8):put(drums,hat(k in [3,7]),start+k*.5*beat,.085 if k%2 else .12,(-.35 if k%2 else .35))
 if bar%4==3:
  for k in range(6):put(drums,hat(),start+(3.25+k*.125)*beat,.055,(-.4+k*.16))
 notes=[(0,root,.7),(.75,root,.65),(1.5,root+12,.4),(2,root,.65),(2.75,root+7,.4),(3.25,root,.65)]
 for q,m,d in notes:put(bassbus,sub(m,d*beat,slide=.16 if q==0 else 0),start+q*beat,.46 if not breakdown else .22)
 if not breakdown:
  # Sparse new percussive hook, deliberately avoiding a bright arpeggio.
  for q,m in [(0,64),(1.5,67),(2.5,62),(3.25,59)]:
   if bar%2:m-=2
   x=bell(m);put(tones,x,start+q*beat,.115,pan=-.12)
   put(tones,x,start+(q+.75)*beat,.038,pan=.45)
 if bar in [3,7,9,15]:
  t=np.arange(int(beat*sr))/sr;sw=filt(noise(beat),2800,'highpass')*(t/beat)**2;put(tones,sw,start+3*beat,.12,pan=.2)
 # Soft road texture behind the beat, generated noise only.
 t=np.arange(int(4*beat*sr))/sr;put(tones,filt(noise(4*beat),700)*.012,start,.8,pan=.05)
bassbus*=duck
mix=drums+tones+bassbus[:,None]*.7071;mix=filt(mix.T,30,'highpass').T if False else signal.sosfilt(signal.butter(2,30,fs=sr,btype='highpass',output='sos'),mix,axis=0)
mix=np.tanh(mix*1.1);mix[:int(.025*sr)]*=np.linspace(0,1,int(.025*sr))[:,None];tail=int(1.1*sr);mix[-tail:]*=np.linspace(1,0,tail)[:,None];mix*=.9/max(.9,np.max(np.abs(mix)))
out=Path('/workspace/race-music-draft');wavfile.write(out/'drift-v2.wav',sr,(mix*32767).astype(np.int16));subprocess.run(['ffmpeg','-v','error','-y','-i',str(out/'drift-v2.wav'),'-af','loudnorm=I=-14:TP=-1.5:LRA=7','-ar','44100','-b:a','192k',str(out/'drift-v2-preview.mp3')],check=True)
meta={'title':'Drift Race V2 — Dark Bass Preview','bpm':bpm,'duration':round(length),'caption':'نسخهٔ دوم برای شنیدن: بیس سنگین‌تر، ضرب دریفت، ملودی کم‌تر و فضای تیره‌تر. حدود ۳۰ ثانیه. هنوز وارد بازی نشده است.','composition':'Original synthesized drums, 808-style bass and percussive hook; no audio samples copied from the reference.'};(out/'drift-v2-preview.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2));print(json.dumps({'seconds':length,'rms':float(np.sqrt(np.mean(mix**2))),'peak':float(np.max(np.abs(mix))),'bytes':(out/'drift-v2-preview.mp3').stat().st_size}))
