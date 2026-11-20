from pathlib import Path

def edit(filename, pairs):
    path=Path(filename)
    text=path.read_text()
    for old,new in pairs:
        if text.count(old)!=1:
            raise SystemExit(f'Expected one {old!r} in {filename}')
        text=text.replace(old,new,1)
    path.write_text(text)

edit('public/math-duel.mjs',[
    ("if(['questionBreak','likePortraitSize','giftPortraitSize'].includes(action))", """if(['answerFrameSeconds','winnerFrameSeconds'].includes(action)){
  const seconds=Number(value), maximum=action==='winnerFrameSeconds'?30:60;
  if(value==null||!Number.isInteger(seconds)||seconds<3||seconds>maximum)throw Error('Invalid frame duration');
  s[action]=seconds;
  return true;
 }
 if(['questionBreak','likePortraitSize','giftPortraitSize'].includes(action))"""),
    ('s.finishedAt=now;s.nextRoundAt=now+30000;', 's.finishedAt=now;s.winnerFrameMs=(s.winnerFrameSeconds??15)*1000;s.nextRoundAt=now+30000;'),
    ('duration:Math.max(7000,Math.ceil', 'duration:Math.max((s.answerFrameSeconds??7)*1000,Math.ceil'),
    ('questionBreakRemaining:breakRemaining(s,now),', """questionBreakRemaining:breakRemaining(s,now),answerFrameSeconds:s.answerFrameSeconds??7,winnerFrameSeconds:s.winnerFrameSeconds??15,winnerFrameRemaining:s.phase==='finished'?Math.max(0,s.finishedAt+(s.winnerFrameMs??15000)-now):0,"""),
])
edit('public/math-duel.html',[
    ('<h3 data-t="profilesTab">Profiles</h3>', '''<h3 data-t="profilesTab">Profiles</h3>
<label class="setting-field"><span data-t="answerFrameSeconds">Correct-answer frame duration (seconds)</span><input id="answerFrameSeconds" type="number" min="3" max="60" step="1" value="7"></label>
<label class="setting-field"><span data-t="winnerFrameSeconds">Winner crown celebration duration (seconds)</span><input id="winnerFrameSeconds" type="number" min="3" max="30" step="1" value="15"></label>'''),
    ('quiz-show.css?v=109','quiz-show.css?v=111'),
    ('math-duel-ui.mjs?v=110','math-duel-ui.mjs?v=111'),
])
edit('public/math-duel-ui.mjs',[
    ("'./quiz-show-view.mjs?v=109'","'./quiz-show-view.mjs?v=111'"),
    ("const displaySettings=['questionBreak','likePortraitSize','giftPortraitSize'];", """const displaySettings=['questionBreak','likePortraitSize','giftPortraitSize','answerFrameSeconds','winnerFrameSeconds'];
Object.assign(labels.en,{answerFrameSeconds:'Correct-answer frame duration (seconds)',winnerFrameSeconds:'Winner crown celebration duration (seconds)'});
Object.assign(labels.fa,{answerFrameSeconds:'زمان نمایش قاب پاسخ درست (ثانیه)',winnerFrameSeconds:'زمان جشن تاج برنده (ثانیه)'});"""),
    ("if(latest.liveEnded){$('nextQuestionStatus').textContent='';return;}","""if(latest.liveEnded){$('nextQuestionStatus').textContent='';return;}
 $('showPodium').classList.toggle('frames-expired',latest.winnerFrameRemaining<=performance.now()-received);"""),
])
edit('public/quiz-show-view.mjs',[
    ('export function framePortrait(avatar){','export function framePortrait(avatar,crowned=false){'),
    ('frame.append(flame,avatar);','''frame.append(flame,avatar);
 const metal=document.createElement('span');
 metal.className='portrait-metal';
 metal.setAttribute('aria-hidden','true');
 frame.append(metal);
 if(crowned){
  const crown=document.createElement('span');
  crown.className='champion-crown';
  crown.setAttribute('aria-hidden','true');
  frame.append(crown);
 }'''),
    ('slot.append(celebrating?framePortrait(portrait):portrait,rank,name,score);','slot.append(celebrating?framePortrait(portrait,index===0):portrait,rank,name,score);'),
    ("podium.classList.toggle('winner-celebration',celebrating);","podium.classList.toggle('winner-celebration',celebrating);podium.classList.toggle('frames-expired',!s.winnerFrameRemaining);"),
])
css=Path('public/quiz-show.css')
css.write_text(css.read_text()+Path(__file__).with_name('portrait-styles111.css').read_text())

tests=Path('tests/profile-timing.mjs')
tests.write_text(tests.read_text()+'''
test('profile frame durations are saved independently of the next-question break', () => {
  const state = mathState({}, 1000);
  mathControl(state, 'answerFrameSeconds', 10, 1000);
  mathControl(state, 'winnerFrameSeconds', 6, 1000);
  mathControl(state, 'questionBreak', 4, 1000);
  mathControl(state, 'start', null, 1000);
  mathEvent(state, {type:'comment',userId:'winner',comment:'ABCD'[state.answer - 1]}, 1100);
  mathControl(state, 'finish', null, 1200);
  assert.equal(state.celebration.duration, 10000);
  assert.equal(state.revealUntil, 15200);
  mathTick(state, 15200);
  assert.equal(mathView(state, 15200).winnerFrameRemaining, 6000);
  assert.equal(mathView(state, 21200).winnerFrameRemaining, 0);
  assert.equal(mathView(state, 21200).nextRoundRemaining, 24000);
  assert.throws(() => mathControl(state, 'winnerFrameSeconds', 31, 21200));
});
''')
