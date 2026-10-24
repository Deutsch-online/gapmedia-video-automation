import {renderGuests} from './guests-ui.js';
const $=id=>document.getElementById(id);let token=decodeURIComponent(location.hash.slice(1));
try{if(token)sessionStorage.setItem('fahrfit-control-token',token);else token=sessionStorage.getItem('fahrfit-control-token')||'';}catch{}
history.replaceState(null,'',location.pathname);
let giftStyleDirty=false,activityDirty=false,activityProfilesSignature;
let timeDirty=false,musicDirty=false,timerSoundDirty=false,languageDirty=false;
let activeBuild,sessionDirty=false,questionGroupSignature;
let state,catalog=[],mappingDirty=false,manualDirty=false,savedSignature;
const giftKeys=['A','B','C','ALL'];
const styleTiers=['simple','silver','gold','diamond','vip'];
for(const [i,tier] of styleTiers.entries()){const label=document.createElement('label');label.textContent=['ساده از','نقره‌ای از','طلایی از','الماسی از','VIP از'][i];const input=document.createElement('input');input.id='giftStyle_'+tier;input.type='number';input.min='1';input.max='1000000000';input.step='1';label.append(input);$('giftStyleLevels').append(label);input.addEventListener('input',()=>{giftStyleDirty=true;});}
$('giftStyleBasis').addEventListener('change',()=>{giftStyleDirty=true;});
$('saveGiftStyle').addEventListener('click',async()=>{const result=await api('gift-style',{basis:$('giftStyleBasis').value,levels:Object.fromEntries(styleTiers.map(t=>[t,Number($('giftStyle_'+t).value)]))});if(result){giftStyleDirty=false;render(result.state);}});

