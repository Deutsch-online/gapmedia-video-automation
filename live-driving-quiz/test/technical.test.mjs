import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bankSections} from '../sections.mjs';
import {validateQuestions} from '../quiz.mjs';
import {explainQuestion} from '../teaching.mjs';
import {winnerEncouragement} from '../live-assistant.mjs';
const questions=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)));
test('50 genuine technical lessons have specific explanations; text-only questions never get invented examination images',()=>{
 const technical=questions.filter(q=>q.id.startsWith('2.7.'));assert.equal(technical.length,50);assert.equal(bankSections(questions).technical.ids.length,50);
 for(const q of technical){assert.equal(q.detailed_lesson,true);assert.ok(q.explanation_fa.length>100);assert.ok(explainQuestion(q,{reveal:true}).includes(q.explanation_fa));assert.doesNotMatch(explainQuestion(q,{reveal:true}),/تطبیق دهید|باید انتخاب شوند/);if(q.learning_example)assert.ok(readFileSync(new URL('../public'+q.learning_example,import.meta.url),'utf8').includes('kein Original-Prüfungsbild'));}
 const text=technical.find(q=>q.source_media==='none');assert.equal(text.image,undefined);assert.doesNotThrow(()=>validateQuestions([text]));assert.throws(()=>validateQuestions([{...text,image:'/media/fake.png'}]),/provenance/);
});
test('winner encouragement names only supplied winners and varies without extra advice',()=>{
 assert.equal(winnerEncouragement([]),'');const a=winnerEncouragement(['مریم','علی','مریم'],'a'),b=winnerEncouragement(['مریم','علی'],'b');assert.match(a,/مریم/);assert.match(a,/علی/);assert.equal(a.match(/مریم/g).length,1);assert.notEqual(a,b);assert.doesNotMatch(a,/تطبیق|همهٔ گزینه/);
});
