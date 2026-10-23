import {randomUUID} from 'node:crypto';

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
  return questions;
}

export class Quiz {
  constructor(questions, {now=()=>Date.now(), seconds=30}={}) {
    this.questions=validateQuestions(questions); this.now=now; this.seconds=seconds;
    this.index=0; this.phase='waiting'; this.round=null; this.answers=new Map();
    this.seen=new Map(); this.groups=new Map(); this.leaderboard=new Map(); this.lastAnswer=null;
  }
  start() {
    if (this.phase==='open') throw Error('Round already open');
    this.round={id:randomUUID(),opened:this.now(),closes:this.now()+this.seconds*1000};
    this.phase='open'; this.answers=new Map(); this.lastAnswer=null;
  }
  next() { if(this.phase==='open') throw Error('Reveal or pause this question first'); this.index=(this.index+1)%this.questions.length;this.phase='waiting';this.round=null;this.answers=new Map();this.lastAnswer=null; }
  pause() { this.phase='paused'; }
  reveal() {
    if(this.phase!=='open') return;
    this.phase='revealed';
    const correct=this.questions[this.index].correct.slice().sort().join(',');
    for(const [id,answer] of this.answers) {
      const ok=[...answer.choices].sort().join(',')===correct;
      if(ok) { const row=this.leaderboard.get(id)||{name:answer.name,score:0}; row.name=answer.name;row.score++;this.leaderboard.set(id,row); }
    }
  }
  tick() { if(this.phase==='open' && this.now()>=this.round.closes) this.reveal(); }
  submit({id,userId,name,choice,time,roundId}) {
    this.tick();
    if(!id || !userId || ![...LETTERS,'ALL'].includes(choice) || !Number.isFinite(time)) return {accepted:false,reason:'invalid_event'};
    if(this.seen.has(id)) return {accepted:false,reason:'duplicate_event'};
    this.seen.set(id,this.now());
    if(this.seen.size>20000) this.seen.delete(this.seen.keys().next().value);
    if(this.phase!=='open' || (roundId && roundId!==this.round.id)) return {accepted:false,reason:'round_closed'};
    if(time<Math.floor(this.round.opened/1000)*1000 || time>this.round.closes || time>this.now()+5000) return {accepted:false,reason:'late_or_old_event'};
    const answer=this.answers.get(userId)||{name:String(name||'بیننده').slice(0,40),choices:new Set()};
    const multiple=this.questions[this.index].correct.length>1;
    if(choice==='ALL'&&!multiple)return {accepted:false,reason:'all_not_allowed'};
    const choices=choice==='ALL'?LETTERS:[choice];
    if(choices.every(k=>answer.choices.has(k))) return {accepted:false,reason:'already_selected'};
    if(!multiple && answer.choices.size) return {accepted:false,reason:'one_answer_only'};
    for(const k of choices)answer.choices.add(k); this.answers.set(userId,answer);
    this.lastAnswer={name:answer.name,choice};
    return {accepted:true,choice};
  }
  gift(event,mapping) {
    const giftId=String(event.giftId??event.gift?.id??'');
    const choice=[...LETTERS,'ALL'].find(k=>String(mapping[k]?.id)===giftId);
    if(!choice) return {accepted:false,reason:'unmapped_gift'};
    const userId=String(event.user?.id??event.user?.userId??'');
    const group=event.groupId && String(event.groupId)!=='0'?`${userId}:${giftId}:${event.groupId}`:null;
    const rawTime=Number(event.common?.createTime??event.createTime);
    const time=rawTime<1e12?rawTime*1000:rawTime;
    const combo=event.gift?.combo===true || Number(event.gift?.type??event.giftType)===1;
    if(combo && !event.repeatEnd) {
      if(group && Number.isFinite(time) && !this.groups.has(group)) this.groups.set(group,time);
      if(this.groups.size>20000)this.groups.delete(this.groups.keys().next().value);
      return {accepted:false,reason:'streak_not_finished'};
    }
    const id=group || String(event.orderId||event.common?.msgId||event.msgId||'');
    const firstTime=group && this.groups.has(group)?this.groups.get(group):time;
    return this.submit({id,userId,name:event.user?.uniqueId||event.user?.nickname,choice,time:firstTime});
  }
  snapshot() {
    this.tick();
    const q=this.questions[this.index];
    const question={id:q.id,de:q.de,fa:q.fa,options:q.options,topic:q.topic,visual:q.visual,multiple:q.correct.length>1,source_kind:q.source_kind||'authored-practice',image:q.image||null,image_alt:q.image_alt||null,points:q.points||null};
    if(this.phase==='revealed') Object.assign(question,{correct:q.correct,explanation_de:q.explanation_de,explanation_fa:q.explanation_fa,source:q.source});
    return {index:this.index,total:this.questions.length,phase:this.phase,roundId:this.round?.id||null,closesAt:this.round?.closes||null,serverTime:this.now(),question,
      voters:this.answers.size,counts:Object.fromEntries(LETTERS.map(k=>[k,[...this.answers.values()].filter(a=>a.choices.has(k)).length])),lastAnswer:this.lastAnswer,
      leaderboard:[...this.leaderboard.values()].sort((a,b)=>b.score-a.score).slice(0,5)};
  }
}
