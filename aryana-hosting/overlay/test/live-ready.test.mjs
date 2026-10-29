import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {LiveLink} from '../src/live-link.mjs';
import {SpeechQueue} from '../src/speech-queue.mjs';
import {DurableState} from '../src/durable-state.mjs';
import {HostSession} from '../src/host.mjs';
import {stockReply} from '../src/replies.mjs';
test('recovery preserves ownership, backs off, and stops cancelled retries',async()=>{
 const clients=[],timers=[],events=[];const link=new LiveLink({create:()=>{const c=new EventEmitter();c.connect=async()=>{};c.disconnect=()=>{c.emit('disconnected');};clients.push(c);return c;},timer:(fn,delay)=>{const x={fn,delay};timers.push(x);return x;},cancel:x=>x.cancelled=true,event:(k,d)=>events.push([k,d])});
 await link.start('account');assert.equal(link.status,'connected');clients[0].emit('gift',{count:1});assert.equal(events.length,1);
 clients[0].emit('disconnected');assert.equal(link.status,'reconnecting');assert.equal(timers[0].delay,2000);await timers[0].fn();await new Promise(r=>setImmediate(r));assert.equal(link.status,'connected');clients[0].emit('gift',{});assert.equal(events.length,1);
 clients[1].emit('disconnected');link.stop();assert(timers[1].cancelled);await timers[1].fn();assert.equal(clients.length,2);assert.equal(link.status,'disconnected');
});
test('gift and VIP speech displace likes, stale items expire and stops discard old revisions',()=>{
 let now=0;const q=new SpeechQueue({now:()=>now,limit:2});q.push('like','like',1);q.push('join','join',1);assert(q.push('gift','gift',1));assert.equal(q.shift(1).text,'gift');assert.equal(q.push('join','join',1),false);now=61000;assert.equal(q.shift(1),null);q.push('old','gift',1);assert.equal(q.shift(2),null);
});
test('durable storage refuses public repositories and never sends private state to them',async()=>{
 const calls=[];const store=new DurableState({repo:'owner/state',token:'test-token',fetcher:async(url,options)=>{calls.push({url,method:options.method});return Response.json({private:false});}});assert.equal(await store.load(),null);store.pending={version:1,settings:{names:['Maryam']}};await store.flush();assert(!calls.some(x=>x.method==='POST'));assert.equal(store.status,'unavailable');if(store.timer)clearTimeout(store.timer);
});
test('three simulated hours retain totals, bounded deduplication and recovery after restart',()=>{
 let now=1000000;const session=new HostSession({now:()=>now}),settings={names:[]};let coins=0,likes=0,last;
 for(let tick=0;tick<5400;tick++){
  now+=2000;const gift=tick%5===0;last={msgId:String(tick+1),user:{id:String(tick%30),nickname:'مریم'},repeatCount:1,diamondCount:10,count:3};
  session.accept(gift?'gift':'like',last,settings);if(gift)coins+=10;else likes+=3;
  if(tick%30===0){const s=session.snapshot();assert.equal(s.giftTotal,coins);assert.equal(s.likeTotal,likes);assert(s.rows.length<=10);}
 }
 assert.equal(session.seen.size,5000);const restored=new HostSession({now:()=>now});assert(restored.restore(JSON.parse(JSON.stringify(session.export()))));assert.equal(restored.snapshot().giftTotal,coins);assert.equal(restored.snapshot().likeTotal,likes);assert.equal(restored.accept('like',last,settings),null);assert.equal(restored.snapshot().likeTotal,likes);
});
test('fast social replies do not swallow a real question or pretend to be human',()=>{
 assert(stockReply('سلام آریانا!').includes('خوش آمدید'));
 assert(stockReply('Are you a real person?').includes('virtual'));
 assert.equal(stockReply('سلام چرا امروز هوا سرد است؟'),null);
 assert.equal(stockReply('نام من user123 است'),null);
});
