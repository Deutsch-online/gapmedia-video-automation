let context,master,timerBus,current,signature,lastPlayed,lastTimerCue,initializing=false,voices=[];
const $=id=>document.getElementById(id);

// Original short major-key jingle: plucked melody, chords, bass and light hats.
export function scheduleJingle(ctx,destination,start){
 const nodes=[],beat=60/140;
 function note(midi,at,length,level,type='triangle'){
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.value=440*2**((midi-69)/12);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+length);
  osc.connect(gain);gain.connect(destination);osc.start(at);osc.stop(at+length+.02);nodes.push(osc);
 }
 const melody=[76,79,81,79,76,72,74,76,77,81,84,81,79,77,76,74,79,83,86,83,81,79,77,74,76,79,84,79,76,74,72,84];
 melody.forEach((m,i)=>note(m,start+i*beat/2,beat*.65,.24));
 const chords=[[60,64,67],[65,69,72],[67,71,74],[60,64,67]];
 for(let bar=0;bar<4;bar++)for(let b=0;b<4;b++){
  const at=start+(bar*4+b)*beat;note(chords[bar][0]-24,at,beat*.65,.25,'sine');
  chords[bar].forEach(m=>note(m,at+beat/2,beat*.35,.045));
  const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.045),ctx.sampleRate),samples=buffer.getChannelData(0);let seed=1234+b;
  for(let i=0;i<samples.length;i++){seed=(1664525*seed+1013904223)>>>0;samples[i]=(seed/2147483648-1)*(1-i/samples.length);}
  const hat=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();hat.buffer=buffer;filter.type='highpass';filter.frequency.value=6500;gain.gain.value=.09;hat.connect(filter);filter.connect(gain);gain.connect(destination);hat.start(at);nodes.push(hat);
 }
 return nodes;
}
function stopMusic(){for(const voice of voices)try{voice.stop();}catch{}voices=[];}
function play(){
 if(!current||current.phase!=='revealed'||!current.celebration?.count||current.celebration.roundId!==current.roundId||!current.celebrationMusic||!context||context.state!=='running'||lastPlayed===current.roundId)return;
 stopMusic();lastPlayed=current.roundId;voices=scheduleJingle(context,master,context.currentTime+.04);
}
function timerTone(frequency,delay,duration,level){
 if(!context||context.state!=='running')return;
 const osc=context.createOscillator(),gain=context.createGain(),at=context.currentTime+delay;
 osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.005);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
 osc.connect(gain);gain.connect(timerBus);osc.start(at);osc.stop(at+duration+.01);
 osc.onended=()=>{osc.disconnect();gain.disconnect();};
}
async function activateAudio(test=false){
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Audio unavailable');
  context||=new Audio();
  if(!master){master=context.createGain();master.gain.value=(current?.musicVolume??20)/100;master.connect(context.destination);timerBus=context.createGain();timerBus.gain.value=.6;timerBus.connect(context.destination);context.addEventListener('statechange',()=>renderCelebration(current));}
  if(context.state!=='running')await context.resume();
  renderCelebration(current);
  if(test){timerTone(659.25,0,.18,.3);timerTone(1046.5,.2,.25,.26);}
 }catch{$('enableMusic').textContent='♫ Ton erneut aktivieren';}
}
$('enableMusic').addEventListener('click',()=>void activateAudio(true));
// Browser sources that permit autoplay start immediately; other browsers still
// require a real gesture in this display, not in the separate control page.
for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>void activateAudio(),{once:true});
export function renderCelebration(state){
 if(!state)return;current=state;
 if(!initializing){initializing=true;void activateAudio();}
 if(master)master.gain.setTargetAtTime(Math.max(0,Math.min(100,state.musicVolume??20))/100,context.currentTime,.03);
 $('enableMusic').classList.remove('hidden');
 $('enableMusic').textContent=context?.state==='running'?'♫ Ton testen':'♫ Ton aktivieren';
 $('enableMusic').title=context?.state==='running'?'Testton für diese Browser-Quelle abspielen':'In dieser Browser-Quelle einmal klicken, um den Ton freizugeben';
 const result=state.celebration;const visible=Boolean(result?.count);
 $('winnerCelebration').classList.toggle('hidden',!visible);
 if(!visible||!state.celebrationMusic||state.phase!=='revealed'||result.roundId!==state.roundId)stopMusic();
 if(!visible){signature=null;return;}
 $('winnerTitle').textContent=result.roundId===state.roundId&&state.phase==='revealed'?'Richtig beantwortet!':'Zuletzt richtig beantwortet';
 $('winnerCount').textContent=result.count+(result.count===1?' Person':' Personen')+' · '+result.questionId;
 $('winnerProfiles').classList.toggle('few',result.people.length<=3);
 const next=JSON.stringify([result.roundId,result.people]);
 if(next!==signature){signature=next;$('winnerProfiles').replaceChildren(...result.people.map((person,index)=>{
  const card=document.createElement('div');card.className='winner-profile';card.style.setProperty('--winner-i',index);
  const face=document.createElement('div');face.className='winner-face';face.textContent=Array.from(person.name)[0]||'✓';
  if(person.avatar){const img=document.createElement('img');img.src=person.avatar;img.alt=person.name;img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove(),{once:true});face.append(img);}
  const badge=document.createElement('b');badge.className='winner-check';badge.textContent='✓';
  const name=document.createElement('span');name.textContent=person.name;name.title=person.name;
  card.append(face,badge,name);return card;
 }));}
 play();
}

export function soundCountdown(state,left){
 if(!state?.timerSound||!context||context.state!=='running'||!state.roundId)return;
 const tick=state.phase==='open'&&left>=1&&left<=5;
 const ended=state.phase==='revealed'&&state.serverTime>=state.closesAt;
 if(!tick&&!ended)return;
 const key=state.roundId+':'+(ended?'end':left);if(key===lastTimerCue)return;lastTimerCue=key;
 if(ended){timerTone(659.25,0,.16,.3);timerTone(1046.5,.16,.25,.26);}else timerTone(880,0,.07,.24);
}
