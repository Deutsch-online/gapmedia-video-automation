import {renderCelebration,soundCountdown} from './celebration.js';
import {renderGuests} from './guests-ui.js';
function fitScreen(){document.documentElement.style.setProperty('--screen-scale',Math.min(innerWidth/1080,innerHeight/1920));}
addEventListener('resize',fitScreen);fitScreen();
const $=id=>document.getElementById(id);
let state,receivedAt=0,optionSignature,supporterSignature,guestSignature;
const fa=new Intl.NumberFormat('en-US');
const digits=text=>String(text).replace(/[۰-۹٠-٩]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.includes(c)?'۰۱۲۳۴۵۶۷۸۹'.indexOf(c):'٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
const icons={junction:'↗',parking:'P',distance:'↔',phone:'📵',siren:'🚑',beacon:'⚠',fog:'≋',bus:'BUS',crossing:'🚶'};
function element(tag,className,text){const el=document.createElement(tag);el.className=className;el.textContent=text;return el;}
function render(s){
  state=s;receivedAt=performance.now();const q=s.question;
  $('show').classList.toggle('revealed',s.phase==='revealed');
  const imported=q.source_kind==='imported-question-bank';$('show').classList.toggle('bank-question',imported);$('show').classList.toggle('watching',s.phase==='watching');
  $('bankMedia').classList.toggle('hidden',!q.image);$('bankImage').classList.toggle('hidden',Boolean(q.video));$('bankVideo').classList.toggle('hidden',!q.video);
  const img=$('bankImage');if(q.image&&img.getAttribute('src')!==q.image){$('imageFailure').classList.add('hidden');img.src=q.image;img.alt=q.de||q.id;}
  $('bankImageLabel').textContent=`${q.id}`;

  $('modeLabel').textContent=s.mode==='demo'?'Demo':s.liveReady?(s.answerInput==='comments'?'LIVE · Kommentare':'LIVE · Geschenke'):'Nicht verbunden';
  $('modeLabel').classList.toggle('real',s.mode==='live');
  $('topic').textContent='Führerschein-Theorie';
  $('questionNumber').textContent=`${String(s.index+1).padStart(2,'0')} / ${String(s.total).padStart(2,'0')}`;
  $('questionDe').textContent=q.de;$('questionFa').textContent=digits(q.fa);$('questionFa').classList.toggle('hidden',!s.showPersian);
  $('answerType').textContent=q.multiple?'Mehrere richtige Antworten':'Eine richtige Antwort';
  const scene=document.querySelector('.scene');scene.className='scene'+(!['red','yellow'].includes(q.visual)?' alt':'')+(q.visual==='fog'?' fog':'');
  $('signal').className='signal '+q.visual;$('symbol').textContent=icons[q.visual]||'DE';
  const signature=JSON.stringify([q.id,q.correct,s.gifts,s.mode,s.answerInput,s.showPersian,s.counts,s.participants]);
  if(signature!==optionSignature){$('options').replaceChildren(...q.options.map((o,i)=>{
    const k='ABC'[i],gift=s.answerInput==='comments'?{name:'Kommentar '+fa.format(i+1),symbol:'💬'}:s.gifts[k];
    const row=element('div','option'+(q.correct?(q.correct.includes(k)?' correct':' wrong'):''));
    const key=element('div','option-key',q.correct?.includes(k)?'✓':s.answerInput==='comments'?fa.format(i+1):k);
    const copy=element('div','option-copy');
    const de=element('div','option-de',o.de);de.lang='de';de.dir='ltr';
    const f=element('div','option-fa'+(s.showPersian?'':' hidden'),digits(o.fa));f.lang='fa';f.dir='rtl';
    const pill=element('div','gift-pill');const info=element('span','gift-info');
    const symbol=element('span','gift-symbol',gift?.symbol||'🎁');info.append(symbol);
    if(gift?.icon){const icon=document.createElement('img');icon.className='gift-icon';icon.alt=gift.name;icon.referrerPolicy='no-referrer';icon.src=gift.icon;icon.addEventListener('error',()=>icon.remove(),{once:true});icon.addEventListener('load',()=>symbol.classList.add('hidden'),{once:true});info.append(icon);}
    info.append(element('span','',`${gift?.name||'Nicht konfiguriert'}${gift?.id?' · #'+gift.id:''}`));pill.append(info);
    const people=s.participants?.[k]||[];if(people.length){const strip=element('div','answer-participants');strip.setAttribute('aria-label','Antwortende für Option '+k);
     for(const person of people){const face=element('span','participant-avatar');face.title=person.name;face.dataset.participant=person.key;face.append(element('span','avatar-initial',Array.from(person.name)[0]||'?'));
      if(person.avatar){const img=document.createElement('img');img.alt=person.name;img.referrerPolicy='no-referrer';img.src=person.avatar;img.addEventListener('error',()=>img.remove(),{once:true});face.append(img);}strip.append(face);
     }pill.append(strip);
    }
    copy.append(de,f,pill);row.append(key,copy,element('div','vote-count',fa.format(s.counts[k])));return row;
  }));optionSignature=signature;}
  $('explanation').classList.toggle('hidden',!q.correct);
  const all=s.gifts.ALL;
  $('allGift').classList.toggle('hidden',!q.multiple||s.phase==='revealed'||(s.mode==='live'&&!all?.verified));
  $('allGift').textContent='Alle drei Optionen: A + B + C';
  $('explainDe').textContent=q.explanation_de||'';$('explainFa').textContent=q.explanation_fa||'';
  if(q.source)$('source').href=q.source;else $('source').removeAttribute('href');
  const labels={watching:'Video ansehen – noch nicht antworten',waiting:'Bereit für die nächste Frage',open:s.mode==='demo'?'Testantwort auswählen':'Jetzt antworten',revealed:'Richtige Antwort',paused:'Pausiert – Antworten deaktiviert'};
  $('phaseLabel').textContent=labels[s.phase]||s.phase;
  $('voters').textContent=`${fa.format(s.voters)} Teilnehmende`;
  $('lastAnswer').textContent=s.lastAnswer?`${s.lastAnswer.name}: ${s.lastAnswer.choice}`:'Erst nachdenken, dann antworten.';
  $('giftNote').textContent='Antworten gelten nur während der Antwortzeit.';
  const gs=JSON.stringify(s.guests||[]);if(gs!==guestSignature){guestSignature=gs;renderGuests($('guestList'),s.guests||[],{language:'de'});}
  renderSupporters(s.supporters||[]);renderCelebration(s);syncVideo();updateTimer();requestAnimationFrame(adjustBankLayout);
}
function serverNow(){return state.serverTime+performance.now()-receivedAt;}
function updateTimer(){if(!state)return;const target=state.phase==='watching'?state.opensAt:state.closesAt;const left=['open','watching'].includes(state.phase)?Math.max(0,Math.ceil((target-serverNow())/1000)):0;
 soundCountdown(state,left);
 $('timer').replaceChildren(document.createTextNode(fa.format(left)),element('span','',state.phase==='watching'?'Video':state.phase==='revealed'?'Antwort':'Sek.'));
 $('progressBar').style.width=state.phase==='open'?`${Math.max(0,Math.min(100,left/(state.questionSeconds||30)*100))}%`:state.phase==='revealed'?'100%':'0%';}
setInterval(updateTimer,250);
let reconnect;
function connect(){const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/events`);ws.onmessage=e=>render(JSON.parse(e.data));ws.onclose=()=>{$('phaseLabel').textContent='Verbindung unterbrochen – bitte warten.';clearTimeout(reconnect);reconnect=setTimeout(connect,2000);};}
fetch('/api/state').then(r=>r.json()).then(render);connect();

$('bankImage').addEventListener('error',()=>{$('imageFailure').classList.remove('hidden');$('phaseLabel').textContent='Das Bild ist nicht verfügbar. Bitte die Frage pausieren.';});

function adjustBankLayout(){const show=$('show');if(!show.classList.contains('bank-question'))return;const media=state?.question.video?$('bankVideo'):$('bankImage');media.style.removeProperty('height');show.classList.remove('bank-compact','bank-crowded');if(show.scrollHeight>show.clientHeight)show.classList.add('bank-compact');if(show.scrollHeight>show.clientHeight)show.classList.add('bank-crowded');if(show.scrollHeight>show.clientHeight){const height=Number.parseFloat(getComputedStyle(media).height);media.style.height=Math.max(180,height-(show.scrollHeight-show.clientHeight)-12)+'px';}}
document.fonts.ready.then(adjustBankLayout);

function syncVideo(){
 if(!state)return;const video=$('bankVideo'),q=state.question;
 if(!q.video){video.pause();if(video.hasAttribute('src')){video.removeAttribute('src');video.load();}return;}
 if(video.getAttribute('src')!==q.video){video.src=q.video;video.poster=q.image;video.load();}
 if(!video.readyState)return;
 if(state.phase==='watching'){
  const elapsed=(serverNow()-state.videoStartedAt)/1000;const target=Math.max(0,Math.min(elapsed,q.video_duration_ms/1000-.05));
  if(Math.abs(video.currentTime-target)>.8)video.currentTime=target;
  if(elapsed<0)video.pause();else if(video.paused)void video.play().catch(()=>{$('imageFailure').textContent='Automatische Wiedergabe fehlgeschlagen. Bitte das Kontrollpanel prüfen.';$('imageFailure').classList.remove('hidden');});
 }else{video.pause();if(['open','revealed'].includes(state.phase))video.currentTime=Math.max(0,Math.min(video.duration,q.video_duration_ms/1000)-.05);}
}
$('bankVideo').addEventListener('loadedmetadata',syncVideo);
$('bankVideo').addEventListener('error',()=>{$('imageFailure').textContent='Video nicht verfügbar. Bitte die Frage pausieren.';$('imageFailure').classList.remove('hidden');});

const dragonPath='M8 35 17 23 13 9 27 18 38 6 38 20 54 25 48 34 59 42 43 47 38 57 28 45 16 49 22 38Z';
function dragon(){const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 64 64');svg.classList.add('dragon-head');const path=document.createElementNS(ns,'path');path.setAttribute('d',dragonPath);path.setAttribute('fill','#3d1109');path.setAttribute('stroke','#ffd580');path.setAttribute('stroke-width','3');const eye=document.createElementNS(ns,'circle');eye.setAttribute('cx','39');eye.setAttribute('cy','30');eye.setAttribute('r','3');eye.setAttribute('fill','#fff5a8');svg.append(path,eye);return svg;}
function renderSupporters(rows){
 const signature=JSON.stringify(rows);if(signature===supporterSignature)return;supporterSignature=signature;
 const rail=$('supporterRail'),existing=new Map([...rail.children].map(card=>[card.dataset.supporterKey,card])),active=new Set(rows.map(p=>p.key));
 for(const [key,card] of existing)if(!active.has(key))card.remove();
 rows.forEach((person,index)=>{
  const previous=existing.get(person.key);if(previous){previous.classList.toggle('newest',index===0);previous.style.order=index;return;}
  const card=element('div',`supporter tier-${person.tier}${index===0?' newest':''}`);card.title=person.name;card.dataset.supporterKey=person.key;card.style.order=index;
  const orb=element('div','supporter-orb'),photo=element('div','supporter-photo',Array.from(person.name)[0]||'?');
  if(person.avatar){const img=document.createElement('img');img.src=person.avatar;img.alt=person.name;img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove(),{once:true});photo.append(img);}
  orb.append(element('span','orb-halo'),photo,element('span','orb-gloss'));
  if(['gold','diamond','vip'].includes(person.tier)){for(let i=0;i<4;i++){const spark=element('i','orb-spark spark-'+i);orb.append(spark);}}
  if(person.tier==='vip'){const orbit=element('span','dragon-orbit');orbit.append(dragon());orb.append(orbit,element('b','supporter-badge','VIP'));}
  else if(person.tier==='diamond')orb.append(element('b','supporter-badge','◆'));
  else if(person.tier==='gold')orb.append(element('b','supporter-badge','♛'));
  card.append(orb,element('span','supporter-name',person.name));
  card.append(element('small','supporter-gift',person.giftName+(person.count?' × '+fa.format(person.count):'')));
  if(person.coins!==null)card.append(element('small','supporter-coins',fa.format(person.coins)+' 🪙'));rail.append(card);
 });
}
