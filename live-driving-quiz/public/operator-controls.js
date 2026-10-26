const demo=new URLSearchParams(location.search).get('demo')==='sales';
let token=demo?'':decodeURIComponent(location.hash.slice(1));
if(token&&!/^[A-Za-z0-9_-]{20,128}$/.test(token))token='';
// Retain only in this Browser-source session so Refresh keeps owner controls.
// Sales/demo frames never read or receive a credential.
if(!demo)try{if(token)sessionStorage.setItem('fahrfit-screen-token',token);else token=sessionStorage.getItem('fahrfit-screen-token')||'';}catch{}
if(!demo&&location.hash)history.replaceState(null,'',location.pathname+location.search);
const bar=document.createElement('nav');bar.className='operator-controls';bar.setAttribute('aria-label','Fragensteuerung für LIVE-Moderator');
const status=document.createElement('span');status.className='operator-status';status.setAttribute('role','status');
const buttons=new Map();let busy=false;
for(const [action,label] of [['start','▶ Start'],['previous','← Zurück'],['repeat','↻ Wiederholen'],['pause','Ⅱ Pause'],['next','Weiter →']]){
 const button=document.createElement('button');button.type='button';button.dataset.operator=action;button.textContent=label;buttons.set(action,button);bar.append(button);
 button.addEventListener('click',async()=>{
  if(busy)return;
  if(demo){document.dispatchEvent(new CustomEvent('quiz-demo-command',{detail:{action:action==='start'?'resume':action}}));return;}
  busy=true;for(const b of buttons.values())b.disabled=true;
  try{const r=await fetch('/api/admin/'+action,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'});const result=await r.json();if(!r.ok)throw Error(result.error||'Aktion fehlgeschlagen');status.textContent='✓';}
  catch(error){status.textContent=error.message;}
  finally{busy=false;for(const b of buttons.values())b.disabled=false;}
 });
}
bar.append(status);bar.hidden=!demo&&!token;document.getElementById('show').append(bar);document.getElementById('show').classList.toggle('has-operator-controls',demo||Boolean(token));
export function renderOperator(state){if(!busy)buttons.get('previous').disabled=!state.navigation?.hasPrevious;}
