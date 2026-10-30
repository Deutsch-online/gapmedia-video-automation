import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LipSyncBudget,NeuralLipSync} from '../src/neural-lipsync.mjs';

test('Credit reservations survive restore and reset only on a new UTC day',()=>{
 let now=Date.parse('2026-10-30T08:00:00Z');const budget=new LipSyncBudget({limit:1,now:()=>now});
 const hold=budget.reserve(.5);assert.throws(()=>budget.reserve(.6));budget.settle(hold,.1);assert.equal(budget.snapshot().used,.1);
 const restored=new LipSyncBudget({limit:1,now:()=>now});restored.restore(budget.snapshot());assert.throws(()=>restored.reserve(.95));
 now+=86400000;assert.equal(restored.snapshot().used,0);
});

function fixture(t,runner,durationProbe=async()=>2){
 const root=mkdtempSync(join(tmpdir(),'aryana-neural-'));mkdirSync(join(root,'tools'),{recursive:true});mkdirSync(join(root,'public/assets'),{recursive:true});
 writeFileSync(join(root,'tools/lipsync-client.py'),'# test boundary');writeFileSync(join(root,'public/assets/idle.mp4'),'approved-reference');
 const audio=join(root,'voice.mp3');writeFileSync(audio,'approved-generated-audio');const privateDir=join(root,'.private');mkdirSync(privateDir);
 const previous=process.env.ARYANA_LIPSYNC_TOKEN;process.env.ARYANA_LIPSYNC_TOKEN='unit-test-placeholder';
 const engine=new NeuralLipSync({root,privateDir,python:process.execPath,space:'afgtakrun/aryana-live-lipsync',revision:'tested-revision',runner,durationProbe});
 t.after(()=>{if(previous===undefined)delete process.env.ARYANA_LIPSYNC_TOKEN;else process.env.ARYANA_LIPSYNC_TOKEN=previous;rmSync(root,{recursive:true,force:true});});
 return {root,privateDir,audio,engine};
}
const delay=()=>new Promise(resolve=>setTimeout(resolve,5));

test('Exact audio and model reference cache avoids a second GPU request',async t=>{
 let calls=0;let engine;
 const f=fixture(t,async input=>{calls++;writeFileSync(input.output,'model-produced-video');return {ok:true,video_seconds:2,has_audio:true,reference_sha256:engine.referenceHash};});engine=f.engine;
 const first=await engine.submit(f.audio);const before=engine.budget.snapshot().used;assert.equal(await engine.submit(f.audio),first);assert.equal(calls,1);assert.equal(engine.budget.snapshot().used,before);
 writeFileSync(f.audio,'a-different-fresh-sentence');assert.notEqual(await engine.submit(f.audio),first);assert.equal(calls,2);
});

test('Exhausted budget rejects before calling the paid worker',async t=>{
 let calls=0;const f=fixture(t,async()=>{calls++;});f.engine.budget.reserve(5.8);
 await assert.rejects(f.engine.submit(f.audio),/بودجه/);assert.equal(calls,0);
});

test('Cancel during duration probing never starts a GPU request',async t=>{
 let release,calls=0;const gate=new Promise(resolve=>release=resolve);const f=fixture(t,async()=>{calls++;},async()=>{await gate;return 2;});
 const result=f.engine.submit(f.audio);f.engine.cancel();release();await assert.rejects(result,/لغو/);assert.equal(calls,0);assert.equal(f.engine.budget.snapshot().used,0);
});

test('Stop rejects queued and late completed replies and retains the safety reservation',async t=>{
 let release,engine;const gate=new Promise(resolve=>release=resolve);let entered=false;
 const f=fixture(t,async input=>{entered=true;await gate;writeFileSync(input.output,'late-model-video');return {ok:true,video_seconds:2,has_audio:true,reference_sha256:engine.referenceHash};});engine=f.engine;
 const active=engine.submit(f.audio);while(!entered)await delay();const pending=engine.submit(f.audio);const rejectedPending=assert.rejects(pending,/لغو/);
 engine.cancel();release();await assert.rejects(active,/لغو/);await rejectedPending;assert.ok(engine.budget.snapshot().used>=.5);assert.equal(readdirSync(join(f.privateDir,'video')).length,0);
});

test('A wrong-face or silent model result is never accepted as speech',async t=>{
 const f=fixture(t,async input=>{writeFileSync(input.output,'invalid-model-video');return {ok:true,video_seconds:2,has_audio:false,reference_sha256:'wrong-reference'};});
 await assert.rejects(f.engine.submit(f.audio),/مطابقت/);assert.equal(f.engine.ready,false);assert.equal(readdirSync(join(f.privateDir,'video')).length,0);
});

test('A comment displaces queued topics and cancels a late topic video without losing model readiness',async t=>{
 let release,entered=false,engine;const gate=new Promise(resolve=>release=resolve);
 const f=fixture(t,async input=>{if(!entered){entered=true;await gate;}writeFileSync(input.output,'valid-video');return {ok:true,video_seconds:2,has_audio:true,reference_sha256:engine.referenceHash};});engine=f.engine;engine.ready=true;
 const topic=engine.submit(f.audio,{kind:'topic',priority:5});while(!entered)await delay();const rejected=assert.rejects(topic,/لغو/);engine.cancelTopics();
 const reply=engine.submit(f.audio,{kind:'reply',priority:110});release();await rejected;assert.match(await reply,/video/);assert.equal(engine.ready,true);assert.equal(engine.lastError,'');
});
test('Low priority queued lip jobs cannot keep a comment behind them',async t=>{
 let release,entered=false,engine;const order=[],gate=new Promise(resolve=>release=resolve);
 const f=fixture(t,async input=>{order.push(readFileSync(input.audio,'utf8'));if(!entered){entered=true;await gate;}writeFileSync(input.output,'valid-video');return {ok:true,video_seconds:2,has_audio:true,reference_sha256:engine.referenceHash};});engine=f.engine;
 const first=engine.submit(f.audio);while(!entered)await delay();
 const low=join(f.root,'low.mp3'),high=join(f.root,'high.mp3');writeFileSync(low,'low-priority');writeFileSync(high,'comment-answer');
 const lowPromise=engine.submit(low,{kind:'join',priority:35}),reply=engine.submit(high,{kind:'reply',priority:110});release();await Promise.all([first,lowPromise,reply]);assert.deepEqual(order,['approved-generated-audio','comment-answer','low-priority']);
});
