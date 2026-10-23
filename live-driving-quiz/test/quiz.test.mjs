import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Quiz,validateQuestions} from '../quiz.mjs';
const bank=JSON.parse(readFileSync(new URL('../data/practice-questions.json',import.meta.url)));
const mapping={A:{id:'11'},B:{id:'22'},C:{id:'33'}};
function setup(index=0){let now=Date.now();const quiz=new Quiz(bank,{now:()=>now});quiz.index=index;quiz.start();return {quiz,advance:n=>{now+=n;},gift:(id,choice='A',extra={})=>({giftId:mapping[choice].id,user:{id:'user1',nickname:'آزمایش'},common:{msgId:id,createTime:String(Math.floor(now/1000))},gift:{type:0},...extra})};}
test('all original questions have three bilingual options and legal references',()=>{assert.ok(validateQuestions(bank).length>=21);assert.equal(bank.find(q=>q.id==='fog').correct.length,2);});
test('one separate ALL gift selects all three answers only on multiple-answer questions',()=>{
 const {quiz,gift}=setup(12);const map={...mapping,ALL:{id:'44'}};
 assert.equal(quiz.gift({...gift('all'),giftId:'44'},map).accepted,true);quiz.reveal();assert.equal(quiz.leaderboard.get('user1').score,1);
 const one=setup();assert.equal(one.quiz.gift({...one.gift('all'),giftId:'44'},map).reason,'all_not_allowed');
});
test('answer keys are hidden until reveal and each round scores only once',()=>{
 const {quiz,gift}=setup();assert.equal('correct' in quiz.snapshot().question,false);
 assert.equal(quiz.gift(gift('one'),mapping).accepted,true);quiz.reveal();quiz.reveal();
 assert.deepEqual(quiz.snapshot().question.correct,['A']);assert.equal(quiz.leaderboard.get('user1').score,1);
});
test('gift streaks count once and extra gifts never buy extra points',()=>{
 const {quiz,gift}=setup();
 assert.equal(quiz.gift(gift('m1','A',{groupId:'g1',repeatEnd:0,gift:{type:1},repeatCount:20}),mapping).reason,'streak_not_finished');
 assert.equal(quiz.gift(gift('m2','A',{groupId:'g1',repeatEnd:1,gift:{type:1},repeatCount:20}),mapping).accepted,true);
 assert.equal(quiz.gift(gift('m3','A',{groupId:'g1',repeatEnd:1,gift:{type:1},repeatCount:20}),mapping).reason,'duplicate_event');
 assert.equal(quiz.gift(gift('m4','A'),mapping).reason,'already_selected');
 assert.equal(quiz.gift(gift('m5','B'),mapping).reason,'one_answer_only');
 quiz.reveal();assert.equal(quiz.leaderboard.get('user1').score,1);
});
test('multiple-answer questions combine distinct gift choices, exact set wins',()=>{
 const {quiz,gift}=setup(4);quiz.gift(gift('a','A'),mapping);quiz.gift(gift('b','B'),mapping);quiz.reveal();assert.equal(quiz.leaderboard.get('user1').score,1);
 const other=setup(4);other.quiz.gift(other.gift('a','A'),mapping);other.quiz.reveal();assert.equal(other.quiz.leaderboard.size,0);
});
test('late events, replay from previous round, unknown gifts and missing timestamps are rejected',()=>{
 const {quiz,gift,advance}=setup();const old=gift('old');quiz.gift(old,mapping);quiz.reveal();quiz.next();advance(31000);quiz.start();
 assert.equal(quiz.gift(old,mapping).reason,'duplicate_event');
 assert.equal(quiz.gift({...old,common:{...old.common,msgId:'late'}},mapping).reason,'late_or_old_event');
 assert.equal(quiz.gift({...gift('unmapped'),giftId:'999'},mapping).reason,'unmapped_gift');
 assert.equal(quiz.gift({...gift('missing'),common:undefined},mapping).reason,'invalid_event');
 advance(31000);assert.equal(quiz.gift(gift('too-late'),mapping).reason,'round_closed');
});
test('a streak started before a new question cannot answer that question',()=>{
 const {quiz,gift,advance}=setup();quiz.gift(gift('a','A',{groupId:'old-group',gift:{type:1},repeatEnd:0}),mapping);
 quiz.reveal();quiz.next();advance(31000);quiz.start();
 assert.equal(quiz.gift(gift('b','A',{groupId:'old-group',gift:{type:1},repeatEnd:1}),mapping).reason,'late_or_old_event');
});
test('default zero group IDs do not block new real gift messages across questions',()=>{
 const {quiz,gift,advance}=setup();assert.equal(quiz.gift(gift('a','A',{groupId:'0'}),mapping).accepted,true);
 quiz.reveal();quiz.next();advance(31000);quiz.start();assert.equal(quiz.gift(gift('b','B',{groupId:'0'}),mapping).accepted,true);
});

test('each question cites an archived official law and new bus scenarios distinguish approaching from stopped',()=>{
 const sources=JSON.parse(readFileSync(new URL('../data/legal-sources.json',import.meta.url)));
 for(const q of bank)assert.ok(sources.some(s=>s.url===q.source&&s.text.length>100&&s.retrieved_at),q.id);
 assert.deepEqual(bank.find(q=>q.id==='bus-approach').correct,['C']);
 assert.deepEqual(bank.find(q=>q.id==='bus-stopped').correct,['A','B']);
});

test('manual reveal works for waiting and paused questions without double scoring',()=>{
 let now=Date.now();const quiz=new Quiz(bank,{now:()=>now});quiz.start();
 for(const choice of bank[0].correct)quiz.submit({id:'manual-'+choice,userId:'viewer',name:'Viewer',choice,time:now});
 quiz.pause();quiz.reveal({manual:true});let s=quiz.snapshot();assert.equal(s.phase,'revealed');assert.deepEqual(s.question.correct,bank[0].correct);assert.equal(s.leaderboard[0].score,1);assert.equal(s.revealReason,'manual');
 quiz.pause();quiz.reveal({manual:true});assert.equal(quiz.snapshot().leaderboard[0].score,1);
 now+=100000;assert.equal(quiz.snapshot().revealReason,'manual');quiz.next();quiz.reveal({manual:true});s=quiz.snapshot();assert.equal(s.phase,'revealed');assert.ok(s.question.correct);assert.equal(s.voters,0);
});
test('natural expiry is distinct from a manual reveal',()=>{
 let now=Date.now();const quiz=new Quiz(bank,{now:()=>now,seconds:10});quiz.start();now+=10001;assert.equal(quiz.snapshot().revealReason,'timer');
});
