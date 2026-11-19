from pathlib import Path
import sys
r=Path(sys.argv[1]);p=r/'public/math-duel.mjs';s=p.read_text().replace('MATH_VERSION=100','MATH_VERSION=101').replace('s.version!==100','s.version!==101').replace('s.version=100','s.version=101').replace('version:100','version:101')
s=s.replace("return lines[index%lines.length];", "return index<lines.length?lines[index]:'';")
s=s.replace("&&now-h.at<3600000", "")
s=s.replace("if(!choices.length&&kind!=='invite')return '';const candidates=choices.length?choices:list.filter(t=>t!==recent.at(-1)?.template);", "if(!choices.length)return '';const candidates=choices;")
s=s.replace("s.phraseHistory=s.phraseHistory.slice(-120);", "")
s=s.replace("if(!text||s.voiceEnabled===false)return;", "if(!text||s.voiceEnabled===false)return;\n const normalized=text.normalize('NFKC').toLowerCase().replace(/\\s+/g,' ').trim();s.spokenHistory??=[];if(s.spokenHistory.includes(normalized))return;")
s=s.replace("if(kind==='question'&&(!s.voice", "if(kind==='question'&&(!s.voice",1)
s=s.replace("{s.voice=item;return;}", "{s.spokenHistory.push(normalized);s.voice=item;return;}",1)
s=s.replace("s.voiceQueue.push(item);", "s.spokenHistory.push(normalized);s.voiceQueue.push(item);",1)
s=s.replace("for(let i=0;i<people.length;i++){const p=people[i];", "s.portraitSeen??={};const fresh=people.filter(p=>s.portraitSeen[p.id]===undefined||now-s.portraitSeen[p.id]>=1800000);for(let i=0;i<fresh.length;i++){const p=fresh[i];s.portraitSeen[p.id]=now;")
s=s.replace("ordinal:i+1,total:people.length,duration:4000", "ordinal:i+1,total:fresh.length,duration:4000")
s=s.replace("now-s.arrivalSeen[person.id]<30000", "now-s.arrivalSeen[person.id]<600000")
p.write_text(s)
for name in ['public/math-duel-ui.mjs','public/math-duel.html','server.mjs']:
 p=r/name;s=p.read_text().replace('v=100','v=101').replace('math100','math101').replace('mathVersion:100','mathVersion:101').replace('mathPanelVersion:100','mathPanelVersion:101');p.write_text(s)
print('NONREPETITION_101_READY')
