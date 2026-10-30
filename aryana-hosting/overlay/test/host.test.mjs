import test from 'node:test';
import assert from 'node:assert/strict';
import {HostSession,spokenName,greeting,applyCorrections} from '../src/host.mjs';
test('numeric and uncertain names never receive a spoken name, including decorated numeric names',()=>{
 for(const name of ['12345','مریم۲۵','user_998','♥ ١٢٣','notarealname'])assert.equal(spokenName(name),null);
 assert.equal(spokenName('مریم'),'مریم');assert.equal(spokenName('Sarah'),'Sarah');assert.equal(spokenName('Newname',['Newname']),'Newname');
 assert.equal(greeting(null,40),'سلام، خوش آمدید!');assert.match(greeting('مریم',26),/احترام فراوان/);assert.doesNotMatch(greeting('مریم',25),/احترام فراوان/);
});
test('gift totals count completed combos once and rotate exactly every minute without timer resets',()=>{
 let now=100000;const host=new HostSession({now:()=>now}),settings={names:[]};
 const event=(msg,id,extra={})=>({user:{id,nickname:'مریم'},count:100,giftId:'rose',diamondCount:10,repeatCount:1,common:{msgId:msg},...extra});
 host.accept('like',event('like','fan'),settings);host.accept('gift',event('g1','donor'),settings);host.accept('gift',event('g2','donor'),settings);host.accept('gift',event('g3','other',{diamondCount:1}),settings);
 assert.equal(host.snapshot().focus.coins,20);now+=60000;assert.equal(host.snapshot().focus.kind,'like');host.accept('gift',event('g4','other'),settings);assert.equal(host.snapshot().focus.kind,'like');now+=60000;assert.equal(host.snapshot().focus.kind,'gift');
 const combo=event('combo','new',{gift:{type:1},groupId:'group',repeatCount:5,repeatEnd:0});assert.equal(host.accept('gift',combo,settings),null);
 host.accept('gift',{...combo,repeatEnd:1},settings);host.accept('gift',{...combo,repeatEnd:1,common:{msgId:'different'}},settings);assert.equal(host.snapshot().giftTotal,81);
});
test('shared donor and liker identity is never duplicated, and numeric entrants get only generic thanks',()=>{
 const host=new HostSession(),settings={names:[]};
 host.accept('gift',{user:{id:'one',nickname:'Sara'},giftId:'gift',diamondCount:100,common:{msgId:'g'}},settings);
 host.accept('like',{user:{id:'one',nickname:'Sara'},count:500,common:{msgId:'l'}},settings);
 assert.equal(host.snapshot().rows.length,0);
 const reaction=host.accept('join',{user:{id:'numeric',nickname:'9999',payGrade:{level:40}},common:{msgId:'j'}},settings);
 assert.equal(reaction.vip,false);assert.equal(reaction.text,'سلام، خوش آمدید!');
});
test('pronunciation overrides match whole words and preserve other vocabulary',()=>{
 assert.equal(applyCorrections('یک موتر و موترها',{'یک':'یِک','موتر':'موتَر'}),'یِک موتَر و موترها');
});

test('every entry welcomes, every gift and like says only the exact thanks phrase',()=>{
 for(const nickname of ['مریم','12345']){const host=new HostSession(),settings={names:[]};
  for(const kind of ['gift','like','join']){const reaction=host.accept(kind,{user:{id:nickname,nickname},giftId:'rose',diamondCount:1,count:5,common:{msgId:kind+nickname}},settings);assert.ok(reaction);if(kind==='join'){assert.match(reaction.text,/خوش آمدید/);assert.doesNotMatch(reaction.text,/تشکر/);}else assert.equal(reaction.text,'بسیار تشکر!');}
 }
});
