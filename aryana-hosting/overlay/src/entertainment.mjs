import {topicContent} from './topics.mjs';
const jokes={
 en:['Here is a quick AI joke. Why did the chatbot bring a ladder? It wanted a higher level of intelligence. Ha ha!','A robot took a holiday because it needed to recharge. Ha ha! Even a robot appreciates a break.','I asked an AI for a quick answer. In the joke, it sent a thirty-slide presentation. Ha ha!','Why did the robot join a band? It had great algorithms and terrible rhythm. Ha ha!'],
 fa:['یک جوک کوتاه دربارهٔ هوش مصنوعی! چرا چت‌بات نردبان آورد؟ می‌خواست سطح هوشش بلندتر شود. ها ها!','ربات رخصتی گرفت، چون نیاز داشت دوباره شارژ شود. ها ها! حتی ربات هم گاهی استراحت می‌خواهد.','در یک جوک، از هوش مصنوعی یک جواب کوتاه خواستند؛ سی صفحه توضیح فرستاد. ها ها!','چرا ربات در گروه موسیقی شامل شد؟ الگوریتم خوب داشت، ولی ریتم را گم می‌کرد. ها ها!']
};
const quizzes=[
 {en:'Quick AI quiz! Can AI make a mistake? A: yes. B: never. Comment A or B.',fa:'یک کوییز کوتاه! آیا هوش مصنوعی ممکن است اشتباه کند؟ گزینهٔ یک: بله. گزینهٔ دو: هرگز. یک یا دو را کومنت کنید.',correct:'A',enWhy:'AI can be wrong, so check important answers.',faWhy:'هوش مصنوعی ممکن است اشتباه کند؛ جواب‌های مهم را بررسی کنید.'},
 {en:'Which prompt is clearer? A: tell me anything. B: explain AI to a beginner with an example. Comment A or B.',fa:'کدام درخواست روشن‌تر است؟ یک: یک چیزی بگو. دو: هوش مصنوعی را برای مبتدی با مثال توضیح بده. یک یا دو را کومنت کنید.',correct:'B',enWhy:'A clear goal and context make the request more useful.',faWhy:'هدف و زمینهٔ روشن، درخواست را مفیدتر می‌سازد.'},
 {en:'Another AI quiz! Does a fluent answer guarantee it is true? A: yes. B: no. Tell me A or B.',fa:'کوییز بعدی! آیا جواب روان حتماً درست است؟ یک: بله. دو: نه. یک یا دو را کومنت کنید.',correct:'B',enWhy:'A confident-sounding answer can still be incorrect.',faWhy:'جواب با لحن مطمئن هم ممکن است نادرست باشد.'},
 {en:'Should important AI answers be checked with reliable sources? A: yes. B: no. Comment your choice.',fa:'آیا جواب‌های مهم هوش مصنوعی را با منبع معتبر بررسی کنیم؟ یک: بله. دو: نه. انتخاب‌تان را کومنت کنید.',correct:'A',enWhy:'Checking reliable sources helps catch mistakes.',faWhy:'بررسی منبع معتبر به پیدا کردن اشتباه کمک می‌کند.'}
];
const retain={en:['Stay if you would like another challenge; a new AI quiz is coming up. Your comments make this conversation interesting.','We have another joke and a quiz to try together. Ask a question or share your opinion while you are here.'],fa:['اگر دوست دارید، برای چالش بعدی همراه بمانید؛ یک کوییز دیگر دربارهٔ هوش مصنوعی داریم. کومنت‌های شما گفتگو را جالب می‌سازد.','یک جوک و یک کوییز دیگر را با هم امتحان می‌کنیم. تا همراه ما هستید، سوال یا نظریهٔ خود را کومنت کنید.']};
export class EntertainmentHost{
 constructor({now=()=>Date.now()}={}){this.now=now;this.turn=0;this.facts=0;this.jokes=0;this.quizzes=0;this.active=null;}
 starters({language='fa',topic='ai'}={}){const locale=language==='en'?'en':'fa';return [{type:'explain',text:topicContent(topic,locale,0)},{type:'explain',text:topicContent(topic,locale,2)},{type:'joke',expression:'amused',text:jokes[locale][0]}];}
 next({language='fa',topic='ai'}={}){
  const locale=language==='en'?'en':'fa';
  if(this.active&&!this.active.finished){const quiz=this.active;if(!quiz.hinted&&this.now()<quiz.revealAt){quiz.hinted=true;return {type:'quiz-hint',quizId:quiz.id,text:locale==='en'?'Write A or B in the comments. I will explain the answer shortly; take a moment to choose.':'یک یا دو را کومنت کنید. کمی فرصت دارید انتخاب کنید؛ جواب را با توضیح می‌گویم.'};}return {type:'quiz-reveal',quizId:quiz.id,notBefore:quiz.revealAt,text:this.reveal(quiz,locale)};}
  const plan=['explain','joke','quiz','explain','retention','joke','quiz'],type=plan[this.turn++%plan.length];
  if(type==='explain')return {type,text:topicContent(topic,locale,this.facts++)};
  if(type==='joke')return {type,expression:'amused',text:jokes[locale][this.jokes++%jokes[locale].length]};
  if(type==='retention')return {type,text:retain[locale][Math.floor(this.turn/plan.length)%retain[locale].length]};
  const quiz=quizzes[this.quizzes++%quizzes.length];return {type:'quiz-question',quiz:{...quiz,id:'quiz-'+this.quizzes,locale},text:quiz[locale]};
 }
 reveal(quiz,locale){return locale==='en'?'The answer is '+quiz.correct+'. '+quiz.enWhy:'جواب، گزینهٔ '+(quiz.correct==='A'?'یک':'دو')+' است. '+quiz.faWhy;}
 published(segment,duration=0){if(segment.type==='quiz-question'){const now=this.now();this.active={...segment.quiz,askedAt:now,revealAt:now+duration*1000+12000,expiresAt:now+duration*1000+90000,hinted:false,finished:false};}else if(segment.type==='quiz-reveal'&&this.active?.id===segment.quizId)this.active.finished=true;}
 playable(segment){return !segment.quizId||this.active?.id===segment.quizId&&!this.active.finished;}
 selection(comment){if(!this.active||this.now()>this.active.expiresAt)return null;const text=String(comment).trim().toLowerCase().replace(/[۱١]/g,'1').replace(/[۲٢]/g,'2').replace(/^(?:option|answer|گزینه|جواب)\s*[:：]?\s*/,'');const match=text.match(/^(a|b|1|2|الف|ب)(?:[\s.!؟?]|$)/);if(!match)return null;return ['a','1','الف'].includes(match[1])?'A':'B';}
 related(comment){return Boolean(this.selection(comment))||Boolean(this.active&&this.now()<=this.active.expiresAt&&/^(?:repeat the question|what is the answer|what's the answer|جواب چیست|جواب کدام است|سوال را تکرار کن)[?؟!.]*$/i.test(String(comment).trim()));}
 answer(comment,language='fa'){if(!this.related(comment))return null;const quiz=this.active,locale=language==='en'?'en':'fa';if(/repeat the question|سوال را تکرار کن/i.test(comment))return quiz[locale];const choice=this.selection(comment);if(!choice){quiz.finished=true;return this.reveal(quiz,locale);}const correct=choice===quiz.correct;quiz.finished=true;return locale==='en'?(correct?'Correct! ':'Good try! ')+this.reveal(quiz,locale):(correct?'درست است! ':'کوشش خوب بود! ')+this.reveal(quiz,locale);}
 reset(){this.active=null;}
}
