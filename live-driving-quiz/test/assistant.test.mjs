import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LiveAssistant,ASSISTANT_DEFAULTS,validAssistantSettings,normalizeAssistantSettings,speakableComment,commentLeadIn} from '../live-assistant.mjs';
import {answerComment,explainQuestion} from '../teaching.mjs';
import {Quiz} from '../quiz.mjs';
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
 const {assistant,texts,setNow}=fixture();const event={content:'سلام، حق تقدم یعنی چه؟',user:{id:'1',nickname:'سارا'},common:{msgId:'a'}};
 assert.equal(assistant.comment(event,q,'open','r').accepted,true);assert.equal(assistant.comment(event,q,'open','r').reason,'duplicate');assert.equal(assistant.comment({...event,common:{msgId:'b'}},q,'open','r').reason,'cooldown');
 setNow(9000);assert.equal(assistant.comment({...event,content:'۱۲۳',common:{msgId:'c'}},q,'open','r').accepted,false);assert.equal(assistant.comment({...event,content:'نقطهٔ کور چیست؟',common:{msgId:'d'}},q,'open','r').accepted,true);await flush();
 assert.match(texts[0],/سارا/);assert.match(texts[0],/حق تقدم/);assert.doesNotMatch(texts.join('\n'),/یکی از دوستان نوشته/);
 const quiz=new Quiz(questions,{now:()=>1_700_000_000_000});quiz.start();
 assert.equal(quiz.comment({comment:'2',user:{id:'u',nickname:'سارا'},common:{msgId:'score',createTime:1_700_000_000}}).accepted,true);
 assert.equal(assistant.comment({content:'2',user:{id:'u',nickname:'سارا'},common:{msgId:'score-read'}},q,'open','r').reason,'not_readable');
});
test('only meaningful comments are read, with a warm named lead-in',async()=>{
 const {assistant,texts,setNow}=fixture();
 for(const [content,id] of [['هههه','g1'],['هاهاها','g2'],['ضصثقفغ','g3'],['اب','g4'],['😂🔥','g5'],['asdfqwer','g6'],['https://example.com/lesson','g7'],['www.example.com سلام','g8'],['123','g9'],['AAA','g10']])assert.equal(assistant.comment({content,user:{nickname:'سارا'},common:{msgId:id}},q,'open','r').reason,'not_readable',content);
 assert.equal(speakableComment('سلام asdf حق تقدم'),'سلام حق تقدم');
 assert.equal(commentLeadIn('سارا','حق تقدم چیست؟','seed').includes('سارا'),true);
 assert.match(commentLeadIn('سارا','حق تقدم چیست؟','seed'),/می‌گوید|سوال|می‌خوانم|نوشته|نوشتی|بشنویم/);
 assert.equal(commentLeadIn('Mary','سلام','1'),commentLeadIn('Mary','سلام','1'));
 assert.match(commentLeadIn('Mary','سلام','1'),/دوست گرامی/);
 setNow(0);assert.equal(assistant.comment({content:'Schulterblick یعنی چه؟',user:{nickname:'سارا'},common:{msgId:'term'}},q,'open','r').accepted,true);await flush();
 assert.match(texts.at(-1),/سارا/);assert.match(texts.at(-1),/Schulterblick/);assert.match(texts.at(-1),/نقطهٔ کور/);
});
test('like thanks names only the person whose own likes passed 500, and only once',async()=>{
 const {assistant,settings,texts,setNow}=fixture();const liker={user:{id:'sender',nickname:'مریم'}},quiet={user:{id:'quiet',nickname:'سارا'}},stranger={user:{id:'other',nickname:'علی'}};
 assistant.noteSupport('like',liker,{accepted:false},800);assistant.noteSupport('like',liker,{accepted:true,pending:true},800);assistant.flushThanks();assert.equal(assistant.queue.length,0);
 settings.likeThreshold=100;assistant.noteSupport('like',liker,{accepted:true},10);assistant.noteSupport('like',liker,{accepted:true},500);assistant.noteSupport('like',quiet,{accepted:true},80);assistant.flushThanks();assert.equal(assistant.queue.length,0);
 assistant.noteSupport('like',liker,{accepted:true},501);assistant.flushThanks();await flush();assert.equal(assistant.queue.length,1);assert.match(texts[0],/تشکر از لایکت، مریم!/);assert.doesNotMatch(texts[0],/سارا|علی|شییر|دوستان گرامی|پخش زنده|همهٔ دوستان/);assert.equal(assistant.thanks.size,0);
 assistant.noteSupport('like',liker,{accepted:true},900);assistant.flushThanks();assert.equal(assistant.queue.length,1);
 setNow(settings.thankGap*1000-1);assistant.noteSupport('like',stranger,{accepted:true},700);assistant.flushThanks();assert.equal(assistant.queue.length,1);
 const thankedAt=settings.thankGap*1000;setNow(thankedAt);assistant.flushThanks();await flush();assert.match(texts.at(-1),/تشکر از لایکت، علی!/);assert.doesNotMatch(texts.at(-1),/مریم|سارا/);
 settings.thankGap=120;setNow(thankedAt+119999);assistant.noteSupport('like',quiet,{accepted:true},600);assistant.flushThanks();assert.equal(texts.length,2);setNow(thankedAt+120000);assistant.flushThanks();await flush();assert.match(texts.at(-1),/تشکر از لایکت، سارا!/);
 const migrated=normalizeAssistantSettings({...ASSISTANT_DEFAULTS,likeThreshold:1,thankGap:40});assert.equal(migrated.likeThreshold,501);assert.equal(migrated.thankGap,40);
});
test('gift thanks is short, named, and skips anyone who did not send a finished gift',async()=>{
 const {assistant,settings,texts,setNow}=fixture();const giver={user:{id:'g',nickname:'مریم'}},second={user:{id:'g2',nickname:'سارا'}};
 assistant.noteSupport('gift',giver,{accepted:true,pending:true});assistant.noteSupport('gift',{user:{id:'no',nickname:'علی'}},{accepted:false});assistant.flushThanks();assert.equal(assistant.queue.length,0);
 assistant.noteSupport('gift',giver,{accepted:true,pending:false});assistant.noteSupport('gift',second,{accepted:true});assistant.flushThanks();await flush();
 assert.match(texts[0],/زنده باشین مریم، تشکر از هدیه‌ات!/);assert.match(texts[0],/زنده باشین سارا، تشکر از هدیه‌ات!/);assert.doesNotMatch(texts[0],/علی|همهٔ دوستان|شییر|دوستان گرامی/);
 setNow(settings.thankGap*1000);assistant.noteSupport('gift',{user:{id:'latin',nickname:'Alex'}},{accepted:true});assistant.flushThanks();await flush();assert.match(texts.at(-1),/زنده باشین دوست گرامی، تشکر از هدیه‌ات!/);
});
test('bounded queues, cancellation and voice errors cannot restart discarded speech or trigger a paid fallback',async()=>{
 let resolve;const assistant=new LiveAssistant({voice:{synthesize:()=>new Promise(r=>resolve=r)},settings:()=>ASSISTANT_DEFAULTS});for(let i=0;i<10;i++)assistant.enqueue({text:'سلام به شما '+i});assert.equal(assistant.queue.length,8);assistant.clear();resolve({audio:Buffer.from('RIFF'),durationMs:1000});await flush();assert.equal(assistant.queue.length,0);assert.equal(assistant.audio.size,0);
 const bad=new LiveAssistant({voice:{synthesize:async()=>{throw Error('No native voice');}},settings:()=>ASSISTANT_DEFAULTS});bad.enqueue({text:'سلام'});await flush();assert.equal(bad.stats.errors,1);assert.match(bad.lastError,/پولی استفاده نشد/);assert.equal(bad.active,null);
});
test('invalid assistant settings and missing Python fail closed with a settled promise',async()=>{
 assert.equal(validAssistantSettings(ASSISTANT_DEFAULTS),true);assert.equal(validAssistantSettings({...ASSISTANT_DEFAULTS,commentGap:0}),false);
 const speech=new LiveSpeech({python:'/no/such/native-python',timeout:1000});try{await assert.rejects(speech.synthesize('سلام'),/صدای محلی/);}finally{speech.close();}
});
