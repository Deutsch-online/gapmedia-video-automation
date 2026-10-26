import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LiveAssistant,ASSISTANT_DEFAULTS,validAssistantSettings} from '../live-assistant.mjs';
import {answerComment,explainQuestion} from '../teaching.mjs';
import {LiveSpeech} from '../live-speech.mjs';
const questions=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url))),q=questions[0],flush=()=>new Promise(r=>setImmediate(r));
const fixture=()=>{let now=0;const texts=[],settings={...ASSISTANT_DEFAULTS},voice={state:'ready',synthesize:async text=>{texts.push(text);return {audio:Buffer.from('RIFF-test'),durationMs:1000};}},assistant=new LiveAssistant({voice,settings:()=>settings,now:()=>now});return {assistant,settings,texts,setNow:value=>{now=value;}};};
test('all bank lessons use exactly bank-correct options; pre-answer hints do not disclose choice numbers',()=>{
 for(const question of questions){const hidden=answerComment('جواب را توضیح بدهید',question,{revealed:false});assert.equal(hidden.kind,'hint');assert.doesNotMatch(hidden.text,/گزینهٔ [123]/);const shown=explainQuestion(question,{reveal:true});for(const key of question.correct)assert.ok(shown.includes(['یک','دو','سه']['ABC'.indexOf(key)]));assert.doesNotMatch(shown,/باید انتخاب شوند|تطبیق دهید/);}
 assert.equal(answerComment('۱۲۳',q),null);assert.equal(answerComment('123',q),null);assert.match(answerComment('Schulterblick یعنی چه؟',q).text,/نقطهٔ کور/);
});
test('queue waits for an idle slot, preserves long explanations, deduplicates automatic/manual explanation and retires old rounds',async()=>{
 const {assistant,texts,setNow}=fixture();const long=questions.find(q=>q.detailed_lesson&&q.explanation_fa.length>235);assistant.explain(long,'round1',{revealed:true});assistant.explain(long,'round1',{revealed:true,owner:true});await flush();assert.equal(assistant.queue.length,1);assert.equal(texts[0],explainQuestion(long,{reveal:true}));
 assert.equal(assistant.tick({roundId:'round1',phase:'open',canSpeak:false}),null);assert.equal(assistant.snapshot().active,null);
 const spoken=assistant.tick({roundId:'round1',phase:'revealed',canSpeak:true});assert.equal(spoken.kind,'explanation');assert.ok(assistant.getAudio(spoken.id));assert.equal(assistant.snapshot({roundId:'other',phase:'waiting'}).active,null);
 setNow(10);assistant.tick({roundId:'round2',phase:'open',canSpeak:false});assert.equal(assistant.active,null);
});
test('Persian comments are rate-limited and numeric answers never get read or alter answer scoring',async()=>{
 const {assistant,setNow}=fixture();const event={content:'سلام، حق تقدم یعنی چه؟',user:{id:'1',nickname:'سارا'},common:{msgId:'a'}};
 assert.equal(assistant.comment(event,q,'open','r').accepted,true);assert.equal(assistant.comment(event,q,'open','r').reason,'duplicate');assert.equal(assistant.comment({...event,common:{msgId:'b'}},q,'open','r').reason,'cooldown');
 setNow(9000);assert.equal(assistant.comment({...event,content:'۱۲۳',common:{msgId:'c'}},q,'open','r').accepted,false);assert.equal(assistant.comment({...event,content:'نقطهٔ کور چیست؟',common:{msgId:'d'}},q,'open','r').accepted,true);await flush();
});
test('only accepted final gift events and real per-user like totals produce bounded grouped thanks',async()=>{
 const {assistant,settings,texts}=fixture();const event={user:{id:'sender',nickname:'مریم'}};
 assistant.noteSupport('gift',event,{accepted:true,pending:true});assistant.noteSupport('gift',event,{accepted:false});assistant.flushThanks();assert.equal(assistant.queue.length,0);
 settings.likeThreshold=100;assistant.noteSupport('like',event,{accepted:true},10);assistant.flushThanks();assert.equal(assistant.queue.length,0);
 assistant.noteSupport('gift',event,{accepted:true,pending:false});assistant.noteSupport('like',event,{accepted:true},100);assistant.flushThanks();await flush();assert.equal(assistant.queue.length,1);assert.match(texts[0],/هدیه/);assert.match(texts[0],/لایک/);assert.match(texts[0],/مریم/);assert.match(texts[0],/تشکر، دوستان گرامی، از لایک/);assert.match(texts[0],/لایف را شییر کنید/);assert.doesNotMatch(texts[0],/پخش زنده/);assert.equal(assistant.thanks.size,0);
});
test('bounded queues, cancellation and voice errors cannot restart discarded speech or trigger a paid fallback',async()=>{
 let resolve;const assistant=new LiveAssistant({voice:{synthesize:()=>new Promise(r=>resolve=r)},settings:()=>ASSISTANT_DEFAULTS});for(let i=0;i<10;i++)assistant.enqueue({text:'سلام به شما '+i});assert.equal(assistant.queue.length,8);assistant.clear();resolve({audio:Buffer.from('RIFF'),durationMs:1000});await flush();assert.equal(assistant.queue.length,0);assert.equal(assistant.audio.size,0);
 const bad=new LiveAssistant({voice:{synthesize:async()=>{throw Error('No native voice');}},settings:()=>ASSISTANT_DEFAULTS});bad.enqueue({text:'سلام'});await flush();assert.equal(bad.stats.errors,1);assert.match(bad.lastError,/پولی استفاده نشد/);assert.equal(bad.active,null);
});
test('invalid assistant settings and missing Python fail closed with a settled promise',async()=>{
 assert.equal(validAssistantSettings(ASSISTANT_DEFAULTS),true);assert.equal(validAssistantSettings({...ASSISTANT_DEFAULTS,commentGap:0}),false);
 const speech=new LiveSpeech({python:'/no/such/native-python',timeout:1000});try{await assert.rejects(speech.synthesize('سلام'),/صدای محلی/);}finally{speech.close();}
});
