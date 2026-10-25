import {drawRing} from './rings.js';
const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text!=null)node.textContent=text;return node;};
const profileURL=name=>typeof name==='string'&&/^[A-Za-z0-9._]{2,24}$/.test(name)?'https://www.tiktok.com/@'+name:null;
const giftLabel=person=>person.giftName+(person.count?' × '+person.count:'')+(person.pending?' · läuft':'');
function updateCopy(node,person){
 const copy=node.querySelector('.activity-copy');copy.querySelector('.supporter-name').textContent=person.name;
 const gift=copy.querySelector('.supporter-gift');if(gift)gift.textContent=giftLabel(person);
 let coins=copy.querySelector('.supporter-coins');if(person.kind==='gift'&&person.coins!==null){if(!coins){coins=el('small','supporter-coins');copy.append(coins);}coins.textContent=person.coins+' 🪙';}else coins?.remove();
 let likes=copy.querySelector('.supporter-likes');if(person.likes>0){if(!likes){likes=el('small','supporter-likes');copy.append(likes);}likes.textContent='♥ '+person.likeLabel;}else likes?.remove();
}
let frameSettings={};
function card(person,focus=false){
 const gift=person.kind==='gift',node=el('div',`supporter ${gift?'activity-gift':'activity-like'} tier-${person.tier}${person.newest?' newest':''}${focus?' activity-feature':''}`);node.dataset.person=person.personKey||person.key;
 if(focus)node.append(el('strong','activity-feature-title',gift?'Danke für dein Geschenk!':'Top Likes · Danke!'));
 const orb=el('div','supporter-orb'),photo=el('div','supporter-photo',Array.from(person.name||'?')[0]);
 if(person.avatar){const img=document.createElement('img');img.src=person.avatar;img.alt=person.name;img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove(),{once:true});photo.append(img);}
 orb.append(photo);
 const canvas=document.createElement('canvas');canvas.className='studio-profile-ring';canvas.width=canvas.height=focus?240:144;canvas.dataset.level=({vip:'fire',diamond:'ice',gold:'gold',silver:'silver',simple:'simple',bubble:'glow',crown:'gold',liked:'glow',basic:'simple'})[person.tier]||'simple';canvas.dataset.feature=focus?'1':'0';const chosen=frameSettings[gift?'gifter':'liker'];if(chosen&&chosen!=='auto')canvas.dataset.level=chosen;orb.append(canvas);
 if(focus){const hearts=el('div','focus-hearts');for(let i=0;i<5;i++){const heart=el('i','','♥');heart.style.setProperty('--i',i);hearts.append(heart);}orb.append(hearts);}
 const copy=el('div','activity-copy');copy.append(el('span','supporter-name',person.name));
 if(gift){copy.append(el('small','supporter-gift',giftLabel(person)));if(person.coins!==null)copy.append(el('small','supporter-coins',person.coins+' 🪙'));}
 if(person.likes>0)copy.append(el('small','supporter-likes','♥ '+person.likeLabel));
 node.append(orb,copy);
 if(focus){const url=profileURL(person.username),follow=el(url?'a':'span','activity-follow'+(url?'':' unavailable'),'Follow +');
  if(url){follow.href=url;follow.target='_blank';follow.rel='noopener noreferrer';follow.title='TikTok-Profil öffnen und dort folgen';}else{follow.setAttribute('aria-disabled','true');follow.title='TikTok-Benutzername im Ereignis nicht verfügbar';}node.append(follow);
 }
 return node;
}
function fitList(){
 const list=$('supporterRail').querySelector('.activity-list'),inner=list?.firstElementChild;if(!inner)return;
 const travel=Math.max(0,inner.scrollHeight-list.clientHeight);list.style.setProperty('--list-travel',travel+'px');list.style.setProperty('--tour-duration',Math.max(12,travel/35)+'s');list.classList.toggle('scrolling',travel>2);
}
let signature;
export function renderActivity(state){
 const config=state.activityDisplay||{side:'right',count:8,top:220},focus=state.activityFocus;
 const show=$('show');show.classList.toggle('activity-left',config.side==='left');show.style.setProperty('--activity-top',(config.top||220)+'px');
 const rows=(state.supporters||[]).filter(p=>!focus||p.personKey!==focus.personKey).slice(0,Math.max(0,config.count-(focus?1:0)));
 frameSettings=state.profileFrames||{};renderJoins(state.joins||[],state.joinDisplay);renderWelcome(state);
 const next=JSON.stringify([focus,rows,frameSettings]);if(signature===next){requestAnimationFrame(fitList);return;}signature=next;drawnStatic=false;
 const rail=$('supporterRail');const oldFocus=rail.querySelector('.activity-feature');
 // Preserve the enlarged portrait when only its like count changes.
 let featured;
 if(focus){const identity=JSON.stringify([focus.key,focus.kind,focus.tier,focus.avatar,focus.username,frameSettings]);
  if(oldFocus?.dataset.identity===identity){featured=oldFocus;updateCopy(featured,focus);}
  else{featured=card(focus,true);featured.dataset.identity=identity;}
 }
 const list=el('div','activity-list'),inner=el('div','activity-list-inner');rows.forEach(p=>inner.append(card(p)));list.append(inner);
 rail.replaceChildren(...(featured?[featured]:[]),list);requestAnimationFrame(fitList);
}

