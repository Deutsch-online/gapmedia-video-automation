from pathlib import Path
import sys
root=Path(sys.argv[1])
p=root/'public/math-duel.mjs';s=p.read_text().replace('MATH_VERSION=95','MATH_VERSION=96').replace('s.version!==95','s.version!==96').replace('s.version=95','s.version=96').replace('version:95','version:96')
s=s.replace("if(s.version!==96){s.version=96;if(!s.questionDuration||s.questionDuration<30)s.questionDuration=30;", "if(s.version!==96){const previousVersion=s.version||0;s.version=96;if(previousVersion<94&&(!s.questionDuration||s.questionDuration<30))s.questionDuration=30;s.arrivalSize??=100;s.arrivalMotion??='up';")
s=s.replace("export function mathControl(s,action,value,now=Date.now()){", "export function mathControl(s,action,value,now=Date.now()){if(action==='arrivalSize'){const n=Number(value);if(!Number.isInteger(n)||n<60||n>180||n%10)throw Error('Bubble size must be 60–180% in steps of 10');s.arrivalSize=n;return true;}if(action==='arrivalMotion'){if(!['up','left','right','none'].includes(value))throw Error('Invalid bubble motion');s.arrivalMotion=value;return true;}")
s=s.replace("return {version:96,", "return {version:96,arrivalSize:s.arrivalSize??100,arrivalMotion:s.arrivalMotion||'up',")
p.write_text(s)
p=root/'public/math-duel-ui.mjs';s=p.read_text().replace('v=95','v=96').replace('math95','math96')
s=s.replace("Object.assign(labels.en,{", "Object.assign(labels.en,{arrivalSize:'New viewer bubble size',arrivalMotion:'Bubble movement',motionUp:'Upward',motionLeft:'Up toward the left',motionRight:'Up toward the right',motionNone:'No movement',",1)
s=s.replace("Object.assign(labels.fa,{", "Object.assign(labels.fa,{arrivalSize:'اندازهٔ حباب تازه‌وارد',arrivalMotion:'حرکت حباب',motionUp:'رو به بالا',motionLeft:'رو به بالا و چپ',motionRight:'رو به بالا و راست',motionNone:'بدون حرکت',",1)
s=s.replace("function render(s){latest=s;", "function render(s){latest=s;document.body.dataset.arrivalMotion=s.arrivalMotion||'up';$('arrivalBanner').style.setProperty('--bubble-scale',String((s.arrivalSize??100)/100));if(document.activeElement!==$('arrivalSize'))$('arrivalSize').value=String(s.arrivalSize??100);$('arrivalSizeValue').textContent=String(s.arrivalSize??100)+'%';$('arrivalMotion').value=s.arrivalMotion||'up';")
s=s.replace("$('arrivalSide').onchange=", "$('arrivalSize').oninput=()=>{$('arrivalSizeValue').textContent=$('arrivalSize').value+'%';$('arrivalBanner').style.setProperty('--bubble-scale',String(Number($('arrivalSize').value)/100));};$('arrivalSize').onchange=()=>control('arrivalSize',Number($('arrivalSize').value));$('arrivalMotion').onchange=()=>control('arrivalMotion',$('arrivalMotion').value);$('arrivalSide').onchange=")
p.write_text(s)
p=root/'public/math-duel.html';s=p.read_text().replace('v=95','v=96').replace('<p id="liveStatus"></p>', '<p id="liveStatus"></p><label><span data-t="arrivalSize">New viewer bubble size</span><input id="arrivalSize" type="range" min="60" max="180" step="10" value="100"><output id="arrivalSizeValue" for="arrivalSize">100%</output></label><label><span data-t="arrivalMotion">Bubble movement</span><select id="arrivalMotion"><option value="up" data-t="motionUp">Upward</option><option value="left" data-t="motionLeft">Up toward the left</option><option value="right" data-t="motionRight">Up toward the right</option><option value="none" data-t="motionNone">No movement</option></select></label>');p.write_text(s)
p=root/'public/math-duel.css'
with p.open('a')as f:f.write(r'''
/* Saved newcomer size and travel direction are independent of its resting edge. */
#arrivalBanner{--bubble-scale:1;--arrival-from-x:0px;width:calc(150px * var(--bubble-scale))}
#arrivalBanner .arrival-portrait{width:calc(72px * var(--bubble-scale));height:calc(72px * var(--bubble-scale))}
#arrivalBanner .arrival-name{font-size:calc(15px * var(--bubble-scale))}#arrivalBanner .arrival-time{font-size:calc(12px * var(--bubble-scale))}
body[data-arrival-motion=left] #arrivalBanner{--arrival-from-x:360px}body[data-arrival-motion=right] #arrivalBanner{--arrival-from-x:-360px}body[data-arrival-motion=none] #arrivalBanner{animation:none!important}
@keyframes arrival-rise{from{transform:translate(var(--arrival-from-x,0px),650px);opacity:0}to{transform:translate(0,0);opacity:1}}
.screen #broadcast #arrivalBanner{width:calc(220px * var(--bubble-scale));height:calc(178px * var(--bubble-scale));max-height:calc(178px * var(--bubble-scale));padding:calc(4px * var(--bubble-scale));gap:calc(2px * var(--bubble-scale))}
.screen #broadcast #arrivalBanner h2{font-size:calc(19px * var(--bubble-scale))}
.screen #broadcast #arrivalBanner .arrival-portrait{width:calc(100px * var(--bubble-scale));height:calc(100px * var(--bubble-scale));font-size:calc(44px * var(--bubble-scale));border-width:calc(4px * var(--bubble-scale))}
.screen #broadcast #arrivalBanner .arrival-name{width:100%;font-size:calc(23px * var(--bubble-scale))}
.screen #broadcast #arrivalBanner .arrival-time{font-size:calc(16px * var(--bubble-scale))}
''')
p=root/'server.mjs';p.write_text(p.read_text().replace('mathVersion:95','mathVersion:96').replace('mathPanelVersion:95','mathPanelVersion:96').replace('math95','math96'))
print('BUBBLE_SETTINGS_96_READY')
p=root/'public/math-duel.mjs';s=p.read_text().replace(' To add your flag, comment your country name or code.','').replace(' برای پرچم، نام یا کد کشورت را کامنت کن.','').replace(' برای پاسخ، شمارهٔ گزینه را بنویس.',' برای پاسخ، شمارهٔ گزینه یا خود جواب را بنویس.');p.write_text(s)
