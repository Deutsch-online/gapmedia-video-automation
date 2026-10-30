const $=id=>document.getElementById(id),video=$('hostVideo'),idle=$('idleVideo');
let context,gain,source,enabled=false,playing=false,queue=[],revision,epoch=0,current=null,volume=.85,muted=false;
const seen=new Set();let idlePath='/assets/idle.mp4?v=0061e1f4605708e7',idleBlocked=false,idleStarting=false;
function report(status,detail=''){parent.postMessage({type:'aryana-player',status,detail},location.origin);}
function manualPlay(){const button=$('enableAudio');button.classList.toggle('needs-play',idleBlocked&&!idle.hidden);button.hidden=enabled&&!idleBlocked;}
function startIdle(userGesture=false){
 if(idle.hidden)return;if(!idle.paused&&!idle.error){manualPlay();return;}
 if((idleBlocked||idleStarting)&&!userGesture){manualPlay();return;}
 if(userGesture&&idle.error)idle.load();idle.muted=true;idle.defaultMuted=true;idleStarting=true;
 Promise.resolve(idle.play()).then(()=>{idleBlocked=false;manualPlay();}).catch(error=>{if(error.name!=='AbortError'){idleBlocked=true;manualPlay();report('idle-error','برای شروع پخش، تصویر را لمس کنید.');}}).finally(()=>{idleStarting=false;});
}
function refreshIdle(){idle.hidden=!(idlePath&&video.hidden);if(!idle.hidden){if(idle.getAttribute('src')!==idlePath)idle.src=idlePath;startIdle();}else idle.pause();manualPlay();}
idle.addEventListener('playing',()=>{idleBlocked=false;manualPlay();});
idle.addEventListener('error',()=>{idleBlocked=true;manualPlay();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshIdle();});
const mobile=location.pathname.includes('mobile');document.body.classList.toggle('mobile-output',mobile);
function fit(){document.documentElement.style.setProperty('--live-scale',(mobile?Math.max:Math.min)(innerWidth/1080,innerHeight/1920));}addEventListener('resize',fit);fit();
function audioContext(){context??=new AudioContext();if(!gain){gain=context.createGain();gain.connect(context.destination);}return context;}
function stop(){epoch++;queue=[];current=null;try{source?.stop();}catch{}source=null;video.onended=null;video.pause();video.playbackRate=1;video.hidden=true;playing=false;refreshIdle();report(enabled?'ready':'locked');}
function finish(token){if(token!==epoch||!current)return;current=null;const node=source;source=null;try{node?.stop();}catch{}video.onended=null;video.pause();video.playbackRate=1;video.hidden=true;playing=false;refreshIdle();report(enabled?'ready':'locked');void next();}
function startAudio(){
 const item=current;if(!item||!item.buffer||source||context?.state!=='running')return;
 const offset=item.video?video.currentTime:0;if(offset>=item.buffer.duration)return;
 const token=item.token,node=context.createBufferSource();source=node;node.buffer=item.buffer;node.connect(gain);gain.gain.value=muted?0:volume;
 const startAt=context.currentTime+.02;node.onended=()=>{if(source===node)finish(token);};node.start(startAt,offset);
 if(item.video){const sync=()=>{if(token!==epoch||!playing||current!==item||source!==node)return;const expected=offset+context.currentTime-startAt;if(expected>=0){const delta=expected-video.currentTime;if(Math.abs(delta)>.18)video.currentTime=Math.max(0,expected);video.playbackRate=Math.max(.96,Math.min(1.04,1+delta*.15));}requestAnimationFrame(sync);};requestAnimationFrame(sync);}
 report('playing');
}
window.aryanaActivateAudio=async()=>{startIdle(true);try{await audioContext().resume();enabled=context.state==='running';manualPlay();if(enabled){startAudio();void next();}report(enabled?'ready':'locked');return enabled;}catch(error){report('error',error.message);return false;}};
$('enableAudio').onclick=()=>void window.aryanaActivateAudio();
function render(state){
 if(revision!==undefined&&revision!==state.revision)stop();revision=state.revision;
 idlePath=state.playback?.idleVideo||idlePath;refreshIdle();volume=Math.max(0,Math.min(1,(state.playback?.volume??85)/100));muted=Boolean(state.playback?.muted);if(gain)gain.gain.value=muted?0:volume;
 for(const item of state.utterances||[]){if(seen.has(item.id))continue;seen.add(item.id);while(seen.size>1000)seen.delete(seen.values().next().value);if(Date.now()-item.at<60000)queue.push(item);}
 queue.sort((a,b)=>(b.priority||0)-(a.priority||0)||a.at-b.at);queue=queue.slice(0,6);void next();
}
async function next(){
 if(playing)return;queue=queue.filter(item=>Date.now()-item.at<60000);if(!queue.length)return;
 if(!queue[0].video&&!enabled){manualPlay();report('locked');return;}
 const item=queue.shift(),token=epoch;playing=true;current={...item,token,buffer:null};const active=current;report('loading');
 try{
  const response=await fetch(item.audio);if(!response.ok)throw Error('دریافت صدای جمله انجام نشد.');const buffer=await audioContext().decodeAudioData(await response.arrayBuffer());
  if(token!==epoch||current!==active)return;active.buffer=buffer;
  if(item.video){video.src=item.video;video.muted=true;video.currentTime=0;await video.play();if(token!==epoch)return;video.hidden=false;video.onended=()=>finish(token);refreshIdle();report(enabled?'playing':'playing-muted');}
  enabled=context.state==='running';manualPlay();startAudio();
 }catch(error){if(token!==epoch)return;finish(token);report('error',error.message);}
}
let lastStateAt=0,ws;
function accept(data){lastStateAt=Date.now();render(data);}
function connect(){try{ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/events');ws.onmessage=e=>{try{accept(JSON.parse(e.data));}catch{report('error','پیام نامعتبر پخش');}};ws.onclose=()=>{setTimeout(connect,2000);};ws.onerror=()=>{};}catch{setTimeout(connect,3000);}}
async function poll(){if(lastStateAt&&Date.now()-lastStateAt<4500)return;try{const response=await fetch('/api/playback',{cache:'no-store'});if(response.ok)accept(await response.json());}catch{report('disconnected');}}
refreshIdle();connect();void poll();setInterval(()=>void poll(),2500);
// OBS/LIVE Studio may permit audio without a gesture. A blocked resume never blocks video.
void window.aryanaActivateAudio();
