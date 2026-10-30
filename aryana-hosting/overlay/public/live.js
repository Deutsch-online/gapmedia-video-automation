const $=id=>document.getElementById(id);
let context,gain,source,enabled=false,playing=false,queue=[],revision,epoch=0;
const seen=new Set(),video=$('hostVideo'),idle=$('idleVideo');let idlePath='/assets/idle.mp4?v=0061e1f4605708e7';
let idleBlocked=false,idleStarting=false;
function manualPlay(needed){const button=$('enableAudio');needed=Boolean(needed&&!idle.hidden);button.classList.toggle('needs-play',needed);button.hidden=enabled&&!needed;}
function startIdle(userGesture=false){
 if(idle.hidden)return;
 if(!idle.paused&&!idle.error){manualPlay(false);return;}
 if(idleBlocked&&!userGesture){manualPlay(true);return;}
 if(idleStarting&&!userGesture)return;
 if(userGesture&&idle.error){idle.load();idleBlocked=false;}
 idle.muted=true;idle.defaultMuted=true;idleStarting=true;
 try{
  Promise.resolve(idle.play()).then(()=>{idleBlocked=false;manualPlay(false);}).catch(error=>{
   if(error.name==='AbortError')return;
   idleBlocked=true;manualPlay(true);report('idle-error','برای شروع پخش، دکمهٔ پخش را لمس کنید.');
  }).finally(()=>{idleStarting=false;});
 }catch{idleStarting=false;idleBlocked=true;manualPlay(true);}
}
function refreshIdle(){
 const show=Boolean(idlePath&&video.hidden);idle.hidden=!show;
 if(show){if(idle.getAttribute('src')!==idlePath){idleBlocked=false;idle.src=idlePath;}startIdle();}
 else{idle.pause();manualPlay(false);}
}
idle.addEventListener('playing',()=>{idleBlocked=false;manualPlay(false);});
idle.addEventListener('error',()=>{if(!idle.hidden){idleBlocked=true;manualPlay(true);report('idle-error','دریافت ویدیو انجام نشد؛ برای تلاش دوباره پخش را لمس کنید.');}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshIdle();});
const mobile=location.pathname.includes('mobile');document.body.classList.toggle('mobile-output',mobile);
function fit(){document.documentElement.style.setProperty('--live-scale',(mobile?Math.max:Math.min)(innerWidth/1080,innerHeight/1920));}
addEventListener('resize',fit);fit();
function report(status,detail=''){parent.postMessage({type:'aryana-player',status,detail},location.origin);}
function stop(){epoch++;queue=[];try{source?.stop();}catch{}source=null;video.pause();video.playbackRate=1;video.hidden=true;playing=false;refreshIdle();report(enabled?'ready':'locked');}
window.aryanaActivateAudio=async()=>{
 startIdle(true);
 try{
  context??=new AudioContext();if(!gain){gain=context.createGain();gain.connect(context.destination);}
  await context.resume();enabled=context.state==='running';manualPlay(idleBlocked);
  report(enabled?'ready':'locked');if(enabled)void next();return enabled;
 }catch(e){report('error',e.message);return false;}
};
$('enableAudio').onclick=()=>void window.aryanaActivateAudio();
contextState();function contextState(){report('locked');}
let volume=.85,muted=false,avatarMode='animated';

function render(state){
 if(revision!==undefined&&revision!==state.revision)stop();revision=state.revision;
 
 idlePath=state.playback?.idleVideo||'/assets/idle.mp4?v=0061e1f4605708e7';refreshIdle();
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
  const node=context.createBufferSource();source=node;node.buffer=buffer;node.connect(gain);if(token!==epoch)return;
  node.onended=()=>{if(token!==epoch)return;source=null;playing=false;video.pause();video.playbackRate=1;video.hidden=true;refreshIdle();report('ready');void next();};
  if(item.video){video.src=item.video;video.muted=true;try{await video.play();if(token!==epoch)return;video.hidden=false;refreshIdle();}catch{video.hidden=true;refreshIdle();}}
  if(token!==epoch){video.pause();video.hidden=true;return;}
  const startAt=context.currentTime+.02;
  if(item.video&&!video.hidden)video.currentTime=0;
  node.start(startAt);
  if(item.video&&!video.hidden){const sync=()=>{if(token!==epoch||!playing||video.hidden)return;const expected=context.currentTime-startAt;if(expected>=0){const delta=expected-video.currentTime;if(Math.abs(delta)>.18)video.currentTime=Math.max(0,expected);video.playbackRate=Math.max(.96,Math.min(1.04,1+delta*.15));}requestAnimationFrame(sync);};requestAnimationFrame(sync);}
  report('playing');
 }catch(e){if(token!==epoch)return;playing=false;video.hidden=true;refreshIdle();report('error',e.message);void next();}
}
function connect(){const ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/events');ws.onmessage=e=>{try{render(JSON.parse(e.data));}catch{report('error','پیام نامعتبر پخش');}};ws.onclose=()=>{report('disconnected');setTimeout(connect,2000);};}
refreshIdle();connect();
