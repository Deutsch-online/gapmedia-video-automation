import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateQuestions,Quiz} from '../quiz.mjs';
import {bankManifest,loadBankMedia,validateImage} from '../bank-media.mjs';
const questions=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)));
test('live deck has source IDs, unchanged imported German/answer keys, and all associated images',()=>{
 assert.equal(validateQuestions(questions).length,bankManifest.question_count);const media=loadBankMedia(questions);assert.equal(media.size,questions.length+(bankManifest.videos||[]).length);
 for(const q of questions){
  const row=bankManifest.images.find(r=>r.question_id===q.id);assert.ok(row);
  const hash=createHash('sha256').update(JSON.stringify([q.de,q.options.map(o=>o.de),q.correct])).digest('hex');assert.equal(hash,row.text_key_sha256);
  const quiz=new Quiz([q]);const publicQuestion=quiz.snapshot().question;assert.equal(publicQuestion.correct,undefined);assert.equal(publicQuestion.image,q.image);quiz.start();if(q.video){quiz.round.opened=Date.now()-1;quiz.tick();}quiz.reveal();assert.deepEqual(quiz.snapshot().question.correct,q.correct);
 }
});
test('a corrupted image or a mismatched question image cannot enter the live deck',()=>{
 const row=bankManifest.images[0];const bytes=Buffer.from(loadBankMedia(questions).values().next().value);bytes[100]^=1;assert.throws(()=>validateImage(bytes,row),/integrity/);
 assert.throws(()=>loadBankMedia([{...questions[0],image:questions[1].image}]),/association/);
 assert.throws(()=>validateQuestions([{...questions[0],source:'https://example.com/fake'}]),/provenance/);
});

test('video questions reserve a viewing phase; gifts cannot count until the full film ends',()=>{
 const q=questions.find(q=>q.video);let now=100000;const quiz=new Quiz([q],{now:()=>now});quiz.start();
 assert.equal(quiz.phase,'watching');assert.equal(quiz.snapshot().question.video,q.video);
 assert.equal(quiz.submit({id:'early',userId:'v',name:'v',choice:q.correct[0],time:now}).reason,'watching_video');
 assert.throws(()=>quiz.start(),/already open/);assert.throws(()=>quiz.next(),/pause/);
 now+=q.video_duration_ms+1999;quiz.tick();assert.equal(quiz.phase,'watching');
 now+=1;quiz.tick();assert.equal(quiz.phase,'open');assert.equal(quiz.round.closes-now,30000);
 assert.equal(quiz.submit({id:'valid',userId:'v',name:'v',choice:q.correct[0],time:now}).accepted,true);
});
