"""Original 129 BPM racing instrumental. Synthesized instruments; no reference audio samples."""
import numpy as np
from scipy import signal
from scipy.io import wavfile
from pathlib import Path
import subprocess,json
SR=44100;BPM=129;beat=60/BPM;bars=32;duration=bars*4*beat;N=int((duration+1.6)*SR);rng=np.random.default_rng(1292026)
mix=np.zeros((N,2),np.float64)
def add(x,start,level=1,pan=0):
 a=int(start*SR);n=min(len(x),N-a)
 if a<0 or n<=0:return
 v=np.asarray(x[:n])*level;mix[a:a+n,0]+=v*np.sqrt((1-pan)/2);mix[a:a+n,1]+=v*np.sqrt((1+pan)/2)
def hz(m):return 440*2**((m-69)/12)
def kick():
 t=np.arange(int(.42*SR))/SR;freq=45+105*np.exp(-t*35);phase=2*np.pi*np.cumsum(freq)/SR
 return np.tanh(1.8*np.sin(phase))*np.exp(-t*11)+rng.normal(0,.1,len(t))*np.exp(-t*180)
def snare():
 t=np.arange(int(.23*SR))/SR;n=rng.normal(0,1,len(t));n=signal.sosfilt(signal.butter(2,1500,fs=SR,btype='highpass',output='sos'),n)
 return .55*n*np.exp(-t*22)+.45*np.sin(2*np.pi*185*t)*np.exp(-t*35)
def hat(open=False):
 t=np.arange(int((.18 if open else .07)*SR))/SR;n=rng.normal(0,1,len(t));n=signal.sosfilt(signal.butter(2,7500,fs=SR,btype='highpass',output='sos'),n)
 return n*np.exp(-t*(23 if open else 75))
def bass(m,length):
 t=np.arange(int(length*SR))/SR;f=hz(m);s=.7*np.sin(2*np.pi*f*t)+.28*signal.sawtooth(2*np.pi*f*t)+.14*np.sin(2*np.pi*f*2*t)
 s=signal.sosfilt(signal.butter(2,850,fs=SR,output='sos'),np.tanh(s*2.3));env=np.minimum(1,t/.008)*np.minimum(1,np.maximum(0,length-t)/.035);return s*env
lead_bus=np.zeros(N)
def pluck(m,length):
 t=np.arange(int(length*SR))/SR;f=hz(m);s=np.sin(2*np.pi*f*t)+.33*np.sin(2*np.pi*2*f*t)+.16*np.sin(2*np.pi*3*f*t)
 return s*np.minimum(1,t/.006)*np.exp(-t*5.5)*np.minimum(1,np.maximum(0,length-t)/.04)
roots=[40,36,33,35];chords=[[64,67,71],[60,64,67],[57,60,64],[59,63,66]]
# Newly composed motif, varied across the chord sequence.
motif=[0,3,7,10,12,7,3,2,0,7,12,15,14,10,7,2]
for bar in range(bars):
 start=bar*4*beat;drop=8<=bar<24 or bar>=28;build=4<=bar<8;breakdown=24<=bar<28;root=roots[(bar//2)%4]
 for q in range(4):
  if not breakdown or q in [0,2]:add(kick(),start+q*beat,.85 if drop else .65)
  if q%2 and bar>=4:add(snare(),start+q*beat,.36 if drop else .23,pan=.04)
 for k in range(8 if not drop else 16):
  div=2 if not drop else 4;add(hat(open=(k%8==6)),start+k*beat/div,.06 if k%2 else .095,pan=(-.25 if k%2 else .25))
 if bar>=4:
  pattern=[0,0,12,0,0,7,0,12] if drop else [0,0,0,7]
  for k,offset in enumerate(pattern):add(bass(root+offset,beat*(.42 if drop else .78)),start+k*4*beat/len(pattern),.34 if drop else .25)
 if bar<4 or breakdown or bar%4==0:
  for m in chords[(bar//2)%4]:
   t=np.arange(int(4*beat*SR))/SR;pad=(np.sin(2*np.pi*hz(m)*t)+.3*np.sin(2*np.pi*hz(m)*1.002*t));env=np.sin(np.pi*np.minimum(t/(4*beat),1))**1.2
   add(pad*env,start,.045,pan=.35 if m%2 else -.35)
 if bar>=2:
  for k in range(8):
   note=root+24+motif[(k+bar%2*8)%16];x=pluck(note,.55);at=int((start+k*.5*beat)*SR);ln=min(len(x),N-at);lead_bus[at:at+ln]+=x[:ln]*(.1 if breakdown else .15 if drop else .075)
 if bar in [7,15,23,27]:
  t=np.arange(int(2*beat*SR))/SR;noise=rng.normal(0,1,len(t));noise=signal.sosfilt(signal.butter(2,4000,fs=SR,btype='highpass',output='sos'),noise);add(noise*(t/(2*beat))**2,start+2*beat,.11,pan=.1)
 if bar in [8,16,28]:
  t=np.arange(int(1.4*SR))/SR;add(rng.normal(0,1,len(t))*np.exp(-t*3),start,.09)
# Stereo echoes and an original synthesized acceleration swoosh.
for delay,level,pan in [(0,1,-.08),(.75*beat,.35,.55),(1.5*beat,.2,-.55)]:add(lead_bus,delay,level,pan)
for at in [0,8*4*beat,16*4*beat,28*4*beat]:
 t=np.arange(int(1.2*SR))/SR;f=65+180*(t/1.2)**2;s=np.sin(2*np.pi*np.cumsum(f)/SR)+.15*rng.normal(0,1,len(t));add(s*np.sin(np.pi*t/1.2)**2,at,.045)
# Gentle bus saturation, high-pass, fades; mastering is done with FFmpeg.
mix=signal.sosfilt(signal.butter(2,30,fs=SR,btype='highpass',output='sos'),mix,axis=0);mix=np.tanh(mix*.8)
fade=int(.15*SR);mix[:fade]*=np.linspace(0,1,fade)[:,None];tail=int(1.5*SR);mix[-tail:]*=np.linspace(1,0,tail)[:,None]
mix*=.88/max(.88,np.max(np.abs(mix)));out=Path('/workspace/race-music-draft');wavfile.write(out/'neon-team-129.wav',SR,(mix*32767).astype(np.int16))
subprocess.run(['ffmpeg','-v','error','-y','-i',str(out/'neon-team-129.wav'),'-af','loudnorm=I=-15:TP=-1.5:LRA=9','-ar','44100','-b:a','192k',str(out/'neon-team-129-preview.mp3')],check=True)
(out/'composition.json').write_text(json.dumps({'title':'Neon Team — Racing Preview','tempo_bpm':BPM,'duration_seconds':len(mix)/SR,'composition':'Original note sequences and synthesized drums, bass, pads and effects. No audio sampled from the reference.','status':'Preview for owner review; current game music unchanged.'},indent=2))
print(json.dumps({'seconds':len(mix)/SR,'peak':float(np.max(np.abs(mix))),'rms':float(np.sqrt(np.mean(mix**2))),'mp3_bytes':(out/'neon-team-129-preview.mp3').stat().st_size}))