const reduced=matchMedia('(prefers-reduced-motion: reduce)');let lastMain=0,lastSmall=0,drawnStatic=false;
function animateFrames(time){
 if(document.hidden){requestAnimationFrame(animateFrames);return;}
 const still=reduced.matches;if(still&&drawnStatic){requestAnimationFrame(animateFrames);return;}
 const main=time-lastMain>=50,small=time-lastSmall>=160;
 if(main||small||still){
  for(const canvas of document.querySelectorAll('.studio-profile-ring')){
   const feature=canvas.dataset.feature==='1';if(!still&&!(feature?main:small))continue;
   const ctx=canvas.getContext('2d'),span=canvas.width;ctx.clearRect(0,0,span,span);
   if(canvas.dataset.level==='none')continue;
   drawRing(ctx,span/2,span/2,span*.61,canvas.dataset.level,still?0:time,{speed:1,intensity:feature?1.2:.7,ornaments:feature});
  }
  if(main)lastMain=time;if(small)lastSmall=time;drawnStatic=still;
 }
 requestAnimationFrame(animateFrames);
}
reduced.addEventListener('change',()=>{drawnStatic=false;});
requestAnimationFrame(animateFrames);

const seenJoins=new Set(),joinQueue=[];let joinPumpRunning=false;
function showNextJoin(){
 if(!joinQueue.length){joinPumpRunning=false;return;}joinPumpRunning=true;
 const join=joinQueue.shift(),host=$('joinToasts'),toast=el('div','join-toast');
 const portrait=el('div','join-portrait',Array.from(join.name||'?')[0]);
 if(join.avatar){const img=document.createElement('img');img.src=join.avatar;img.alt=join.name;img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove(),{once:true});portrait.append(img);}
 const copy=el('div','join-copy');copy.append(el('strong','',join.name),el('small','','خوش آمدید · Willkommen'));toast.append(portrait,copy);toast.title=join.name+' · خوش آمدید · Willkommen';host.append(toast);
 toast.addEventListener('animationend',()=>toast.remove(),{once:true});setTimeout(()=>toast.remove(),8500);setTimeout(showNextJoin,1600);
}
function renderJoins(joins,config={enabled:true,side:"right",size:96,bottom:100}){
 let host=$('joinToasts');if(!host){host=el('div','join-toasts');host.id='joinToasts';host.setAttribute('aria-live','polite');$('show').append(host);}
 host.classList.toggle('join-left',config.side==='left');host.style.setProperty('--join-size',(config.size||96)+'px');host.style.setProperty('--join-bottom',(config.bottom||100)+'px');host.classList.toggle('hidden',config.enabled===false);if(config.enabled===false){joinQueue.length=0;host.replaceChildren();return;}
 for(const join of joins){if(seenJoins.has(join.key))continue;seenJoins.add(join.key);if(seenJoins.size>1000)seenJoins.delete(seenJoins.values().next().value);if(Date.now()-join.at>9000)continue;joinQueue.push(join);if(joinQueue.length>50)joinQueue.shift();}
 if(!joinPumpRunning)showNextJoin();
}

function renderWelcome(state){let banner=$('welcomeBanner');if(!banner){banner=el('div','welcome-banner hidden');banner.id='welcomeBanner';banner.setAttribute('role','status');$('show').append(banner);}const greeting=state.welcome?.announcement;const visible=state.welcome?.enabled&&greeting&&state.serverTime>=greeting.at&&state.serverTime<greeting.expiresAt&&!['open','watching'].includes(state.phase);banner.classList.toggle('hidden',!visible);if(!visible||banner.dataset.key===greeting.id+':'+(state.welcome.language||'both'))return;banner.dataset.key=greeting.id+':'+(state.welcome.language||'both');const fa=el('p','',state.welcome.texts.fa),de=el('p','',state.welcome.texts.de);fa.lang='fa';fa.dir='rtl';de.lang='de';const language=state.narrationLanguage==='fa'?'fa':state.welcome.language||'both';banner.replaceChildren(...(language==='fa'?[fa]:language==='de'?[de]:[fa,de]));}
