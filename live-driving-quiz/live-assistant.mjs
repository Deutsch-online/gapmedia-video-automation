import {randomUUID} from 'node:crypto';
import {cleanComment,hasPersian,answerComment,explainQuestion,teachingNote} from './teaching.mjs';
export const ASSISTANT_DEFAULTS={enabled:true,showCaptions:false,readComments:true,replyComments:true,autoExplain:true,thankLikes:true,thankGifts:true,likeThreshold:1,commentGap:8,thankGap:20};
export function validAssistantSettings(s){return s&&['enabled','showCaptions','readComments','replyComments','autoExplain','thankLikes','thankGifts'].every(k=>typeof s[k]==='boolean')&&Number.isInteger(s.likeThreshold)&&s.likeThreshold>=1&&s.likeThreshold<=1000&&Number.isInteger(s.commentGap)&&s.commentGap>=3&&s.commentGap<=60&&Number.isInteger(s.thankGap)&&s.thankGap>=10&&s.thankGap<=120;}
const numberOnly=text=>/^[\s\d۰-۹٠-٩,،.؟?!]+$/.test(text);
const personName=event=>cleanComment(event.user?.nickname||event.user?.displayId||event.user?.uniqueId||'بیننده').slice(0,40);
const spokenName=name=>/^[\u0600-\u06ff\s\u200c]+$/.test(name)?name.slice(0,30):'دوست گرامی';
export class LiveAssistant{
 constructor({voice,settings=()=>ASSISTANT_DEFAULTS,now=()=>Date.now()}={}){this.voice=voice;this.settings=settings;this.now=now;this.generation=0;this.preparing=false;this.queue=[];this.active=null;this.audio=new Map();this.seen=new Map();this.thanks=new Map();this.lastComment=-Infinity;this.lastThanks=-Infinity;this.lastError=null;this.history=[];this.stats={queued:0,spoken:0,dropped:0,errors:0};}
 enabled(){return this.settings().enabled;}
 seenEvent(key){if(!key)return false;const now=this.now();if(this.seen.has(key)&&now-this.seen.get(key)<180000)return true;this.seen.set(key,now);while(this.seen.size>1000)this.seen.delete(this.seen.keys().next().value);return false;}
 enqueue({text,title='دستیار درسی',kind='text',roundId=null,requiresReveal=false,priority=2,key=null}){
  if(!this.enabled())return {accepted:false,reason:'disabled'};
  text=cleanComment(text,1500);if(!text||!hasPersian(text))return {accepted:false,reason:'persian_text_required'};
  if(key&&this.seenEvent('job:'+key))return {accepted:false,reason:'duplicate'};
  if(this.queue.length>=8){if(priority===0){const index=this.queue.findLastIndex(j=>j.priority>0);if(index>=0)this.queue.splice(index,1);else return {accepted:false,reason:'queue_full'};}else{this.stats.dropped++;return {accepted:false,reason:'queue_full'};}}
  const job={id:randomUUID(),text,title:cleanComment(title).slice(0,70),kind,roundId,requiresReveal,priority,at:this.now(),status:'queued'};
  this.queue.push(job);this.queue.sort((a,b)=>a.priority-b.priority||a.at-b.at);this.stats.queued++;this.prepare();return {accepted:true,id:job.id};
 }
 async prepare(){
  if(this.preparing)return;const job=this.queue.find(j=>j.status==='queued');if(!job)return;
  const generation=this.generation;this.preparing=true;job.status='preparing';
  try{const clip=await this.voice.synthesize(job.text);if(generation!==this.generation)return;job.durationMs=clip.durationMs;job.status='ready';this.audio.set(job.id,{audio:clip.audio,at:this.now()});this.lastError=null;}
  catch{if(generation===this.generation){this.queue=this.queue.filter(j=>j!==job);this.stats.errors++;this.lastError='تولید صدای محلی فارسی ناموفق بود؛ از سرویس پولی استفاده نشد.';}}
  finally{this.preparing=false;this.prepare();}
 }
 comment(event,q,phase,roundId){
  const config=this.settings(),text=cleanComment(event.content??event.comment??event.text),msg=String(event.common?.msgId??event.msgId??'');
  if(!this.enabled()||!hasPersian(text)||numberOnly(text)||/https?:|www\./i.test(String(event.content??event.comment??'')))return {accepted:false,reason:'not_readable'};
  if(msg&&!/^0+$/.test(msg)&&this.seenEvent('comment:'+msg))return {accepted:false,reason:'duplicate'};
  if(this.now()-this.lastComment<config.commentGap*1000)return {accepted:false,reason:'cooldown'};
  const reply=config.replyComments?answerComment(text,q,{revealed:phase==='revealed'}):null;
  const read=config.readComments?'نظر بیننده: '+text.slice(0,160):'';
  if(!read&&!reply)return {accepted:false,reason:'not_relevant'};
  const result=this.enqueue({text:[read,reply?.text].filter(Boolean).join(' '),title:'پاسخ به '+personName(event),kind:reply?'reply':'comment',roundId:reply?.questionBound?roundId:null,requiresReveal:phase==='revealed'&&reply?.questionBound===true,priority:2});
  if(result.accepted)this.lastComment=this.now();return result;
 }
 explain(q,roundId,{revealed=false,owner=false}={}){const existing=revealed&&(this.queue.find(j=>j.kind==='explanation'&&j.roundId===roundId)||this.active?.kind==='explanation'&&this.active?.roundId===roundId&&this.active);if(existing)return {accepted:true,id:existing.id,reused:true};return this.enqueue({text:explainQuestion(q,{reveal:revealed}),title:revealed?'تشریح سوال '+q.id:'نکتهٔ مهم سوال',kind:revealed?'explanation':'hint',roundId,requiresReveal:revealed,priority:owner?0:1,key:owner?null:'explain:'+roundId});}
 noteSupport(kind,event,{accepted,pending=false}={},total=1){
  const s=this.settings();if(!accepted||pending||!this.enabled()||!(kind==='gift'?s.thankGifts:s.thankLikes)||kind==='like'&&total<s.likeThreshold)return;
  const id=String(event.user?.id??event.user?.userId??'');if(!id)return;
  this.thanks.set(kind+':'+id,{kind,name:personName(event),at:this.now()});while(this.thanks.size>200)this.thanks.delete(this.thanks.keys().next().value);
 }
 flushThanks(){
  if(!this.thanks.size||this.now()-this.lastThanks<this.settings().thankGap*1000||!this.enabled())return;
  const people=[...this.thanks.values()].filter(p=>this.now()-p.at<90000);if(!people.length){this.thanks.clear();return;}
  const parts=[];for(const [kind,label] of [['gift','فرستادن هدیه'],['like','لایک کردن پخش زنده']]){const group=people.filter(p=>p.kind===kind);if(!group.length)continue;const names=[...new Set(group.slice(0,3).map(p=>spokenName(p.name)))].join(' و ');parts.push('از '+names+(group.length>3?' و همهٔ دوستان':'')+' برای '+label+' سپاسگزارم.');}
  if(this.enqueue({text:parts.join(' '),title:'تشکر از همراهی شما',kind:'thanks',priority:3}).accepted){this.thanks.clear();this.lastThanks=this.now();}
 }
 tick({roundId,phase,canSpeak=false}={}){
  const now=this.now();if(!this.enabled()){this.clear();return null;}
  if(this.active&&(now>=this.active.expiresAt||['open','watching'].includes(phase)||this.active.roundId&&this.active.roundId!==roundId))this.active=null;
  this.queue=this.queue.filter(j=>{const keep=now-j.at<90000&&(!j.roundId||j.roundId===roundId);if(!keep)this.audio.delete(j.id);return keep;});
  for(const [id,row] of this.audio)if(now-row.at>180000&&id!==this.active?.id)this.audio.delete(id);while(this.audio.size>16)this.audio.delete(this.audio.keys().next().value);
  this.flushThanks();if(this.active||!canSpeak)return null;
  const index=this.queue.findIndex(j=>j.status==='ready'&&(!j.requiresReveal||phase==='revealed'));if(index<0)return null;
  const job=this.queue.splice(index,1)[0];this.active={...job,at:now,expiresAt:now+job.durationMs+1800,audioUrl:'/assistant/audio/'+job.id+'.wav'};this.stats.spoken++;
  this.history.unshift({at:now,title:job.title,kind:job.kind,text:job.text});this.history=this.history.slice(0,12);return this.active;
 }
 getAudio(id){return this.audio.get(id)?.audio||null;}
 snapshot(context){const job=this.active;if(!job||context&&(job.roundId&&job.roundId!==context.roundId||['open','watching'].includes(context.phase)))return {active:null};return {active:{id:job.id,title:job.title,text:job.text,kind:job.kind,roundId:job.roundId,at:job.at,expiresAt:job.expiresAt,durationMs:job.durationMs,audioUrl:job.audioUrl}};}
 status(){return {queue:this.queue.map(j=>({id:j.id,title:j.title,status:j.status})),active:this.snapshot().active,stats:{...this.stats},engine:this.voice.state,lastError:this.lastError,history:this.history};}
 clear(){this.generation++;this.queue=[];this.active=null;this.audio.clear();this.thanks.clear();this.seen.clear();this.lastComment=-Infinity;this.lastThanks=-Infinity;}
}
