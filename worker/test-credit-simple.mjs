import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {decideSimpleCredit,handleSimpleCredit} from './src/credit.js';
import {planHash} from '../lib/cinematic-credit.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const now=Date.now(),plan={episode:7,scenes:Array.from({length:12},(_,i)=>({de:'Scene '+i}))};
const request={id:'a'.repeat(24),status:'pending',simple_text_approval:true,chat_id:'42',message_id:100,
  plan_sha:planHash(plan),created_at:new Date(now-30000).toISOString(),expires_at:new Date(now+3600000).toISOString(),scenes:[9,10,11]};
const message={text:'تایید',message_id:101,date:Math.floor(now/1000),from:{id:42},chat:{id:42,type:'private'}};
assert.equal((await decideSimpleCredit(request,message,plan,now)).status,'approved');
assert.deepEqual((await decideSimpleCredit(request,message,plan,now)).scenes,[9,10,11]);
assert.equal((await decideSimpleCredit(request,{...message,text:'رد'},plan,now)).status,'rejected');
assert.equal((await decideSimpleCredit(request,{...message,text:'تأیید'},plan,now)).status,'approved');
for(const change of [{status:'approved'},{status:'rejected'},{status:'running'},{status:'superseded'},
  {simple_text_approval:false},{expires_at:new Date(now-1).toISOString()},{plan_sha:'wrong'},{created_at:'invalid'}]){
  assert.equal(await decideSimpleCredit({...request,...change},message,plan,now),null);
}
for(const change of [{text:'تایید محتوا'},{text:'بله'},{from:{id:43}},{chat:{id:42,type:'group'}},
  {forward_origin:{type:'user'}},{message_id:99},{date:Math.floor(now/1000)-100},
  {reply_to_message:{message_id:90}},{date:Math.floor(now/1000)+120}]){
  assert.equal(await decideSimpleCredit(request,{...message,...change},plan,now),null);
}
let writes=0,reply='',conflict=false;
const original=globalThis.fetch;
globalThis.fetch=async(url,init)=>{
  if(init.method==='PUT'){
    writes++;const body=JSON.parse(init.body);assert.equal(body.sha,'original-sha');
    const saved=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body.content),c=>c.charCodeAt(0))));
    assert.equal(saved.status,'approved');assert.equal(saved.decision_message_id,101);
    return new Response('{}',{status:conflict?409:200});
  }
  const value=url.includes('.cinematic-credit-request.json')?request:{pending:{plan}};
  return Response.json({sha:'original-sha',content:Buffer.from(JSON.stringify(value)).toString('base64')});
};
const telegram=async(_env,_method,payload)=>{reply=payload.text;};
assert.equal(await handleSimpleCredit(message,{},telegram,{}),true);
assert.equal(writes,1);assert.match(reply,/ثبت شد/);
conflict=true;
await assert.rejects(handleSimpleCredit(message,{},telegram,{}),/not saved/);
assert.equal(writes,2,'a conflicted decision must not overwrite the winning decision');
assert.equal(await handleSimpleCredit({...message,text:'ممنون'},{},telegram,{}),false);
globalThis.fetch=original;
console.log('Simple credit: owner-only, pending scoped plan, fresh message, expiry, replay and CAS protections passed');
