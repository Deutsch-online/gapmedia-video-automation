import test from 'node:test';
import assert from 'node:assert/strict';
import {WelcomeCycle} from '../welcome.mjs';
import {narrationDuration} from '../narration-metadata.mjs';
test('welcome is due every two minutes, waits for question/video to end, resets on disconnection',()=>{
 let now=0;const cycle=new WelcomeCycle({now:()=>now}),state={connected:true,enabled:true,phase:'open',durationMs:18000};
 assert.equal(cycle.tick(state),null);now=119999;assert.equal(cycle.tick({...state,phase:'paused'}),null);now=120000;assert.equal(cycle.tick(state),null);
 const first=cycle.tick({...state,phase:'revealed'});assert.equal(first.at,120000);assert.equal(first.expiresAt,140000);assert.equal(cycle.tick({...state,phase:'revealed'}),null);
 now=240000;const second=cycle.tick({...state,phase:'paused'});assert.notEqual(first.id,second.id);
 assert.equal(cycle.tick({...state,connected:false}),null);assert.equal(cycle.announcement,null);assert.equal(cycle.dueAt,null);
 now=500000;assert.equal(cycle.tick({...state,phase:'paused'}),null);assert.equal(cycle.dueAt,620000);
 cycle.tick({...state,enabled:false});assert.equal(cycle.dueAt,null);
});
test('question duration includes both complete recordings and inter-language pause',()=>{
 const meta={questions:{one:{duration_ms:6000}},persian_questions:{one:{duration_ms:9000}}};
 assert.equal(narrationDuration(meta,'one','both'),15300);assert.equal(narrationDuration(meta,'one','fa'),9000);assert.equal(narrationDuration(meta,'one','de'),6000);
});
