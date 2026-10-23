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
 assert.equal(quiz.comment({comment:'hello 1'}).reason,'irrelevant_comment');quiz.pause();assert.equal(quiz.comment({comment:'1',user:{id:'late'},common:{msgId:'late',createTime:now}}).accepted,false);
});

test('installed v3 protobuf chat content and gifts pass the actual schema instead of legacy-only chat names',async()=>{
 const {WebcastChatMessage,WebcastGiftMessage}=await import('tiktok-live-proto/v3');
 const now=Date.now(),quiz=new Quiz(bank,{now:()=>now});quiz.start();
 const comment=Object.assign(WebcastChatMessage.decode(new Uint8Array()),{content:'2',user:{id:'123',displayId:'real_schema',avatarThumb:{urlList:[avatar]}},common:{msgId:'protobuf-chat',createTime:String(Math.floor(now/1000))}});
 assert.equal(comment.comment,undefined);assert.equal(quiz.comment(comment).accepted,true);assert.equal(quiz.snapshot().participants.B[0].name,'real_schema');
 const gift=Object.assign(WebcastGiftMessage.decode(new Uint8Array()),{giftId:'5655',repeatEnd:0,repeatCount:1,groupId:'7',user:{id:'124',nickname:'gift user'},gift:{id:'5655',type:1,combo:true,diamondCount:1,name:'Rose'},common:{msgId:'protobuf-gift',createTime:String(Math.floor(now/1000))}});
 assert.equal(quiz.gift(gift,presetGifts('easydeutsches')).reason,'streak_not_finished');gift.repeatEnd=1;assert.equal(quiz.gift(gift,presetGifts('easydeutsches')).accepted,true);
});
