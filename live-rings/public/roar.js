// Original procedural sound design: no external recordings or downloaded audio.
export class RoarPlayer {
 constructor(){this.context=null;this.last=-Infinity;}
 async unlock(){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return false;this.context??=new Audio();if(this.context.state==='suspended')await this.context.resume();return this.context.state==='running';}
 async preview(kind,volume=35){if(await this.unlock())this.play(kind,{volume,enabled:true,force:true});}
 play(kind,{volume=35,enabled=true,force=false}={}){
  const ctx=this.context;if(!enabled||!ctx||ctx.state!=='running'||!['gold','ice','fire'].includes(kind))return false;
  const now=ctx.currentTime;if(!force&&now-this.last<2.8)return false;this.last=now;
  const duration=kind==='gold'?2.5:3.2,start=now+.02,level=Math.max(0,Math.min(100,volume))/100;
  const master=ctx.createGain(),compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.ratio.value=5;master.gain.value=level*.65;master.connect(compressor);compressor.connect(ctx.destination);
  const envelope=ctx.createGain();envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(.85,start+.16);envelope.gain.linearRampToValueAtTime(.62,start+duration*.5);envelope.gain.exponentialRampToValueAtTime(.001,start+duration);envelope.connect(master);
  const samples=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=samples.getChannelData(0);let seed=kind==='gold'?17:kind==='ice'?53:91;
  for(let i=0;i<data.length;i++){seed=(1664525*seed+1013904223)>>>0;const t=i/ctx.sampleRate,pulse=.6+.4*Math.sin(t*(kind==='gold'?29:21)*Math.PI*2);data[i]=(seed/4294967296*2-1)*pulse;}
  const noise=ctx.createBufferSource();noise.buffer=samples;const throat=ctx.createBiquadFilter();throat.type='bandpass';throat.Q.value=1.2;throat.frequency.setValueAtTime(kind==='ice'?620:420,start);throat.frequency.exponentialRampToValueAtTime(150,start+duration);noise.connect(throat);throat.connect(envelope);
  const bass=ctx.createOscillator(),body=ctx.createGain();bass.type='sawtooth';bass.frequency.setValueAtTime(kind==='gold'?88:kind==='ice'?105:64,start);bass.frequency.exponentialRampToValueAtTime(kind==='gold'?42:34,start+duration);body.gain.value=.23;bass.connect(body);body.connect(envelope);
  const rumble=ctx.createOscillator(),sub=ctx.createGain();rumble.type='sine';rumble.frequency.setValueAtTime(kind==='fire'?38:48,start);rumble.frequency.linearRampToValueAtTime(25,start+duration);sub.gain.value=.32;rumble.connect(sub);sub.connect(envelope);
  if(kind==='ice')for(let i=0;i<5;i++){const crystal=ctx.createOscillator(),g=ctx.createGain(),at=start+.2+i*.28;crystal.type='sine';crystal.frequency.setValueAtTime(1500+i*360,at);crystal.frequency.exponentialRampToValueAtTime(600+i*170,at+.5);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(.035,at+.03);g.gain.exponentialRampToValueAtTime(.001,at+.65);crystal.connect(g);g.connect(master);crystal.start(at);crystal.stop(at+.7);}
  if(kind==='fire'){const fire=ctx.createBiquadFilter(),g=ctx.createGain();fire.type='highpass';fire.frequency.value=1600;g.gain.value=.18;noise.connect(fire);fire.connect(g);g.connect(envelope);}
  noise.start(start);bass.start(start);rumble.start(start);bass.stop(start+duration);rumble.stop(start+duration);noise.onended=()=>{master.disconnect();compressor.disconnect();};return true;
 }
}
