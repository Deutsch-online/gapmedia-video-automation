from pathlib import Path
import sys
r=Path(sys.argv[1]);p=r/'tests/direct95.mjs';s=p.read_text().replace("send(s,id,value).points,10", "send(s,id,value).points,id==='a'?11:10").replace("id==='a').points,10", "id==='a').points,11").replace("send(s,'en','  ASIA! ').points,10", "send(s,'en','  ASIA! ').points,11").replace("send(s,'direct','Afghanistan').points,10", "send(s,'direct','Afghanistan').points,11").replace("id==='direct').points,10", "id==='direct').points,11").replace("send(s,'option','1').points,10", "send(s,'option','1').points,11");p.write_text(s)
p=r/'tests/timing94.mjs';p.write_text(p.read_text().replace('s.questionDeadline,67500','s.questionDeadline,70000'))
p=r/'tests/show99.mjs';s=p.read_text().replace("s.celebration.person.id,'b'", "s.celebration.others[0].id,'b'").replace("mathTick(s,end+6500);assert.equal(s.phase,'finished')", "mathTick(s,s.revealUntil);assert.equal(s.phase,'finished')").replace('mathTick(s,end+36500)', 'mathTick(s,s.finishedAt+30000)').replace('.score,10)', '.score,11)').replace('.score,20)', '.score,22)');p.write_text(s)
p=r/'tests/math-duel.mjs';s=p.read_text().replace("p.id==='human').points,10)", "p.id==='human').points,11)").replace("p.id==='human').points,11)", "p.id==='human').points,12)")
# The first nine-like check has no like point; only the answer-speed bonus.
s=s.replace("eventId:'9'},1200);assert.equal(s.players.find(p=>p.id==='human').points,12)", "eventId:'9'},1200);assert.equal(s.players.find(p=>p.id==='human').points,11)")
s=s.replace("p.id==='human').points,110)", "p.id==='human').points,111)").replace("p.id==='flag').points,10)", "p.id==='flag').points,11)");p.write_text(s)
print('UPDATED_EXPECTATIONS_FOR_EXPLICIT_SPEED_BONUS_AND_GROUP_SHOWCASE')
