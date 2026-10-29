const $=id=>document.getElementById(id);let enabled=false,playing=false,queue=[],seen=new Set(),seenJoins=new Set(),revision,playEpoch=0,captionEnabled=true;
const audio=new Audio();let activeVideo=false;
function fit(){document.documentElement.style.setProperty('--live-scale',Math.min(innerWidth/1080,innerHeight/1920));}addEventListener('resize',fit);fit();
function make(tag,cls,text){const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;}
function face(person){const e=make('span','fan-face',Array.from(person.name||'؟')[0]);if(person.avatar){const img=document.createElement('img');img.src=person.avatar;img.referrerPolicy='no-referrer';img.alt='';img.onerror=()=>img.remove();e.append(img);}return e;}
function card(person,featured=false){const e=make('div','fan-card'+(featured?' featured':''));if(featured)e.append(make('small','fan-title',person.kind==='gift'?'نفر اول گیفت':'نفر اول لایک'));e.append(face(person));const copy=make('div','fan-copy');copy.append(make('strong','',person.name),make('small','',person.kind==='gift'?'🎁 '+person.coins+(person.unknown?' + ؟':''):'♡ '+person.likes));e.append(copy);return e;}
let railSignature;
function render(state){
 if(revision!==undefined&&revision!==state.revision){playEpoch++;queue=[];audio.pause();$('hostVideo').pause();$('hostVideo').hidden=true;$('caption').hidden=true;playing=false;}revision=state.revision,playEpoch=0,captionEnabled=true;
 const playback=state.playback||{};audio.volume=$('hostVideo').volume=Math.max(0,Math.min(1,(playback.volume??85)/100));audio.muted=$('hostVideo').muted=Boolean(playback.muted);captionEnabled=playback.subtitles!==false;if(!captionEnabled)$('caption').hidden=true;
 $('stageConnection').textContent=({connected:'LIVE · متصل',connecting:'در حال اتصال…',reconnecting:'اتصال مجدد تیک‌تاک…',ended:'پایان لایف'})[state.connection]||'پیش‌نمایش';
 const signature=JSON.stringify([state.focus,state.rows]);if(signature!==railSignature){railSignature=signature;const rows=state.rows.filter(p=>!state.focus||p.key!==state.focus.key).slice(0,6);$('supporters').replaceChildren(...(state.focus?[card(state.focus,true)]:[]),...rows.map(p=>card(p)));}
 for(const join of state.joins){if(seenJoins.has(join.key))continue;seenJoins.add(join.key);while(seenJoins.size>1000)seenJoins.delete(seenJoins.values().next().value);const toast=make('div','arrival');toast.style.bottom=((seenJoins.size%3)*180)+'px';toast.append(face(join));const copy=make('div','');copy.append(make('strong','',join.name),make('small','',join.spokenName?'خوش آمدید!':'تشکر از همراهی‌تان'));toast.append(copy);$('joins').append(toast);setTimeout(()=>toast.remove(),6000);}
 for(const item of state.utterances){if(seen.has(item.id)||Date.now()-item.at>60000)continue;seen.add(item.id);while(seen.size>1000)seen.delete(seen.values().next().value);queue.push(item);queue.sort((a,b)=>(b.priority||0)-(a.priority||0)||a.at-b.at);if(queue.length>6)queue.pop();}if(enabled)void playNext();
}
async function playNext(){
 if(playing||!enabled||!queue.length)return;const item=queue.shift(),epoch=playEpoch;playing=true;$('caption').textContent=item.text;$('caption').hidden=!captionEnabled;
 const player=item.video?$('hostVideo'):audio;activeVideo=Boolean(item.video);$('hostVideo').hidden=!activeVideo;player.src=item.video||item.audio;
 const finish=()=>{if(epoch!==playEpoch)return;player.onended=player.onerror=null;playing=false;$('hostVideo').hidden=true;$('caption').hidden=true;$('reaction').textContent='';void playNext();};player.onended=finish;player.onerror=finish;
 $('reaction').textContent=({gift:'♡',like:'♡',join:'✧'})[item.kind]||'';
 try{await player.play();}catch{playing=false;queue.unshift(item);enabled=false;$('enableAudio').hidden=false;$('caption').hidden=true;}
}
$('enableAudio').onclick=async()=>{try{const context=new AudioContext();await context.resume();await context.close();enabled=true;$('enableAudio').hidden=true;void playNext();}catch{$('enableAudio').textContent='دوباره برای فعال‌کردن صدا بزنید';}};
function connect(){const ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/events');ws.onmessage=event=>{try{render(JSON.parse(event.data));}catch{$('stageConnection').textContent='پیام نامعتبر صحنه';}};ws.onclose=()=>{$('stageConnection').textContent='ارتباط صحنه قطع شد؛ اتصال مجدد…';setTimeout(connect,2000);};}connect();
