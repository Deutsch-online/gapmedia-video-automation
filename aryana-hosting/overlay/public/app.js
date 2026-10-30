const $=id=>document.getElementById(id);
const fa=new Intl.NumberFormat('fa-IR');let key='',current;
function notice(text,error=false){$('notice').textContent=text;$('notice').classList.toggle('error',error);}
async function api(action,data={}){
 if(['say','thanks','intro','voice-sample','demo','comment','correction'].includes(action)){void $('livePreview').contentWindow.aryanaActivateAudio?.();notice('درخواست ارسال شد؛ منتظر آماده‌شدن صدا باشید…');}
 try{const response=await fetch('/api/'+action,{method:'POST',headers:{'content-type':'application/json','x-aryana-key':key},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw Error(result.error||'خطا');render(result.state);notice(['say','thanks','intro','voice-sample','demo','comment','correction'].includes(action)?'درخواست پذیرفته شد؛ وضعیت صدا در بخش پیش‌نمایش نمایش داده می‌شود.':'انجام شد.');return result;}
 catch(error){notice(error.message,true);return null;}
}
const labels={connected:'لایف متصل است',disconnected:'آمادهٔ آزمایش',connecting:'در حال اتصال…',error:'اتصال برقرار نشد',reconnecting:'در حال اتصال مجدد…',ended:'لایف پایان یافت'};
function render(state){
 if(!state)return;current=state;$('thanksClip').disabled=!state.capabilities.recordedReactions;$('connection').lastChild.textContent=labels[state.connection]||state.connection;$('connection').classList.toggle('connected',state.connection==='connected');
 $('giftTotal').replaceChildren(document.createTextNode(fa.format(state.giftTotal)+' '));const unit=document.createElement('small');unit.textContent='کوین';$('giftTotal').append(unit);$('likeTotal').textContent=fa.format(state.likeTotal);
 for(const field of ['muted','subtitles','conversationEnabled'])$(field).checked=Boolean(state.settings[field]);if(document.activeElement!==$('volume'))$('volume').value=state.settings.volume??85;
 if(document.activeElement!==$('avatarMode'))$('avatarMode').value=state.settings.avatarMode||'animated';
 const readiness=[['صحنهٔ پخش',state.displayClients>0,'پنجرهٔ پخش را باز کنید'],['صدای اختصاصی',state.capabilities.voiceClone&&state.speech!=='error',state.speech==='error'?'خطا در تولید صدا':'دیلارا جایگزین است'],['گفت‌وگوی آزمایشی',state.capabilities.conversation!=='not_configured'&&state.conversationStatus!=='error',state.conversationStatus==='error'?'مدل گفت‌وگو خطا دارد':'مدل گفت‌وگو تنظیم نشده'],['ذخیرهٔ خصوصی',state.storage==='ready',state.storage==='local_only'?'فعلاً فقط روی سرور محلی ذخیره می‌شود':'ذخیرهٔ ابری در دسترس نیست'],['تیک‌تاک',state.connection==='connected',labels[state.connection]||'متصل نیست'],['مدل سه‌بعدی متحرک',state.capabilities.animated3d,'مدل متحرک نصب نشده است']];
 $('readiness').replaceChildren(...readiness.map(([label,ok,detail])=>{const p=document.createElement('p');p.className=ok?'':'needs-attention';p.textContent=(ok?'✓ ':'○ ')+label+(ok?' · آماده':' · '+detail);return p;}));$('ask').disabled=['loading','answering'].includes(state.conversationStatus);$('ask').textContent=state.conversationStatus==='answering'?'در حال آماده‌کردن پاسخ…':'پاسخ به کامنت آزمایشی';
 $('autoSpeak').checked=state.settings.autoSpeak;document.querySelector('.voice-name').textContent=state.capabilities.voiceClone?'صدای اختصاصی آریانا':'دیلارا · فارسی';
 $('say').disabled=state.speech==='generating';$('say').textContent=state.speech==='generating'?'در حال آماده‌کردن صدا…':'▶ خواندن متن';
 $('avatarStatus').textContent='مدل سه‌بعدی آزمایشی: حرکت سر، پلک و لب با صدا. چهرهٔ اختصاصی: تصویر و کلیپ‌های آمادهٔ معرفی و تشکر؛ حرکت پیوسته ندارد.';
 const avatar=state.avatar||{},rendering=avatar.preparing||avatar.job?.status==='rendering';
 $('renderPreview').disabled=!avatar.configured||rendering;
 $('renderProgress').textContent=rendering?'در حال ساخت کلیپ آفلاین · '+(avatar.job?.progress||0)+'٪ · ممکن است چند دقیقه زمان ببرد.':avatar.configured?'موتور کلیپ آفلاین متصل است؛ ساخت جملهٔ کوتاه تا 100 نویسه.':'برای ساخت حرکت لب، موتور آفلاین باید جداگانه نصب شود؛ راهنما داخل بسته است.';
 const events=state.log||[];$('eventLog').replaceChildren();
 if(!events.length){const p=document.createElement('p');p.className='empty';p.textContent='هنوز رویدادی ثبت نشده است.';$('eventLog').append(p);}
 for(const event of events.slice(0,5)){const row=document.createElement('div');row.className='event-row';const icon=document.createElement('span');icon.className='event-icon';icon.textContent=({gift:'🎁',join:'↗',like:'♡',error:'!'})[event.kind]||'◌';const text=document.createElement('span');text.textContent=event.text;const time=document.createElement('small');time.textContent=new Date(event.at).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});row.append(icon,text,time);$('eventLog').append(row);}
 $('corrections').replaceChildren(...Object.entries(state.settings.corrections).map(([word,spoken])=>{const chip=document.createElement('span');chip.textContent=word+' ← '+spoken;return chip;}));
 if(state.lastError)notice(state.lastError,true);
}
for(const button of document.querySelectorAll('[data-tab]'))button.addEventListener('click',()=>{for(const tab of document.querySelectorAll('[data-tab]')){const active=tab===button;tab.classList.toggle('active',active);$(tab.dataset.tab+'-panel').hidden=!active;}});
$('ask').onclick=()=>api('comment',{text:$('commentText').value});$('emergency').onclick=()=>api('stop');
for(const field of ['muted','subtitles','conversationEnabled'])$(field).onchange=()=>api('settings',{[field]:$(field).checked});$('volume').onchange=()=>api('settings',{volume:Number($('volume').value)});
$('voiceSample').onclick=()=>api('voice-sample');
$('renderPreview').onclick=()=>api('render',{text:$('speechText').value});
$('say').onclick=()=>api('say',{text:$('speechText').value});$('intro').onclick=()=>api('intro');$('stop').onclick=()=>api('stop');
$('connect').onclick=()=>api('connect',{username:$('username').value});$('disconnect').onclick=()=>api('disconnect');$('autoSpeak').onchange=()=>api('settings',{autoSpeak:$('autoSpeak').checked});
for(const button of document.querySelectorAll('[data-demo]'))button.onclick=()=>api('demo',{kind:button.dataset.demo,name:$('demoName').value});
$('reset').onclick=()=>api('reset');$('saveCorrection').onclick=()=>api('correction',{word:$('word').value,spoken:$('spoken').value});$('saveName').onclick=()=>api('name',{name:$('approvedName').value});
$('sourceUrl').textContent=location.origin+'/live';$('copySource').onclick=()=>navigator.clipboard.writeText(location.origin+'/live').then(()=>notice('نشانی صفحهٔ پخش کپی شد.')).catch(()=>notice('نشانی را از کادر بالا کپی کنید.'));
let polling=false,loading=false;
async function loadState(){if(loading||!key)return;loading=true;try{const response=await fetch('/api/state',{headers:{'x-aryana-key':key},cache:'no-store'});if(response.status===401){key='';sessionStorage.removeItem('aryana-admin');if(!$('loginDialog').open)$('loginDialog').showModal();throw Error('کلید مدیریت معتبر نیست.');}if(!response.ok)throw Error('ارتباط سرور برقرار نیست.');render(await response.json());}catch(e){notice(e.message,true);}finally{loading=false;}}
$('loginForm').onsubmit=async event=>{event.preventDefault();key=$('adminToken').value.trim();await loadState();if(key){sessionStorage.setItem('aryana-admin',key);$('adminToken').value='';$('loginDialog').close();}else $('loginError').textContent='کلید معتبر نیست.';};
const fragment=location.hash.slice(1);if(fragment){history.replaceState(null,'',location.pathname+location.search);if(/^[a-f0-9]{64}$/.test(fragment))key=fragment;}
if(!key)key=sessionStorage.getItem('aryana-admin')||'';
const session=await(await fetch('/api/session')).json();if(!session.requiresToken)key=session.key;
if(key){await loadState();if(key&&session.requiresToken)sessionStorage.setItem('aryana-admin',key);}else $('loginDialog').showModal();
setInterval(()=>void loadState(),1500);


