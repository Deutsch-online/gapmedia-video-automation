import {showAvatar,connectSpeech,react} from '/avatar.js';
const $=id=>document.getElementById(id);
let context,gain,source,enabled=false,playing=false,queue=[],revision,epoch=0;
const seen=new Set(),video=$('hostVideo');
const mobile=location.pathname.includes('mobile');document.body.classList.toggle('mobile-output',mobile);
function fit(){document.documentElement.style.setProperty('--live-scale',(mobile?Math.max:Math.min)(innerWidth/1080,innerHeight/1920));}
addEventListener('resize',fit);fit();
function report(status,detail=''){parent.postMessage({type:'aryana-player',status,detail},location.origin);}
function stop(){epoch++;queue=[];source?.stop();source=null;video.pause();video.hidden=true;playing=false;report(enabled?'ready':'locked');}
window.aryanaActivateAudio=async()=>{
 try{
  context??=new AudioContext();if(!gain){gain=context.createGain();gain.connect(context.destination);}
  await context.resume();enabled=context.state==='running';$('enableAudio').hidden=enabled;
  report(enabled?'ready':'locked');if(enabled)void next();return enabled;
 }catch(e){report('error',e.message);return false;}
};
$('enableAudio').onclick=()=>void window.aryanaActivateAudio();
contextState();function contextState(){report('locked');}
let volume=.85,muted=false,avatarMode;

function render(state){
 if(revision!==undefined&&revision!==state.revision)stop();revision=state.revision;
 if(avatarMode!==state.playback?.avatarMode){avatarMode=state.playback?.avatarMode||'animated';void showAvatar(avatarMode==='animated');}
 volume=Math.max(0,Math.min(1,(state.playback?.volume??85)/100));muted=Boolean(state.playback?.muted);
 if(gain)gain.gain.value=muted?0:volume;
 for(const item of state.utterances||[]){
  if(seen.has(item.id))continue;seen.add(item.id);while(seen.size>1000)seen.delete(seen.values().next().value);
  if(Date.now()-item.at>60000)continue;queue.push(item);
 }
 queue.sort((a,b)=>(b.priority||0)-(a.priority||0)||a.at-b.at);queue=queue.slice(0,6);
 if(enabled)void next();
}
async function next(){
 if(playing||!enabled)return;
 queue=queue.filter(item=>Date.now()-item.at<60000);if(!queue.length)return;
 const item=queue.shift(),token=epoch;playing=true;report('loading');
 try{
  const response=await fetch(item.audio);if(!response.ok)throw Error('دریافت صدا انجام نشد');
  const buffer=await context.decodeAudioData(await response.arrayBuffer());
  if(token!==epoch)return;
  if(context.state!=='running'){playing=false;queue.unshift(item);enabled=false;$('enableAudio').hidden=false;report('locked');return;}
  gain.gain.value=muted?0:volume;
  const node=context.createBufferSource();source=node;node.buffer=buffer;node.connect(gain);await connectSpeech(context,node);if(token!==epoch)return;react(item.kind);
  node.onended=()=>{if(token!==epoch)return;source=null;playing=false;video.pause();video.hidden=true;report('ready');void next();};
  if(item.video&&avatarMode==='portrait'){video.src=item.video;video.muted=true;video.hidden=false;await video.play().catch(()=>{video.hidden=true;});}
  if(token!==epoch){video.pause();video.hidden=true;return;}
  node.start();report('playing');
 }catch(e){if(token!==epoch)return;playing=false;video.hidden=true;report('error',e.message);void next();}
}
function connect(){const ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/events');ws.onmessage=e=>{try{render(JSON.parse(e.data));}catch{report('error','پیام نامعتبر پخش');}};ws.onclose=()=>{report('disconnected');setTimeout(connect,2000);};}
connect();
