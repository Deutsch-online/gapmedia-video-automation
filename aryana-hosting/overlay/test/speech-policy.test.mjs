import test from 'node:test';
import assert from 'node:assert/strict';
import {hasEngagementRequest,assertSpeechAllowed,SPEECH_RULE} from '../src/speech-policy.mjs';
import {supportSegment} from '../src/support-prompts.mjs';
import {topicContent,topicChoices} from '../src/topics.mjs';
import {LiveProgram} from '../src/live-program.mjs';
import {gratitude} from '../src/host.mjs';
test('Persian and English requests for gifts, likes, tapping and engagement targets are blocked',()=>{
 for(const text of ['Please send me a gift.','Send some hearts!','Give us more likes.','Drop a rose.','Like this live!','Tap the screen to support us.','Double-tap to keep this going.','Let us reach 1000 likes.','A like is welcome.','Your gifts help keep this going.','Support me with gifts.','Do not be shy, send me gifts.','Thank you, please send another gift.','گیفت بفرستید.','یک هدیه بدهید.','لایک کنید.','لایک‌کنید.','صفحه را تپ‌تپ کنید.','قلب بفرستید.','برای حمایت لایک بزنید.','به هزار لایک برسیم.','لایک شما خوشحال‌کننده است.','مریم جان، گیفت ارسال کنید.','بسیار تشکر؛ گیفت بفرستید.']){
  assert.equal(hasEngagementRequest(text),true,text);assert.throws(()=>assertSpeechAllowed(text));
 }
});
test('Thanks for existing support, ordinary preferences and voluntary questions remain allowed',()=>{
 for(const text of ['Thank you very much for the gift, Maryam!','Thank you very much for 1000 likes, Maryam!','Thanks for your likes, they help.','I like learning about AI.','I would like to hear your view.','No gift is needed to take part.','Please do not send gifts.','You do not have to send a gift.','Never ask for likes.','Ask a question or share your view.','What example would you like explained next?','بسیار تشکر!','مریم جان، از گیفت‌تان بسیار تشکر!','مریم جان، برای 1000 لایک بسیار تشکر!','برای شرکت در گفتگو گیفت لازم نیست.','گیفت نفرستید.','سوال و نظریهٔ خود را کومنت کنید.']){
  assert.equal(hasEngagementRequest(text),false,text);assert.doesNotThrow(()=>assertSpeechAllowed(text));
 }
 for(const language of ['fa','en'])for(const kind of ['gift','like'])assert.equal(hasEngagementRequest(gratitude('Maryam',kind,100,language)),false);
});
test('All prepared invitations in both languages follow the new speech policy',()=>{
 for(const language of ['fa','en']){
  for(let i=0;i<16;i++){const clip=supportSegment(i,language,{id:'m',name:'مریم',englishName:'Maryam'});assert.equal(hasEngagementRequest(clip.text),false,clip.text);assert.doesNotMatch(clip.text,/تپ|لایک|گیفت|\bgifts?\b|\blikes\b|\btap\b/i);}
  for(const topic of topicChoices)for(let i=0;i<30;i++){const text=topicContent(topic,language,i);assert.equal(hasEngagementRequest(text),false,text);}
 }
 assert.match(SPEECH_RULE,/gifts.*likes.*tap/);
});
test('A generated programme solicitation is rejected instead of being scheduled as new content',async()=>{
 const program=new LiveProgram();await assert.rejects(program.next(async()=>Array(8).fill('Please send me a gift.').join(' '),{language:'en'}));assert.equal(program.used.size,0);assert.equal(program.scheduledSeconds,0);assert.equal(program.reserved.size,0);
});
