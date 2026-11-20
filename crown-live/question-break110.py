from pathlib import Path

def edit(file, replacements):
    path=Path(file)
    source=path.read_text()
    for old,new in replacements:
        if source.count(old)!=1:
            raise SystemExit(f'Expected one match in {file}: {old!r}')
        source=source.replace(old,new,1)
    path.write_text(source)

edit('public/math-duel.mjs',[
    ("action==='questionBreak'?[0,60]", "action==='questionBreak'?[1,60]"),
    ("s.revealUntil=Math.max(now+6500,awards)+(s.questionBreak??2)*1000;", "s.revealBreakMs=(s.questionBreak||2)*1000;s.revealBreakAnnounced=false;s.revealUntil=Math.max(now+6500,awards)+s.revealBreakMs;"),
    ("if(s.phase==='reveal'){if(now>=s.revealUntil", "if(s.phase==='reveal'){if(!s.revealBreakAnnounced&&breakRemaining(s,now)!==null){s.revealBreakAnnounced=true;changed=true;}if(now>=s.revealUntil"),
    ("export function mathView(s,now=Date.now()){", """function breakRemaining(s,now){
 if(s.phase!=='reveal'||s.endRoundAfterReveal||s.celebration||s.celebrationQueue?.length)return null;
 const remaining=s.revealUntil-now;
 return remaining<=(s.revealBreakMs??((s.questionBreak||2)*1000))?Math.max(0,remaining):null;
}
export function mathView(s,now=Date.now()){"""),
    ("questionBreak:s.questionBreak??2,", """questionBreak:s.questionBreak||2,questionBreakRemaining:breakRemaining(s,now),"""),
])
edit('public/math-duel-ui.mjs',[
    ("""const next=$('nextQuestionStatus');
 next.textContent=latest.phase==='reveal'&&!latest.endRoundAfterReveal&&latest.revealRemaining>0
  ?t('nextQuestion')+' '+Math.ceil(Math.max(0,latest.revealRemaining-performance.now()+received)/1000)+' '+t('seconds'):'';""",
     """const next=$('nextQuestionStatus');
 const breakRemaining=latest.questionBreakRemaining;
 const breakSeconds=breakRemaining>0?Math.max(1,Math.ceil((breakRemaining-performance.now()+received)/1000)):null;
 next.textContent=breakSeconds?t('nextQuestion')+' '+breakSeconds+' '+t('seconds'):'';"""),
    ("latest.phase==='reveal'?'0':t(latest.phase)","latest.phase==='reveal'?(breakSeconds??'—'):t(latest.phase)"),
])
edit('public/math-duel.html',[
    ('math-duel-ui.mjs?v=109','math-duel-ui.mjs?v=110'),
    ('id="questionBreak" type="number" min="0"','id="questionBreak" type="number" min="1"'),
])
edit('tests/profile-timing.mjs',[
    ("  assert.equal(state.revealUntil, endsAt + 5000);","  assert.equal(state.revealUntil, endsAt + 5000);\n  assert.equal(mathView(state, endsAt - 1).questionBreakRemaining, null);"),
    ("  mathTick(state, endsAt);\n  assert.equal(state.phase, 'reveal');","  mathTick(state, endsAt);\n  assert.equal(state.phase, 'reveal');\n  assert.equal(mathView(state, endsAt).questionBreakRemaining, 5000);"),
    ("  assert.equal(state.serial, 1);\n  mathTick(state, endsAt + 5000);","  assert.equal(state.serial, 1);\n  assert.equal(mathView(state, endsAt + 4999).questionBreakRemaining, 1);\n  mathTick(state, endsAt + 5000);"),
])
