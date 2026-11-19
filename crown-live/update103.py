from pathlib import Path
import sys,shutil
r=Path(sys.argv[1])
for name in ['public/math-duel.mjs','public/math-duel-ui.mjs','public/math-duel.html','server.mjs']:
 p=r/name;s=p.read_text().replace('MATH_VERSION=102','MATH_VERSION=103').replace('s.version!==102','s.version!==103').replace('s.version=102','s.version=103').replace('version:102','version:103').replace('v=102','v=103').replace('math102','math103').replace('mathVersion:102','mathVersion:103').replace('mathPanelVersion:102','mathPanelVersion:103');p.write_text(s)
p=r/'public/math-duel-ui.mjs';s=p.read_text();s="import {CountdownAudio} from './countdown-audio.mjs';\n"+s
pos=s.index('function tick()');s=s[:pos]+"const countdownAudio=new CountdownAudio({onBlocked:()=>{if(screen&&!mutedPreview)$('screenAudioUnlock').hidden=false;}});addEventListener('pagehide',()=>countdownAudio.close());\n"+s[pos:]
s=s.replace("const q=Math.max(0,latest.questionRemaining-delta);", "const q=Math.max(0,latest.questionRemaining-delta);countdownAudio.update({key:latest.round+':'+latest.serial,phase:latest.phase,remaining:q,enabled:audioEnabled&&!mutedPreview&&!blockedAudio,volume:screen?(latest.outputVolume??.85):monitorVolume});")
s=s.replace("function setMonitor(enabled){", "function setMonitor(enabled){if(enabled)countdownAudio.unlock();")
s=s.replace("$('screenAudioUnlock').onclick=()=>{", "$('screenAudioUnlock').onclick=()=>{countdownAudio.unlock();$('screenAudioUnlock').hidden=true;")
p.write_text(s)
p=r/'public/quiz-show-view.mjs';s=p.read_text().replace('r.append(letter,text,votes);', 'r.append(letter,votes,text);');p.write_text(s)
p=r/'public/quiz-show.css'
with p.open('a')as f:f.write('''
/* Larger respondent portraits immediately beside the option marker, on the left. */
#showMain #options .show-option{direction:ltr}#showMain #options .voters{flex-shrink:0}#showMain #options .voters .player-avatar{width:32px;height:32px;flex-shrink:0;border:2px solid #fff}html[lang=fa] #showMain #options .option-text{direction:rtl;text-align:right}.screen #broadcast #showMain #options .voters{gap:5px;max-width:226px}.screen #broadcast #showMain #options .voters .player-avatar{width:68px;height:68px;font-size:32px;border:3px solid #fff}.screen #broadcast #showMain #options .show-option{gap:12px;height:96px;min-height:96px;max-height:96px}.screen #broadcast #showMain #options .option-text{min-width:0}
''')
shutil.copyfile(Path(__file__).with_name('countdown-audio103.mjs'),r/'public/countdown-audio.mjs')
print('FINAL_TEN_SECONDS_CLOCK_AND_LEFT_RESPONDENT_PHOTOS_103_READY')
