const $=id=>document.getElementById(id);
const fa=new Intl.NumberFormat('fa-IR');let key='',current;
function notice(text,error=false){$('notice').textContent=text;$('notice').classList.toggle('error',error);}
async function api(action,data={}){
 try{const response=await fetch('/api/'+action,{method:'POST',headers:{'content-type':'application/json','x-aryana-key':key},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw Error(result.error||'خطا');render(result.state);notice('انجام شد.');return result;}
 catch(error){notice(error.message,true);return null;}
}
const labels={connected:'لایف متصل است',disconnected:'آمادهٔ آزمایش',connecting:'در حال اتصال…',error:'اتصال برقرار نشد'};
function render(state){
 if(!state)return;current=state;$('connection').lastChild.textContent=labels[state.connection]||state.connection;$('connection').classList.toggle('connected',state.connection==='connected');
 $('giftTotal').replaceChildren(document.createTextNode(fa.format(state.giftTotal)+' '));const unit=document.createElement('small');unit.textContent='کوین';$('giftTotal').append(unit);$('likeTotal').textContent=fa.format(state.likeTotal);
 $('autoSpeak').checked=state.settings.autoSpeak;document.querySelector('.voice-name').textContent=state.capabilities.voiceClone?'صدای اختصاصی آریانا':'دیلارا · فارسی';
 $('say').disabled=state.speech==='generating';$('say').textContent=state.speech==='generating'?'در حال آماده‌کردن صدا…':'▶ خواندن متن';
 $('avatarStatus').textContent=state.capabilities.introductionVideo?'ویدیوی معرفی آماده است؛ حرکت لب زنده هنوز متصل نیست.':'چهره و صدای اختصاصی آماده‌اند؛ حرکت لب زنده هنوز متصل نیست.';
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

