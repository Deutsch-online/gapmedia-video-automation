const frame=document.getElementById('salesPreview'),$=id=>document.getElementById(id);
function send(action,data={}){frame.contentWindow.postMessage({type:'fahrfit-demo-command',action,data},location.origin);}
for(const button of document.querySelectorAll('[data-demo]'))button.addEventListener('click',()=>send(button.dataset.demo));
for(const button of document.querySelectorAll('[data-answer]'))button.addEventListener('click',()=>send('answer',{value:button.dataset.answer}));
$('demoPersian').addEventListener('change',()=>send('language',{enabled:$('demoPersian').checked}));
$('demoInput').addEventListener('change',()=>send('input',{input:$('demoInput').value}));
$('sendDemoAnswer').addEventListener('click',()=>send('answer',{value:$('demoAnswer').value.replace(/[۱۲۳١٢٣]/g,c=>({'۱':'1','۲':'2','۳':'3','١':'1','٢':'2','٣':'3'}[c]))}));
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==frame.contentWindow||e.data?.type!=='fahrfit-demo-state')return;const s=e.data;$('demoStatus').textContent=`سؤال ${s.index+1} از ${s.total} · ${s.phase==='watching'?'نمایش ویدیو':s.phase==='open'?'در انتظار پاسخ':s.phase==='paused'?'متوقف':'نمایش جواب'} · امتیاز آزمایشی: ${s.score}`;document.querySelector('[data-demo=previous]').disabled=!s.hasPrevious;});
