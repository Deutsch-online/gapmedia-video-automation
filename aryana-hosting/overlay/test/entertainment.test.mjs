import test from 'node:test';
import assert from 'node:assert/strict';
import {EntertainmentHost} from '../src/entertainment.mjs';
import {AutomaticSpeechBuffer} from '../src/automatic-speech.mjs';
import {HostSession} from '../src/host.mjs';
import {localizedReaction} from '../src/languages.mjs';
test('Named like thanks happen once at 100, 500 and 1000, including after restore',()=>{
 const host=new HostSession(),settings={names:[]};let id=0;
 const like=count=>host.accept('like',{user:{id:'maryam',nickname:'مریم'},count,common:{msgId:String(++id)}},settings);
 assert.equal(like(99).milestone,null);assert.equal(like(1).milestone,100);assert.match(host.likers.get('maryam').spokenName,/مریم/);assert.equal(like(1).milestone,null);assert.equal(like(399).milestone,500);
 const last=like(500);assert.equal(last.milestone,1000);assert.match(last.text,/مریم.*1000.*تشکر/);assert.match(localizedReaction(last.text,'en'),/1000 likes, Maryam/);
 const restored=new HostSession();restored.restore(JSON.parse(JSON.stringify(host.export())));assert.equal(restored.accept('like',{user:{id:'maryam',nickname:'مریم'},count:1,common:{msgId:'after'}},settings).milestone,null);
});
test('Combined like jumps make one highest thanks and numeric gift names remain unspoken',()=>{
 const host=new HostSession(),settings={names:[]};const reaction=host.accept('like',{user:{id:'s',nickname:'Sara'},count:1100,common:{msgId:'likes'}},settings);assert.equal(reaction.milestone,1000);
 const gift=host.accept('gift',{user:{id:'n',nickname:'99999'},diamondCount:1,common:{msgId:'gift'}},settings);assert.equal(gift.text,'بسیار تشکر!');assert.doesNotMatch(gift.text,/99999/);
 const named=host.accept('gift',{user:{id:'m',nickname:'مریم'},diamondCount:1,common:{msgId:'named'}},settings);assert.match(named.text,/مریم.*گیفت.*تشکر/);assert.match(localizedReaction(named.text,'en'),/gift, Maryam/);
});
test('Entertainment includes jokes with a light laugh and a real quiz with checked answers',()=>{
 let now=100000;const host=new EntertainmentHost({now:()=>now});assert.equal(host.next({language:'en'}).type,'explain');const joke=host.next({language:'en'});assert.equal(joke.type,'joke');assert.match(joke.text,/Ha ha/);
 const question=host.next({language:'en'});assert.equal(question.type,'quiz-question');assert.match(question.text,/A:.*B:/);assert.equal(host.answer('A','en'),null);
 host.published(question,6);const hint=host.next({language:'en'});assert.equal(hint.type,'quiz-hint');const reveal=host.next({language:'en'});assert.equal(reveal.notBefore,now+18000);assert(host.playable(reveal));
 const answer=host.answer('۱','fa');assert.match(answer,/درست است/);assert.match(answer,/بررسی/);assert.equal(host.playable(reveal),false);now+=100000;assert.equal(host.answer('A','en'),null);
});
test('Wrong quiz choices get a respectful correction and no invented winner or reward',()=>{
 const host=new EntertainmentHost();host.next({language:'en'});host.next({language:'en'});const quiz=host.next({language:'en'});host.published(quiz,3);const answer=host.answer('option B','en');assert.match(answer,/Good try.*answer is A/);assert.doesNotMatch(answer,/winner|prize|gift/i);
});
test('The next prepared clip can be ready while the current clip plays and comments interrupt it',()=>{
 let now=0;const buffer=new AutomaticSpeechBuffer({now:()=>now});buffer.observe(5);buffer.begin('next');const clip={audio:'next-audio',video:'video',durationSeconds:5,segment:{type:'explain'},context:'en:ai'};buffer.ready('next',clip);
 assert.equal(buffer.take({enabled:true,blocked:false,context:'en:ai'}),null);now=5100;assert.equal(buffer.take({enabled:true,blocked:false,context:'en:ai'}),clip);
 buffer.begin('stale');buffer.interrupt();assert.equal(buffer.ready('stale',clip),false);assert.equal(buffer.take({enabled:true,blocked:true,context:'en:ai'}),null);
});
test('Cached filler clips avoid immediate repeats and never reuse old quiz questions',()=>{
 let now=100000;const buffer=new AutomaticSpeechBuffer({now:()=>now});for(let n=0;n<3;n++)buffer.remember({audio:'a'+n,video:'v'+n,durationSeconds:3,segment:{type:'explain'},context:'en:ai'});
 buffer.remember({audio:'quiz',video:'q',segment:{type:'quiz-question'},context:'en:ai'});assert.equal(buffer.pool.length,3);buffer.begin('preparing');const one=buffer.take({enabled:true,blocked:false,context:'en:ai'});const two=buffer.take({enabled:true,blocked:false,context:'en:ai'});assert.notEqual(one.audio,two.audio);assert.equal(buffer.take({enabled:true,blocked:false,context:'fa:ai'}),null);
});
