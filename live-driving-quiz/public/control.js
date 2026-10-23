const $=id=>document.getElementById(id);const token=decodeURIComponent(location.hash.slice(1));
history.replaceState(null,'',location.pathname);
let state,catalog=[],mappingDirty=false,manualDirty=false,savedSignature;
const giftKeys=['A','B','C','ALL'];
for(const k of giftKeys){
 const label=document.createElement('label');label.textContent=k==='ALL'?'هر سه · اختیاری':`گزینهٔ ${k}`;
 const name=document.createElement('input');name.id='manualName'+k;name.placeholder='نام هدیه';name.maxLength=80;
 const id=document.createElement('input');id.id='manualId'+k;id.placeholder='شناسهٔ عددی هدیه';id.inputMode='numeric';id.dir='ltr';id.maxLength=20;
 label.append(name,id);$('manualGifts').append(label);
}
$('manualGifts').addEventListener('input',()=>{manualDirty=true;});
$('screenUrl').textContent=location.origin+'/screen';
function notice(text,error=false){$('notice').textContent=text;$('notice').classList.toggle('error',error);}
async function api(action,data={}){
 try{
  const r=await fetch('/api/admin/'+action,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(data)});
  const result=await r.json();if(!r.ok)throw Error(result.error||'خطا');notice('دستور اجرا شد.');render(result.state);return result;
 }catch(e){notice(e.message,true);return null;}
}
function mappings(){
 const drafts=Object.fromEntries([...document.querySelectorAll('#giftMapping select')].map(el=>[el.dataset.key,el.value]));
 $('giftMapping').replaceChildren(...['A','B','C','ALL'].map(k=>{
  const label=document.createElement('label');label.append(document.createTextNode(k==='ALL'?'هر سه گزینه · اختیاری':`گزینهٔ ${k}`));
  const select=document.createElement('select');select.dataset.key=k;
  const blank=document.createElement('option');blank.value='';blank.textContent='از فهرست زنده انتخاب کنید';select.append(blank);
  for(const gift of catalog){const option=document.createElement('option');option.value=gift.id;option.textContent=`${gift.name} · ${gift.coins?gift.coins+' Coin':'قیمت داخل TikTok'} · #${gift.id}`;select.append(option);}
  const value=mappingDirty?drafts[k]:(state?.gifts[k]?.id||'');
  if(value&&!catalog.some(g=>g.id===value)){const option=document.createElement('option');option.value=value;option.textContent=(state?.gifts[k]?.name||value)+' · در فهرست اتصال نیست';option.disabled=true;select.append(option);}
  select.value=value||'';select.addEventListener('change',()=>{mappingDirty=true;});
  const preview=document.createElement('small');preview.className='gift-answer-preview';preview.dataset.answer=k;label.append(select,preview);return label;
 }));
 answerPreviews();
}
function answerPreviews(){for(const el of document.querySelectorAll('[data-answer]')){const k=el.dataset.answer;el.replaceChildren();if(k==='ALL'){el.textContent='هدیهٔ اختیاری برای انتخاب A + B + C';continue;}const o=state?.question.options['ABC'.indexOf(k)];if(o){const de=document.createElement('span');de.lang='de';de.textContent=o.de;const fa=document.createElement('span');fa.textContent=o.fa;el.append(de,fa);}}}
function savedGifts(){
 const signature=JSON.stringify(state?.gifts);
 $('savedGifts').replaceChildren(...giftKeys.map(k=>{const row=document.createElement('div');row.className='saved-gift';const key=document.createElement('b');key.textContent=k;const text=document.createElement('span');const g=state.gifts[k];text.textContent=g?.verified?`${g.name} · #${g.id}`:(k==='ALL'?'اختیاری · تنظیم نشده':'تنظیم واقعی لازم است');row.append(key,text);return row;}));
 if(signature!==savedSignature&&!manualDirty){for(const k of giftKeys){const g=state.gifts[k];$('manualName'+k).value=g?.verified?g.name:'';$('manualId'+k).value=g?.verified?g.id:'';}}
 savedSignature=signature;answerPreviews();
}
async function loadCatalog(){try{const r=await fetch('/api/admin/catalog',{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error('لینک خصوصی پنل را از پیام تلگرام باز کنید؛ بخش بعد از # باید در لینک باشد.');catalog=(await r.json()).gifts;mappings();}catch(e){notice(e.message,true);}}
function render(s){
 if(!s)return;const changed=state?.connection.status!==s.connection.status||state?.connection.giftCount!==s.connection.giftCount;state=s;
 $('connectionStatus').textContent=s.connection.message;
 $('autoplay').checked=s.autoplay;
 const p={waiting:'منتظر شروع',open:'دریافت پاسخ',revealed:'نمایش جواب',paused:'متوقف'};
 $('status').textContent=`حالت: ${s.mode==='demo'?'آزمایشی':'واقعی'}\nسؤال: ${s.index+1} از ${s.total}\nوضعیت: ${p[s.phase]}\nبینندگان پاسخ‌دهنده: ${s.voters}\nآمادگی گیفت واقعی: ${s.liveReady?'آماده':'تنظیم لازم دارد'}${s.lastReject?'\nآخرین پاسخ ثبت‌نشده: '+({round_closed:'زمان سؤال تمام شده یا دریافت پاسخ متوقف است.',one_answer_only:'بیننده قبلاً گزینهٔ دیگری را انتخاب کرده است.',all_not_allowed:'این سؤال فقط یک پاسخ دارد.',late_or_old_event:'پیام هدیه برای این سؤال دیر رسیده یا مربوط به قبل است.',invalid_event:'اطلاعات لازم برای ثبت پاسخ دریافت نشد.'}[s.lastReject]||'پاسخ تکراری یا نامعتبر بود.'):''}`;
 $('leaderboard').replaceChildren(...s.leaderboard.map((row,i)=>{const p=document.createElement('p');p.textContent=`${i+1}. ${row.name} — ${row.score} پاسخ درست`;return p;}));
 savedGifts();if(changed)void loadCatalog();
}
document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>api(b.dataset.command)));
document.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>api('simulate',{choice:b.dataset.choice,name:$('demoName').value})));
$('autoplay').addEventListener('change',e=>api('autoplay',{enabled:e.target.checked}));
$('connect').addEventListener('click',async()=>{notice('اتصال در حال بررسی است…');await api('connect',{username:$('username').value,startOnConnect:$('startOnConnect').checked});await loadCatalog();});
$('saveGifts').addEventListener('click',async()=>{const result=await api('gifts',{ids:[...document.querySelectorAll('#giftMapping select')].map(s=>s.value)});if(result){mappingDirty=false;mappings();notice('گیفت هر گزینه ذخیره شد؛ انتخاب‌های فعلی را بالا می‌بینید.');}});
$('refreshGifts').addEventListener('click',()=>loadCatalog());
$('saveManualGifts').addEventListener('click',async()=>{const result=await api('manual-gifts',{confirmed:$('manualConfirmed').checked,gifts:giftKeys.map(k=>({name:$('manualName'+k).value,id:$('manualId'+k).value.trim()}))});if(result){manualDirty=false;mappingDirty=false;mappings();notice('گیفت هر گزینه ذخیره شد؛ دریافت واقعی نیازمند اتصال لایو است.');}});
$('liveMode').addEventListener('click',()=>api('mode',{mode:'live'}));
$('demoMode').addEventListener('click',()=>api('mode',{mode:'demo'}));
if(!token)notice('لینک خصوصی پنل را از پیام تلگرام باز کنید؛ بخش بعد از # لازم است.',true);else notice('آماده؛ ابتدا یک سؤال آزمایشی اجرا کنید.');
fetch('/api/state').then(r=>r.json()).then(render);
const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/events`);ws.onmessage=e=>render(JSON.parse(e.data));ws.onclose=()=>notice('ارتباط پنل قطع شد؛ نشانی خصوصی پنل را دوباره باز کنید.',true);
