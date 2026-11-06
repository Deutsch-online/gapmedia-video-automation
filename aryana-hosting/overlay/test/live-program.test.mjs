import test from 'node:test';
import assert from 'node:assert/strict';
import {LiveProgram} from '../src/live-program.mjs';
import {curriculum,parts} from '../src/live-curriculum.mjs';
import {AutomaticSpeechBuffer} from '../src/automatic-speech.mjs';
import {speechText} from '../src/speech-pronunciation.mjs';
import {ActiveViewers} from '../src/viewer-engagement.mjs';
import {createHash} from 'node:crypto';
// A deterministic model boundary: every request returns a different paragraph-sized response.
function modelFixture(prompt){const seed=createHash('sha256').update(prompt).digest('hex');return Array.from({length:42},(_,i)=>'example'+createHash('sha256').update(seed+':'+i).digest('hex').slice(0,7)).join(' ')+'.';}
test('Curriculum provides over nine hundred distinct lesson parts in both languages',()=>{assert(curriculum.length>=130);assert(parts.length>=7);assert(curriculum.length*parts.length>=900);assert.equal(new Set(curriculum.map(x=>x.en)).size,curriculum.length);assert.equal(new Set(curriculum.map(x=>x.fa)).size,curriculum.length);});
test('Two hours of simulated speech preparation and playback never repeats a segment',async()=>{
 let now=0;const program=new LiveProgram({now:()=>now}),buffer=new AutomaticSpeechBuffer({now:()=>now,playable:segment=>program.allows(segment)}),played=new Set();let generating=null,lastEnd=0,maxGap=0;
 for(now=0;now<7300000;now+=1000){
  if(generating&&now>=generating.at){buffer.ready(generating.ticket,generating.clip);generating=null;}
  const clip=buffer.take({enabled:true,blocked:false,context:'en:ai'});
  if(clip){assert(!played.has(clip.segment.key));played.add(clip.segment.key);assert(program.published(clip.segment,20));buffer.observe(20);if(lastEnd)maxGap=Math.max(maxGap,now-lastEnd);lastEnd=now+20000;}
  if(!generating&&!buffer.pending&&!buffer.prepared){const segment=await program.next(modelFixture,{language:'en'});assert(segment);const ticket='t'+now;assert(buffer.begin(ticket));generating={at:now+5000,ticket,clip:{segment,text:segment.text,audio:segment.key,video:segment.key+'.mp4',context:'en:ai',durationSeconds:20}};}
 }
 assert(program.snapshot().targetReached);assert(program.scheduledSeconds>=7200);assert(played.size>=360);assert(maxGap<2000);
 const restored=new LiveProgram();restored.restore(JSON.parse(JSON.stringify(program.export())));assert.equal(restored.used.size,program.used.size);const fresh=await restored.next(modelFixture,{language:'en'});assert(!played.has(fresh.key));
});
test('Rephrasing with the same lesson key and changing only a viewer name cannot bypass history',()=>{const program=new LiveProgram();const original={key:'one',text:'Maryam, a clear prompt includes a goal, useful context and an example. Ask for one short explanation and check that the reply actually follows the request you made.'};program.published(original,12);assert.equal(program.allows({...original,text:'A completely different sentence.'}),false);assert.equal(program.allows({key:'two',text:original.text.replace('Maryam','Sara')}),false);});
test('Cancelled generation never appears later or advances spoken duration',async()=>{const program=new LiveProgram();let finish;const pending=program.next(()=>new Promise(resolve=>{finish=resolve;}));program.cancel();finish(modelFixture('late'));assert.equal(await pending,null);assert.equal(program.scheduledSeconds,0);assert.equal(program.used.size,0);});
test('Failed or very short model output is surfaced and not counted as prepared speech',async()=>{const program=new LiveProgram();await assert.rejects(program.next(async()=>'Hi!'));assert.equal(program.used.size,0);assert.equal(program.failures,1);assert.equal(program.reserved.size,0);});
test('Future quiz answers do not block a different prepared speech segment',()=>{let now=0;const buffer=new AutomaticSpeechBuffer({now:()=>now});buffer.begin('answer');buffer.ready('answer',{audio:'a',video:'v',segment:{type:'quiz-reveal',notBefore:12000},context:'en:ai'});assert.equal(buffer.prepared,null);assert(buffer.begin('other'));buffer.ready('other',{audio:'b',video:'w',segment:{type:'program'},context:'en:ai'});assert.equal(buffer.take({enabled:true,blocked:false,context:'en:ai'}).audio,'b');now=12000;assert.equal(buffer.take({enabled:true,blocked:false,context:'en:ai'}).audio,'a');buffer.interrupt();assert.equal(buffer.deferred.length,0);});
test('Cached fillers are consumed only once and pronunciation marks preserve display spelling',()=>{const buffer=new AutomaticSpeechBuffer();const clip={audio:'one',video:'one',context:'en:ai',segment:{type:'explain'}};buffer.remember(clip);assert(buffer.take({enabled:true,blocked:false,context:'en:ai'}));buffer.remember(clip);assert.equal(buffer.pool.length,0);assert.equal(speechText('مجری، کومنت‌های شما و یک کومنت.'),'مجرِی، کومِنت‌های شما و یک کومِنت.');});
test('Only recent recognized first names can be used in optional callouts',()=>{let now=0;const viewers=new ActiveViewers({now:()=>now});for(const nickname of ['9999','Sara99','unknown'])viewers.observe({user:{id:nickname,nickname}},{names:[]});assert.equal(viewers.next(),null);viewers.observe({user:{id:'m',nickname:'مریم'}},{names:[]});assert.equal(viewers.next().englishName,'Maryam');viewers.spoken('m');assert.equal(viewers.next(),null);now=180001;assert.equal(viewers.fresh('m'),false);});
