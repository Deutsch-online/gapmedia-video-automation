const fa=new Intl.NumberFormat('en-US');
function el(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
function portrait(person){const box=el('span',Array.from(person.name||person.username||'؟')[0],'guest-photo tier-'+(person.tier||'bubble'));if(person.avatar){const img=el('img');img.src=person.avatar;img.alt=person.name||person.username;img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove(),{once:true});box.append(img);}if(person.tier==='vip')box.append(el('span','🐉','guest-dragon'));return box;}
export function renderGuests(root,rows,{remove,simulate}={}){
 const opened=new Set([...root.querySelectorAll('details[open]')].map(e=>e.dataset.key));
 root.replaceChildren(...rows.map(guest=>{
  const details=el('details',null,'guest-card');details.dataset.key=guest.key;details.open=opened.has(guest.key);
  const summary=el('summary');summary.append(portrait(guest),el('b','@'+guest.username),el('small',fa.format(guest.supporters.length)+' حامی'));details.append(summary);
  if(remove){details.append(el('p',guest.resolved?'گیرنده با شناسهٔ عددی مشخص است.':'منتظر شناسایی: مهمان کامنت بگذارد یا شناسهٔ عددی او را در پنل وارد کنید.'));const del=el('button','حذف مهمان','secondary');del.onclick=()=>remove(guest.key);details.append(del);const test=el('button','آزمایش حمایت · 500 کوین');test.onclick=()=>simulate(guest.key);details.append(test);}
  if(!guest.supporters.length)details.append(el('p','هنوز گیفت با گیرندهٔ مشخص ثبت نشده است.'));
  for(const donor of guest.supporters){const row=el('div',null,'guest-donor');row.append(portrait(donor),el('strong',donor.name));const stats=el('div');stats.append(el('b',fa.format(donor.totalCoins)+' کوین'+(donor.unknownValue?' + ارزش نامعلوم':'')));for(const gift of donor.gifts)stats.append(el('p',`${gift.name} × ${fa.format(gift.count)} · ${fa.format(gift.coins)} کوین${gift.unknownValue?' + ارزش نامعلوم':''}`));row.append(stats);details.append(row);}
  return details;
 }));
}
