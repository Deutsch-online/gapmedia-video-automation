import {quizState,answerNumber,roundQuiz} from './free-play.mjs';
import {normalizeLiveEvent,personFromEvent} from './supporters.mjs';
import {welcomeName} from './bubble-stages.mjs';
import {profileWelcomeSpeech} from './league-voice.mjs';
const line=(language,en,fa)=>language==='fa'?fa:en;
export function participantInvite(language='en'){return line(language,'Fancy a quick challenge? Have a look at the question. What do you think?','یک چالش کوتاه، چطور است؟ سؤال را ببین. به نظرت جواب کدام است؟');}
export function questionSpeech(quiz,language='en'){if(!quiz?.available)return '';return quiz.question+' '+quiz.options.map((x,i)=>line(language,'Option ','گزینهٔ ')+(i+1)+'. '+x).join('. ')+'. '+line(language,'Which option do you think fits?','به نظر شما کدام گزینه درست است؟');}
export function commentSpeech({person,text,accepted,correct,answer,available=true,language='en',variant=0}){
 const n=welcomeName(person)||line(language,'friend','دوست عزیز'),v=Math.abs(variant)%3;
 if(accepted&&answer!==null){const correctLines=['Yes, you got it! What gave it away?','That is right! Did you know it, or work it out?','Nice one, that is right! What was your clue?'],correctFa=['آفرین، درست گفتی! از کجا فهمیدی؟','درست است! از قبل می‌دانستی، یا همین حالا حلش کردی؟','آفرین به دقتت، درست است! چه سرنخی پیدا کردی؟'],wrongLines=['Not this one, but good try! Shall we try the next question?','Ah, not quite. No worries! There is a fresh question coming.','Good try! That was not it. Let us have another go with the next one.'],wrongFa=['این بار درست نبود، ولی آفرین که امتحان کردی! برویم سراغ سؤال بعدی؟','این یکی درست نبود. اشکالی ندارد! سؤال بعدی یک فرصت تازه است.','آفرین به تلاشت! این بار درست نبود؛ با سؤال بعدی دوباره امتحان می‌کنیم.'];return n+'، '+(correct?line(language,correctLines[v],correctFa[v]):line(language,wrongLines[v],wrongFa[v]));}
 const t=String(text||'').trim().toLowerCase();
 if(/^(سلام|درود|hello|hi|hey)(\s|[!،,.؟?]|$)/u.test(t))return n+'، '+line(language,'hello! Glad you are here. What kind of questions do you enjoy?','سلام! خوشحالم اینجایی. بیشتر از چه جور سؤال‌هایی خوشت می‌آید؟');
 if(/^(چطور|چگونه|قانون|how|rules)/u.test(t))return n+'، '+line(language,'Read the question and send one option number, one to four. Each question accepts one answer per person.','سؤال را بخوان و شمارهٔ یک گزینه، از یک تا چهار را بنویس. برای هر سؤال، از هر نفر یک پاسخ ثبت می‌شود.');
 if(/^(ممنون|تشکر|مرسی|thanks|thank you)/u.test(t))return n+'، '+line(language,'you are welcome! I am glad we are sharing this moment.','خواهش می‌کنم! خوشحالم که این لحظه را با هم می‌گذرانیم.');
 if(answer!==null)return n+'، '+(available?line(language,'Your message arrived. Only one answer is recorded for each question; there is another chance with the next one.','پیامت رسید. برای هر سؤال فقط یک پاسخ ثبت می‌شود؛ با سؤال بعدی فرصت تازه داری.'):line(language,'Your message arrived. A new question will appear when the round resumes.','پیامت رسید. با ادامهٔ دور، سؤال تازه نمایش داده می‌شود.'));
 return n+'، '+line(language,['Thanks for your message. What topic would you enjoy next?','I saw your message. What clue in this question caught your attention?','Good to hear from you. Do you prefer football questions or number puzzles?'][v],['ممنون از پیامت. دوست داری موضوع سؤال بعدی چه باشد؟','پیامت را دیدم. کدام بخش این سؤال توجهت را جلب کرد؟','خوشحالم که همراهی می‌کنی. سؤال فوتبالی را دوست داری یا معمای عددی؟'][v]);
}
export function thanksSpeech(person,kind,language='en',variant=0){const n=welcomeName(person)||line(language,'friend','دوست عزیز');return n+'، '+(kind==='gift'?line(language,['Thank you for the gift. I appreciate your kindness.','That was kind of you. Thank you for your gift.'][variant%2],['برای هدیه‌ات ممنونم. مهربانی‌ات ارزشمند است.','خیلی لطف کردی، از هدیه‌ات تشکر می‌کنم.'][variant%2]):line(language,['Thank you for the likes. Glad you are enjoying the show.','Thanks for the warm reaction. It is lovely to have you here.'][variant%2],['برای لایک‌هایت ممنونم. خوشحالم که از برنامه لذت می‌بری.','از واکنش مهربانت ممنونم. بودنت در این جمع دلگرم‌کننده است.'][variant%2]));}
// Ephemeral speech only: no raw comment is read aloud or sent to a text generator.
export class QuizNarrator{
 constructor(){this.queue=[];this.active=null;this.seen=new Map();this.cooldowns=new Map();this.serial=0;this.questionKey='';this.welcomeKey='';this.language='';}
 push(kind,text,now,{key,priority=20,expiresAt=now+18000,questionKey,reaction,personName}={}){if(!text||text.length>600||expiresAt<=now||this.seen.has(key))return false;this.seen.set(key,now);this.queue.push({id:'narrator:'+now+':'+(++this.serial),kind,text,language:this.language,priority,expiresAt,questionKey,reaction,personName});this.queue.sort((a,b)=>b.priority-a.priority);this.queue=this.queue.slice(0,24);return true;}
 event(game,raw,result,now=Date.now()){
  if(raw.isTest||game.s.liveExperience!=='portraits')return false;const d=normalizeLiveEvent(raw),person=personFromEvent(d);if(!person.id||!['comment','like','gift'].includes(d.type))return false;
  const language=(game.s.audio?.narrationLanguage||game.s.language)==='fa'?'fa':'en';this.setLanguage(language);
  if(d.type==='gift'&&d.giftType===1&&!d.repeatEnd)return false;
  if(d.type!=='comment'&&!result.supporterChanged)return false;
  const receipt=d.eventId&&d.eventId!=='0'?d.type+':'+d.eventId:d.type+':'+person.id+':'+(d.comment||Math.floor(now/5000));if(this.seen.has(receipt))return false;this.seen.set(receipt,now);
  const key=d.type+':'+person.id,delay=d.type==='comment'?6000:d.type==='like'?30000:15000;if(now<(this.cooldowns.get(key)||0))return false;this.cooldowns.set(key,now+delay);
  const quiz=quizState(game.profileRound(),now,language),response=game.profileRound().quizResponses?.find(x=>x.id===person.id&&x.questionId===quiz.id),answer=answerNumber(d.comment);
  const text=d.type==='comment'?commentSpeech({person,text:d.comment,accepted:result.accepted,correct:response?.correct,answer,available:quiz.available,language,variant:this.serial}):thanksSpeech(person,d.type,language,this.serial);
  return this.push(d.type,text,now,{key:receipt+':speech',priority:d.type==='comment'?100:d.type==='gift'?45:35,reaction:d.type==='comment'?(result.accepted&&answer!==null?(response?.correct?'correct':'try-again'):'conversation'):'thanks',personName:welcomeName(person)});
 }
 setLanguage(language){if(this.language&&this.language!==language){this.queue=[];this.active=null;this.questionKey='';this.welcomeKey='';}this.language=language;}
 tick(game,now,{connected=false}={}){
  const previous=this.active?.id||'',enabled=game.s.liveExperience==='portraits'&&game.s.fun.football?.voiceEnabled!==false;
  if(!enabled){this.active=null;this.queue=[];return previous!=='';}
  this.setLanguage((game.s.audio?.narrationLanguage||game.s.language)==='fa'?'fa':'en');
  for(const [key,at]of this.seen)if(now-at>3600000)this.seen.delete(key);for(const [key,until]of this.cooldowns)if(until<now-60000)this.cooldowns.delete(key);
  const round=game.profileRound(),quiz=quizState(round,now,this.language),qkey=round.number+':'+quiz.id+':'+this.language;
  if(round.phase==='playing'&&quiz.available&&qkey!==this.questionKey){this.questionKey=qkey;this.push('question',questionSpeech(quiz,this.language),now,{key:'question:'+qkey,priority:60,questionKey:qkey,expiresAt:now+Math.max(0,(quiz.nextIn-2)*1000)});}
  const w=game.s.fun.welcomeActive;if(connected&&w&&now<w.endsAt&&w.id!==this.welcomeKey){this.welcomeKey=w.id;this.push('welcome',profileWelcomeSpeech(w.person,this.language,w.variant)+' '+participantInvite(this.language),now,{key:w.id,priority:10,expiresAt:now+35000});}
  const valid=x=>x.expiresAt>now&&(!x.questionKey||(round.phase==='playing'&&x.questionKey===qkey));this.queue=this.queue.filter(valid);
  if(this.active&&(this.active.endsAt<=now||!valid(this.active)))this.active=null;
  if(this.active&&this.active.kind!=='comment'&&this.queue[0]?.kind==='comment'){
   if(this.active.kind==='question'&&valid(this.active))this.queue.push({...this.active,id:this.active.id+':resume',priority:55});this.active=null;this.queue.sort((a,b)=>b.priority-a.priority);
  }
  if(!this.active&&this.queue.length){const item=this.queue.shift(),duration=Math.min(26000,Math.max(11000,item.text.length*65+4000));this.active={...item,startedAt:now,endsAt:Math.min(item.expiresAt,now+duration)};}
  return previous!==(this.active?.id||'');
 }
 view(sign){return this.active?{...this.active,speechText:this.active.text,speechUrl:sign(this.active.text,this.active.language,this.active.reaction==='correct'?'correct':this.active.reaction==='try-again'?'incorrect':this.active.kind)}:null;}
}

