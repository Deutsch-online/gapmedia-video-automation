import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {planHash} from '../lib/cinematic-credit.mjs';
import {parseCreditText,decideCreditText} from '../lib/credit-text.mjs';
const now=Date.parse('2026-10-20T00:00:00Z');
const hash=x=>createHash('sha256').update(x).digest('hex');
const yes='cc-'+ 'a'.repeat(32), no='cc-'+ 'b'.repeat(32);
const plan={episode:9002,scenes:[{text:'Hallo'}]};
const request={status:'pending',chat_id:'123',plan_sha:planHash(plan),created_at:new Date(now-60000).toISOString(),expires_at:new Date(now+60000).toISOString(),text_approve_sha:hash(yes),text_reject_sha:hash(no)};
const command={action:'approved-feature',payload:'تایید '+yes,source:'telegram-cloud-worker',requestedAt:new Date(now).toISOString(),requestId:'one'};
test('exact approval and rejection forwarded by existing Worker',()=>{
 assert.equal(decideCreditText(request,command,plan,'123',now).status,'approved');
 assert.equal(decideCreditText(request,{...command,action:'topic-reject',payload:no},plan,'123',now).status,'rejected');
 assert.equal(parseCreditText({...command,payload:'تایید'}),null);
});
test('reject code cannot be changed into approval',()=>{
 assert.equal(decideCreditText(request,{...command,payload:'تایید '+no},plan,'123',now),null);
});
test('invalid, expired, replayed, changed-plan and wrong-owner requests fail closed',()=>{
 for(const current of [{...request,status:'approved'},{...request,status:'running'},{...request,status:'superseded'},{...request,expires_at:new Date(now-1).toISOString()},{...request,text_approve_sha:hash(no)}]) assert.equal(decideCreditText(current,command,plan,'123',now),null);
 assert.equal(decideCreditText(request,command,{...plan,episode:4},'123',now),null);
 assert.equal(decideCreditText(request,command,plan,'456',now),null);
 assert.equal(decideCreditText(request,{...command,source:'manual'},plan,'123',now),null);
 assert.equal(decideCreditText(request,{...command,requestedAt:new Date(now-120000).toISOString()},plan,'123',now),null);
});
