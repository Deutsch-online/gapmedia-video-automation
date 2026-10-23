import test from 'node:test';
import assert from 'node:assert/strict';
import {QuizSessions} from '../sessions.mjs';
import {SessionStore} from '../session-store.mjs';
const ids=Array.from({length:100},(_,i)=>'q'+i),opts={shuffle:ids=>[...ids],now:()=>12345};
test('50-question sessions finish without cycling; completed questions survive reload and are excluded',()=>{
 const s=new QuizSessions(ids,{},opts);assert.throws(()=>s.configure(49,false));assert.equal(s.create(),'q0');
 for(let i=0;i<50;i++){assert.equal(s.current(),'q'+i);s.complete(s.current());s.next();}
 assert.equal(s.current(),null);assert.equal(s.summary().finished,true);assert.equal(s.summary().done,50);
 const restored=new QuizSessions(ids,JSON.parse(JSON.stringify(s.export())),opts);assert.equal(restored.create(),'q50');assert.equal(restored.session.ids.length,50);assert.equal(new Set(restored.session.ids).size,50);
 for(let i=0;i<50;i++){restored.complete(restored.current());restored.next();}
 assert.throws(()=>restored.create(),/0/);restored.configure(75,true);restored.create();assert.equal(restored.session.ids.length,75);assert.equal(new Set(restored.session.ids).size,75);
});
test('reviewing a completed question needs explicit repeat opt-in; completed review does not consume unrelated plan position',()=>{
 const s=new QuizSessions(ids,{},opts);s.create();s.complete('q0');assert.throws(()=>s.review('q0'));s.configure(50,true);s.review('q99');s.complete('q99');assert.equal(s.summary().review,true);assert.equal(s.session.done.length,1);assert.equal(s.next(),'q0');
});
test('private progress writes use an authenticated private Dataset; failure blocks progress until a successful retry',async()=>{
 const real=globalThis.fetch;let fail=false,body;
 globalThis.fetch=async(url,options)=>{assert.equal(options.headers.Authorization,'Bearer test-private');if(options.method==='POST'){body=options.body;return new Response('',{status:fail?503:200});}return Response.json({version:1,completed:{}});};
 try{const store=new SessionStore({HF_SESSION_REPO:'owner/state',HF_SESSION_TOKEN:'test-private'});assert.equal((await store.load()).version,1);store.queue({version:1,completed:{q0:{at:12}}});await store.flush();assert.equal(store.status,'saved');const file=JSON.parse(body.trim().split('\n')[1]);assert.equal(file.value.path,'sessions.json');assert.equal(JSON.parse(Buffer.from(file.value.content,'base64')).completed.q0.at,12);
 fail=true;store.queue({version:1,completed:{q1:{at:13}}});await assert.rejects(store.flush());assert.equal(store.status,'error');fail=false;await store.retry({version:1,completed:{q1:{at:13}}});assert.equal(store.status,'saved');
 fail=true;globalThis.fetch=async()=>new Response('',{status:503});const unread=new SessionStore({HF_SESSION_REPO:'owner/state',HF_SESSION_TOKEN:'test-private'});assert.equal(await unread.load(),null);await assert.rejects(unread.flush());
 }finally{globalThis.fetch=real;}
});