for(const k of giftKeys){
 const label=document.createElement('label');label.textContent=k==='ALL'?'هر سه · اختیاری':`گزینهٔ ${k}`;
 const name=document.createElement('input');name.id='manualName'+k;name.placeholder='نام هدیه';name.maxLength=80;
 const id=document.createElement('input');id.id='manualId'+k;id.placeholder='شناسهٔ عددی هدیه';id.inputMode='numeric';id.dir='ltr';id.maxLength=20;
 label.append(name,id);$('manualGifts').append(label);
}
$('manualGifts').addEventListener('input',()=>{manualDirty=true;});
$('screenUrl').textContent=location.origin+'/screen';
$('operatorScreenLink').href=location.origin+'/screen#'+encodeURIComponent(token);
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
 if(!s)return;if(activeBuild&&s.build&&activeBuild!==s.build){history.replaceState(null,'',location.pathname+'#'+encodeURIComponent(token));location.reload();return;}activeBuild=s.build;const changed=state?.connection.status!==s.connection.status||state?.connection.giftCount!==s.connection.giftCount;state=s;
 $('autoReconnect').checked=Boolean(s.connection.autoReconnect);
 $('connectionStatus').textContent=s.connection.message+(s.connection.autoReconnect&&s.connection.retryAt?' تلاش بعدی تا '+Math.max(0,Math.ceil((s.connection.retryAt-s.serverTime)/1000))+' ثانیهٔ دیگر.':'')+(s.connection.diagnostics?.length?' '+s.connection.diagnostics.map(d=>`${d.route||'اتصال'}: ${d.reason}${d.httpStatus?' HTTP '+d.httpStatus:''}`).join(' · '):'');
 renderGuests($('guestList'),s.guests||[],{remove:key=>api('guest-remove',{key}),simulate:key=>api('simulate-guest-gift',{key})});
 $('answerInputStatus').textContent=s.answerInput==='comments'?'روش فعال: کامنت 1،2،3':'روش فعال: رز / تیک‌تاک / GG';
 $('commentsInput').classList.toggle('secondary',s.answerInput!=='comments');$('giftInput').classList.toggle('secondary',s.answerInput!=='gifts');
 $('autoplay').checked=s.autoplay;
 if(!giftStyleDirty){$('giftStyleBasis').value=s.giftStyle.basis;for(const tier of styleTiers)$('giftStyle_'+tier).value=s.giftStyle.levels[tier];}
 if(!activityDirty){$('activitySide').value=s.activityDisplay.side;$('activityCount').value=s.activityDisplay.count;$('activityTop').value=s.activityDisplay.top;$('activityTopValue').textContent=s.activityDisplay.top;}
 const profiles=[s.activityFocus,...s.supporters].filter(Boolean),profileSig=JSON.stringify(profiles.map(p=>[p.personKey,p.username,p.name]));
 if(profileSig!==activityProfilesSignature){activityProfilesSignature=profileSig;const seen=new Set();$('activityProfiles').replaceChildren(...profiles.filter(p=>p.username&&!seen.has(p.username)&&seen.add(p.username)).map(p=>{const link=document.createElement('a');link.href='https://www.tiktok.com/@'+encodeURIComponent(p.username);link.target='_blank';link.rel='noopener noreferrer';link.textContent=p.name+' · Follow +';return link;}));}

 if(s.session){const q=s.session;if(!sessionDirty){$('sessionSize').value=q.configuredSize;$('sessionSize').max=q.bankTotal;$('allowRepeat').checked=q.allowRepeat;}
 $('sessionStatus').textContent=`${s.mode==='demo'?'آزمایشی — ':''}جلسهٔ ${q.number}: ${q.review?'مرور دستی':q.position+' از '+q.size}؛ انجام‌شده در جلسه ${q.done}؛ کل انجام‌شده ${q.completedTotal}؛ تازه ${q.freshTotal}.${q.finished?' جلسه تمام شده؛ جلسهٔ جدید را بزنید.':''} ذخیره: ${s.sessionStorage?.status||'—'}${s.sessionStorage?.error?' — '+s.sessionStorage.error:''}`;
 const sig=JSON.stringify([s.mode,q.completedTotal,q.number,q.allowRepeat]);if(sig!==questionGroupSignature){questionGroupSignature=sig;void loadQuestions();}}

 if(!languageDirty)$('showPersian').checked=s.showPersian;
 $('narrationEnabled').checked=s.narrationEnabled;
 if(!timerSoundDirty)$('timerSound').checked=s.timerSound;
 if(!musicDirty){$('celebrationMusic').checked=s.celebrationMusic;$('musicVolume').value=s.musicVolume;$('musicVolumeValue').textContent=s.musicVolume;}
 if(!timeDirty)$('questionSeconds').value=s.questionSeconds;
 $('questionTimeStatus').textContent=`زمان فعلی پاسخ: ${s.questionSeconds} ثانیه؛ فیلم سؤال جداگانه و کامل پخش می‌شود.`;
 $('startQuestion').textContent=`شروع سؤال · ${s.questionSeconds} ثانیه`;
 const t=s.traffic||{};$('trafficStatus').textContent=`دریافت واقعی از همین لایو: ${t.likesReceived||0} رویداد لایک، ${t.commentsReceived||0} کامنت، ${t.answerCommentsReceived||0} کامنت عددی، ${t.commentsAccepted||0} پاسخ ثبت‌شده؛ ${t.giftsReceived||0} رویداد گیفت، ${t.giftsAccepted||0} پاسخ گیفت ثبت‌شده.${t.lastCommentReject?' علت آخرین کامنت ثبت‌نشده: '+t.lastCommentReject:''}${t.lastGiftReject?' علت آخرین گیفت ثبت‌نشده: '+t.lastGiftReject:''}`;
 const p={watching:'نمایش فیلم · هنوز پاسخ ندهید',waiting:'منتظر شروع',open:'دریافت پاسخ',revealed:'نمایش جواب',paused:'متوقف'};
 $('status').textContent=`حالت: ${s.mode==='demo'?'آزمایشی':'واقعی'}\nسؤال: ${s.index+1} از ${s.total}\nوضعیت: ${p[s.phase]}\nبینندگان پاسخ‌دهنده: ${s.voters}\nآمادگی گیفت واقعی: ${s.liveReady?'آماده':'تنظیم لازم دارد'}${s.lastReject?'\nآخرین پاسخ ثبت‌نشده: '+({watching_video:'ابتدا فیلم را ببینید؛ پاسخ‌گویی پس از فیلم آغاز می‌شود.',round_closed:'زمان سؤال تمام شده یا دریافت پاسخ متوقف است.',one_answer_only:'بیننده قبلاً گزینهٔ دیگری را انتخاب کرده است.',all_not_allowed:'این سؤال فقط یک پاسخ دارد.',late_or_old_event:'پیام هدیه برای این سؤال دیر رسیده یا مربوط به قبل است.',invalid_event:'اطلاعات لازم برای ثبت پاسخ دریافت نشد.'}[s.lastReject]||'پاسخ تکراری یا نامعتبر بود.'):''}`;
 $('leaderboard').replaceChildren(...s.leaderboard.map((row,i)=>{const p=document.createElement('p');p.textContent=`${i+1}. ${row.name} — ${row.score} پاسخ درست`;return p;}));
 savedGifts();if(changed)void loadCatalog();
}
let manualBusy=false;
async function manualCommand(action,data={}){
 if(manualBusy)return;manualBusy=true;notice('در حال اجرای فرمان…');
 const buttons=[...document.querySelectorAll('[data-command="previous"],[data-command="repeat"],[data-command="start"],[data-command="reveal"],[data-command="next"],#selectQuestion,#questionSelect')];
 for(const button of buttons)button.disabled=true;
 try{return await api(action,data);}finally{manualBusy=false;for(const button of buttons)button.disabled=false;}
}
document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>['pause','disconnect'].includes(b.dataset.command)?api(b.dataset.command):manualCommand(b.dataset.command)));
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

