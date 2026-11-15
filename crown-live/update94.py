from pathlib import Path
import sys
root=Path(sys.argv[1])
p=root/'public/math-duel.mjs';s=p.read_text().replace('MATH_VERSION=93','MATH_VERSION=94').replace('s.version!==93','s.version!==94').replace('s.version=93','s.version=94').replace('version:93','version:94')
s=s.replace("if(s.version!==94){s.version=94;", "if(s.version!==94){s.version=94;if(!s.questionDuration||s.questionDuration<30)s.questionDuration=30;")
s=s.replace("s.questionSeconds=s.questionDuration||(q.enOptions.length?20:12)", "s.questionSeconds=s.questionDuration||30")
s=s.replace('questionSeconds:10','questionSeconds:30').replace('questionRemaining:10000','questionRemaining:30000')
p.write_text(s)
p=root/'public/math-duel-ui.mjs';s=p.read_text().replace('v=93','v=94').replace('math93','math94').replace('Automatic (12 / 20 seconds)','Automatic (30 seconds)').replace('خودکار (۱۲ / ۲۰ ثانیه)','خودکار (۳۰ ثانیه)');p.write_text(s)
p=root/'public/math-duel.html';p.write_text(p.read_text().replace('v=93','v=94'))
p=root/'server.mjs';p.write_text(p.read_text().replace('mathVersion:93','mathVersion:94').replace('mathPanelVersion:93','mathPanelVersion:94').replace('math93','math94'))
print('QUESTION_TIME_94_READY default_seconds=30')
