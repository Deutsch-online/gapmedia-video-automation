import test from 'node:test';
import assert from 'node:assert/strict';
import {LikeWall,compactLikes,activityWall} from '../likes.mjs';
import {SupporterWall} from '../supporters.mjs';
const now=Date.now();
const event=(id,count,user='1')=>({count,total:'9999999',user:{id:user,displayId:'fan_'+user},common:{msgId:id,createTime:Math.floor(now/1000)}});
test('actual v3 like messages count sender deltas, deduplicate and cross exact frame thresholds',async()=>{
 const {WebcastLikeMessage}=await import('tiktok-live-proto/v3');const wall=new LikeWall({now:()=>now});
 const one=Object.assign(WebcastLikeMessage.decode(new Uint8Array()),event('a',100));
 assert.equal(wall.observe(one).accepted,true);assert.equal(wall.snapshot()[0].tier,'basic');assert.equal(wall.snapshot()[0].likes,100);
 assert.equal(wall.observe(one).reason,'duplicate_event');wall.observe(event('b',1));assert.equal(wall.snapshot()[0].tier,'liked');
 wall.observe(event('c',899));assert.equal(wall.snapshot()[0].tier,'crown');assert.equal(wall.snapshot()[0].likeLabel,'1K');
 assert.equal(wall.observe({...event('d',1),count:undefined}).accepted,false);assert.equal(wall.observe({...event('old',3),common:{msgId:'old',createTime:now-120001}}).accepted,false);
 assert.deepEqual([compactLikes(999),compactLikes(1000),compactLikes(1400),compactLikes(2000)],['999','1K','1.4K','2K']);
});
test('ranked likenesses and larger donors share a bounded list without duplicate identities or exposed IDs',()=>{
 const likes=new LikeWall({now:()=>now}),gifts=new SupporterWall({now:()=>now});likes.observe(event('one',1000));likes.observe(event('two',500,'2'));likes.observe(event('three',20,'3'));
 gifts.gift({giftId:'5655',diamondCount:500,repeatCount:1,user:{id:'2',nickname:'donor'},common:{msgId:'gift',createTime:now}},{});
 const rows=activityWall(likes,gifts);assert.equal(rows.length,3);assert.equal(rows[0].kind,'gift');assert.equal(rows[0].tier,'diamond');assert.equal(rows[0].likes,500);assert.equal(rows[1].likes,1000);assert.equal(rows[1].rank,1);assert.ok(rows.every(p=>!('userId' in p)));
 for(let i=4;i<30;i++)likes.observe(event('fan'+i,i,String(i)));assert.equal(activityWall(likes,gifts).length,8);
});

test('configurable row limits never overrun and spotlight switches after exactly 60 seconds',async()=>{
 const {activityFocus}=await import('../likes.mjs');let clock=now;
 const likes=new LikeWall({now:()=>clock}),gifts=new SupporterWall({now:()=>clock,limit:20});
 likes.observe(event('top',1500,'1'));likes.observe(event('second',100,'2'));
 gifts.gift({giftId:'gift',diamondCount:500,user:{id:'3',uniqueId:'gift_user',nickname:'Gift User'},common:{msgId:'g',createTime:clock}},{});
 assert.equal(activityFocus(likes,gifts,clock).kind,'gift');assert.equal(activityFocus(likes,gifts,clock).username,'gift_user');
 clock+=59999;assert.equal(activityFocus(likes,gifts,clock).kind,'gift');clock++;assert.equal(activityFocus(likes,gifts,clock).likes,1500);assert.equal(activityFocus(likes,gifts,clock).username,'fan_1');
 for(const count of [1,2,3,8,10])assert.ok(activityWall(likes,gifts,count).length<=count);
 assert.ok(!('userId' in activityFocus(likes,gifts,clock)));
});
test('profile links use validated actual usernames and never guess from display names',async()=>{
 const {profileUsername,profileLink}=await import('../gifts.mjs');
 assert.equal(profileUsername({user:{nickname:'A Fake Name'}}),null);assert.equal(profileUsername({user:{displayId:'real.user'}}),'real.user');
 assert.equal(profileLink('real.user'),'https://www.tiktok.com/@real.user');assert.equal(profileLink('x/?redirect=evil'),null);assert.equal(profileLink('javascript:alert(1)'),null);
});
