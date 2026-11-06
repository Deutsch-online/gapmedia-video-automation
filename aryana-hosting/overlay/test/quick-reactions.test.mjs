import test from 'node:test';
import assert from 'node:assert/strict';
import {HostSession} from '../src/host.mjs';
import {QuickReactions,quickPhrases} from '../src/quick-reactions.mjs';
import {dailyQuestion,dailyQuestionCount} from '../src/daily-questions.mjs';
import {hasEngagementRequest} from '../src/speech-policy.mjs';
const user=(id,name,level)=>({id,nickname:name,payGrade:level===undefined?undefined:{level}});
test('First actual like thanks each viewer immediately and keeps named milestones once',()=>{
 const host=new HostSession(),settings={names:[]};let n=0;const like=(id,name,count)=>host.accept('like',{user:user(id,name),count,common:{msgId:String(++n)}},settings);
 const first=like('m','مریم',1);assert.equal(first.firstLike,true);assert.match(first.text,/مریم.*لایک.*تشکر/);assert.equal(like('m','مریم',1).firstLike,false);assert.equal(like('s','Sara',1).firstLike,true);assert.equal(like('m','مریم',98).milestone,100);
 const restored=new HostSession();restored.restore(host.export());assert.equal(restored.accept('like',{user:user('m','مریم'),count:1,common:{msgId:'restored'}},settings).firstLike,false);
});
test('Known visitors above level 25 get special welcome and gratitude without soliciting more gifts',()=>{
 const host=new HostSession(),settings={names:[],language:'en'};const join=host.accept('join',{user:user('m','مریم',26),common:{msgId:'join'}},settings);assert.equal(join.vip,true);assert.match(join.text,/very warm welcome, Maryam/i);
 const gift=host.accept('gift',{user:user('m','مریم'),diamondCount:1,common:{msgId:'gift'}},settings);assert.equal(gift.vip,true);assert.match(gift.text,/kindness.*appreciated/i);assert.equal(hasEngagementRequest(gift.text),false);
 const exact=host.accept('join',{user:user('s','Sara',25),common:{msgId:'25'}},settings);assert.equal(exact.vip,false);
 const numeric=host.accept('join',{user:user('n','9999',90),common:{msgId:'num'}},settings);assert.equal(numeric.vip,false);assert.doesNotMatch(numeric.text,/9999/);
});
test('Cached welcome publishes on the join call, independent of model and speech queues',()=>{
 let now=1000;const published=[];const quick=new QuickReactions({now:()=>now,publish:clip=>published.push(clip)});quick.clips.set('welcome:fa',{text:quickPhrases['welcome:fa'],audio:'a',video:'v',durationSeconds:2});quick.offer('welcome','fa');assert.equal(published.length,1);assert.equal(quick.endAt,3000);
 quick.offer('welcome','fa');quick.offer('welcome','fa');assert.equal(published.length,1);now=3000;quick.drain();assert.equal(published.length,2);assert.equal(published[1].batchCount,2);assert(!published[0].text.includes('تشکر'));
});
test('A comment answer retains priority and queued welcomes resume afterwards',()=>{let blocked=true;const output=[];const quick=new QuickReactions({blocked:()=>blocked,publish:clip=>output.push(clip)});quick.clips.set('welcome:en',{text:'Hello, welcome!',durationSeconds:2});quick.offer('welcome','en');assert.equal(output.length,0);blocked=false;quick.drain();assert.equal(output.length,1);});
test('Daily questions cover both new and present viewers without requests for money or likes',()=>{assert.equal(dailyQuestionCount,32);for(const language of ['fa','en']){const seen=new Set();for(let n=0;n<dailyQuestionCount;n++){const question=dailyQuestion(n,language);assert.equal(hasEngagementRequest(question),false);assert(!seen.has(question));seen.add(question);}assert.equal(dailyQuestion(dailyQuestionCount,language),dailyQuestion(0,language));}});
