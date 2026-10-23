import test from 'node:test';
import assert from 'node:assert/strict';
import {QuestionNarrator} from '../public/narration.js';
const flush=()=>new Promise(r=>setImmediate(r));
function fixture(fetchAudio){
 const played=[];const ctx={state:'running',destination:{},decodeAudioData:async()=>({}),createBufferSource(){const s={connect(){},disconnect(){},start(){played.push(s);},stop(){s.stopped=true;}};return s;}};
 const narrator=new QuestionNarrator({fetchAudio:fetchAudio||(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}))});
 const state={narrationEnabled:true,phase:'open',roundId:'one',question:{id:'1.2.09-021-M'},narrationReplay:0};
 return {narrator,state,ctx,played};
}
test('German narration plays once per round, repeats on request and stops on pause/reveal',async()=>{
 const {narrator,state,ctx,played}=fixture();narrator.update(state,ctx);await flush();assert.equal(played.length,1);
 for(let i=0;i<20;i++)narrator.update(state,ctx);await flush();assert.equal(played.length,1);
 narrator.update({...state,narrationReplay:1},ctx);await flush();assert.equal(played.length,2);assert.equal(played[0].stopped,true);
 narrator.update({...state,phase:'paused'},ctx);assert.equal(played[1].stopped,true);
 narrator.update(state,ctx);await flush();assert.equal(played.length,3);
 narrator.update({...state,phase:'revealed'},ctx);assert.equal(played[2].stopped,true);
});
test('watching, disabled speech and suspended browser source do not read; unlocking starts',async()=>{
 const {narrator,state,ctx,played}=fixture();
 narrator.update({...state,phase:'watching'},ctx);narrator.update({...state,narrationEnabled:false},ctx);ctx.state='suspended';narrator.update(state,ctx);await flush();assert.equal(played.length,0);
 ctx.state='running';narrator.update(state,ctx);await flush();assert.equal(played.length,1);
});
test('late audio response cannot play over next question or after stopping',async()=>{
 let resolve;const {narrator,state,ctx,played}=fixture(()=>new Promise(r=>resolve=r));narrator.update(state,ctx);narrator.update({...state,phase:'paused'},ctx);
 resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await flush();assert.equal(played.length,0);
});
