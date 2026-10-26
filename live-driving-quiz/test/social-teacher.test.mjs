import test from 'node:test';import assert from 'node:assert/strict';
import {SocialTeacher} from '../social-teacher.mjs';
test('Social uses its existing webhook and only relays authenticated pinned-owner jobs',async()=>{
 const sent=[];let executed=0;const agent=new SocialTeacher({secret:'bridge',callbackSecret:'callback',owner:'7',execute:async()=>{executed++;return 'done';},fetcher:async(url,options)=>{sent.push({url,options});return Response.json({ok:true});}});
 try{await agent.start();assert.equal(sent.length,0,'no getUpdates, setWebhook or competing Telegram registration');assert.equal(agent.authorized('wrong'),false);assert.equal(agent.authorized('bridge'),true);const u={update_id:1,message:{chat:{id:7,type:'private'},from:{id:8},text:'سوال بعدی'}};await agent.receive(u);assert.equal(executed,0);u.message.from.id=7;await agent.receive(u);await new Promise(r=>setImmediate(r));await agent.receive(u);assert.equal(executed,1);assert.equal(agent.jobs[0].status,'done');assert.ok(sent.every(r=>r.url.endsWith('/internal/teacher-result')&&r.options.headers['X-Project-Authorization']==='callback'));assert.equal(agent.status().expectedBot,'afgsocial_bot');}finally{agent.close();}
});
