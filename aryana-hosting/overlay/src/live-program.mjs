import {createHash} from 'node:crypto';
import {curriculum,parts} from './live-curriculum.mjs';
import {hasEngagementRequest} from './speech-policy.mjs';
const normalize=text=>String(text||'').normalize('NFKC').toLowerCase().replace(/[\u064b-\u065f\u0670]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const digest=text=>createHash('sha256').update(text).digest('hex');
const shingles=text=>{const words=normalize(text).split(' ');return new Set(words.slice(0,-3).map((_,i)=>words.slice(i,i+4).join(' ')));};
export class LiveProgram{
 constructor({now=()=>Date.now(),targetSeconds=7200}={}){this.now=now;this.targetSeconds=targetSeconds;this.reset();}
 reset(){this.used=new Set();this.texts=[];this.shingleSets=[];this.hashes=new Set();this.reserved=new Map();this.cursor=0;this.scheduledSeconds=0;this.failures=0;this.lastError='';this.epoch=(this.epoch||0)+1;}
 cancel(){this.epoch++;this.reserved.clear();}
 key(segment){return segment?.key||'text:'+digest(normalize(segment?.text));}
 allows(segment){if(!segment?.text||hasEngagementRequest(segment.text))return false;const text=normalize(segment.text);if(this.used.has(this.key(segment))||this.hashes.has(digest(text)))return false;const a=shingles(text);if(a.size<12)return true;for(const b of this.shingleSets){let shared=0;for(const term of a)if(b.has(term))shared++;if(shared/Math.min(a.size,b.size)>.8)return false;}return true;}
 accept(segment){if(!this.allows(segment)||this.reserved.has(this.key(segment)))return false;this.reserved.set(this.key(segment),this.now());return true;}
 async next(generate,{language='fa',valid=()=>true}={}){
  const locale=language==='en'?'en':'fa',epoch=this.epoch,total=curriculum.length*parts.length;
  for(let step=0;step<total;step++){
   const index=(this.cursor+step)%total,lesson=curriculum[Math.floor(index/parts.length)],part=index%parts.length,key=lesson.id+':'+part;
   if(this.used.has(key)||this.reserved.has(key))continue;this.reserved.set(key,this.now());
   const previous=this.texts.slice(-2).map(text=>text.slice(0,180)).join(' / ');
   const prompt=(locale==='en'?'Lesson: '+lesson.en+'. ':'موضوع: '+lesson.fa+'. ')+parts[part][locale==='en'?0:1]+(locale==='en'?' Speak 40 to 65 words naturally, without headings, lists or a greeting. Stay on this exact topic. Avoid these recent passages: ':' در ۴۰ تا ۶۵ کلمه طبیعی صحبت کن؛ بدون عنوان، فهرست یا سلام مجدد. همین موضوع را نگه دار. این بخش‌های قبلی را تکرار نکن: ')+previous;
   try{for(let attempt=0;attempt<2;attempt++){
    const text=String(await generate(prompt,locale)||'').trim().slice(0,600);
    if(epoch!==this.epoch||!valid()){this.reserved.delete(key);return null;}
    const segment={key,type:'program',text,lesson:lesson.id,part,locale};
    if(text.split(/\s+/).length>=30&&this.allows(segment)){this.cursor=(index+1)%total;this.lastError='';return segment;}
   }throw Error('بخش تازه کوتاه یا تکراری بود.');}
   catch(error){this.reserved.delete(key);if(epoch!==this.epoch||!valid())return null;this.cursor=(index+1)%total;this.failures++;this.lastError=String(error.message||error).slice(0,180);throw error;}
  }
  this.lastError='فهرست موضوع‌های تازهٔ این جلسه تمام شده است.';return null;
 }
 published(segment,duration=0){if(!this.allows(segment))return false;const key=this.key(segment);this.used.add(key);this.reserved.delete(key);const text=normalize(segment.text);this.hashes.add(digest(text));this.texts.push(text);this.shingleSets.push(shingles(text));if(this.texts.length>2000){this.texts.shift();this.shingleSets.shift();}this.scheduledSeconds+=Math.max(0,Number(duration)||0);return true;}
 snapshot(){return {targetSeconds:this.targetSeconds,scheduledSeconds:Math.round(this.scheduledSeconds),segments:this.used.size,availableLessonParts:curriculum.length*parts.length,repeatPolicy:'whole_session',targetReached:this.scheduledSeconds>=this.targetSeconds,failures:this.failures,lastError:this.lastError};}
 export(){return {version:1,used:[...this.used],texts:this.texts,scheduledSeconds:this.scheduledSeconds,cursor:this.cursor};}
 restore(data){if(data?.version!==1)return;this.used=new Set((Array.isArray(data.used)?data.used:[]).filter(key=>typeof key==='string'&&key.length<150).slice(0,2500));this.texts=(Array.isArray(data.texts)?data.texts:[]).filter(text=>typeof text==='string').map(text=>normalize(text).slice(0,600)).slice(-2000);this.hashes=new Set(this.texts.map(digest));this.shingleSets=this.texts.map(shingles);this.scheduledSeconds=Number.isFinite(data.scheduledSeconds)?Math.max(0,data.scheduledSeconds):0;this.cursor=Number.isInteger(data.cursor)&&data.cursor>=0?data.cursor:0;this.reserved.clear();}
}
