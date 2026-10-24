import test from 'node:test';
import assert from 'node:assert/strict';
import {GuestSupport} from '../guests.mjs';
const now=Date.now();
const gift=(id,extra={})=>({giftId:'5655',giftName:'Rose',diamondCount:1,repeatCount:3,receiverUserId:'123',user:{id:'321',nickname:'حامی',avatarThumb:{urlList:['https://p16.tiktokcdn.com/avatar.png']}},common:{msgId:id,createTime:now},...extra});
test('guest support uses actual recipient, counts exact completed gifts once, retains totals and last-event ring',()=>{
 const ledger=new GuestSupport([],{now:()=>now});ledger.add('@Guest','123');
 assert.equal(ledger.gift(gift('1')).accepted,true);assert.equal(ledger.gift(gift('1')).reason,'duplicate_event');
 ledger.gift(gift('2',{giftId:'big',diamondCount:500,repeatCount:1}));
 const donor=ledger.snapshot()[0].supporters[0];assert.equal(donor.totalCoins,503);assert.equal(donor.tier,'diamond');assert.equal(donor.gifts[0].count,3);assert.ok(donor.avatar);
 assert.equal(ledger.snapshot()[0].userId,undefined);
 assert.equal(ledger.gift(gift('3',{receiverUserId:'999'})).reason,'unknown_recipient');assert.equal(ledger.snapshot()[0].supporters[0].totalCoins,503);
 ledger.clear();assert.equal(ledger.snapshot()[0].supporters.length,0);assert.equal(ledger.snapshot()[0].username,'guest');
});
test('username resolves through exact event identity, never nickname, and streak/unknown value stay honest',()=>{
 const ledger=new GuestSupport([],{now:()=>now});ledger.add('guest');assert.equal(ledger.observe({id:'123',nickname:'guest'}),false);
 assert.equal(ledger.observe({id:'123',uniqueId:'Guest'}),true);assert.equal(ledger.observe({id:'999',uniqueId:'Guest'}),false);
 const event=gift('1',{giftDetails:{giftType:1},repeatEnd:0,diamondCount:undefined});assert.equal(ledger.gift(event).reason,'streak_not_finished');
 assert.equal(ledger.gift({...event,repeatEnd:1,diamondCount:undefined}).accepted,true);
 const donor=ledger.snapshot()[0].supporters[0];assert.equal(donor.unknownValue,true);assert.equal(donor.totalCoins,0);assert.equal(donor.tier,'bubble');
 assert.throws(()=>ledger.add('another','123'));assert.throws(()=>ledger.add('bad/name'));
});

test('v3 guest displayId resolves the registered username without relying on legacy uniqueId',()=>{
 const ledger=new GuestSupport();ledger.add('guest');assert.equal(ledger.observe({id:'123',displayId:'guest'}),true);assert.equal(ledger.snapshot()[0].resolved,true);
});

test('progressive display never adds a guest streak more than once',()=>{
 const ledger=new GuestSupport([],{now:()=>now});ledger.add('guest','123');
 const e=gift('start',{groupId:'s',gift:{type:1,diamondCount:1},repeatCount:1,repeatEnd:0});ledger.gift(e);ledger.gift({...e,repeatCount:100,common:{msgId:'progress',createTime:now}});
 assert.equal(ledger.snapshot()[0].supporters.length,0);
 ledger.gift({...e,repeatCount:100,repeatEnd:1,common:{msgId:'end',createTime:now}});assert.equal(ledger.snapshot()[0].supporters[0].totalCoins,100);assert.equal(ledger.snapshot()[0].supporters[0].gifts[0].count,100);
});
