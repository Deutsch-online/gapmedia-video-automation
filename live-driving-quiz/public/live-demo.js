const frame=document.getElementById('liveDemoFrame');
const send=(action,data={})=>frame.contentWindow.postMessage({type:'fahrfit-demo-command',action,data},location.origin);
for(const button of document.querySelectorAll('[data-action]'))button.onclick=()=>send(button.dataset.action);
for(const button of document.querySelectorAll('[data-media]'))button.onclick=()=>send('media',{action:button.dataset.media});
for(const button of document.querySelectorAll('[data-answer]'))button.onclick=()=>send('answer',{value:button.dataset.answer});
document.getElementById('demoMediaHeight').oninput=e=>{document.getElementById('demoHeightValue').textContent=e.target.value;send('media',{action:'height',value:Number(e.target.value)});};
document.getElementById('liveDemoPersian').onchange=e=>send('language',{enabled:e.target.checked});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==frame.contentWindow||e.data?.type!=='fahrfit-demo-state')return;const s=e.data;document.getElementById('liveDemoStatus').textContent='سوال '+(s.index+1)+' از '+s.total+' · '+({watching:'نمایش ویدیو',open:'انتظار پاسخ',paused:'متوقف',revealed:'نمایش جواب'}[s.phase]||s.phase)+' · امتیاز '+s.score;});
