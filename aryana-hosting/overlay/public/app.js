const $=id=>document.getElementById(id);
const fa=new Intl.NumberFormat('fa-IR');let key='',current;
let previewMuted=true;try{previewMuted=localStorage.getItem('aryana-preview-muted')!=='false';}catch{}
function applyPreviewMute(){ $('previewMuted').checked=previewMuted;$('livePreview').contentWindow.aryanaSetLocalMuted?.(previewMuted); }
$('livePreview').addEventListener('load',applyPreviewMute);
$('previewMuted').onchange=()=>{previewMuted=$('previewMuted').checked;try{localStorage.setItem('aryana-preview-muted',String(previewMuted));}catch{}applyPreviewMute();};
applyPreviewMute();
function notice(text,error=false){$('notice').textContent=text;$('notice').classList.toggle('error',error);}
async function api(action,data={}){
 if(['say','thanks','intro','voice-sample','demo','comment','correction','lip-publish'].includes(action)){void $('livePreview').contentWindow.aryanaActivateAudio?.();notice('درخواست ارسال شد؛ منتظر آماده‌شدن صدا باشید…');}
 try{const response=await fetch('/api/'+action,{method:'POST',headers:{'content-type':'application/json','x-aryana-key':key},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw Error(result.error||'خطا');render(result.state);notice(['say','thanks','intro','voice-sample','demo','comment','correction','lip-publish'].includes(action)?'درخواست پذیرفته شد؛ وضعیت صدا در بخش پیش‌نمایش نمایش داده می‌شود.':action==='lip-prepare'?'آماده‌سازی شروع شد؛ وضعیت را در بخش لب‌خوانی ببینید.':action==='lip-test'?'آزمایش خصوصی شروع شد.':'انجام شد.');return result;}
 catch(error){notice(error.message,true);return null;}
}
const labels={connected:'لایف متصل است',disconnected:'تیک‌تاک متصل نیست',connecting:'در حال اتصال…',error:'اتصال برقرار نشد',reconnecting:'در حال اتصال مجدد…',ended:'لایف پایان یافت'};
function render(state){
 if(!state)return;current=state;$('entertainmentEnabled').checked=state.settings.entertainmentEnabled!==false;$('prepareEntertainment').disabled=state.connection==='connected'||Boolean(state.entertainment?.preparing);$('entertainmentStatus').textContent=state.entertainment?.preparing?'در حال آماده‌سازی بخش بعدی سرگرمی…':state.entertainment?.cachedClips>=3?'بخش‌های آماده برای پخش روان‌تر در دسترس‌اند.':'برای کم‌شدن وقفه، پیش از لایف سرگرمی را آماده کنید.';$('topicEnabled').checked=state.settings.topicEnabled!==false;if(document.activeElement!==$('topic'))$('topic').value=state.settings.language==='en'?'ai':state.settings.topic||'ai';for(const option of $('topic').options)option.disabled=state.settings.language==='en'&&option.value!=='ai';if(document.activeElement!==$('outputLanguage'))$('outputLanguage').value=state.settings.language||'auto';$('mirrorNotice').hidden=!state.capabilities.mirror;for(const id of ['connect','disconnect','reset'])$(id).disabled=Boolean(state.capabilities.mirror);for(const b of document.querySelectorAll('[data-demo]'))b.disabled=Boolean(state.capabilities.mirror);$('connect').disabled=Boolean(state.capabilities.mirror)||state.livePreparation?.status==='preparing'||Boolean(state.entertainment?.preparing);$('thanksClip').disabled=!state.capabilities.recordedReactions;$('connection').lastChild.textContent=labels[state.connection]||state.connection;$('connection').classList.toggle('connected',state.connection==='connected');
 $('giftTotal').replaceChildren(document.createTextNode(fa.format(state.giftTotal)+' '));const unit=document.createElement('small');unit.textContent='کوین';$('giftTotal').append(unit);$('likeTotal').textContent=fa.format(state.likeTotal);
 for(const field of ['muted','subtitles','conversationEnabled'])$(field).checked=Boolean(state.settings[field]);if(document.activeElement!==$('volume'))$('volume').value=state.settings.volume??85;
 if(state.settings.avatarMode==='portrait')$('modelStatus').textContent=state.capabilities.idleVideo?'چهرهٔ اختصاصی با ویدیوی انتظار حرکت می‌کند؛ واکنش‌های معرفی و تشکر آماده‌اند. پاسخ تازه پس از آماده‌شدن ویدیوی لب‌خوانی پخش می‌شود.':'چهرهٔ اختصاصی با کلیپ‌های معرفی و تشکر؛ حرکت انتظار آماده نیست.';
 if($('lipSyncStatus')){
  const lip=state.lipSync;const pending=(lip?.pending||0)+(state.voiceEngine?.pending?1:0)+(state.livePreparation?.status==='preparing'?1:0);
  $('lipSyncStatus').textContent=lip?.configured?(pending?'در حال آماده‌سازی صدا و حرکت لب…':lip.ready?'لب‌خوانی پاسخ تازه آماده است'+(lip.lastLatencySeconds?' · آخرین ساخت: '+fa.format(lip.lastLatencySeconds.toFixed(1))+' ثانیه':''):lip.lastError||'پیش از لایف، آماده‌سازی لب‌ها را بزنید.'):'سرویس لب‌خوانی تازه تنظیم نشده است.';
  $('lipPrepare').disabled=!lip?.configured||pending>0;$('lipTest').disabled=!lip?.configured||pending>0||state.connection==='connected';
  const test=state.lipTest;$('lipPublish').disabled=test?.status!=='ready';$('lipTestStatus').textContent=test?.status==='preparing'?'آزمایش خصوصی در حال ساخت است؛ روی خروجی LIVE پخش نمی‌شود.':test?.status==='ready'?'آزمایش تازه در '+fa.format(test.elapsedSeconds.toFixed(1))+' ثانیه آماده شد.':test?.error||'آزمایش خصوصی روی صفحهٔ LIVE پخش نمی‌شود.';
  if(test?.status==='ready'){const player=$('lipTestPreview');player.hidden=false;if(player.getAttribute('src')!==test.video)player.src=test.video;}
 }
 $('avatarMode').value='portrait';$('modelStatus').textContent='ویدیوی طبیعیِ همان چهره و صندلی؛ بدون عکس آغازین و بدون مدل سه‌بعدی.';
 const readiness=[['صحنهٔ پخش',state.displayClients>0,'پنجرهٔ پخش را باز کنید'],['صدای اختصاصی',state.capabilities.voiceClone&&state.speech!=='error',state.speech==='error'?'خطا در تولید صدا':'دیلارا جایگزین است'],['گفت‌وگوی آزمایشی',state.capabilities.conversation!=='not_configured'&&state.conversationStatus!=='error',state.conversationStatus==='error'?'مدل گفت‌وگو خطا دارد':'مدل گفت‌وگو تنظیم نشده'],['ذخیرهٔ خصوصی',state.storage==='ready',state.storage==='local_only'?'فعلاً فقط روی سرور محلی ذخیره می‌شود':'ذخیرهٔ ابری در دسترس نیست'],['تیک‌تاک',state.connection==='connected',labels[state.connection]||'متصل نیست'],['حرکت انتظارِ چهرهٔ اختصاصی',state.capabilities.idleVideo,'ویدیوی انتظار آماده نیست'],['ویدیوی متحرکِ انتظار',state.capabilities.idleVideo,'ویدیو در دسترس نیست']];
 $('readiness').replaceChildren(...readiness.map(([label,ok,detail])=>{const p=document.createElement('p');p.className=ok?'':'needs-attention';p.textContent=(ok?'✓ ':'○ ')+label+(ok?' · آماده':' · '+detail);return p;}));$('ask').disabled=['loading','answering'].includes(state.conversationStatus);$('ask').textContent=state.conversationStatus==='answering'?'در حال آماده‌کردن پاسخ…':'پاسخ به کامنت آزمایشی';
 $('autoSpeak').checked=state.settings.autoSpeak;document.querySelector('.voice-name').textContent=state.capabilities.voiceClone?'صدای اختصاصی آریانا · '+(state.settings.language==='en'?'English':state.settings.language==='fa'?'فارسی/دری':'خودکار'):(state.settings.language==='en'?'Ava · English':'دیلارا · فارسی');
 $('say').disabled=state.speech==='generating';$('say').textContent=state.speech==='generating'?'در حال آماده‌کردن صدا…':'▶ پخش متن با حرکت لب';
 $('avatarStatus').textContent=state.capabilities.idleVideo?'چهرهٔ اختصاصی هنگام انتظار با ویدیوی آماده حرکت می‌کند. معرفی و تشکر حرکت لبِ هماهنگ دارند؛ پاسخ تازه با صدای خودش برای ساخت حرکت لب آماده می‌شود.':'مدل سه‌بعدی آزمایشی: حرکت سر، پلک و لب با صدا. چهرهٔ اختصاصی: تصویر و کلیپ‌های آمادهٔ معرفی و تشکر؛ حرکت پیوسته ندارد.';
 const avatar=state.avatar||{},rendering=avatar.preparing||avatar.job?.status==='rendering';
 $('renderPreview').hidden=!avatar.configured;$('renderProgress').hidden=!avatar.configured;$('renderPreview').disabled=!avatar.configured||rendering;$('renderPreview').textContent=avatar.mode==='included_gpu_clips'?'ساخت کلیپ کوتاه با GPU':'ساخت کلیپ آفلاین';
 $('renderProgress').textContent=rendering?(avatar.mode==='included_gpu_clips'?'در حال ساخت با سهمیهٔ PRO · معمولاً چند دقیقه زمان می‌برد.':'در حال ساخت کلیپ آفلاین · '+(avatar.job?.progress||0)+'٪ · ممکن است چند دقیقه زمان ببرد.'):avatar.configured?(avatar.mode==='included_gpu_clips'?'پیش از اتصال تیک‌تاک: جمله‌ای کوتاه تا ۵ ثانیه بسازید. فقط سهمیهٔ موجود PRO مصرف می‌شود؛ این تولید در لحظه نیست.':'موتور کلیپ آفلاین متصل است؛ ساخت جملهٔ کوتاه تا 100 نویسه.'):'برای ساخت حرکت لب، موتور آفلاین باید جداگانه نصب شود؛ راهنما داخل بسته است.';
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
$('entertainmentEnabled').onchange=()=>api('settings',{entertainmentEnabled:$('entertainmentEnabled').checked});
$('prepareEntertainment').onclick=()=>api('entertainment-prepare');
$('topicEnabled').onchange=()=>api('settings',{topicEnabled:$('topicEnabled').checked});
$('topic').onchange=()=>api('settings',{topic:$('topic').value});
$('refreshLive').onclick=async()=>{
 const button=$('refreshLive'),preview=$('livePreview'),supported=preview.contentWindow.aryanaRefreshSupported===true;
 button.disabled=true;
 try{const result=await api('refresh-live');if(!result)return;
  if(!supported){const target=new URL(preview.src,location.href);target.searchParams.set('refresh',result.state.playback.refreshToken);preview.src=target.href;}
  notice('درخواست رفرش برای صفحه‌های پخش فرستاده شد؛ اتصال تیک‌تاک برقرار می‌ماند.');
 }finally{button.disabled=false;}
};
$('stopTopic').onclick=async()=>{await api('settings',{topicEnabled:false});await api('stop');};
$('outputLanguage').onchange=()=>api('settings',{language:$('outputLanguage').value});
$('englishExample').onclick=()=>{ $('speechText').value='Hello dear friends, I am Aryana. Welcome to our live!';$('outputLanguage').value='en';void api('settings',{language:'en'});};
$('say').onclick=()=>api('say',{text:$('speechText').value});$('intro').onclick=()=>api('intro');$('stop').onclick=()=>api('stop');
$('connect').onclick=()=>api('connect',{username:$('username').value});$('disconnect').onclick=()=>api('disconnect');$('autoSpeak').onchange=()=>api('settings',{autoSpeak:$('autoSpeak').checked});
for(const button of document.querySelectorAll('[data-demo]'))button.onclick=()=>api('demo',{kind:button.dataset.demo,name:$('demoName').value});
$('reset').onclick=()=>api('reset');$('saveCorrection').onclick=()=>api('correction',{word:$('word').value,spoken:$('spoken').value});$('saveName').onclick=()=>api('name',{name:$('approvedName').value});
$('sourceUrl').textContent=location.origin+'/live?v=refresh-v6';$('copySource').onclick=()=>navigator.clipboard.writeText(location.origin+'/live').then(()=>notice('نشانی صفحهٔ پخش کپی شد.')).catch(()=>notice('نشانی را از کادر بالا کپی کنید.'));
let polling=false,loading=false;
async function loadState(){if(loading||!key)return;loading=true;try{const response=await fetch('/api/state',{headers:{'x-aryana-key':key},cache:'no-store'});if(response.status===401){key='';sessionStorage.removeItem('aryana-admin');if(!$('loginDialog').open)$('loginDialog').showModal();throw Error('کلید مدیریت معتبر نیست.');}if(!response.ok)throw Error('ارتباط سرور برقرار نیست.');render(await response.json());}catch(e){notice(e.message,true);}finally{loading=false;}}
$('loginForm').onsubmit=async event=>{event.preventDefault();key=$('adminToken').value.trim();await loadState();if(key){sessionStorage.setItem('aryana-admin',key);$('adminToken').value='';$('loginDialog').close();}else $('loginError').textContent='کلید معتبر نیست.';};
const fragment=location.hash.slice(1);if(fragment){history.replaceState(null,'',location.pathname+location.search);if(/^[a-f0-9]{64}$/.test(fragment))key=fragment;}
if(!key)key=sessionStorage.getItem('aryana-admin')||'';
const session=await(await fetch('/api/session')).json();if(!session.requiresToken)key=session.key;
if(key){await loadState();if(key&&session.requiresToken)sessionStorage.setItem('aryana-admin',key);}else $('loginDialog').showModal();
setInterval(()=>void loadState(),1500);


$('lipPrepare').onclick=()=>void api('lip-prepare');
$('lipPublish').onclick=()=>void api('lip-publish',{id:current?.lipTest?.id});
$('lipTest').onclick=()=>void api('lip-test',{text:$('speechText').value.trim()});
$('activatePreview').onclick=()=>{previewMuted=false;try{localStorage.setItem('aryana-preview-muted','false');}catch{}applyPreviewMute();void $('livePreview').contentWindow.aryanaActivateAudio?.();};
$('togglePreview').onclick=()=>{const open=$('previewColumn').classList.toggle('mobile-open');if(open)$('previewColumn').scrollIntoView({behavior:'smooth',block:'start'});};
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==$('livePreview').contentWindow||event.data?.type!=='aryana-player')return;const labels={locked:'صدا قفل است؛ دکمهٔ فعال‌کردن صدا را بزنید.',ready:'پخش آماده است.',loading:'در حال دریافت صدای آماده‌شده…',playing:'آریانا اکنون صحبت می‌کند.','playing-muted':'حرکت لب فعال است؛ برای شنیدن صدا در همین صفحه دکمهٔ پخش را بزنید.',disconnected:'ارتباط صفحهٔ پخش قطع شده؛ تلاش مجدد…','idle-error':'ویدیوی انتظار اجرا نشد؛ اتصال و پخش ویدیو را بررسی کنید.',error:'خطای پخش: '+(event.data.detail||'دوباره امتحان کنید')};$('playerStatus').textContent=labels[event.data.status]||event.data.status;});

$('avatarMode').onchange=()=>api('settings',{avatarMode:$('avatarMode').value});
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==$('livePreview').contentWindow||event.data?.type!=='aryana-avatar'||current?.settings.avatarMode==='portrait')return;const labels={loading:'مدل سه‌بعدی در حال بارگذاری است؛ بار اول حدود ۳۷ مگابایت دریافت می‌شود.',ready:'مدل سه‌بعدی متحرک آماده است. چهرهٔ آن آزمایشی و متفاوت از تصویر اختصاصی است.',error:'مدل سه‌بعدی اجرا نشد: '+event.data.detail,'lip-error':'حرکت لب در این مرورگر اجرا نشد: '+event.data.detail};$('modelStatus').textContent=labels[event.data.status]||event.data.status;});

$('thanksClip').onclick=()=>api('thanks');