$('activatePreview').onclick=()=>void $('livePreview').contentWindow.aryanaActivateAudio?.();
$('togglePreview').onclick=()=>{const open=$('previewColumn').classList.toggle('mobile-open');if(open)$('previewColumn').scrollIntoView({behavior:'smooth',block:'start'});};
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==$('livePreview').contentWindow||event.data?.type!=='aryana-player')return;const labels={locked:'صدا قفل است؛ دکمهٔ فعال‌کردن صدا را بزنید.',ready:'پخش آماده است.',loading:'در حال دریافت صدای آماده‌شده…',playing:'آریانا اکنون صحبت می‌کند.',disconnected:'ارتباط صفحهٔ پخش قطع شده؛ تلاش مجدد…',error:'خطای پخش: '+(event.data.detail||'دوباره امتحان کنید')};$('playerStatus').textContent=labels[event.data.status]||event.data.status;});

$('avatarMode').onchange=()=>api('settings',{avatarMode:$('avatarMode').value});
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==$('livePreview').contentWindow||event.data?.type!=='aryana-avatar')return;const labels={loading:'مدل سه‌بعدی در حال بارگذاری است؛ بار اول حدود ۳۷ مگابایت دریافت می‌شود.',ready:'مدل سه‌بعدی متحرک آماده است. چهرهٔ آن آزمایشی و متفاوت از تصویر اختصاصی است.',error:'مدل سه‌بعدی اجرا نشد: '+event.data.detail,'lip-error':'حرکت لب در این مرورگر اجرا نشد: '+event.data.detail};$('modelStatus').textContent=labels[event.data.status]||event.data.status;});

$('thanksClip').onclick=()=>api('thanks');
