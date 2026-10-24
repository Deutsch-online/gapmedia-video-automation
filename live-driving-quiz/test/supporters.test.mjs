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
 assert.equal(wall.gift(streak,mapping).pending,true);assert.equal(wall.snapshot()[0].coins,500);assert.equal(wall.gift({...streak,repeatEnd:1},mapping).accepted,true);assert.equal(wall.snapshot()[0].coins,500);
 assert.equal(wall.gift({...streak,repeatEnd:1,common:{msgId:'other',createTime:now}},mapping).reason,'duplicate_event');assert.equal(wall.gift(gift('old',1000,'old',{common:{msgId:'old',createTime:now-130000}}),mapping).reason,'invalid_event');
});

test('all-gift display includes answer gifts independently of quiz/comment input and keeps exact quantity',()=>{
 const wall=new SupporterWall({now:()=>now});const rose=gift('rose',1,'rose-sender',{giftId:'5655',gift:{name:'Rose',type:1},repeatCount:3,repeatEnd:1});
 assert.equal(wall.gift(rose,{}).accepted,true);const row=wall.snapshot()[0];assert.equal(row.name,'rose-sender');assert.equal(row.giftName,'Rose');assert.equal(row.count,3);assert.equal(row.coins,3);
 assert.equal(wall.gift(rose,{}).reason,'duplicate_event');assert.equal(wall.snapshot().length,1);
});

test('custom gift decoration thresholds can use total coins or final gift count',async()=>{
 const {DEFAULT_GIFT_STYLE,validGiftStyle,styledGiftTier}=await import('../supporters.mjs');
 assert.equal(validGiftStyle(DEFAULT_GIFT_STYLE),true);assert.equal(styledGiftTier({coins:500,count:2}),'diamond');
 const config={basis:'count',levels:{simple:2,silver:5,gold:10,diamond:20,vip:50}};
 assert.equal(validGiftStyle(config),true);assert.equal(styledGiftTier({coins:99999,count:1},config),'bubble');assert.equal(styledGiftTier({coins:1,count:20},config),'diamond');assert.equal(styledGiftTier({coins:null,count:50},config),'vip');
 assert.equal(styledGiftTier({coins:null,count:100}), 'bubble');
 assert.equal(validGiftStyle({...config,levels:{...config.levels,gold:4}}),false);assert.equal(validGiftStyle({...config,basis:'cash'}),false);
});

test('zero order/group sentinels cannot hide a later 100-gift sender',()=>{
 const wall=new SupporterWall({now:()=>now});
 wall.gift(gift('first',1,'one',{orderId:'0',groupId:'0'}),{});
 const result=wall.gift(gift('hundred',1,'hundred',{orderId:'0',groupId:'0',repeatCount:100}),{});
 assert.equal(result.accepted,true);assert.equal(wall.snapshot()[0].name,'hundred');assert.equal(wall.snapshot()[0].count,100);assert.equal(wall.snapshot()[0].coins,100);
});
test('a v3 streak appears immediately, updates cumulatively to 100 and finalizes once',async()=>{
 const {WebcastGiftMessage}=await import('tiktok-live-proto/v3');
 const wall=new SupporterWall({now:()=>now});
 const event=(id,n,end=0)=>Object.assign(WebcastGiftMessage.decode(new Uint8Array()),{giftId:'5655',orderId:'0',groupId:'series',repeatCount:n,repeatEnd:end,user:{id:'100-user',displayId:'real_sender',nickname:'Real Sender',avatarThumb:{urlList:['https://p16-sign.tiktokcdn.com/avatar.png']}},common:{msgId:id,createTime:String(Math.floor(now/1000))},gift:{type:1,diamondCount:1,name:'Rose'}});
 assert.equal(wall.gift(event('a',1),{}).accepted,true);const key=wall.snapshot()[0].key;
 assert.equal(wall.snapshot()[0].pending,true);assert.ok(wall.snapshot()[0].avatar);
 wall.gift(event('b',40),{});wall.gift(event('c',100),{});assert.equal(wall.snapshot()[0].count,100);assert.equal(wall.snapshot()[0].coins,100);assert.equal(wall.snapshot()[0].key,key);
 assert.equal(wall.gift(event('end',100,1),{}).updated,true);assert.equal(wall.snapshot()[0].pending,false);assert.equal(wall.snapshot().length,1);
 assert.equal(wall.gift(event('replay',100,1),{}).reason,'duplicate_event');assert.equal(wall.gift(event('old-count',20),{}).reason,'duplicate_event');
});
test('missing group IDs, zero protobuf counters and missing final avatars retain a complete streak',()=>{
 const wall=new SupporterWall({now:()=>now});
 const first=gift('zero-a',0,'same',{groupId:'0',orderId:'0',gift:{type:1,diamondCount:1,name:'Rose'},repeatCount:0,repeatEnd:0,comboCount:5});
 wall.gift(first,{});assert.equal(wall.snapshot()[0].count,5);assert.equal(wall.snapshot()[0].coins,5);const key=wall.snapshot()[0].key;
 wall.gift({...first,repeatCount:100,common:{msgId:'zero-b',createTime:now}},{});
 wall.gift({...first,repeatCount:100,repeatEnd:1,user:{id:'same',nickname:'same'},common:{msgId:'zero-end',createTime:now}},{});
 const row=wall.snapshot()[0];assert.equal(row.key,key);assert.equal(row.count,100);assert.equal(row.coins,100);assert.equal(row.pending,false);assert.ok(row.avatar);
});

test('empty metadata and zero defaults do not mask valid nested gift values',()=>{
 const wall=new SupporterWall({now:()=>now});
 const e=gift('mixed',0,'nested',{orderId:'0',groupId:'0',repeatCount:0,repeatEnd:0,giftDetails:{},gift:{gift_id:'5655',gift_type:1,diamond_count:5,repeat_count:100,repeat_end:1,name:'Rose'}});
 assert.equal(wall.gift(e,{}).accepted,true);assert.equal(wall.snapshot()[0].count,100);assert.equal(wall.snapshot()[0].coins,500);assert.equal(wall.snapshot()[0].pending,false);
});
