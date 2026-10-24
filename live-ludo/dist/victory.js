// Ring artwork and animation: live-rings/public and live-driving-quiz/public/rings.js in this repository.
// Original major-key victory jingle copied from live-driving-quiz/public/celebration.js.
import {drawRing} from './rings.js';
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


export function victoryLevel(gifts){return gifts>100?'fire':gifts>=100?'ice':gifts>=50?'gold':gifts>=10?'silver':'glow'}
export function createVictoryEffect(main,{audio,volume}){
 const root=document.createElement('section');root.className='champion-overlay';root.hidden=true;root.setAttribute('aria-label','Country championship celebration');
 root.innerHTML='<div class="champion-confetti"></div><div class="champion-kicker">COUNTRY CHAMPION</div><h2></h2><div class="champion-art"><canvas width="760" height="760"></canvas><div class="champion-portrait"></div><span class="champion-crown">♛</span></div><strong class="champion-supporter"></strong><div class="champion-score"></div><div class="champion-countdown"></div>';
 main.append(root);const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),portrait=root.querySelector('.champion-portrait');let key=null,data=null,frame,lastDraw=0,nodes=[],bus,played=false,expires=0;
 function stopMusic(){for(const node of nodes)try{node.stop()}catch{}nodes=[];try{bus?.disconnect()}catch{}bus=null}
 function music(){const context=audio();if(played||context?.state!=='running')return;played=true;bus=context.createGain();bus.gain.value=Math.max(0,Math.min(.7,Number(volume())/100*.7));bus.connect(context.destination);const start=context.currentTime+.04,remaining=Math.max(0,(expires-Date.now())/1000);for(let n=0;n<4&&n*7.1<remaining;n++)nodes.push(...scheduleJingle(context,bus,start+n*7.1))}
 function draw(now){if(!data||root.hidden)return;if(Date.now()>=expires){root.hidden=true;stopMusic();return}if(now-lastDraw>1000/30){lastDraw=now;ctx.clearRect(0,0,760,760);drawRing(ctx,380,380,352,victoryLevel(data.gifts),now,{speed:1.2,intensity:Math.min(2,1+data.gifts/100),ornaments:true});root.querySelector('.champion-countdown').textContent='NEXT ROUND · '+Math.max(0,Math.ceil((expires-Date.now())/1000))+'s';music()}frame=requestAnimationFrame(draw)}
 return{update(next){if(next.winner===null){data=null;key=null;root.hidden=true;cancelAnimationFrame(frame);stopMusic();return}const nextKey=next.round+':'+next.winner;if(key===nextKey)return;key=nextKey;data=next;expires=Math.min(Date.now()+30000,Number(next.until)||Date.now()+30000);played=false;stopMusic();root.hidden=false;root.dataset.level=victoryLevel(next.gifts);root.querySelector('h2').textContent=next.country+' WINS';root.querySelector('.champion-supporter').textContent=next.person?.name||next.country;root.querySelector('.champion-score').textContent='◆ '+next.points+' POINTS · '+next.gifts+' GIFTS';portrait.replaceChildren();const src=next.person?.avatar;if(src&&(/^(https:\/\/|data:image\/(webp|png|jpeg);base64,)/.test(src)||/^\/avatars\/[a-z0-9-]+\.svg$/.test(src))){const img=document.createElement('img');img.src=src;img.alt=next.person?.name||'Champion supporter';img.referrerPolicy='no-referrer';portrait.append(img)}else portrait.textContent=Array.from(next.person?.name||next.country||'♛')[0];const confetti=root.querySelector('.champion-confetti');confetti.replaceChildren();for(let n=0;n<54;n++){const dot=document.createElement('i');dot.style.setProperty('--particle',n);dot.style.setProperty('--start',(n*37%100)+'%');dot.style.setProperty('--delay',(-n*.23)+'s');confetti.append(dot)}cancelAnimationFrame(frame);frame=requestAnimationFrame(draw)},stop(){root.hidden=true;data=null;stopMusic();cancelAnimationFrame(frame)}};
}
