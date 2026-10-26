import test from 'node:test';
import assert from 'node:assert/strict';
import {QuizSessions} from '../sessions.mjs';
import {SessionStore} from '../session-store.mjs';
const ids=Array.from({length:100},(_,i)=>'q'+i),opts={shuffle:ids=>[...ids],now:()=>12345};
test('50-question sessions finish without cycling; completed questions survive reload and are excluded',()=>{
 const s=new QuizSessions(ids,{},opts);assert.throws(()=>s.configure(29,false));s.configure(50,false);assert.equal(s.create(),'q0');
 for(let i=0;i<50;i++){assert.equal(s.current(),'q'+i);s.complete(s.current());s.next();}
 assert.equal(s.current(),null);assert.equal(s.summary().finished,true);assert.equal(s.summary().done,50);
 const restored=new QuizSessions(ids,JSON.parse(JSON.stringify(s.export())),opts);restored.configure(50,false);assert.equal(restored.create(),'q50');assert.equal(restored.session.ids.length,50);assert.equal(new Set(restored.session.ids).size,50);
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

test('expanding a 150-question bank to 200 preserves active plans and completed history',()=>{
 const oldIds=Array.from({length:150},(_,i)=>'q'+i),newIds=Array.from({length:200},(_,i)=>'q'+i);
 const original=new QuizSessions(oldIds,{},opts);original.create();original.complete('q0');original.next();
 const restored=new QuizSessions(newIds,JSON.parse(JSON.stringify(original.export())),opts);
 assert.deepEqual(restored.session,original.session);assert.deepEqual(restored.completed,original.completed);assert.equal(restored.summary().bankTotal,200);assert.equal(restored.summary().freshTotal,199);
 restored.configure(200,true);restored.create();assert.equal(restored.session.ids.length,200);assert.equal(new Set(restored.session.ids).size,200);
});

import {bankSections} from '../sections.mjs';
test('source sections constrain new sessions, persist and can replay exact completed plan without global repeats',()=>{
 const questions=Array.from({length:60},(_,i)=>({id:(i<7?'1.2.09':'1.3.01')+'-'+i,source:'https://example.com/1.2.09-abbiegen-wenden-und-rueckwaertsfahren/x'}));
 const groups=bankSections(questions),s=new QuizSessions(questions.map(q=>q.id),{}, {...opts,groups});
 assert.equal(groups['1.2.09'].ids.length,7);assert.match(groups['1.2.09'].label,/abbiegen/);
 assert.throws(()=>s.configure(8,false,'1.2.09'));assert.throws(()=>s.configure(1,false,'missing'));
 s.configure(7,false,'1.2.09');s.create();const plan=[...s.session.ids],sessionId=s.session.id;
 for(let i=0;i<7;i++){s.complete(s.current());s.next();}assert.equal(s.summary().finished,true);
 s.repeat();assert.notEqual(s.session.id,sessionId);assert.deepEqual(s.session.ids,plan);assert.equal(s.summary().done,0);assert.equal(s.allowRepeat,false);assert.equal(s.current(),plan[0]);assert.equal(Object.keys(s.completed).length,7);
 const restored=new QuizSessions(questions.map(q=>q.id),s.export(),{...opts,groups});assert.equal(restored.size,7);assert.equal(restored.section,'1.2.09');assert.deepEqual(restored.session.ids,plan);
 restored.configure(50,false,'all');restored.create();assert.equal(restored.session.ids.length,50);assert.ok(restored.session.ids.every(id=>!plan.includes(id)));
});

test('30-question lesson folders persist order, exclude studied questions, and replay only by explicit selection',()=>{
 const s=new QuizSessions(ids,{},opts);assert.equal(s.size,30);s.refreshLessons();assert.deepEqual(s.lessonFolders().queued.map(row=>row.count),[30,30,30]);assert.equal(s.lessonFolders().remainder,10);
 assert.equal(s.nextLesson(),'q0');const plan=[...s.session.ids];assert.equal(s.session.ids.length,30);
 for(let i=0;i<30;i++){s.complete(s.current());s.next();}
 assert.equal(s.lessonFolders().studied.length,1);assert.equal(s.lessonFolders().queued.length,2);
 const restored=new QuizSessions(ids,JSON.parse(JSON.stringify(s.export())),opts);assert.deepEqual(restored.lessonPlan,s.lessonPlan);assert.equal(restored.nextLesson(),'q30');assert.ok(restored.session.ids.every(id=>!plan.includes(id)));
 const archived=restored.lessonFolders().studied[0];assert.equal(restored.replayLesson(archived.id),'q0');assert.deepEqual(restored.session.ids,plan);assert.equal(restored.allowRepeat,false);
});