async function loadQuestions(){try{const response=await fetch('/api/admin/questions',{headers:{Authorization:'Bearer '+token}});if(!response.ok)return;const data=await response.json(),selected=$('questionSelect').value;
 const groups=[['سؤال‌های جلسهٔ جاری',q=>q.planned&&!q.completed],['سؤال‌های تازه',q=>!q.planned&&!q.completed],['سؤال‌های انجام‌شده',q=>q.completed]];
 $('questionSelect').replaceChildren(...groups.map(([label,filter])=>{const group=document.createElement('optgroup');group.label=label;for(const q of data.questions.filter(filter)){const o=document.createElement('option');o.value=q.id;o.textContent=`${q.video?'🎬 ':'🖼 '}${q.id} · ${q.topic}`;o.disabled=q.completed&&!data.session.allowRepeat;group.append(o);}return group;}));if(selected)$('questionSelect').value=selected;
 }catch{notice('فهرست سؤال‌ها دریافت نشد.',true);}}
$('selectQuestion').addEventListener('click',()=>manualCommand('select',{id:$('questionSelect').value}));if(token)void loadQuestions();

$('giftPreset').addEventListener('click',async()=>{const result=await api('gift-preset');if(result){mappingDirty=false;manualDirty=false;mappings();notice('A: Rose 5655 · B: TikTok 5269 · C: GG 6064 ذخیره شد.');}});

document.querySelectorAll('[data-supporter]').forEach(button=>button.addEventListener('click',()=>api('simulate-supporter',{coins:Number(button.dataset.supporter),name:'Test '+button.dataset.supporter})));
$('clearSupporters').addEventListener('click',()=>api('clear-supporters'));

for(const [id,input] of [['commentsInput','comments'],['giftInput','gifts']])$(id).addEventListener('click',async()=>{if(await api('pause'))await api('answer-input',{input});});
$('simulateComment').addEventListener('click',()=>api('simulate-comment',{comment:$('demoComment').value,name:$('demoName').value}));

$('addGuest').addEventListener('click',()=>api('guest-add',{username:$('guestUsername').value,userId:$('guestUserId').value}));

$('questionSeconds').addEventListener('input',()=>{timeDirty=true;});
$('saveQuestionTime').addEventListener('click',async()=>{const seconds=Number($('questionSeconds').value);if(!Number.isInteger(seconds)||seconds<10||seconds>300){notice('زمان باید بین 10 و 300 ثانیه باشد.',true);return;}if(await api('pause')){const result=await api('question-time',{seconds});if(result){timeDirty=false;render(result.state);notice('زمان ذخیره شد؛ برای ادامه شروع سؤال را بزنید.');}}});

$('musicVolume').addEventListener('input',()=>{musicDirty=true;$('musicVolumeValue').textContent=$('musicVolume').value;});
$('celebrationMusic').addEventListener('change',()=>{musicDirty=true;});
$('saveMusic').addEventListener('click',async()=>{const result=await api('celebration-audio',{enabled:$('celebrationMusic').checked,volume:Number($('musicVolume').value)});if(result){musicDirty=false;render(result.state);}});

$('narrationEnabled').addEventListener('change',async()=>{const result=await api('narration',{enabled:$('narrationEnabled').checked});if(result)render(result.state);});
$('repeatNarration').addEventListener('click',()=>api('narration-repeat'));
$('timerSound').addEventListener('change',()=>{timerSoundDirty=true;});
$('saveTimerSound').addEventListener('click',async()=>{const result=await api('timer-sound',{enabled:$('timerSound').checked});if(result){timerSoundDirty=false;render(result.state);}});

$('showPersian').addEventListener('change',async()=>{
 const checkbox=$('showPersian');languageDirty=true;checkbox.disabled=true;$('languageSaveStatus').textContent='در حال اعمال…';
 const result=await api('display-language',{showPersian:checkbox.checked});languageDirty=false;checkbox.disabled=false;
 if(result){render(result.state);$('languageSaveStatus').textContent=result.state.showPersian?'ترجمهٔ فارسی روشن است.':'ترجمهٔ فارسی خاموش است.';}else{checkbox.checked=Boolean(state?.showPersian);$('languageSaveStatus').textContent='ذخیره نشد؛ دوباره امتحان کنید.';}
});

$('sessionSize').addEventListener('input',()=>{sessionDirty=true;});
$('allowRepeat').addEventListener('change',()=>{sessionDirty=true;});
async function saveSession(){const result=await api('session-settings',{size:Number($('sessionSize').value),allowRepeat:$('allowRepeat').checked});if(result){sessionDirty=false;render(result.state);}return result;}
$('saveSession').addEventListener('click',saveSession);
$('newSession').addEventListener('click',async()=>{if(await api('pause')&&await saveSession())await api('new-session');});
$('retrySession').addEventListener('click',()=>api('retry-session-save'));
document.querySelectorAll('[data-like]').forEach(button=>button.addEventListener('click',()=>api('simulate-like',{count:Number(button.dataset.like),name:'Test '+button.dataset.like})));

$('autoReconnect').addEventListener('change',e=>api('auto-reconnect',{enabled:e.target.checked}));

for(const id of ['activitySide','activityCount','activityTop'])$(id).addEventListener('input',()=>{activityDirty=true;$('activityTopValue').textContent=$('activityTop').value;});
$('saveActivity').addEventListener('click',async()=>{const result=await api('activity-display',{side:$('activitySide').value,count:Number($('activityCount').value),top:Number($('activityTop').value)});if(result){activityDirty=false;render(result.state);}});
