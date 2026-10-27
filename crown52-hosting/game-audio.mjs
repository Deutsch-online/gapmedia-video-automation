export class LiveSound{
 constructor(){this.ctx=null;this.master=null;this.pad=null;this.enabled=true;this.volume=.32;this.ambient=true;this.quiet=true;try{const s=JSON.parse(localStorage.getItem('crown52-audio'));if(s){this.enabled=s.enabled!==false;this.volume=Math.max(0,Math.min(.7,Number.isFinite(Number(s.volume))?Number(s.volume):.32));this.ambient=s.ambient!==false}}catch{}}
 save(){try{localStorage.setItem('crown52-audio',JSON.stringify({enabled:this.enabled,volume:this.volume,ambient:this.ambient}))}catch{}}
 async unlock(){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return false;try{if(!this.ctx){this.ctx=new C();this.master=this.ctx.createGain();this.master.gain.value=this.enabled?this.volume:0;const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=18;limiter.ratio.value=8;this.master.connect(limiter);limiter.connect(this.ctx.destination);this.makePad()}await this.ctx.resume();this.update();return this.ctx.state==='running'}catch{return false}}
 get ready(){return this.ctx?.state==='running'}
 update(){if(!this.ctx)return;const t=this.ctx.currentTime;this.master.gain.setTargetAtTime(this.enabled?this.volume:0,t,.06);this.pad.gain.setTargetAtTime(this.enabled&&this.ambient?(this.quiet ? .32 : .09):0,t,.3)}
 setQuiet(q){if(this.quiet===q)return;this.quiet=q;this.update()}
 setVolume(v){this.volume=Math.max(0,Math.min(.7,v));this.update();this.save()}
 setAmbient(v){this.ambient=v;this.update();this.save()}
 async toggle(){if(!this.ready){this.enabled=true;await this.unlock()}else this.enabled=!this.enabled;this.update();this.save();return this.enabled}
 makePad(){const c=this.ctx;this.pad=c.createGain();this.pad.gain.value=0;this.pad.connect(this.master);this.musicStep=0;this.musicNext=c.currentTime+.12;
 const chords=[[48,52,55,59],[45,48,52,55],[41,45,48,52],[43,47,50,55]];
 const melody=[72,76,79,76,74,71,67,71,69,72,76,72,67,71,74,71];
 const tone=(m,t,d,v)=>{const f=440*2**((m-69)/12);for(const [multiple,level,decay]of [[1,1,1],[2,.12,.6],[3,.025,.35]]){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f*multiple;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v*level,t+.035);g.gain.exponentialRampToValueAtTime(.00001,t+d*decay);o.connect(g);g.connect(this.pad);o.start(t);o.stop(t+d*decay+.06);o.onended=()=>{o.disconnect();g.disconnect()}}};
 const schedule=()=>{if(c.state!=='running')return;if(this.musicNext<c.currentTime)this.musicNext=c.currentTime+.08;while(this.musicNext<c.currentTime+.4){const i=this.musicStep,t=this.musicNext,chord=chords[Math.floor(i/8)%4];tone(chord[[0,2,1,3,2,1,3,2][i%8]],t,2.8,.20);if(i%2===0)tone(melody[Math.floor(i/2)%melody.length],t,3.2,.24);this.musicStep++;this.musicNext+=.625}};
 this.musicTimer=setInterval(schedule,150);schedule();}

 note(f,start=0,duration=.16,volume=.16,type='sine'){if(!this.ready||!this.enabled)return;const c=this.ctx,t=c.currentTime+start,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.02)}

 turn(){this.note(784,0,.10,.17,'triangle');this.note(1046.5,.12,.14,.12,'sine')}
 shuffle(){for(let i=0;i<12;i++){this.note(180+(i%3)*35,i*.09,.025,.035,'triangle')}}
 reveal(value){this.note(523.25,.30,.32,.13);this.note(783.99,.42,.45,.11);this.note(value>=1000?1567.98:1046.5,.5,.7,.10);}
 returnCard(){this.note(523.25,0,.24,.055);this.note(392,.09,.3,.04)}
 win(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>this.note(f,i*.14,1.1,.15));}
 gift(){this.note(659.25,0,.3,.16);this.note(987.77,.12,.6,.13)}
}
