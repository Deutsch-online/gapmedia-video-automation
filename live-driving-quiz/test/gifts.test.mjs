import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Quiz} from '../quiz.mjs';
import {presetGifts,configuredGift,observeGift,profileAvatar,safeAvatarURL} from '../gifts.mjs';
const bank=JSON.parse(readFileSync(new URL('../data/practice-questions.json',import.meta.url)));
const avatar='https://p16-sign.tiktokcdn.com/tos-avatar/demo.png?expires=123';
test('owner Rose/TikTok/GG preset uses distinct numeric IDs and remains configured after reconnect metadata',()=>{
 const mapping=presetGifts('easydeutsches');assert.deepEqual(['A','B','C'].map(k=>mapping[k].id),['5655','5269','6064']);
 const seen=observeGift(mapping.A,{id:'5655',name:'Rose',coins:1,source:'live-event'});assert.equal(configuredGift(seen,'easydeutsches'),true);assert.equal(configuredGift(seen,'other_account'),false);
});
test('each actual gift code selects its option with its sender avatar; repeated events do not duplicate faces',()=>{
 const now=Date.now(),quiz=new Quiz(bank,{now:()=>now}),mapping=presetGifts('easydeutsches');quiz.start();
 for(const [i,key] of ['A','B','C'].entries()){
  const event={giftId:mapping[key].id,user:{id:'person'+i,nickname:'شخص '+key,avatarThumb:{urlList:[avatar]}},common:{msgId:'gift'+i,createTime:String(Math.floor(now/1000))},gift:{type:0}};
  assert.equal(quiz.gift(event,mapping).accepted,true);assert.equal(quiz.gift(event,mapping).reason,'duplicate_event');
  const person=quiz.snapshot().participants[key][0];assert.equal(person.avatar,avatar);assert.equal(person.name,'شخص '+key);assert.ok(person.key);assert.equal(person.userId,undefined);assert.equal(quiz.snapshot().counts[key],1);
 }
 quiz.reveal();quiz.next();assert.deepEqual(quiz.snapshot().participants,{A:[],B:[],C:[]});
});
test('one viewer can select multiple answers with different gifts and appears once per selected option',()=>{
 const now=Date.now(),quiz=new Quiz(bank,{now:()=>now});quiz.index=4;quiz.start();const mapping=presetGifts('easydeutsches');
 for(const [i,key] of ['A','B','A'].entries())quiz.gift({giftId:mapping[key].id,user:{userId:'one',nickname:'یک نفر',profilePicture:{urlList:[avatar]}},common:{msgId:String(i+1),createTime:String(Math.floor(now/1000))}},mapping);
 const s=quiz.snapshot();assert.equal(s.voters,1);assert.equal(s.participants.A.length,1);assert.equal(s.participants.B.length,1);assert.equal(s.participants.A[0].key,s.participants.B[0].key);
});
test('avatar extraction supports current and older events and rejects off-site or executable URLs',()=>{
 assert.equal(profileAvatar({user:{profilePicture:{urlList:[avatar]}}}),avatar);assert.equal(profileAvatar({profilePictureUrl:avatar}),avatar);
 for(const url of ['javascript:alert(1)','http://p16-sign.tiktokcdn.com/a','https://tiktokcdn.com.attacker.test/a','https://localhost/a','https://a:b@p16-sign.tiktokcdn.com/a'])assert.equal(safeAvatarURL(url),null);
});
test('avatar strip keeps six recent responders per option while the total remains accurate',()=>{
 const now=Date.now(),quiz=new Quiz(bank,{now:()=>now});quiz.start();for(let i=0;i<10;i++)quiz.submit({id:String(i),userId:'person'+i,name:'شخص '+i,choice:'A',time:now,avatar});
 const s=quiz.snapshot();assert.equal(s.counts.A,10);assert.equal(s.participants.A.length,6);assert.equal(s.participants.A[0].name,'شخص 9');
});

test('comment answers accept exact Latin/Persian/Arabic digits, retain portrait and reject duplicate or unrelated chat',()=>{
 const now=Date.now(),quiz=new Quiz(bank,{now:()=>now});quiz.start();
 for(const [i,comment] of ['1','۲','٣'].entries()){
  const event={comment,user:{id:'comment-user'+i,nickname:'نظر',avatarThumb:{urlList:[avatar]}},common:{msgId:'comment'+i,createTime:now}};
  assert.equal(quiz.comment(event).accepted,true);assert.equal(quiz.comment(event).reason,'duplicate_event');assert.equal(quiz.snapshot().participants['ABC'[i]][0].avatar,avatar);
 }
 assert.equal(quiz.comment({comment:'hello'}).reason,'irrelevant_comment');quiz.pause();assert.equal(quiz.comment({comment:'1',user:{id:'late'},common:{msgId:'late',createTime:now}}).accepted,false);
});

