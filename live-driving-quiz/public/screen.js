function fitScreen(){document.documentElement.style.setProperty('--screen-scale',Math.min(innerWidth/1080,innerHeight/1920));}
addEventListener('resize',fitScreen);fitScreen();
const $=id=>document.getElementById(id);
let state,receivedAt=0;
const fa=new Intl.NumberFormat('fa-IR');
const icons={junction:'↗',parking:'P',distance:'↔',phone:'📵',siren:'🚑',beacon:'⚠',fog:'≋',bus:'BUS',crossing:'🚶'};
function element(tag,className,text){const el=document.createElement(tag);el.className=className;el.textContent=text;return el;}
function render(s){
  state=s;receivedAt=performance.now();const q=s.question;
  $('show').classList.toggle('revealed',s.phase==='revealed');
  const imported=q.source_kind==='imported-question-bank';$('show').classList.toggle('bank-question',imported);$('show').classList.toggle('watching',s.phase==='watching');
  $('bankMedia').classList.toggle('hidden',!q.image);$('bankImage').classList.toggle('hidden',Boolean(q.video));$('bankVideo').classList.toggle('hidden',!q.video);
  const img=$('bankImage');if(q.image&&img.getAttribute('src')!==q.image){$('imageFailure').classList.add('hidden');img.src=q.image;img.alt=q.image_alt||q.id;}
  $('bankImageLabel').textContent=`${q.id}${q.points?' · '+q.points+' Punkte':''}`;

  $('modeLabel').textContent=s.mode==='demo'?'آزمایشی • بدون گیفت واقعی':'پاسخ با گیفت • LIVE';
  $('modeLabel').classList.toggle('real',s.mode==='live');
  $('topic').textContent=q.topic;
  $('questionNumber').textContent=`${String(s.index+1).padStart(2,'0')} / ${String(s.total).padStart(2,'0')}`;
  $('questionDe').textContent=q.de;$('questionFa').textContent=q.fa;
  $('answerType').textContent=q.multiple?'بیش از یک پاسخ درست است':'یک پاسخ درست';
  const scene=document.querySelector('.scene');scene.className='scene'+(!['red','yellow'].includes(q.visual)?' alt':'')+(q.visual==='fog'?' fog':'');
  $('signal').className='signal '+q.visual;$('symbol').textContent=icons[q.visual]||'DE';
  $('options').replaceChildren(...q.options.map((o,i)=>{
    const k='ABC'[i],gift=s.gifts[k];
    const row=element('div','option'+(q.correct?(q.correct.includes(k)?' correct':' wrong'):''));
    const key=element('div','option-key',q.correct?.includes(k)?'✓':k);
    const copy=element('div','option-copy');
    const de=element('div','option-de',o.de);de.lang='de';de.dir='ltr';
    const f=element('div','option-fa',o.fa);
    const text=s.mode==='demo'?`تمرین: انتخاب ${k}`:`هدیه: ${gift?.name||'تنظیم نشده'}${gift?.coins?` · ${fa.format(gift.coins)} Coin`:''}`;
    copy.append(de,f,element('div','gift-pill',text));row.append(key,copy,element('div','vote-count',fa.format(s.counts[k])));return row;
  }));
  $('explanation').classList.toggle('hidden',!q.correct);
  const all=s.gifts.ALL;
  $('allGift').classList.toggle('hidden',!q.multiple||s.phase==='revealed'||(s.mode==='live'&&!all?.verified));
  $('allGift').textContent=s.mode==='demo'?'انتخاب «هر سه»: A + B + C':`هدیهٔ ${all?.name||''} = انتخاب هر سه گزینه${all?.coins?` · ${fa.format(all.coins)} Coin`:''}`;
  $('explainDe').textContent=q.explanation_de||'';$('explainFa').textContent=q.explanation_fa||'';
  if(q.source)$('source').href=q.source;else $('source').removeAttribute('href');
  const labels={watching:'ابتدا فیلم را ببینید · هنوز گیفت نفرستید',waiting:'آمادهٔ سؤال بعد',open:s.mode==='demo'?'پاسخ آزمایشی را انتخاب کنید':'حالا با هدیهٔ گزینه‌تان پاسخ دهید',revealed:'پاسخ درست را یاد بگیریم',paused:'توقف • دریافت پاسخ غیرفعال'};
  $('phaseLabel').textContent=labels[s.phase]||s.phase;
  $('voters').textContent=`${fa.format(s.voters)} شرکت‌کننده`;
  $('lastAnswer').textContent=s.lastAnswer?`${s.lastAnswer.name} ${s.lastAnswer.choice==='ALL'?'هر سه گزینه':`گزینهٔ ${s.lastAnswer.choice}`} را انتخاب کرد.`:'اول فکر کن؛ بعد گزینه‌ات را انتخاب کن.';
  $('giftNote').textContent=s.phase==='watching'?'هنگام نمایش فیلم پاسخ ثبت نمی‌شود؛ پس از پایان فیلم ۳۰ ثانیه فرصت دارید.':s.mode==='demo'?'حالت آزمایشی است؛ هدیه‌ای ارسال نکنید.':q.multiple?'برای چند پاسخ، هدیهٔ هر گزینه را جدا بفرستید؛ هدیهٔ تکراری امتیاز اضافه ندارد.':'برای هر سؤال، اولین گزینهٔ هر نفر ثبت می‌شود؛ هدیهٔ بیشتر امتیاز بیشتری نمی‌دهد.';
  syncVideo();updateTimer();requestAnimationFrame(adjustBankLayout);
}
function serverNow(){return state.serverTime+performance.now()-receivedAt;}
function updateTimer(){if(!state)return;const target=state.phase==='watching'?state.opensAt:state.closesAt;const left=['open','watching'].includes(state.phase)?Math.max(0,Math.ceil((target-serverNow())/1000)):0;
 $('timer').replaceChildren(document.createTextNode(fa.format(left)),element('span','',state.phase==='watching'?'فیلم':state.phase==='revealed'?'پاسخ':'ثانیه'));
 $('progressBar').style.width=state.phase==='open'?`${Math.max(0,Math.min(100,left/30*100))}%`:state.phase==='revealed'?'100%':'0%';}
