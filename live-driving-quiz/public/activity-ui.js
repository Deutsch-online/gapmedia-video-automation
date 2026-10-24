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
function card(person,focus=false){
 const gift=person.kind==='gift',node=el('div',`supporter ${gift?'activity-gift':'activity-like'} tier-${person.tier}${person.newest?' newest':''}${focus?' activity-feature':''}`);node.dataset.person=person.personKey||person.key;
 if(focus)node.append(el('strong','activity-feature-title',gift?'Danke für dein Geschenk!':'Top Likes · Danke!'));
 const orb=el('div','supporter-orb'),photo=el('div','supporter-photo',Array.from(person.name||'?')[0]);
 if(person.avatar){const img=document.createElement('img');img.src=person.avatar;img.alt=person.name;img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove(),{once:true});photo.append(img);}
 orb.append(photo);
 const canvas=document.createElement('canvas');canvas.className='studio-profile-ring';canvas.width=canvas.height=focus?240:144;canvas.dataset.level=({vip:'fire',diamond:'ice',gold:'gold',silver:'silver',simple:'simple',bubble:'glow',crown:'gold',liked:'glow',basic:'simple'})[person.tier]||'simple';canvas.dataset.feature=focus?'1':'0';orb.append(canvas);
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
 const next=JSON.stringify([focus,rows]);if(signature===next){requestAnimationFrame(fitList);return;}signature=next;drawnStatic=false;
 const rail=$('supporterRail');const oldFocus=rail.querySelector('.activity-feature');
 // Preserve the enlarged portrait when only its like count changes.
 let featured;
 if(focus){const identity=JSON.stringify([focus.key,focus.kind,focus.tier,focus.avatar,focus.username]);
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
   drawRing(ctx,span/2,span/2,span*.61,canvas.dataset.level,still?0:time,{speed:1,intensity:feature?1.2:.7,ornaments:feature});
  }
  if(main)lastMain=time;if(small)lastSmall=time;drawnStatic=still;
 }
 requestAnimationFrame(animateFrames);
}
reduced.addEventListener('change',()=>{drawnStatic=false;});
requestAnimationFrame(animateFrames);
