import pathlib,sys
root=pathlib.Path(sys.argv[1])
def edit(path,fn):
 p=root/path
 p.write_text(fn(p.read_text()))
def replace(s,a,b):
 if a not in s:raise RuntimeError('Patch target missing: '+a[:100])
 return s.replace(a,b)
p=root/'public/math-duel.mjs';s=p.read_text()
s="import {normalizeLiveEvent} from './supporters.mjs';\n"+s
s=s.replace('MATH_VERSION=88','MATH_VERSION=90').replace('s.version!==88','s.version!==90').replace('s.version=88','s.version=90').replace('return {version:88,','return {version:90,')
s=replace(s,'delete p.gifts;','delete p.gifts;p.answerPoints=(Number(p.correct)||0)*10;p.likePoints??=0;p.answeredCount??=p.correct||0;p.points=p.answerPoints+p.likePoints;')
s=replace(s,'let changed=advanceSpotlight(s,now);','let changed=advanceArrival(s,now)||false;changed=advanceSpotlight(s,now)||changed;')
s=s.replace('s.round++;s.players=[];','s.round++;resetLikeBaseline(s);s.players=[];').replace("if(action==='reset'){s.demoHold=true;","if(action==='reset'){resetLikeBaseline(s);s.demoHold=true;")
a=s.index('export function mathEvent(');b=s.index('\nfunction queueSpotlight(',a)
event=r"""export function mathEvent(s,raw,now=Date.now()){
 const d=normalizeLiveEvent(raw);mathTick(s,now);const id=String(d.userId||d.uniqueId||'');if(!id||id.startsWith('demo:'))return false;
 s.viewerProfiles??={};const prior=s.viewerProfiles[id],name=String(d.nickname||prior?.name||d.uniqueId||id).replace(/[<>\r\n]/g,'').slice(0,40);let avatar=prior?.avatar||'';try{const u=new URL(d.avatar||'');if(u.protocol==='https:')avatar=u.href;}catch{}
 const person=s.viewerProfiles[id]={...prior,id,name,avatar,observedAt:prior?.observedAt??now};
 if(d.type==='leave'){if(s.waiting)delete s.waiting[id];return true;}
 const first=!prior||prior.observedAt===undefined;let arrivalChanged=false;if(d.type==='join'||first){arrivalChanged=queueArrival(s,person,now);s.waiting??={};if(!person.hasAnswered&&!s.waiting[id])s.waiting[id]={person:{...person},expiresAt:now+30000};}
 s.welcomed??={};if(d.type==='join'||first){if(s.welcomed[id]===undefined||now-s.welcomed[id]>=600000){s.welcomed[id]=now;const welcome=phrase(s,'welcome',name,now),instructions=s.language==='fa'?' برای پاسخ، شمارهٔ گزینه را بنویس. برای پرچم، نام یا کد کشورت را کامنت کن.':' Reply with the option number. To add your flag, comment your country name or code.';speak(s,welcome?welcome+instructions:'','welcome',now);}}
 if(d.type==='join')return arrivalChanged;
 if(d.type==='gift'||d.type==='like'){
 if(d.type==='gift'&&d.giftType===1&&!d.repeatEnd)return arrivalChanged;
 const receipt=d.type==='gift'&&d.groupId&&String(d.groupId)!=='0'?'group:'+id+':'+d.groupId+':'+(d.giftId||''):d.eventId;const key=receipt&&String(receipt)!=='0'?d.type+':'+receipt:'';s.engagementSeen??=[];if(key&&s.engagementSeen.includes(key))return arrivalChanged;if(key){s.engagementSeen.push(key);s.engagementSeen=s.engagementSeen.slice(-1000);}
 s.engagementThanks??={};const ledger=s.engagementThanks[id]??={likes:0,announcedLikes:0,lastLikeAt:null,lastSupportAt:null,coins:0};s.supporterProfiles??={};let speakThanks=false;
 if(d.type==='like'){const amount=Math.max(1,Math.min(100000,Number(d.likeCount??d.count)||1));ledger.likes+=amount;const earned=Math.max(0,Math.floor(ledger.likes/10)-(s.likeBaselines?.[id]||0));const player=s.players.find(p=>p.id===id&&!p.demo);if(player){player.likePoints=earned;player.answerPoints=(player.correct||0)*10;player.points=player.answerPoints+earned;}speakThanks=ledger.lastLikeAt===null||(ledger.likes-ledger.announcedLikes>=100&&now-ledger.lastLikeAt>=15000);if(speakThanks){ledger.announcedLikes=ledger.likes;ledger.lastLikeAt=now;}}
 else{const count=Math.max(1,Number(d.repeatCount)||1),coins=Number(d.coins??d.diamondCount*count);const value=Number.isFinite(coins)&&coins>=0&&coins<=1000000?coins:0;ledger.coins=(ledger.coins||0)+value;let image='';try{const u=new URL(d.gift?.icon?.urlList?.[0]||d.gift?.image?.urlList?.[0]||d.giftPictureUrl||'');if(u.protocol==='https:')image=u.href;}catch{}ledger.lastGift={name:String(d.giftName||d.gift?.name||d.giftDetails?.giftName||'Gift').slice(0,60),image,count,coins:value};ledger.lastGiftAt=now;speakThanks=ledger.lastSupportAt===null||now-ledger.lastSupportAt>=15000;if(speakThanks)ledger.lastSupportAt=now;}
 s.supporterProfiles[id]={...person,likes:ledger.likes,likePoints:Math.max(0,Math.floor(ledger.likes/10)-(s.likeBaselines?.[id]||0)),coins:ledger.coins||0,lastGift:ledger.lastGift||null,lastGiftAt:ledger.lastGiftAt||null,lastAt:now};
 if(d.type==='gift')queueSpotlight(s,person,'support',now);else{const top=Object.entries(s.engagementThanks).sort((a,b)=>b[1].likes-a[1].likes)[0]?.[0];if(top===id&&s.topLikerId!==id){s.topLikerId=id;queueSpotlight(s,person,'like',now);}}
 if(speakThanks)speak(s,phrase(s,'thanks',name,now),'thanks',now);return true;
 }
 if(d.type!=='comment')return arrivalChanged;
 const rawText=d.comment.trim(),explicit=rawText.match(/^(?:country|from|کشور|از)[:\s]+([a-z]{2})$/i),country=profileCountryFromComment(rawText)||(explicit?profileCountry(explicit[1].toUpperCase()==='UK'?'GB':explicit[1].toUpperCase()):null);
 if(country){Object.assign(person,country);for(const p of [...s.players,...s.responses,...(s.choices||[])])if(p.id===id)Object.assign(p,country);if(s.supporterProfiles?.[id])Object.assign(s.supporterProfiles[id],country);if(s.waiting?.[id])Object.assign(s.waiting[id].person,country);if(s.arrival?.person.id===id)Object.assign(s.arrival.person,country);if(s.spotlight?.person.id===id)Object.assign(s.spotlight.person,country);return true;}
 if(s.phase!=='playing')return arrivalChanged;const text=rawText.replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c));if(!/^\d{1,5}$/.test(text)||(s.answered||[]).includes(id))return arrivalChanged;const answer=Number(text),multiple=!!s.current?.enOptions?.length;if(multiple&&(answer<1||answer>4))return arrivalChanged;
 const key=d.eventId&&d.eventId!=='0'?'answer:'+d.eventId:'';if(key&&s.seen.includes(key))return arrivalChanged;
 let p=s.players.find(p=>p.id===id&&!p.demo);if(!p){if(s.players.length>=2000)return arrivalChanged;p={...person,points:0,correct:0,answeredCount:0,firstAnsweredAt:now};s.players.push(p);}Object.assign(p,{name,avatar,countryCode:person.countryCode,countryName:person.countryName});person.hasAnswered=true;if(s.waiting)delete s.waiting[id];s.realActive??={};s.realActive[id]=now;
 if(key){s.seen.push(key);s.seen=s.seen.slice(-2000);}s.answered??=[];s.answered.push(id);const correct=answer===s.answer,points=correct?10:0;p.answeredCount=(p.answeredCount||0)+1;if(correct)p.correct++;p.answerPoints=p.correct*10;p.likePoints=Math.max(0,Math.floor((s.engagementThanks?.[id]?.likes||0)/10)-(s.likeBaselines?.[id]||0));p.points=p.answerPoints+p.likePoints;p.lastAt=now;
 s.choices??=[];s.choices.push({...person,answer,demo:false});s.responses.push({...person,answer,labelEn:s.current?.enOptions?.[answer-1]||String(answer),labelFa:s.current?.faOptions?.[answer-1]||String(answer),correct,points,serial:s.serial});s.responses=s.responses.slice(-100);syncDemos(s,now);return true;
}
function resetLikeBaseline(s){s.likeBaselines=Object.fromEntries(Object.entries(s.engagementThanks||{}).map(([id,p])=>[id,Math.floor(p.likes/10)]));}
function queueArrival(s,person,now){s.arrivalSeen??={};if(s.arrivalSeen[person.id]!==undefined&&now-s.arrivalSeen[person.id]<30000)return false;s.arrivalSeen[person.id]=now;s.arrivalQueue??=[];if(s.arrivalQueue.length<32)s.arrivalQueue.push({person:{...person},queuedAt:now});advanceArrival(s,now);return true;}
function advanceArrival(s,now){let changed=false;for(const[id,p]of Object.entries(s.waiting||{}))if(now>=p.expiresAt){delete s.waiting[id];changed=true;}if(s.arrival&&now>=s.arrival.endsAt){s.arrival=null;changed=true;}s.arrivalQueue??=[];s.arrivalQueue=s.arrivalQueue.filter(p=>now-p.queuedAt<30000);if(!s.arrival&&s.arrivalQueue.length){const next=s.arrivalQueue.shift();s.arrival={...next,id:'arrival:'+now+':'+next.person.id,showAt:now+600,holdUntil:now+10600,endsAt:now+11400};changed=true;}return changed;}
function communityView(s,now){const all=Object.values(s.supporterProfiles||{}).map(p=>({...p,likePoints:Math.max(0,Math.floor((p.likes||0)/10)-(s.likeBaselines?.[p.id]||0))})),likers=all.filter(p=>p.likes>0).sort((a,b)=>b.likes-a.likes).slice(0,2),supporters=all.filter(p=>p.lastGift).sort((a,b)=>b.lastGiftAt-a.lastGiftAt).slice(0,2);for(let i=likers.length;i<2;i++)likers.push({...DEMOS[i],id:'demo:like:'+i,demo:true,likes:120-i*30,likePoints:12-i*3});for(let i=supporters.length;i<2;i++)supporters.push({...DEMOS[i+2],id:'demo:support:'+i,demo:true,lastGift:{name:'Rose',count:1,coins:1,image:'/gifts/rose.webp'}});return{likers,supporters};}
"""
s=s[:a]+event+s[b:]
s=replace(s,"mode=!s.demoEnabled||count>=2?'none':count===1?'rival':'showcase'","mode=!s.demoEnabled?'none':count===0?'showcase':'rival'")
s=s.replace('{...bot,demo:true,points:0,correct:0,lastAt:now}','{...bot,demo:true,points:0,answerPoints:0,likePoints:0,correct:0,answeredCount:0,lastAt:now}')
s=replace(s,'at:now+2500+i*1500+Math.floor(Math.random()*1000)','at:now+Math.min(7000,s.questionSeconds*1000*.4)+i*1300+Math.floor(Math.random()*700)')
a=s.index('const correct=Math.random()<.6,options=');b=s.index('s.answered??=[];',a)
s=s[:a]+"""const options=s.current?.enOptions||[],human=(s.choices||[]).filter(p=>!p.demo);let answer;if(human.length>=3){const counts=new Map();for(const p of human)counts.set(p.answer,(counts.get(p.answer)||0)+1);const majority=[...counts].sort((a,b)=>b[1]-a[1])[0][0],alternatives=options.length?[1,2,3,4].filter(n=>n!==majority):[majority+1,Math.max(0,majority-1),majority+2].filter(n=>n!==majority);answer=alternatives[Math.floor(Math.random()*alternatives.length)];}else{const wrong=options.length?[1,2,3,4].filter(n=>n!==s.answer):[s.answer+1,s.answer+2,s.answer+3];answer=Math.random()<.6?s.answer:wrong[Math.floor(Math.random()*wrong.length)];}const correct=answer===s.answer;"""+s[b:]
s=s.replace('if(correct){p.points+=10;p.correct++;}','p.answeredCount=(p.answeredCount||0)+1;p.firstAnsweredAt??=now;if(correct)p.correct++;p.answerPoints=p.correct*10;p.likePoints=0;p.points=p.answerPoints;')
s=replace(s,'players:[...s.players].sort((a,b)=>b.points-a.points||a.lastAt-b.lastAt).slice(0,20)','players:[...s.players].filter(p=>p.demo||p.answeredCount>0||p.correct>0).sort((a,b)=>(b.answerPoints??b.correct*10)-(a.answerPoints??a.correct*10)||(a.firstAnsweredAt??a.lastAt)-(b.firstAnsweredAt??b.lastAt)).slice(0,20)')
s=replace(s,'demoEnabled:s.demoEnabled,demoMode',"community:communityView(s,now),arrival:s.arrival?{id:s.arrival.id,person:s.arrival.person,remainingMs:Math.max(0,s.arrival.holdUntil-Math.max(now,s.arrival.showAt)),fadeRemainingMs:Math.max(0,s.arrival.endsAt-now),fading:now>=s.arrival.holdUntil}:null,waiting:Object.values(s.waiting||{}).filter(p=>now<p.expiresAt).slice(-4).map(p=>p.person),demoEnabled:s.demoEnabled,demoMode")
p.write_text(s)
# Live display and settings.
p=root/'public/math-duel.html';s=p.read_text()
s=replace(s,'<div id="answerList"><h3 data-t="correct">✅ Correct answers</h3><div id="responses"></div></div>','<div id="answerList" hidden><div id="responses"></div></div><div id="communityBoard"></div>')
s=replace(s,'<div id="ranking"></div></section></div>','<div id="ranking"></div><div id="waitingBoard"></div></section></div>')
s=s.replace('<div id="demoStatus"','<div id="arrivalBanner" hidden role="status" aria-live="polite"></div><div id="demoStatus"',1)
s=s.replace('<p class="setting-note" data-t="autosaved">','<p id="liveEventHealth" class="live-health" role="status"></p><p class="setting-note" data-t="autosaved">')
s=s.replace('<p id="liveStatus"></p>','<p id="liveStatus"></p><p class="setting-note" data-t="providerHelp"></p><a href="https://huggingface.co/spaces/afgtakrun/live-crown-52/settings" target="_blank" rel="noopener" data-t="hostSettings">Hosting settings</a>')
s=s.replace('<hr><h3 data-t="panelAudio">','<p class="setting-note" data-t="voiceBackupHelp"></p><hr><h3 data-t="panelAudio">')
s=s.replace('v=88','v=90');p.write_text(s)
p=root/'public/math-duel-ui.mjs';s=p.read_text()
s=replace(s,"$('answerList').hidden=!!event","$('answerList').hidden=true")
s=s.replace("spotlightSetting:'One-minute community portrait spotlight'","voiceBackupHelp:'Natural voice uses the existing allowance. A built-in backup voice continues when that service or its allowance is unavailable; the backup sounds different.',providerHelp:'If the event provider rejects access, configure SIGN_API_KEY in Space secrets with an authorized EulerStream key. Do not post keys in chat.',hostSettings:'Hosting settings',providerError:'TikTok events blocked: provider key or permissions rejected.',topLikers:'Top likers',supporters:'Supporters',likes:'likes',coins:'coins',welcome:'WELCOME',newViewers:'New viewers',waitingHint:'Answer to join the quiz',rankRule:'Rank: answers · likes add points',likeRule:'10 likes = 1 point',spotlightSetting:'One-minute community portrait spotlight'")
s=s.replace("spotlightSetting:'نمایش برجستهٔ عکس برای یک دقیقه'","voiceBackupHelp:'صدای اصلی از سهمیهٔ موجود استفاده می‌کند. هنگام خطا یا پایان سهمیه، صدای پشتیبان داخلی ادامه می‌دهد؛ جنس صدای پشتیبان متفاوت است.',providerHelp:'اگر سرویس رویدادها دسترسی را رد کرد، کلید مجاز EulerStream را در Secrets هاست با نام SIGN_API_KEY ثبت کنید؛ کلید را در چت نفرستید.',hostSettings:'تنظیمات هاست',providerError:'رویدادهای تیک‌تاک مسدودند: کلید یا مجوز سرویس پذیرفته نشده است.',topLikers:'لایکرهای برتر',supporters:'حامی‌ها',likes:'لایک',coins:'کوین',welcome:'خوش آمدی',newViewers:'تازه‌واردها',waitingHint:'برای ورود به جدول، جواب بده',rankRule:'رتبه: جواب‌ها · لایک امتیاز دارد',likeRule:'هر ۱۰ لایک = ۱ پوینت',spotlightSetting:'نمایش برجستهٔ عکس برای یک دقیقه'")
s=s.replace('renderSpotlight(s.spotlight);','renderSpotlight(s.spotlight);renderCommunity(s.community,s.spotlight);renderWaiting(s.waiting||[]);renderArrival(s.arrival);')
s=s.replace("$('demoStatus').textContent=s.demoMode==='none'?'':t(s.demoMode);","$('demoStatus').textContent=t('rankRule');").replace("$('demoStatus').hidden=s.demoMode==='none';","$('demoStatus').hidden=false;")
s=s.replace('s.players.slice(0,screen?6:10)','s.players.slice(0,screen?((s.waiting||[]).length?4:6):10)')
s=s.replace("function tick(){if(!latest)return;","function tick(){if(!latest)return;if(latest.arrival){const elapsed=performance.now()-received,card=$('arrivalBanner'),left=latest.arrival.remainingMs-elapsed;card.classList.toggle('arrival-fading',left<=0);if(latest.arrival.fadeRemainingMs-elapsed<=0)card.hidden=true;const timer=card.querySelector('.arrival-time');if(timer)timer.textContent=fmt(Math.max(0,left)/1000)+' '+t('seconds');}")
ui=r"""
function renderCommunity(community,focus){if(!community)return;const root=$('communityBoard');root.replaceChildren();for(const[kind,list,label]of[['like',community.likers,'topLikers'],['support',community.supporters,'supporters']]){const h=document.createElement('h3');h.textContent=t(label);root.append(h);for(const p of list){const card=row(p.name,kind==='like'?fmt(p.likes):'',p);card.classList.add('community-row');card.dataset.community=kind;if(focus?.person.id===p.id)card.classList.add('featured-supporter');const info=document.createElement('small');info.className='community-info';info.textContent=kind==='like'?fmt(p.likePoints||0)+' PT · '+t('likeRule'):(p.lastGift?.name||'Gift')+' ×'+fmt(p.lastGift?.count||1)+' · '+fmt(p.lastGift?.coins||0)+' '+t('coins');if(kind==='support'&&p.lastGift?.image){const im=document.createElement('img');im.className='gift-thumb';try{const u=new URL(p.lastGift.image,location.origin);if(u.protocol==='https:'||u.origin===location.origin){im.src=u.href;im.alt=p.lastGift.name;card.append(im)}}catch{}}card.append(info);root.append(card);}}}
function renderWaiting(people){const root=$('waitingBoard');root.replaceChildren();if(!people.length)return;const h=document.createElement('h3');h.textContent=t('newViewers');root.append(h);for(const p of people.slice(-2))root.append(row(p.name,t('waitingHint'),p));}
function renderArrival(event){const root=$('arrivalBanner');if(!event){root.hidden=true;root.replaceChildren();delete root.dataset.id;return;}root.hidden=false;const key=event.id+'|'+JSON.stringify(event.person)+'|'+language();if(root.dataset.id!==key){root.dataset.id=key;root.classList.remove('arrival-fading');root.replaceChildren();const h=document.createElement('h2');h.textContent=t('welcome');const portrait=row('', '',event.person).querySelector('.player-avatar');portrait.classList.add('arrival-portrait');const name=document.createElement('strong');name.textContent=event.person.name;name.className='arrival-name';const note=document.createElement('p');note.textContent=t('waitingHint')+' · '+t('countryHint');const timer=document.createElement('b');timer.className='arrival-time';root.append(h,portrait,name,note,timer);root.style.animation='none';void root.offsetWidth;root.style.animation='';}if(screen){const q=document.querySelector('.quiz');root.style.setProperty('--arrival-top',(q.offsetTop+q.offsetHeight+10)+'px');}root.classList.toggle('arrival-fading',event.fading);}
"""
s=s.replace('function leaderRow(',ui+'\nfunction leaderRow(')
a=s.index("if(d.type==='bridgeStatus')$('liveStatus').textContent=");b=s.index(";if(d.type==='refreshDisplay'",a)
s=s[:a]+"""if(d.type==='bridgeStatus'){const message=d.code==='PROVIDER_AUTH_REQUIRED'?t('providerError'):panelLang==='en'?({idle:'TikTok LIVE not connected',connected:'TikTok LIVE connected',connecting:'Connecting to TikTok LIVE…',disconnected:'TikTok LIVE disconnected',error:'TikTok connection failed: '+(d.code||'check account')})[d.state]||d.state:d.message;$('liveStatus').textContent=message;$('liveEventHealth').textContent=message;$('liveEventHealth').dataset.state=d.state;}"""+s[b+1:]
s=s.replace("testEvent('gift',{giftType:1,repeatEnd:true,eventId:","testEvent('gift',{giftType:1,repeatEnd:true,coins:1,giftName:'Rose',eventId:")
s=s.replace('v=88','v=90').replace('client=math88','client=math90')
p.write_text(s)
# Arrival and compact community panels, preserving the readable native canvas.
css=r"""
#communityBoard h3{margin:10px 0 5px}#communityBoard .community-row{flex-wrap:wrap;position:relative}#communityBoard .community-info{flex-basis:100%;color:#d8e6fa;font-size:11px;line-height:1.3;padding-left:28px}.gift-thumb{width:28px;height:28px;object-fit:contain}.community-row.featured-supporter{background:#23362b;border:1px solid #ffe398;border-radius:5px}#waitingBoard{margin-top:12px;border-top:1px solid #375070;padding-top:8px}#waitingBoard .row>b{font-size:10px;white-space:normal;max-width:90px;color:#b7d0ed}#arrivalBanner{position:relative;text-align:center;background:#071b35;border:2px solid #7cebd3;border-radius:12px;padding:18px;color:#fff;z-index:20;animation:arrival-rise .6s ease-out both}#arrivalBanner h2{font-size:26px;color:#91ffe2;margin:0 0 12px}#arrivalBanner .arrival-portrait{display:flex;width:120px;height:120px;margin:12px auto;font-size:52px;border:3px solid #f8e5a1}#arrivalBanner .arrival-name{display:block;font-size:28px;font-weight:800}#arrivalBanner p{font-size:14px;line-height:1.4}#arrivalBanner .arrival-time{color:#d6e7ff}.arrival-fading{opacity:0!important;transition:opacity .8s ease!important}@keyframes arrival-rise{from{transform:translateY(650px);opacity:0}to{transform:translateY(0);opacity:1}}.screen #broadcast #arrivalBanner{position:absolute;top:var(--arrival-top,1050px);bottom:300px;left:28px;right:120px;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;overflow:hidden}.screen #broadcast #arrivalBanner h2{font-size:44px;margin:0 0 10px}.screen #broadcast #arrivalBanner .arrival-portrait{width:180px;height:180px;max-height:45%;flex-shrink:1;font-size:80px;margin:10px auto}.screen #broadcast #arrivalBanner .arrival-name{font-size:48px;line-height:1.1}.screen #broadcast #arrivalBanner p{font-size:26px;line-height:1.25;max-width:95%;margin:10px 0}.screen #broadcast #arrivalBanner .arrival-time{font-size:28px}.screen #broadcast #communityBoard h3{font-size:26px;margin:8px 0 4px}.screen #broadcast #communityBoard .community-row{display:grid;grid-template-columns:40px minmax(0,1fr) auto;grid-template-rows:auto auto;min-height:67px;padding:6px 2px;column-gap:7px;row-gap:2px;font-size:26px}.screen #broadcast #communityBoard .community-row>.player-avatar{grid-column:1;grid-row:1/3;width:40px;height:40px}.screen #broadcast #communityBoard .community-row>span{grid-column:2;grid-row:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.screen #broadcast #communityBoard .community-row>.demo-badge{grid-column:3;grid-row:1;align-self:center}.screen #broadcast #communityBoard .community-row>b{grid-column:3;grid-row:2;font-size:23px}.screen #broadcast #communityBoard .community-info{grid-column:2/4;grid-row:2;padding:0;font-size:18px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.screen #broadcast #communityBoard .gift-thumb{position:absolute;left:25px;bottom:3px;width:25px;height:25px;z-index:2;background:#0a1730;border-radius:4px}.screen #broadcast #spotlightCard{padding:5px 0 10px;border-bottom:1px solid #806e3d;display:grid;grid-template-columns:110px 1fr;gap:5px;text-align:start;align-items:center}.screen #broadcast #spotlightCard h3{grid-column:1/-1;font-size:26px;margin:0}.screen #broadcast #spotlightCard .spotlight-portrait{grid-row:2/4;width:105px;height:105px;margin:0;font-size:42px;border-width:3px}.screen #broadcast #spotlightCard .spotlight-name{font-size:27px;margin:0;line-height:1.15}.screen #broadcast #spotlightCard .spotlight-time{font-size:22px}.screen #broadcast #waitingBoard h3{font-size:25px}.screen #broadcast #waitingBoard .row{font-size:24px;min-height:52px}.screen #broadcast #waitingBoard .row>b{font-size:19px;max-width:125px}.screen #broadcast #waitingBoard .player-avatar{width:36px;height:36px}.screen #broadcast #demoStatus{font-size:23px}.screen #broadcast #ranking>.row{min-height:61px;font-size:31px;padding:8px 1px}.live-health{font-size:13px;line-height:1.45;padding:9px;background:#10243b;border:1px solid #365276;border-radius:6px}.live-health[data-state=error]{background:#3b1420;color:#ffd3d3;border-color:#ab5363}.live-health[data-state=connected]{color:#a7ffde;border-color:#53a38a}@media(prefers-reduced-motion:reduce){#arrivalBanner{animation:none!important}.arrival-fading{transition:none!important}}
"""
with (root/'public/math-duel.css').open('a') as f:f.write(css)
# Server: normalized event path, honest connection status and continuous bounded-cost speech.
p=root/'server.mjs';s=p.read_text().replace('mathVersion:88,mathPanelVersion:88','mathVersion:90,mathPanelVersion:90,liveProviderConfigured:Boolean(process.env.SIGN_API_KEY),voiceBackup:true')
s=s.replace("renderVersion:'math88'","renderVersion:'math90'")
s=s.replace("['comment','gift','join','like'].includes(d.type)","['comment','gift','join','like','leave'].includes(d.type)",1).replace('liveTelemetry[c]++;liveTelemetry.lastEventAt','if(c)liveTelemetry[c]++;liveTelemetry.lastEventAt',1)
s=s.replace("liveStatus={type:'bridgeStatus',state,message,...details}","liveStatus={type:'bridgeStatus',state,message,providerConfigured:Boolean(process.env.SIGN_API_KEY),...details}")
s=s.replace("naturalVoiceOnly:true","naturalVoiceOnly:false").replace("process.env.CROWN_ELEVEN_API_KEY?'elevenlabs':'unavailable'","process.env.CROWN_ELEVEN_API_KEY?'elevenlabs+local-backup':'local-backup'")
a=s.index('async function leagueSpeech(');b=s.index('\nconst portraitCache=',a)
speech=r"""let backupVoiceChain=Promise.resolve();
function backupSpeech(text,language){
 const task=backupVoiceChain.then(()=>new Promise((resolve,reject)=>{
  const child=execFile('espeak-ng',['--stdout','-v',language==='fa'?'fa':'en-us','-s','155','--stdin'],{encoding:'buffer',maxBuffer:12000000,timeout:15000},(error,stdout)=>{
   if(error||!stdout||stdout.length<100||stdout.subarray(0,4).toString()!=='RIFF')return reject(Error('Backup voice unavailable'));
   stdout.writeUInt32LE(stdout.length-8,4);for(let pos=12;pos+8<=stdout.length;){const tag=stdout.subarray(pos,pos+4).toString(),size=stdout.readUInt32LE(pos+4);if(tag==='data'){stdout.writeUInt32LE(stdout.length-pos-8,pos+4);break;}pos+=8+size+(size%2);}resolve({bytes:stdout,type:'audio/wav',provider:'local-backup',mode:'backup'});
  });child.stdin.on('error',()=>{});child.stdin.end(text);
 }));
 backupVoiceChain=task.catch(()=>{});return task;
}
async function leagueSpeech(req,res,url){
 const text=url.searchParams.get('text')||'',sig=url.searchParams.get('sig')||'',language=url.searchParams.get('lang')||'en',purpose=url.searchParams.get('mode')||'',expected=crypto.createHmac('sha256',secret).update(language+'\n'+purpose+'\n'+text).digest('hex'),cacheKey=language+':'+sig;
 if(/(?:send|buy|give)\s+(?:me\s+|us\s+)?(?:a\s+|more\s+)?gifts?|(?:لایک|گیفت|هدیه|فالو)\s*(?:بزن|بفرست|کنید|کن)/i.test(text))return json(res,403,{error:'Solicitation is disabled'});
 if(!['live','preview','name'].includes(purpose)||!['en','fa'].includes(language)||!text||text.length>600||!/^[a-f0-9]{64}$/.test(sig)||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return json(res,403,{error:'Invalid speech request'});
 if(purpose==='name'&&(text.length>55||!/[\p{L}]/u.test(text)))return json(res,403,{error:'Invalid spoken name'});
 let data=speechCache.get(cacheKey);
 if(!data){
  if(!speechJobs.has(cacheKey)){
   const job=(async()=>{
    const day=new Date().toISOString().slice(0,10),usageKey=purpose==='name'?'nameSpeechUsage':'speechUsage',limit=purpose==='name'?1000:5000,usage=game.s[usageKey]?.day===day?game.s[usageKey]:{day,characters:0};
    if(process.env.CROWN_ELEVEN_API_KEY&&usage.characters+text.length<=limit&&runningSpeech<3){
     runningSpeech++;usage.characters+=text.length;game.s[usageKey]=usage;persist();
     try{
      const voice=process.env.CROWN_ELEVEN_VOICE_ID||'EXAVITQu4vr4xnSDxMaL';
      const response=await fetch('https://api.elevenlabs.io/v1/text-to-speech/'+encodeURIComponent(voice)+'?output_format=mp3_44100_128',{method:'POST',headers:{'xi-api-key':process.env.CROWN_ELEVEN_API_KEY,'Content-Type':'application/json',Accept:'audio/mpeg'},body:JSON.stringify({text,model_id:language==='fa'?(process.env.CROWN_ELEVEN_FA_MODEL||'eleven_v3'):'eleven_v3',language_code:language,voice_settings:{stability:.5,similarity_boost:.75,speed:.96}}),signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw Error('Voice provider unavailable');
      const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<100||bytes.length>3000000)throw Error('Invalid voice audio');
      return{bytes,type:'audio/mpeg',provider:'elevenlabs',mode:'primary'};
     }catch{}finally{runningSpeech--;}
    }
    return backupSpeech(text,language);
   })().then(result=>{speechCache.set(cacheKey,result);while(speechCache.size>128)speechCache.delete(speechCache.keys().next().value);return result;}).finally(()=>speechJobs.delete(cacheKey));
   speechJobs.set(cacheKey,job);
  }
  try{data=await speechJobs.get(cacheKey);}catch{return json(res,503,{error:'Primary and backup voice unavailable'});}
 }
 res.writeHead(200,{'Content-Type':data.type,'Content-Length':data.bytes.length,'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff','X-Voice-Provider':data.provider,'X-Voice-Mode':data.mode||'primary','X-Narration-Language':language});res.end(data.bytes);
}
"""
s=s[:a]+speech+s[b:];p.write_text(s)
print('PATCH_READY version=90')
