import test from 'node:test';
import assert from 'node:assert/strict';
import {CommentInbox} from '../src/comment-inbox.mjs';
import {stockReply,HOST_ORIGIN} from '../src/replies.mjs';
import {localizedReply} from '../src/languages.mjs';
import {SpeechQueue} from '../src/speech-queue.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('Origin replies stay with the virtual AI company in Persian and English',()=>{
 for(const question of ['از کجایی؟','تو اهل کجا هستی؟','آریانا از کجا استی؟','افغانستان هستی؟','از کدام کشور هستی؟'])assert.equal(stockReply(question),HOST_ORIGIN.fa,question);
 for(const question of ['Where are you from?','Which country are you from?','Are you Afghan?','Who created you?'])assert.equal(stockReply(question),HOST_ORIGIN.en,question);
 assert.equal(localizedReply(HOST_ORIGIN.fa,'en'),HOST_ORIGIN.en);assert.equal(localizedReply(HOST_ORIGIN.en,'fa'),HOST_ORIGIN.fa);
 assert.equal(stockReply('از کجا هوش مصنوعی را یاد بگیرم؟'),null);assert.equal(stockReply('Which country is Kabul in?'),null);
});
test('Comments arriving while a previous answer runs are queued instead of being throttled away',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve),spoken=[],accepted=[];
 const inbox=new CommentInbox({answer:async text=>{if(text==='first')await gate;return text+' reply';},speak:text=>spoken.push(text),accepted:job=>accepted.push(job.text)});
 inbox.push('first',{},'1');inbox.push('second',{},'2');inbox.push('third',{},'3');assert.equal(inbox.items.length,2);assert.equal(inbox.push('duplicate',{},'2'),false);
 release();for(let i=0;i<10&&inbox.busy;i++)await tick();assert.deepEqual(spoken,['first reply','second reply','third reply']);assert.equal(accepted.length,3);
});
test('Comment queues are bounded and cancelled answers never leak after a stop',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve),spoken=[];const inbox=new CommentInbox({limit:2,answer:async text=>{await gate;return text;},speak:text=>spoken.push(text)});
 inbox.push('active');inbox.push('old');inbox.push('middle');inbox.push('new');assert.deepEqual(inbox.items.map(x=>x.text),['middle','new']);inbox.clear();release();await tick();assert.deepEqual(spoken,[]);
});
test('Comment replies win over gifts, welcomes and topics, and interrupted topics leave the queue',()=>{
 const queue=new SpeechQueue();queue.push('topic','topic',1);queue.push('gift','gift',1);queue.push('welcome','join',1);queue.push('answer','reply',1);queue.dropKind('topic');assert.equal(queue.shift(1).text,'answer');assert.equal(queue.shift(1).text,'gift');assert.equal(queue.shift(1).text,'welcome');assert.equal(queue.shift(1),null);
});
