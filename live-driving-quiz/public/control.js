const $=id=>document.getElementById(id);const token=decodeURIComponent(location.hash.slice(1));
history.replaceState(null,'',location.pathname);
let state,catalog=[];
$('screenUrl').textContent=location.origin+'/screen';
function notice(text,error=false){$('notice').textContent=text;$('notice').classList.toggle('error',error);}
async function api(action,data={}){
 try{
  const r=await fetch('/api/admin/'+action,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(data)});
  const result=await r.json();if(!r.ok)throw Error(result.error||'خطا');notice('دستور اجرا شد.');render(result.state);return result;
 }catch(e){notice(e.message,true);return null;}
}
function mappings(){
 $('giftMapping').replaceChildren(...['A','B','C','ALL'].map(k=>{
  const label=document.createElement('label');label.append(document.createTextNode(k==='ALL'?'هر سه گزینه · اختیاری':`گزینهٔ ${k}`));
  const select=document.createElement('select');select.dataset.key=k;
  const blank=document.createElement('option');blank.value='';blank.textContent='از فهرست زنده انتخاب کنید';select.append(blank);
  for(const gift of catalog){const option=document.createElement('option');option.value=gift.id;option.textContent=`${gift.name} · ${gift.coins} Coin · #${gift.id}`;select.append(option);}
  select.value=state?.gifts[k]?.id||'';label.append(select);return label;
 }));
}
async function loadCatalog(){try{const r=await fetch('/api/admin/catalog',{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error('نشانی پنل کنترل را همراه رمز بعد از # از ترمینال باز کنید.');catalog=(await r.json()).gifts;mappings();}catch(e){notice(e.message,true);}}
function render(s){
 if(!s)return;const changed=state?.connection.status!==s.connection.status;state=s;
 $('connectionStatus').textContent=s.connection.message;
 $('autoplay').checked=s.autoplay;
 const p={waiting:'منتظر شروع',open:'دریافت پاسخ',revealed:'نمایش جواب',paused:'متوقف'};
 $('status').textContent=`حالت: ${s.mode==='demo'?'آزمایشی':'واقعی'}\nسؤال: ${s.index+1} از ${s.total}\nوضعیت: ${p[s.phase]}\nبینندگان پاسخ‌دهنده: ${s.voters}\nآمادگی گیفت واقعی: ${s.liveReady?'آماده':'تنظیم لازم دارد'}${s.lastReject?'\nآخرین پاسخ ثبت‌نشده: '+({round_closed:'زمان سؤال تمام شده یا دریافت پاسخ متوقف است.',one_answer_only:'بیننده قبلاً گزینهٔ دیگری را انتخاب کرده است.',all_not_allowed:'این سؤال فقط یک پاسخ دارد.',late_or_old_event:'پیام هدیه برای این سؤال دیر رسیده یا مربوط به قبل است.',invalid_event:'اطلاعات لازم برای ثبت پاسخ دریافت نشد.'}[s.lastReject]||'پاسخ تکراری یا نامعتبر بود.'):''}`;
 $('leaderboard').replaceChildren(...s.leaderboard.map((row,i)=>{const p=document.createElement('p');p.textContent=`${i+1}. ${row.name} — ${row.score} پاسخ درست`;return p;}));
 if(changed)void loadCatalog();
}
document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>api(b.dataset.command)));
document.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>api('simulate',{choice:b.dataset.choice,name:$('demoName').value})));
$('autoplay').addEventListener('change',e=>api('autoplay',{enabled:e.target.checked}));
$('connect').addEventListener('click',async()=>{notice('اتصال در حال بررسی است…');await api('connect',{username:$('username').value});await loadCatalog();});
$('saveGifts').addEventListener('click',()=>api('gifts',{ids:[...document.querySelectorAll('#giftMapping select')].map(s=>s.value)}));
$('liveMode').addEventListener('click',()=>api('mode',{mode:'live'}));
$('demoMode').addEventListener('click',()=>api('mode',{mode:'demo'}));
if(!token)notice('نشانی خصوصی پنل کنترل را از ترمینال کپی کنید؛ رمز بعد از # لازم است.',true);else notice('آماده؛ ابتدا یک سؤال آزمایشی اجرا کنید.');
fetch('/api/state').then(r=>r.json()).then(render);
const ws=new WebSocket(`ws://${location.host}/events`);ws.onmessage=e=>render(JSON.parse(e.data));ws.onclose=()=>notice('ارتباط پنل قطع شد؛ نشانی خصوصی پنل را دوباره باز کنید.',true);
