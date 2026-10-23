import test from 'node:test';
import assert from 'node:assert/strict';
import {SupporterWall,supporterTier} from '../supporters.mjs';
import {presetGifts} from '../gifts.mjs';
const mapping=presetGifts('easydeutsches'),now=Date.now();
function gift(id,coins,user='sender',extra={}){return {giftId:'999999',diamondCount:coins,repeatCount:1,user:{id:user,nickname:user,avatarThumb:{urlList:['https://p16-sign.tiktokcdn.com/avatar.png']}},common:{msgId:id,createTime:now},...extra};}
test('ring thresholds follow owner corrections including diamond from 500 and VIP from 1000',()=>{
 for(const [coins,tier] of [[null,'bubble'],[10,'bubble'],[11,'simple'],[50,'simple'],[51,'silver'],[100,'silver'],[101,'gold'],[499,'gold'],[500,'diamond'],[999,'diamond'],[1000,'vip']])assert.equal(supporterTier(coins),tier);
});
test('answer gifts never enter supporter wall; other gifts do not need an open question',()=>{
 const wall=new SupporterWall({now:()=>now});assert.equal(wall.gift(gift('a',1,'one',{giftId:'5655'}),mapping).reason,'answer_gift');assert.equal(wall.snapshot().length,0);
 assert.equal(wall.gift(gift('b',500),mapping).accepted,true);const row=wall.snapshot()[0];assert.equal(row.tier,'diamond');assert.ok(row.avatar);assert.equal(row.userId,undefined);
});
test('newest sender leads and repeated senders move forward without duplicate portraits',()=>{
 const wall=new SupporterWall({now:()=>now,limit:3});wall.gift(gift('1',20,'one'),mapping);wall.gift(gift('2',150,'two'),mapping);assert.deepEqual(wall.snapshot().map(p=>p.name),['two','one']);
 wall.gift(gift('3',1000,'one'),mapping);assert.deepEqual(wall.snapshot().map(p=>p.name),['one','two']);assert.equal(wall.snapshot()[0].tier,'vip');assert.equal(wall.gift(gift('3',1000,'one'),mapping).reason,'duplicate_event');
 for(let i=4;i<8;i++)wall.gift(gift(String(i),1,'user'+i),mapping);assert.equal(wall.snapshot().length,3);wall.clear();assert.equal(wall.snapshot().length,0);
});
test('streak finishes once, tiers use per-gift value times repeat count, and stale events are ignored',()=>{
 const wall=new SupporterWall({now:()=>now});const streak=gift('s',50,'one',{groupId:'group',gift:{type:1},repeatCount:10,repeatEnd:0});
 assert.equal(wall.gift(streak,mapping).reason,'streak_not_finished');assert.equal(wall.gift({...streak,repeatEnd:1},mapping).accepted,true);assert.equal(wall.snapshot()[0].coins,500);
 assert.equal(wall.gift({...streak,repeatEnd:1,common:{msgId:'other',createTime:now}},mapping).reason,'duplicate_event');assert.equal(wall.gift(gift('old',1000,'old',{common:{msgId:'old',createTime:now-130000}}),mapping).reason,'invalid_event');
});