test('installed v3 protobuf chat content and gifts pass the actual schema instead of legacy-only chat names',async()=>{
 const {WebcastChatMessage,WebcastGiftMessage}=await import('tiktok-live-proto/v3');
 const now=Date.now(),quiz=new Quiz(bank,{now:()=>now});quiz.start();
 const comment=Object.assign(WebcastChatMessage.decode(new Uint8Array()),{content:'2',user:{id:'123',displayId:'real_schema',avatarThumb:{urlList:[avatar]}},common:{msgId:'protobuf-chat',createTime:String(Math.floor(now/1000))}});
 assert.equal(comment.comment,undefined);assert.equal(quiz.comment(comment).accepted,true);assert.equal(quiz.snapshot().participants.B[0].name,'real_schema');
 const gift=Object.assign(WebcastGiftMessage.decode(new Uint8Array()),{giftId:'5655',repeatEnd:0,repeatCount:1,groupId:'7',user:{id:'124',nickname:'gift user'},gift:{id:'5655',type:1,combo:true,diamondCount:1,name:'Rose'},common:{msgId:'protobuf-gift',createTime:String(Math.floor(now/1000))}});
 assert.equal(quiz.gift(gift,presetGifts('easydeutsches')).reason,'streak_not_finished');gift.repeatEnd=1;assert.equal(quiz.gift(gift,presetGifts('easydeutsches')).accepted,true);
});

test('winner portraits stay hidden until reveal and require the exact complete answer set',()=>{
 let now=Date.now();const quiz=new Quiz(bank,{now:()=>now});quiz.index=bank.findIndex(q=>q.correct.length>1&&q.correct.length<3);quiz.start();
 const correct=quiz.questions[quiz.index].correct;
 for(let i=0;i<8;i++)for(const choice of correct)quiz.submit({id:'winner'+i+choice,userId:'winner'+i,name:'winner '+i,choice,time:now,avatar});
 quiz.submit({id:'partial',userId:'partial',name:'partial',choice:correct[0],time:now});
 for(const choice of 'ABC')quiz.submit({id:'extra'+choice,userId:'extra',name:'extra',choice,time:now});
 assert.equal(quiz.snapshot().winnerCount,0);assert.deepEqual(quiz.snapshot().winners,[]);
 quiz.reveal();const first=quiz.snapshot();assert.equal(first.winnerCount,8);assert.equal(first.winners.length,6);assert.equal(first.winners[0].avatar,avatar);assert.equal(first.winners[0].userId,undefined);
 now+=2200;const second=quiz.snapshot();assert.equal(second.winners.length,2);assert.equal(second.winners[0].name,'winner 6');
 quiz.next();assert.equal(quiz.snapshot().winnerCount,0);assert.deepEqual(quiz.snapshot().winners,[]);
});

test('last correct responder remains visible across questions until another correct group replaces it',()=>{
 const now=Date.now(),quiz=new Quiz(bank,{now:()=>now});quiz.start();const original=quiz.questions[0].id;
 for(const choice of quiz.questions[0].correct)quiz.submit({id:'first'+choice,userId:'first',name:'First winner',choice,time:now,avatar});
 quiz.reveal();assert.equal(quiz.snapshot().celebration.count,1);const key=quiz.snapshot().celebration.people[0].key;
 quiz.next();quiz.start();let s=quiz.snapshot();assert.equal(s.winnerCount,0);assert.equal(s.celebration.questionId,original);assert.equal(s.celebration.people[0].key,key);assert.equal(s.celebration.people[0].avatar,avatar);assert.equal(s.question.correct,undefined);
 quiz.reveal();assert.equal(quiz.snapshot().celebration.people[0].key,key,'a round with no correct responses does not erase the prior winner');
 quiz.next();quiz.start();for(const choice of quiz.questions[quiz.index].correct)quiz.submit({id:'new'+choice,userId:'new',name:'New winner',choice,time:now});quiz.reveal();
 s=quiz.snapshot();assert.equal(s.celebration.people[0].name,'New winner');assert.notEqual(s.celebration.people[0].key,key);assert.equal(s.celebration.questionId,s.question.id);
});

