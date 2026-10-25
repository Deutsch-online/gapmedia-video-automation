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

test('audio device suspension preserves the sentence and avoids repeating it',async()=>{
 const {narrator,state,ctx,played}=fixture();narrator.update(state,ctx);await flush();assert.equal(played.length,1);
 ctx.state='suspended';for(let i=0;i<10;i++)narrator.update(state,ctx);assert.equal(played[0].stopped,undefined);
 ctx.state='running';narrator.update(state,ctx);await flush();assert.equal(played.length,1);
 ctx.state='suspended';narrator.update({...state,roundId:'new'},ctx);assert.equal(played[0].stopped,true);
});
test('repeat reuses fully decoded audio, temporary load error gets one retry',async()=>{
 let calls=0;const {narrator,state,ctx,played}=fixture(async()=>{calls++;if(calls===1)throw Error('temporary network error');return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};});
 narrator.update(state,ctx);await flush();assert.equal(played.length,1);assert.equal(calls,2);
 narrator.update({...state,narrationReplay:1},ctx);await flush();assert.equal(played.length,2);assert.equal(calls,2);
});

import {WelcomeAnnouncer} from '../public/narration.js';
test('both languages preload and play in order, never simultaneously; Persian mode requests only native Persian',async()=>{
 const urls=[],{narrator,state,ctx,played}=fixture(async url=>{urls.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};});
 narrator.update({...state,narrationLanguage:'both'},ctx);await flush();assert.equal(played.length,1);assert.equal(urls.length,2);assert.match(urls[1],/narration\/fa\//);
 played[0].onended();assert.equal(played.length,2);played[1].onended();assert.equal(narrator.status,'ready');
 narrator.update({...state,narrationLanguage:'both'},ctx);await flush();assert.equal(played.length,2);
 narrator.update({...state,narrationLanguage:'fa',roundId:'fa-only'},ctx);await flush();assert.equal(played.length,3);assert.equal(urls.length,2,'decoded Persian clip is reused');
 narrator.update({...state,phase:'paused'},ctx);assert.equal(played[2].stopped,true);
});
test('welcome waits for idle speech, plays once in both languages, and yields immediately to a new question',async()=>{
 const {ctx,played}=fixture(),urls=[],announcer=new WelcomeAnnouncer({fetchAudio:async url=>{urls.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}});
 const state={mode:'live',connection:{status:'connected'},phase:'revealed',serverTime:1000,welcome:{enabled:true,announcement:{id:'welcome-1',expiresAt:30000}}};
 announcer.update(state,ctx,{busy:true});await flush();assert.equal(played.length,0);
 announcer.update(state,ctx);await flush();assert.equal(played.length,1);assert.deepEqual(urls,['/narration/welcome-fa.wav','/narration/welcome-de.wav']);
 announcer.update(state,ctx);await flush();assert.equal(played.length,1);
 announcer.update({...state,phase:'open'},ctx);assert.equal(played[0].stopped,true);announcer.update(state,ctx);await flush();assert.equal(played.length,1,'cancelled welcome does not restart on another idle state');
 announcer.update({...state,serverTime:40000},ctx);await flush();assert.equal(played.length,1);
});

import {execFileSync} from 'node:child_process';
test('native Persian speech normalization strips symbols, retains decimal meaning and never inserts punctuation names',()=>{
 const code="import importlib.util,json; s=importlib.util.spec_from_file_location('voice','prepare-narration.py'); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); print(json.dumps([m.speech_text('[توقف]، «فاصله»؛ چرا؟ # !','fa'),m.speech_text('سرعت ۳.۵ کیلومتر، ۲۰٪','fa')],ensure_ascii=False))";
 const out=JSON.parse(execFileSync('python3',['-c',code],{cwd:new URL('..',import.meta.url),encoding:'utf8'}));assert.equal(out[0],'توقف فاصله چرا.');assert.equal(out[1],'سرعت 3 ممیز 5 کیلومتر 20 درصد');assert.doesNotMatch(out.join(' '),/علامت|نقطه|براکت/);
});

import {AssistantAnnouncer} from '../public/narration.js';
test('lesson voice buffers once, waits for other audio and stops immediately on a new round',async()=>{
 const {ctx,played}=fixture(),speaker=new AssistantAnnouncer({fetchAudio:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})});
 const state={mode:'demo',phase:'revealed',roundId:'lesson-r',serverTime:1000,assistant:{enabled:true,active:{id:'lesson-1',roundId:'lesson-r',expiresAt:30000,audioUrl:'/assistant/audio/lesson.wav'}}};
 speaker.update(state,ctx,{busy:true});await flush();assert.equal(played.length,0);speaker.update(state,ctx);await flush();assert.equal(played.length,1);
 speaker.update(state,ctx);await flush();assert.equal(played.length,1);speaker.update({...state,roundId:'other',phase:'waiting'},ctx);assert.equal(played[0].stopped,true);
});

test('careful Persian keeps suffixes/ezafe, pronounces explicit share differently from milk, and slows the voice',()=>{
 const code="import importlib.util,json; s=importlib.util.spec_from_file_location('voice','prepare-narration.py'); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); print(json.dumps({'text':m.speech_text('می‌خواهم گزینه‌ی درست، همراهی شما، شییر و share و شیر و پخش زنده','fa'),'scale':m.PERSIAN_LENGTH_SCALE,'volume':m.PERSIAN_VOLUME},ensure_ascii=False))";
 const out=JSON.parse(execFileSync('python3',['-c',code],{cwd:new URL('..',import.meta.url),encoding:'utf8'}));assert.equal(out.scale,1.25);assert.equal(out.volume,.78);assert.match(out.text,/می‌خواهم/);assert.match(out.text,/گزینهٔ درست/);assert.match(out.text,/همراهیِ شما/);assert.match(out.text,/شِیر و شِیر و شیر/);assert.match(out.text,/لایف/);assert.doesNotMatch(out.text,/پخش زنده/);
});
test('Persian speech mode requests only Persian welcome even when both welcome languages are selected',async()=>{
 const {ctx,played}=fixture(),urls=[],speaker=new WelcomeAnnouncer({fetchAudio:async url=>{urls.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}});
 speaker.update({mode:'demo',phase:'paused',narrationLanguage:'fa',serverTime:0,welcome:{enabled:true,language:'both',announcement:{id:'fa-only',demo:true,expiresAt:30000}}},ctx);await flush();assert.deepEqual(urls,['/narration/welcome-fa.wav']);assert.equal(played.length,1);
});

// Native normalizer is shared by question recordings and the resident assistant.
test('Afghan spoken vocabulary uses Flash and driver without changing German or unrelated words',()=>{
 const code="import importlib.util,json; s=importlib.util.spec_from_file_location('voice','prepare-narration.py'); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); print(json.dumps([m.speech_text('فلش Flash FLASH، رانندهٔ موتر، دریور، رانندگان، خودرو، رانندگی، فلشدار','fa'),m.speech_text('Flash Fahrer','de'),m.PRONUNCIATION_VERSION],ensure_ascii=False))";
 const out=JSON.parse(execFileSync('python3',['-c',code],{cwd:new URL('..',import.meta.url),encoding:'utf8'}));
 assert.equal(out[0],'فْلَش فْلَش فْلَش دْرَیوَرِ موتَر دْرَیوَر دْرَیوَرها موتَر رانندگی فلشدار');
 assert.equal(out[1],'Flash Fahrer');assert.equal(out[2],'fa-dari-v4');
});
