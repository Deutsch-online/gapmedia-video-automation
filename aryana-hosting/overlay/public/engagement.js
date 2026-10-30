import {latinLabel} from '/latin-label.js?v=host-v5';
const safeText=value=>String(value??'').slice(0,80);
const format=new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1});
function node(tag,className,text){const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=safeText(text);return el;}
function avatar(person){
 const root=node('span','fan-face',Array.from(latinLabel(person.name))[0]||'♡');
 try{const url=new URL(person.avatar);if(url.protocol==='https:'&&/(^|\.)(tiktokcdn(-us|-eu)?\.com|byteimg\.com|ibyteimg\.com|ibytedtos\.com)$/.test(url.hostname)){const image=node('img','fan-avatar');image.src=url.href;image.alt='';image.referrerPolicy='no-referrer';image.addEventListener('error',()=>image.remove(),{once:true});root.append(image);}}catch{}
 return root;
}
function score(person){const parts=[];if(person.coins>0||person.count>0)parts.push('🎁 '+(person.unknown?'?':format.format(person.coins||0)));if(person.likes>0)parts.push('♥ '+format.format(person.likes));return parts.join('  ·  ');}
export function createEngagementOverlay({rail,arrivals,now=()=>Date.now()}){
 let signature='',lastNow=null;const seen=new Set(),active=new Map();
 function remove(key){const entry=active.get(key);if(!entry)return;clearTimeout(entry.timer);entry.element.remove();active.delete(key);}
 function render(state){
  const time=now();if(lastNow!==null&&time<lastNow){for(const key of active.keys())remove(key);seen.clear();}lastNow=time;
  const keys=new Set();const people=[...(state.focus?[{...state.focus,featured:true}]:[]),...(state.rows||[])].filter(person=>{if(!person?.key||keys.has(person.key))return false;keys.add(person.key);return true;}).slice(0,7);
  const next=JSON.stringify(people.map(p=>[p.key,p.name,p.avatar,p.coins,p.likes,p.count,p.kind,p.featured,p.unknown]));
  if(signature!==next){signature=next;rail.replaceChildren();rail.hidden=!people.length;
   for(const person of people){const card=node('div','fan-card'+(person.featured?' featured':''));card.dataset.person=safeText(person.key);card.dataset.kind=person.kind;const copy=node('span','fan-copy');copy.append(node('strong','fan-name',latinLabel(person.name)),node('small','fan-score',score(person)));card.append(avatar(person),copy);if(person.featured)card.append(node('span','fan-crown',person.kind==='gift'?'🎁 1':'♥ 1'));rail.append(card);}
  }
  for(const [key,entry]of active)if(time-entry.at>=6300)remove(key);
  for(const person of (state.joins||[])){
   if(!person?.key||seen.has(person.key)||!Number.isFinite(person.at)||time-person.at>=6300||person.at-time>2000)continue;
   seen.add(person.key);while(seen.size>1000)seen.delete(seen.values().next().value);
   while(active.size>=3)remove(active.keys().next().value);
   const toast=node('div','arrival');toast.dataset.arrival=safeText(person.key);toast.append(avatar(person),node('strong','arrival-name',latinLabel(person.name)));
   const lane=[0,1,2].find(value=>![...active.values()].some(entry=>entry.lane===value));
   const age=Math.max(0,time-person.at);toast.style.animationDelay=(-age/1000)+'s';toast.style.setProperty('--arrival-lane',String(lane));
   arrivals.append(toast);const entry={element:toast,at:person.at,lane,timer:setTimeout(()=>remove(person.key),6300-age)};active.set(person.key,entry);toast.addEventListener('animationend',()=>remove(person.key),{once:true});
  }
 }
 function clear(){for(const key of active.keys())remove(key);seen.clear();signature='';rail.replaceChildren();rail.hidden=true;}
 return {render,clear};
}