export function narratorPreview(kind,language='en'){
 const person={name:language==='fa'?'لینا':'Lina'},quiz=roundQuiz(1,language);
 if(kind==='question')return questionSpeech(quiz,language);
 if(kind==='correct'||kind==='incorrect')return commentSpeech({person,accepted:true,correct:kind==='correct',answer:1,language});
 if(kind==='comment')return commentSpeech({person,text:language==='fa'?'سلام':'hello',answer:null,language});
 if(kind==='like'||kind==='gift')return thanksSpeech(person,kind,language);
 if(kind==='welcome')return profileWelcomeSpeech(person,language,3)+' '+participantInvite(language);
 return '';
}

export function quizAtmosphere(quiz,language='en',variant=0){if(!quiz?.available)return line(language,'A fresh challenge is on its way.','یک چالش تازه در راه است.');const bank=quiz.nextIn>18?line(language,['Ready for a little challenge?','What catches your eye?','Take a moment. Find the clue.'],['آمادهٔ یک چالش کوتاه‌ای؟','کدام گزینه توجهت را جلب کرد؟','کمی فکر کن؛ سرنخ را پیدا کن.']):quiz.nextIn>8?line(language,['Compare the options. Which one fits?','A quick guess, or a clever clue?','What would you rule out first?'],['گزینه‌ها را مقایسه کن؛ کدام درست است؟','حدس سریع، یا یک سرنخ خوب؟','اول کدام گزینه را کنار می‌گذاری؟']):line(language,['Next challenge coming up!','Keep that curiosity for the next one.','Another little challenge in a moment.'],['چالش بعدی نزدیک است!','کنجکاوی‌ات را برای بعدی نگه دار.','تا چند لحظهٔ دیگر یک سؤال تازه.']);return bank[Math.abs(variant)%bank.length];}
