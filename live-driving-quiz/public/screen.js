import {renderOperator} from './operator-controls.js';
import {renderMediaViewer} from './media-viewer.js';
import {renderActivity} from './activity-ui.js';
import {renderCelebration,soundCountdown} from './celebration.js';
import {renderGuests} from './guests-ui.js';
function fitScreen(){document.documentElement.style.setProperty('--screen-scale',Math.min(innerWidth/1080,innerHeight/1920));}
addEventListener('resize',fitScreen);fitScreen();
const $=id=>document.getElementById(id);
let activeBuild,activeScreenRevision;
let state,receivedAt=0,optionSignature,supporterSignature,guestSignature;
const fa=new Intl.NumberFormat('en-US');
const digits=text=>String(text).replace(/[۰-۹٠-٩]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.includes(c)?'۰۱۲۳۴۵۶۷۸۹'.indexOf(c):'٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
const icons={junction:'↗',parking:'P',distance:'↔',phone:'📵',siren:'🚑',beacon:'⚠',fog:'≋',bus:'BUS',crossing:'🚶'};
function element(tag,className,text){const el=document.createElement(tag);el.className=className;el.textContent=text;return el;}
function render(s){
  if(s.screenRevision!==undefined){if(activeScreenRevision!==undefined&&s.screenRevision!==activeScreenRevision){location.reload();return;}activeScreenRevision=s.screenRevision;}
  if(activeBuild&&s.build&&activeBuild!==s.build){location.reload();return;}activeBuild=s.build;
  state=s;receivedAt=performance.now();const q=s.question;
  $('show').classList.toggle('has-activity',Boolean(s.supporters?.length||s.activityFocus));
  $('show').classList.toggle('answer-comments',s.answerInput==='comments');
  $('show').classList.toggle('revealed',s.phase==='revealed');
  const imported=q.source_kind==='imported-question-bank';$('show').classList.toggle('bank-question',imported);$('show').classList.toggle('watching',s.phase==='watching');
  $('bankMedia').classList.toggle('hidden',!q.image);$('bankImage').classList.toggle('hidden',Boolean(q.video));$('bankVideo').classList.toggle('hidden',!q.video);
  const img=$('bankImage');if(q.image&&img.getAttribute('src')!==q.image){$('imageFailure').classList.add('hidden');img.src=q.image;img.alt=q.de||q.id;}
  $('bankImageLabel').textContent=`${q.id}`;

  $('modeLabel').textContent=s.mode==='demo'?(s.connection.autoReconnect?'Demo · LIVE nicht verbunden':'Demo'):s.liveReady?(s.answerInput==='comments'?'LIVE · Kommentare':'LIVE · Geschenke'):'Nicht verbunden';
  $('modeLabel').classList.toggle('real',s.mode==='live');
  $('topic').textContent='Führerschein-Theorie';
  $('questionNumber').textContent=s.session?`Sitzung ${s.session.number} · ${s.session.review?'Auswahl':s.session.position+' / '+s.session.size}${s.session.finished?' · Beendet':''}`:`${s.index+1} / ${s.total}`;
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
  renderActivity(s);renderCelebration(s);syncVideo();renderMediaViewer(s);renderOperator(s);updateTimer();requestAnimationFrame(adjustBankLayout);
}
function serverNow(){return state.serverTime+performance.now()-receivedAt;}
function updateTimer(){if(!state)return;const target=state.phase==='watching'?state.opensAt:state.closesAt;const left=['open','watching'].includes(state.phase)?Math.max(0,Math.ceil((target-serverNow())/1000)):0;
 soundCountdown(state,left);
 $('timer').replaceChildren(document.createTextNode(fa.format(left)),element('span','',state.phase==='watching'?'Video':state.phase==='revealed'?'Antwort':'Sek.'));
 $('progressBar').style.width=state.phase==='open'?`${Math.max(0,Math.min(100,left/((state.closesAt-state.opensAt)/1000||state.questionSeconds||30)*100))}%`:state.phase==='revealed'?'100%':'0%';}
setInterval(updateTimer,250);
let reconnect;
function connect(){const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/events`);ws.onmessage=e=>render(JSON.parse(e.data));ws.onclose=()=>{$('phaseLabel').textContent='Verbindung unterbrochen – bitte warten.';clearTimeout(reconnect);reconnect=setTimeout(connect,2000);};}
if(new URLSearchParams(location.search).get('demo')==='sales'){void import('./sales-preview.js').then(m=>m.startSalesPreview(render));}
else{fetch('/api/state').then(r=>r.json()).then(render);connect();}

$('bankImage').addEventListener('error',()=>{$('imageFailure').classList.remove('hidden');$('phaseLabel').textContent='Das Bild ist nicht verfügbar. Bitte die Frage pausieren.';});

function adjustBankLayout(){
 const show=$('show');if(!show.classList.contains('bank-question'))return;
 // Preserve the source picture's size when a translation adds more text.
 $('bankImage').style.removeProperty('height');$('bankVideo').style.removeProperty('height');
 show.classList.remove('bank-compact','bank-crowded','bank-tight','bank-full');
 for(const variant of ['bank-compact','bank-crowded','bank-tight','bank-full'])if(show.scrollHeight>show.clientHeight)show.classList.add(variant);
}
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
