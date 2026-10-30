import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicConversation} from '../src/topics.mjs';
import {SpeechQueue} from '../src/speech-queue.mjs';
import {latinLabel} from '../public/latin-label.js';
test('Display names contain no Persian text and keep Latin and numeric names',()=>{for(const name of ['مریم','احمد محمد','۹۹۹۹','همراه','عایشه','فارسی‌نویس'])assert.doesNotMatch(latinLabel(name),/[\u0600-\u06ff]/);assert.equal(latinLabel('مریم'),'Maryam');assert.equal(latinLabel('۹۹۹۹'),'9999');assert.equal(latinLabel('Sara'),'Sara');});
test('Topic host stays quiet while disconnected, paused or responding to a viewer',()=>{let now=100000;const planner=new TopicConversation({now:()=>now});now+=30000;const context={connected:true,enabled:true,autoSpeak:true,busy:false,topic:'food'};for(const override of [{connected:false},{enabled:false},{autoSpeak:false},{busy:true},{lastActivity:now-1000}])assert.equal(planner.take({...context,...override}),null);assert.match(planner.take(context),/منتو/);assert.equal(planner.take(context),null);});
test('Topic speech changes its question after the interval and follows English selection',()=>{let now=0;const planner=new TopicConversation({now:()=>now});const context={connected:true,enabled:true,autoSpeak:true,busy:false,language:'en',topic:'travel'};now=30000;const first=planner.take(context);assert.match(first,/AI/);assert.doesNotMatch(first,/[\u0600-\u06ff]/);now+=74999;assert.equal(planner.take(context),null);now++;const next=planner.take(context);assert.notEqual(next,first);});
test('Gift and comment replies displace low-priority topic speech',()=>{const queue=new SpeechQueue({limit:1});queue.push('topic','topic',1);assert(queue.push('viewer reply','reply',1));assert.equal(queue.shift(1).text,'viewer reply');queue.push('gift','gift',1);assert.equal(queue.push('topic','topic',1),false);});

test('English LIVE never selects Afghanistan food topics, including restored legacy selections',()=>{let now=0;const planner=new TopicConversation({now:()=>now});now=30000;const text=planner.take({connected:true,enabled:true,autoSpeak:true,busy:false,language:'en',topic:'food'});assert.match(text,/AI/);assert.doesNotMatch(text,/Afghan|mantu|ashak|pulao/i);});

test('Host invites AI-versus-human opinions, questions, screen taps and sharing with friends in both languages',()=>{
 for(const language of ['fa','en']){
  let now=0;const planner=new TopicConversation({now:()=>now}),spoken=[];
  for(let turn=0;turn<6;turn++){now=30000+turn*75000;spoken.push(planner.take({connected:true,enabled:true,autoSpeak:true,busy:false,language,topic:'ai'}));}
  const all=spoken.join(' ');
  if(language==='en'){assert.match(all,/human host/);assert.match(all,/AI host/);assert.match(all,/thoughts/);assert.match(all,/comments/);assert.match(all,/questions.*answer/);assert.match(all,/tap the screen/);assert.match(all,/share.*friends/);assert.doesNotMatch(all,/Afghan|pulao|mantu/i);}
  else{assert.match(all,/مجری انسانی/);assert.match(all,/مجری هوش مصنوعی/);assert.match(all,/نظریات/);assert.match(all,/کمنت/);assert.match(all,/سوال.*جواب/);assert.match(all,/تپ‌تپ/);assert.match(all,/دوستان.*شریک/);}
  assert(!/share|شریک/.test(spoken[0]));assert(!/share|شریک/.test(spoken[1]));assert(!/share|شریک/.test(spoken[2]));assert(new Set(spoken).size===spoken.length);
  assert.equal(planner.take({connected:true,enabled:true,autoSpeak:true,busy:false,language,topic:'ai'}),null);
 }
});

test('AI topics explain an idea with examples before requesting audience opinions',()=>{for(const language of ['en','fa']){let now=0;const planner=new TopicConversation({now:()=>now});now=30000;const first=planner.take({connected:true,enabled:true,autoSpeak:true,busy:false,language,topic:'ai'});assert.doesNotMatch(first,/[?؟]/);assert.match(first,language==='en'?/patterns.*example|examples.*autocomplete/is:/الگو.*مثال/);now+=150000;const next=planner.take({connected:true,enabled:true,autoSpeak:true,busy:false,language,topic:'ai'});assert(next);}});
