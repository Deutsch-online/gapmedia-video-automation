import {randomUUID} from 'node:crypto';
import {profileAvatar,safeAvatarURL} from './gifts.mjs';

export const LETTERS = ['A','B','C'];
export function validateQuestions(questions) {
  if (!Array.isArray(questions) || !questions.length) throw Error('Question bank is empty');
  const ids = new Set();
  for (const q of questions) {
    if (!q.id || ids.has(q.id)) throw Error('Question IDs must be unique');
    ids.add(q.id);
    if (![q.de,q.fa,q.explanation_de,q.explanation_fa].every(t=>typeof t==='string' && t.trim())) throw Error('Bilingual question or explanation missing');
    if (q.options?.length!==3 || !q.options.every(o=>o.de?.trim() && o.fa?.trim())) throw Error('Three bilingual options required');
    if (!q.correct?.length || new Set(q.correct).size!==q.correct.length || q.correct.some(k=>!LETTERS.includes(k))) throw Error('Invalid answer key');
    if(q.source_kind==='imported-question-bank'){
      if(!/^\d+\.\d+\.\d+-\d+(?:-[BM])?$/.test(q.id)||!/^https:\/\/www\.clickclickdrive\.de\/fragenkatalog\//.test(q.source)||!q.source.endsWith('/'+q.id)||!/^\/media\/[0-9A-Za-z_-]+\.png$/.test(q.image)||q.translation_kind!=='educational-fa')throw Error('Imported question provenance or image missing');
    }else if (!/^https:\/\/www\.gesetze-im-internet\.de\/stvo_2013\/__[0-9]+\.html$/.test(q.source)) throw Error('Official legal source required');
  }
  for(const q of questions)if(q.video&&(!/^\/media\/[0-9A-Za-z_-]+\.mp4$/.test(q.video)||!Number.isInteger(q.video_duration_ms)||q.video_duration_ms<1000||q.video_duration_ms>30000))throw Error('Invalid question video');
  return questions;
}

export class Quiz {
  constructor(questions, {now=()=>Date.now(), seconds=30}={}) {
    this.questions=validateQuestions(questions); this.now=now; this.seconds=seconds;
    this.lastWinningRound=null;this.revealedAt=null;this.index=0; this.phase='waiting'; this.round=null; this.answers=new Map();
    this.seen=new Map(); this.groups=new Map(); this.leaderboard=new Map(); this.lastAnswer=null;
  }
  start() {
    if (['open','watching'].includes(this.phase)) throw Error('Round already open');
    const q=this.questions[this.index],watch=q.video?q.video_duration_ms+2000:0;
    this.round={id:randomUUID(),opened:this.now()+watch,closes:this.now()+watch+this.seconds*1000,videoStarted:q.video?this.now()+2000:null};
    this.revealedAt=null;this.phase=q.video?'watching':'open'; this.answers=new Map(); this.lastAnswer=null;
  }
  next() { if(['open','watching'].includes(this.phase)) throw Error('Reveal or pause this question first'); this.index=(this.index+1)%this.questions.length;this.phase='waiting';this.round=null;this.answers=new Map();this.lastAnswer=null; }
  pause() { this.phase='paused'; }
  reveal() {
    if(this.phase!=='open') return;
    this.phase='revealed';this.revealedAt=this.now();
    const correct=this.questions[this.index].correct.slice().sort().join(','),winning=[];
    for(const [id,answer] of this.answers) {
      const ok=[...answer.choices].sort().join(',')===correct;
      if(ok) { const row=this.leaderboard.get(id)||{name:answer.name,score:0}; row.name=answer.name;row.score++;this.leaderboard.set(id,row);winning.push({key:answer.publicId,name:answer.name,avatar:answer.avatar}); }
    }
    if(winning.length)this.lastWinningRound={roundId:this.round.id,questionId:this.questions[this.index].id,at:this.now(),people:winning};
  }
  select(id){if(['open','watching'].includes(this.phase))throw Error('Pause this question first');const index=this.questions.findIndex(q=>q.id===id);if(index<0)throw Error('Unknown question');this.index=index;this.phase='waiting';this.round=null;this.answers=new Map();this.lastAnswer=null;}
  tick() { if(this.phase==='watching'&&this.now()>=this.round.opened)this.phase='open';if(this.phase==='open' && this.now()>=this.round.closes) this.reveal(); }
  submit({id,userId,name,choice,time,roundId,avatar}) {
    this.tick();
    if(!id || !userId || ![...LETTERS,'ALL'].includes(choice) || !Number.isFinite(time)) return {accepted:false,reason:'invalid_event'};
    if(this.seen.has(id)) return {accepted:false,reason:'duplicate_event'};
    this.seen.set(id,this.now());
    if(this.seen.size>20000) this.seen.delete(this.seen.keys().next().value);
    if(this.phase==='watching')return {accepted:false,reason:'watching_video'};
    if(this.phase!=='open' || (roundId && roundId!==this.round.id)) return {accepted:false,reason:'round_closed'};
    if(time<Math.floor(this.round.opened/1000)*1000 || time>this.round.closes || time>this.now()+5000) return {accepted:false,reason:'late_or_old_event'};
    const answer=this.answers.get(userId)||{publicId:randomUUID(),name:String(name||'Zuschauer').slice(0,40),avatar:safeAvatarURL(avatar),choices:new Set()};
    const multiple=this.questions[this.index].correct.length>1;
    if(choice==='ALL'&&!multiple)return {accepted:false,reason:'all_not_allowed'};
    const choices=choice==='ALL'?LETTERS:[choice];
    if(choices.every(k=>answer.choices.has(k))) return {accepted:false,reason:'already_selected'};
    if(!multiple && answer.choices.size) return {accepted:false,reason:'one_answer_only'};
    if(safeAvatarURL(avatar))answer.avatar=safeAvatarURL(avatar);
    for(const k of choices)answer.choices.add(k); this.answers.set(userId,answer);
    this.lastAnswer={name:answer.name,avatar:answer.avatar,choice};
    return {accepted:true,choice};
  }
  comment(event){
    const text=String(event.content??event.comment??event.text??'').trim().replace(/[۱۲۳١٢٣]/g,c=>({'۱':'1','۲':'2','۳':'3','١':'1','٢':'2','٣':'3'}[c]));
    if(!/^[123]$/.test(text))return {accepted:false,reason:'irrelevant_comment'};
    const userId=String(event.user?.id??event.user?.userId??event.user?.idStr??event.userId??'');
    const raw=Number(event.common?.createTime??event.createTime),time=raw<1e12?raw*1000:raw;
    const message=String(event.common?.msgId??event.msgId??'');
    return this.submit({id:message?'comment:'+message:'',userId,name:event.user?.nickname||event.user?.displayId||event.user?.uniqueId||event.nickname||event.uniqueId,avatar:profileAvatar(event),choice:'ABC'[Number(text)-1],time});
  }
  gift(event,mapping) {
    const giftId=String(event.giftId??event.gift?.id??event.gift?.gift_id??'');
    const choice=[...LETTERS,'ALL'].find(k=>String(mapping[k]?.id)===giftId);
    if(!choice) return {accepted:false,reason:'unmapped_gift'};
    const userId=String(event.user?.id??event.user?.userId??event.user?.idStr??event.userId??'');
    const group=event.groupId && String(event.groupId)!=='0'?`${userId}:${giftId}:${event.groupId}`:null;
    const rawTime=Number(event.common?.createTime??event.createTime);
    const time=rawTime<1e12?rawTime*1000:rawTime;
    const combo=event.gift?.combo===true || Number(event.gift?.type??event.giftType)===1;
    if(combo && !(event.repeatEnd===true||Number(event.repeatEnd??event.gift?.repeat_end)===1)) {
      if(group && Number.isFinite(time) && !this.groups.has(group)) this.groups.set(group,time);
      if(this.groups.size>20000)this.groups.delete(this.groups.keys().next().value);
      return {accepted:false,reason:'streak_not_finished'};
    }
    const id=group || String(event.orderId||event.common?.msgId||event.msgId||'');
    const firstTime=group && this.groups.has(group)?this.groups.get(group):time;
    return this.submit({id,userId,name:event.user?.nickname||event.user?.displayId||event.user?.uniqueId||event.nickname||event.uniqueId,avatar:profileAvatar(event),choice,time:firstTime});
  }
  snapshot() {
    this.tick();
    const q=this.questions[this.index];
    const question={id:q.id,de:q.de,fa:q.fa,options:q.options,topic:q.topic,visual:q.visual,multiple:q.correct.length>1,source_kind:q.source_kind||'authored-practice',image:q.image||null,image_alt:q.image_alt||null,points:q.points||null,video:q.video||null,video_duration_ms:q.video_duration_ms||null};
    if(this.phase==='revealed') Object.assign(question,{correct:q.correct,explanation_de:q.explanation_de,explanation_fa:q.explanation_fa,source:q.source});
    const correct=q.correct.slice().sort().join(',');
    const winners=this.phase==='revealed'?[...this.answers.values()].filter(a=>[...a.choices].sort().join(',')===correct):[];
    const winnerOffset=winners.length?Math.floor((this.now()-this.revealedAt)/2200)%Math.ceil(winners.length/6)*6:0;
    const last=this.lastWinningRound,offset=last?Math.floor((this.now()-last.at)/2200)%Math.ceil(last.people.length/6)*6:0;
    const celebration=last?{roundId:last.roundId,questionId:last.questionId,at:last.at,count:last.people.length,people:last.people.slice(offset,offset+6)}:null;
    return {celebration,winnerCount:winners.length,winners:winners.slice(winnerOffset,winnerOffset+6).map(a=>({key:a.publicId,name:a.name,avatar:a.avatar})),revealedAt:this.phase==='revealed'?this.revealedAt:null,questionSeconds:this.seconds,index:this.index,total:this.questions.length,phase:this.phase,roundId:this.round?.id||null,closesAt:this.round?.closes||null,serverTime:this.now(),videoStartedAt:this.round?.videoStarted||null,opensAt:this.round?.opened||null,question,
      voters:this.answers.size,participants:Object.fromEntries(LETTERS.map(k=>[k,[...this.answers.values()].filter(a=>a.choices.has(k)).slice(-6).reverse().map(a=>({key:a.publicId,name:a.name,avatar:a.avatar}))])),counts:Object.fromEntries(LETTERS.map(k=>[k,[...this.answers.values()].filter(a=>a.choices.has(k)).length])),lastAnswer:this.lastAnswer,
      leaderboard:[...this.leaderboard.values()].sort((a,b)=>b.score-a.score).slice(0,5)};
  }
}
