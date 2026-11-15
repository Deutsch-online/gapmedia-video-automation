from pathlib import Path
import sys
root=Path(sys.argv[1])
p=root/'public/math-duel.mjs';s=p.read_text().replace('MATH_VERSION=97','MATH_VERSION=98').replace('s.version!==97','s.version!==98').replace('s.version=97','s.version=98').replace('version:97','version:98')
s=s.replace("s.version=98;", "s.version=98;s.demoEnabled=false;if(s.celebration?.kind!=='correct'||!isRealQuizPerson(s.celebration?.person))s.celebration=null;s.celebrationQueue=(s.celebrationQueue||[]).filter(e=>e.kind==='correct'&&isRealQuizPerson(e.person));")
s=s.replace("const person=s.viewerProfiles[id]={...prior,id,name,avatar,", "const person=s.viewerProfiles[id]={...prior,id,name,avatar,isTest:d.isTest===true,")
s=s.replace("Object.assign(p,{name,avatar,uniqueId:person.uniqueId,", "Object.assign(p,{name,avatar,isTest:person.isTest,uniqueId:person.uniqueId,")
s=s.replace("if(s.phase==='finished'&&s.auto&&!s.celebration", "if(s.phase==='finished'&&s.auto&&s.players.some(isRealQuizPerson)&&!s.celebration")
s=s.replace("if(action==='reset'){s.celebration=null;", "if(action==='reset'){s.roundSummary=null;s.celebration=null;")
s=s.replace("if(s.phase==='finished'){s.round++;", "if(s.phase==='finished'){s.roundSummary=null;s.round++;")
s=s.replace("filter(p=>!p.demo&&p.answer===s.answer)", "filter(p=>isRealQuizPerson(p)&&p.answer===s.answer)")
s=s.replace("gained:10,points:s.players", "gained:10,questionEn:s.current?.en||s.question,questionFa:s.current?.fa||s.question,answerEn:s.current?.enOptions?.[s.answer-1]||String(s.answer),answerFa:s.current?.faOptions?.[s.answer-1]||String(s.answer),points:s.players")
s=s.replace('duration:2500','duration:4000')
a=s.index('function revealWinners(');b=s.index('\n',a)
s=s[:a]+"function isRealQuizPerson(p){return !!p&&!p.demo&&!p.isTest&&!/^(?:demo:|manual:)/.test(String(p.id||''));}\nfunction revealWinners(s,now){const ranked=[...(s.players||[])].filter(p=>isRealQuizPerson(p)&&(p.answerPoints??p.correct*10)>0).sort((a,b)=>(b.answerPoints??b.correct*10)-(a.answerPoints??a.correct*10));const score=ranked[0]?.answerPoints??((ranked[0]?.correct||0)*10);s.roundSummary={round:s.round,winners:ranked.filter(p=>(p.answerPoints??p.correct*10)===score).map(p=>({id:p.id,name:p.name,points:p.points}))};s.resultUntil=Math.max(now,s.celebration?.endsAt||now)+(s.celebrationQueue||[]).reduce((n,x)=>n+x.duration,0);}"+s[b:]
s=s.replace("return {version:98,", "return {version:98,roundSummary:s.roundSummary||null,")
p.write_text(s)
p=root/'public/math-duel-ui.mjs';s=p.read_text().replace('v=97','v=98').replace('math97','math98')
s=s.replace("Object.assign(labels.en,{", "Object.assign(labels.en,{liveOnlyHelp:'Live output shows real audience activity only. Practice samples stay in the control panel.',hostLiveHelp:'Be present and interact with viewers in real time. An automated overlay alone does not guarantee LIVE visibility or monetization.',roundResults:'Round results',noLiveAnswers:'No real answers in this round',liveEmpty:'Waiting for live audience activity',",1)
s=s.replace("Object.assign(labels.fa,{", "Object.assign(labels.fa,{liveOnlyHelp:'خروجی لایو فقط فعالیت کاربران واقعی را نشان می‌دهد؛ نمونه‌های تمرینی فقط در پنل هستند.',hostLiveHelp:'در لایو حضور داشته باشید و زنده با کاربران صحبت کنید؛ خروجی خودکار به‌تنهایی تضمین نمایش یا درآمدزایی نیست.',roundResults:'نتیجهٔ دور',noLiveAnswers:'در این دور پاسخ واقعی ثبت نشد',liveEmpty:'منتظر فعالیت واقعی کاربران',",1)
s=s.replace("demo:'Demo players when no real opponent is active'", "demo:'Practice players · control panel only'").replace("demo:'بازیکنان دمو هنگام نبود رقیب واقعی'", "demo:'بازیکنان تمرینی · فقط در پنل'")
helper=r'''
function realLivePerson(p){return !!p&&!p.demo&&!p.isTest&&!/^(?:demo:|manual:)/.test(String(p.id||''));}
function liveOnlySnapshot(s){const players=(s.players||[]).filter(realLivePerson),choices=(s.choices||[]).filter(realLivePerson);return{...s,players,choices,responses:(s.responses||[]).filter(realLivePerson),waiting:(s.waiting||[]).filter(realLivePerson),arrival:realLivePerson(s.arrival?.person)?s.arrival:null,spotlight:realLivePerson(s.spotlight?.person)?s.spotlight:null,celebration:s.celebration?.kind==='correct'&&realLivePerson(s.celebration.person)?s.celebration:null,community:{likers:(s.community?.likers||[]).filter(realLivePerson),supporters:(s.community?.supporters||[]).filter(realLivePerson)},choiceCounts:[1,2,3,4].map(n=>choices.filter(p=>p.answer===n).length),totalPoints:players.reduce((n,p)=>n+(p.points||0),0)};}
function renderRoundSummary(s){const root=$('roundSummary');root.hidden=s.phase!=='finished';if(root.hidden){root.textContent='';return;}const winners=s.roundSummary?.winners||[];root.textContent=winners.length?t('roundResults')+' · '+winners.map(p=>p.name+' · '+fmt(p.points)).join(' / '):t('noLiveAnswers');}
'''
pos=s.index('\nfunction leaderRow');s=s[:pos]+helper+s[pos:]
s=s.replace("function render(s){latest=s;", "function render(s){if(screen)s=liveOnlySnapshot(s);latest=s;renderRoundSummary(s);")
s=s.replace("function renderCelebration(event){const root=", "function renderCelebration(event){if(event?.kind!=='correct'||!realLivePerson(event?.person))event=null;const root=")
s=s.replace("root.append(heading,portrait,name,points,order);", "const context=document.createElement('p');context.className='celebration-context';context.textContent=(fa?'سؤال ':'Question ')+fmt(event.serial)+' · '+(fa?event.answerFa:event.answerEn);root.append(heading,context,portrait,name,points,order);")
s=s.replace("fa?'＋ فالو در تیک‌تاک':'＋ Follow on TikTok'", "fa?'＋ فالو · اختیاری':'＋ Follow · optional'")
p.write_text(s)
p=root/'public/math-duel.html';s=p.read_text().replace('v=97','v=98').replace('<div id="leader"></div>', '<div id="leader"></div><p id="roundSummary" hidden role="status"></p>').replace('<p id="liveStatus"></p>', '<p id="liveStatus"></p><p class="setting-note" data-t="liveOnlyHelp"></p><p class="setting-note" data-t="hostLiveHelp"></p><a href="https://www.tiktok.com/live/creators/en-US/rules_and_guidance/live_monetization_guidelines" target="_blank" rel="noopener noreferrer">TikTok LIVE Monetization Guidelines</a>');p.write_text(s)
p=root/'public/math-duel.css'
with p.open('a')as f:f.write(r'''
#roundSummary{font-size:16px;line-height:1.35;color:#c6fbe2;padding:8px;border-top:1px solid #31536c}#celebrationCard .celebration-context{font-size:17px;margin:0 0 8px;color:#e4ecfa}.screen #broadcast #celebrationCard .celebration-context{font-size:26px;line-height:1.2;margin:0 0 5px}.screen #broadcast #celebrationCard .celebration-portrait{width:260px;height:260px}.screen #broadcast #roundSummary{font-size:24px;padding:7px}
''')
p=root/'server.mjs';p.write_text(p.read_text().replace('mathVersion:97','mathVersion:98').replace('mathPanelVersion:97','mathPanelVersion:98').replace('math97','math98'))
p=root/'tests/math-duel.mjs'
if p.exists():p.write_text(p.read_text().replace("const s=mathState({},0);mathControl(s,'start'", "const s=mathState({},0);s.demoEnabled=true;mathControl(s,'start'"))
print('AUTHENTIC_LIVE_98_READY')

p=root/'public/math-duel.mjs';s=p.read_text().replace('function speak(s,text,kind,now){','function speak(s,text,kind,now,isTest=false){').replace("text,kind,language:s.language||'en'", "text,kind,isTest,language:s.language||'en'").replace("'welcome',now);", "'welcome',now,d.isTest===true);").replace("'thanks',now);return true;", "'thanks',now,d.isTest===true);return true;");p.write_text(s)
p=root/'public/math-duel-ui.mjs';s=p.read_text().replace("return{...s,players,choices,", "return{...s,voice:s.voice?.isTest?null:s.voice,players,choices,").replace("root.append(h);for(const p of list)", "root.append(h);if(!list.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=t('liveEmpty');root.append(empty);}for(const p of list)");p.write_text(s)
