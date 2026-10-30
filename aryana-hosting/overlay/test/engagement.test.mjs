import test from 'node:test';
import assert from 'node:assert/strict';
import {HostSession} from '../src/host.mjs';
const settings={names:[]};
function event(msg,id,name,extra={}){return {user:{id,nickname:name},common:{msgId:msg},diamondCount:10,repeatCount:1,count:20,...extra};}
test('Top gift and top like alternate at 60-second boundaries even as new gifts arrive',()=>{
 let now=100000;const session=new HostSession({now:()=>now});session.accept('like',event('l1','like-top','Sara'),settings);session.accept('gift',event('g1','gift-top','Maryam'),settings);
 assert.equal(session.snapshot().focus.kind,'gift');now+=59999;assert.equal(session.snapshot().focus.kind,'gift');now++;assert.equal(session.snapshot().focus.kind,'like');session.accept('gift',event('g2','gift-top','Maryam'),settings);now+=59999;assert.equal(session.snapshot().focus.kind,'like');now++;assert.equal(session.snapshot().focus.kind,'gift');assert.equal(session.snapshot().focus.coins,20);
});
test('A combined donor and liker has one card with both totals during either highlight',()=>{
 let now=100000;const session=new HostSession({now:()=>now});session.accept('gift',event('g','same','Sara'),settings);session.accept('like',event('l','same','Sara'),settings);
 for(let minute=0;minute<3;minute++){now=100000+minute*60000;const state=session.snapshot();assert.equal(state.rows.length,0);assert.equal(state.focus.coins,10);assert.equal(state.focus.likes,20);}
});
test('Numeric display names remain visible but are never spoken or granted named VIP status',()=>{
 const session=new HostSession();const reaction=session.accept('join',event('j','u','12345',{user:{id:'u',nickname:'12345',payGrade:{level:40}}}),settings);
 assert.equal(session.snapshot().joins[0].name,'12345');assert.equal(reaction.profile.spokenName,null);assert.equal(reaction.vip,false);assert.equal(reaction.text,'سلام، خوش آمدید!');
});
test('Joining notices expire and restored totals preserve the minute rotation',()=>{
 let now=100000;const session=new HostSession({now:()=>now});session.accept('gift',event('g','gift','Sara'),settings);session.accept('like',event('l','like','Maryam'),settings);session.accept('join',event('j','join','John'),settings);now+=9000;assert.equal(session.snapshot().joins.length,0);now=160000;
 const restored=new HostSession({now:()=>now});assert(restored.restore(JSON.parse(JSON.stringify(session.export()))));assert.equal(restored.snapshot().focus.kind,'like');assert.equal(restored.snapshot().giftTotal,10);assert.equal(restored.snapshot().likeTotal,20);
});