setInterval(updateTimer,250);
let reconnect;
function connect(){const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/events`);ws.onmessage=e=>render(JSON.parse(e.data));ws.onclose=()=>{$('phaseLabel').textContent='ارتباط با برنامه قطع شد؛ هدیه ارسال نکنید.';clearTimeout(reconnect);reconnect=setTimeout(connect,2000);};}
fetch('/api/state').then(r=>r.json()).then(render);connect();

$('bankImage').addEventListener('error',()=>{$('imageFailure').classList.remove('hidden');$('phaseLabel').textContent='تصویر سؤال آماده نیست؛ دریافت پاسخ را متوقف کنید.';});

function adjustBankLayout(){const show=$('show');if(!show.classList.contains('bank-question'))return;show.classList.remove('bank-compact');if(show.scrollHeight>show.clientHeight)show.classList.add('bank-compact');}
document.fonts.ready.then(adjustBankLayout);

function syncVideo(){
 if(!state)return;const video=$('bankVideo'),q=state.question;
 if(!q.video){video.pause();if(video.hasAttribute('src')){video.removeAttribute('src');video.load();}return;}
 if(video.getAttribute('src')!==q.video){video.src=q.video;video.poster=q.image;video.load();}
 if(!video.readyState)return;
 if(state.phase==='watching'){
  const elapsed=(serverNow()-state.videoStartedAt)/1000;const target=Math.max(0,Math.min(elapsed,q.video_duration_ms/1000-.05));
  if(Math.abs(video.currentTime-target)>.8)video.currentTime=target;
  if(elapsed<0)video.pause();else if(video.paused)void video.play().catch(()=>{$('imageFailure').textContent='پخش خودکار فیلم ممکن نشد؛ پنل را بررسی کنید.';$('imageFailure').classList.remove('hidden');});
 }else{video.pause();if(['open','revealed'].includes(state.phase))video.currentTime=Math.max(0,Math.min(video.duration,q.video_duration_ms/1000)-.05);}
}
$('bankVideo').addEventListener('loadedmetadata',syncVideo);
$('bankVideo').addEventListener('error',()=>{$('imageFailure').textContent='فیلم دریافت نشد؛ این سؤال را متوقف کنید.';$('imageFailure').classList.remove('hidden');});