test('combined comment digits register all valid options atomically, independent of order and with one portrait per option',()=>{
 const now=Date.now();
 for(const [text,expected] of [['12',['A','B']],['123',['A','B','C']],['13',['A','C']],['14',['A']],['32',['B','C']],['23',['B','C']],['جواب ۲، ۳',['B','C']],['١٣',['A','C']],['112233',['A','B','C']]]){
  const quiz=new Quiz(bank,{now:()=>now});quiz.start();const e={content:text,user:{id:'combo',nickname:'Combination',avatarThumb:{urlList:[avatar]}},common:{msgId:'combined',createTime:now}};
  assert.equal(quiz.comment(e).accepted,true,text);assert.equal(quiz.snapshot().voters,1);assert.equal(quiz.comment(e).reason,'duplicate_event');
  assert.deepEqual([...quiz.answers.get('combo').choices].sort(),expected,text);
  for(const k of 'ABC')assert.equal(quiz.snapshot().participants[k].length,expected.includes(k)?1:0,text);
 }
});
test('combined comments need the exact answer set to win and retain closed-round and stale-event protections',()=>{
 const now=Date.now(),single=bank.find(q=>q.correct.length===1),quiz=new Quiz([single],{now:()=>now});quiz.start();
 const e={content:'123',user:{id:'all'},common:{msgId:'all',createTime:now}};
 assert.equal(quiz.comment(e).accepted,true);quiz.reveal();assert.equal(quiz.snapshot().winnerCount,0,'selecting all options never wins a single-answer question');
 quiz.next();quiz.start();assert.equal(quiz.comment({...e,common:{msgId:'old',createTime:now-1000000}}).reason,'late_or_old_event');
 quiz.pause();assert.equal(quiz.comment({...e,common:{msgId:'paused',createTime:now}}).reason,'round_closed');assert.equal(quiz.comment({content:'456'}).reason,'irrelevant_comment');
});

test('a previous winner is retired when answering again and wrong answers never keep the old badge',()=>{
 const now=Date.now(),quiz=new Quiz(bank,{now:()=>now});quiz.start();
 for(const userId of ['returning','absent'])for(const choice of quiz.questions[0].correct)quiz.submit({id:userId+choice,userId,name:userId,choice,time:now});
 quiz.reveal();assert.equal(quiz.snapshot().celebration.count,2);assert.equal(quiz.snapshot().celebration.people[0].userId,undefined);
 quiz.next();quiz.start();
 const wrong='ABC'.split('').find(k=>!quiz.questions[quiz.index].correct.includes(k));
 assert.ok(wrong);
 assert.equal(quiz.submit({id:'new-wrong',userId:'returning',name:'returning',choice:wrong,time:now}).accepted,true);
 let s=quiz.snapshot();assert.deepEqual(s.celebration.people.map(p=>p.name),['absent']);assert.equal(s.question.correct,undefined);
 quiz.reveal();s=quiz.snapshot();assert.equal(s.winnerCount,0);assert.deepEqual(s.celebration.people.map(p=>p.name),['absent']);
 quiz.next();quiz.start();for(const choice of quiz.questions[quiz.index].correct)quiz.submit({id:'correct-again'+choice,userId:'returning',name:'returning',choice,time:now});
 quiz.reveal();s=quiz.snapshot();assert.deepEqual(s.celebration.people.map(p=>p.name),['returning']);assert.equal(s.celebration.roundId,s.roundId);assert.equal(s.celebration.people[0].userId,undefined);
});

test('retiring an old badge does not reveal whether a partial new answer is correct',()=>{
 const now=Date.now(),quiz=new Quiz(bank,{now:()=>now});quiz.start();
 for(const choice of quiz.questions[0].correct)quiz.submit({id:'old'+choice,userId:'same',name:'same',choice,time:now});quiz.reveal();
 quiz.next();quiz.start();quiz.submit({id:'late',userId:'same',name:'same',choice:'A',time:now-10000});assert.equal(quiz.snapshot().celebration.count,1);
 quiz.submit({id:'fresh',userId:'same',name:'same',choice:quiz.questions[quiz.index].correct[0],time:now});assert.equal(quiz.snapshot().celebration,null);assert.equal(quiz.snapshot().winnerCount,0);
});
