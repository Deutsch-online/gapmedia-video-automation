from pathlib import Path
import sys
root=Path(sys.argv[1])
p=root/'public/math-duel.mjs';s=p.read_text().replace('MATH_VERSION=92','MATH_VERSION=93').replace('s.version!==92','s.version!==93').replace('s.version=92','s.version=93').replace('version:92','version:93')
s=s.replace("if(s.version!==93){s.version=93;", "if(s.version!==93){s.version=93;s.arrivalSide??='right';")
s=s.replace("export function mathControl(s,action,value,now=Date.now()){", "export function mathControl(s,action,value,now=Date.now()){if(action==='arrivalSide'){if(!['left','right'].includes(value))throw Error('Invalid arrival side');s.arrivalSide=value;return true;}")
s=s.replace("return {version:93,", "return {version:93,arrivalSide:s.arrivalSide||'right',")
s=s.replace("if(s.phase==='finished'&&s.auto&&now>=Math.max", "if(s.phase==='finished'&&s.auto&&!s.celebration&&!s.celebrationQueue?.length&&now>=Math.max")
p.write_text(s)
p=root/'public/math-duel-ui.mjs';s=p.read_text().replace('v=92','v=93').replace('math92','math93')
s=s.replace("Object.assign(labels.en,{", "Object.assign(labels.en,{arrivalSide:'New viewer bubble position',arrivalLeft:'Left side',arrivalRight:'Right side',",1)
s=s.replace("Object.assign(labels.fa,{", "Object.assign(labels.fa,{arrivalSide:'محل حباب تازه‌وارد',arrivalLeft:'سمت چپ',arrivalRight:'سمت راست',",1)
s=s.replace("function render(s){latest=s;", "function render(s){latest=s;document.body.dataset.arrivalSide=s.arrivalSide||'right';$('arrivalSide').value=s.arrivalSide||'right';")
s=s.replace("$('liveForm').onsubmit=", "$('arrivalSide').onchange=()=>control('arrivalSide',$('arrivalSide').value);$('liveForm').onsubmit=")
p.write_text(s)
p=root/'public/math-duel.html';s=p.read_text().replace('v=92','v=93').replace('<p id="liveStatus"></p>', '<p id="liveStatus"></p><label><span data-t="arrivalSide">New viewer bubble position</span><select id="arrivalSide"><option value="right" data-t="arrivalRight">Right side</option><option value="left" data-t="arrivalLeft">Left side</option></select></label>');p.write_text(s)
p=root/'public/math-duel.css'
with p.open('a')as f:f.write(r'''
/* Newcomer bubbles stay at the chosen screen edge. */
#arrivalBanner{margin-left:auto;margin-right:0}body[data-arrival-side=left] #arrivalBanner{margin-left:0;margin-right:auto}
.screen #broadcast #arrivalBanner{left:auto;right:28px;margin:0}
.screen[data-arrival-side=left] #broadcast #arrivalBanner{left:28px;right:auto;margin:0}
''')
p=root/'server.mjs';s=p.read_text().replace('mathVersion:92','mathVersion:93').replace('mathPanelVersion:92','mathPanelVersion:93').replace('math92','math93');p.write_text(s)
print('ARRIVAL_SIDE_93_READY')
