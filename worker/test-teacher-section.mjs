import test from 'node:test';import assert from 'node:assert/strict';
import {handleTeacherSection,teacherBridgeSecret} from './src/teacher-section.js';
test('teaching and video routing stay separate; existing credit commands keep their handler',async()=>{
 const memory=new Map(),sent=[],requests=[],env={TELEGRAM_BOT_TOKEN:'fake',BOT_STATE:{get:async k=>memory.get(k),put:async(k,v)=>memory.set(k,v)}};
 const args={env,chatId:'7',telegram:async(e,m,d)=>sent.push(d),update:{update_id:1,message:{chat:{id:7,type:'private'},from:{id:7},text:'وضعیت'}},fetcher:async(url,options)=>{requests.push({url,options});return Response.json({ok:true});}};
 assert.equal(await handleTeacherSection({...args,input:'وضعیت'}),false);
 await handleTeacherSection({...args,input:'/teacher'});assert.equal(memory.get('bot-section:7'),'teacher');
 assert.equal(await handleTeacherSection({...args,input:'/credit'}),false);
 assert.equal(await handleTeacherSection({...args,input:'وضعیت'}),true);assert.equal(requests.length,1);assert.equal(requests[0].options.headers['X-Teacher-Authorization'],await teacherBridgeSecret('fake'));
 await handleTeacherSection({...args,input:'/video'});assert.equal(await handleTeacherSection({...args,input:'وضعیت'}),false);
 await handleTeacherSection({...args,input:'/teacher status'});assert.equal(JSON.parse(requests[1].options.body).message.text,'status');
 assert.ok(sent[0].reply_markup.keyboard.length);
});
test('a failed bridge reports that execution is unconfirmed instead of pretending it queued',async()=>{let reply;await handleTeacherSection({env:{TELEGRAM_BOT_TOKEN:'x',BOT_STATE:{get:async()=> 'teacher'}},chatId:'7',input:'next',update:{message:{chat:{id:7,type:'private'},from:{id:7}}},telegram:async(e,m,p)=>{reply=p.text;},fetcher:async()=>new Response('',{status:503})});assert.match(reply,/تأیید نشد/);});
