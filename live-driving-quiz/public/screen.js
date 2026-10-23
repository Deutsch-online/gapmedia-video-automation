const $=id=>document.getElementById(id);
let state;
const fa=new Intl.NumberFormat('fa-IR');
const icons={junction:'↗',parking:'P',distance:'↔',phone:'📵',siren:'🚑',beacon:'⚠',fog:'≋'};
function element(tag,className,text){const el=document.createElement(tag);el.className=className;el.textContent=text;return el;}
function render(s){
  state=s;const q=s.question;
  $('show').classList.toggle('revealed',s.phase==='revealed');
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
  const labels={waiting:'آمادهٔ سؤال بعد',open:s.mode==='demo'?'پاسخ آزمایشی را انتخاب کنید':'حالا با هدیهٔ گزینه‌تان پاسخ دهید',revealed:'پاسخ درست را یاد بگیریم',paused:'توقف • دریافت پاسخ غیرفعال'};
  $('phaseLabel').textContent=labels[s.phase]||s.phase;
  $('voters').textContent=`${fa.format(s.voters)} شرکت‌کننده`;
  $('lastAnswer').textContent=s.lastAnswer?`${s.lastAnswer.name} ${s.lastAnswer.choice==='ALL'?'هر سه گزینه':`گزینهٔ ${s.lastAnswer.choice}`} را انتخاب کرد.`:'اول فکر کن؛ بعد گزینه‌ات را انتخاب کن.';
  $('giftNote').textContent=s.mode==='demo'?'حالت آزمایشی است؛ هدیه‌ای ارسال نکنید.':q.multiple?'برای چند پاسخ، هدیهٔ هر گزینه را جدا بفرستید؛ هدیهٔ تکراری امتیاز اضافه ندارد.':'برای هر سؤال، اولین گزینهٔ هر نفر ثبت می‌شود؛ هدیهٔ بیشتر امتیاز بیشتری نمی‌دهد.';
  updateTimer();
}
function updateTimer(){if(!state)return;const left=state.phase==='open'?Math.max(0,Math.ceil((state.closesAt-Date.now())/1000)):0;
 $('timer').replaceChildren(document.createTextNode(fa.format(left)),element('span','',state.phase==='revealed'?'پاسخ':'ثانیه'));
 $('progressBar').style.width=state.phase==='open'?`${Math.max(0,Math.min(100,left/30*100))}%`:state.phase==='revealed'?'100%':'0%';}
setInterval(updateTimer,250);
let reconnect;
function connect(){const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/events`);ws.onmessage=e=>render(JSON.parse(e.data));ws.onclose=()=>{$('phaseLabel').textContent='ارتباط با برنامه قطع شد؛ هدیه ارسال نکنید.';clearTimeout(reconnect);reconnect=setTimeout(connect,2000);};}
fetch('/api/state').then(r=>r.json()).then(render);connect();
