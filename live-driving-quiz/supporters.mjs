import {randomUUID} from 'node:crypto';
import {profileAvatar,profileUsername} from './gifts.mjs';
export function supporterTier(coins){
 if(!Number.isFinite(coins)||coins<=10)return 'bubble';
 if(coins>=1000)return 'vip';if(coins>=500)return 'diamond';if(coins>100)return 'gold';if(coins>50)return 'silver';return 'simple';
}
const eventIdentity=value=>{const text=String(value??'').trim();return text&&!/^(?:0+|undefined|null|nan)$/i.test(text)?text:null;};
const positive=(...values)=>values.map(Number).find(n=>Number.isSafeInteger(n)&&n>0&&n<=1000000000)??null;
export class SupporterWall{
 constructor({now=()=>Date.now(),limit=8}={}){this.now=now;this.limit=limit;this.clear();}
 clear(){this.entries=[];this.seen=new Set();this.series=new Map();this.active=new Map();}
 gift(event,mapping={}){
  const sources=[event.giftDetails,event.gift,event.extendedGiftInfo].filter(value=>value&&typeof value==='object');
  const gift=Object.assign({},...sources.slice().reverse());
  const giftId=eventIdentity(event.giftId)||sources.map(g=>eventIdentity(g.id)||eventIdentity(g.gift_id)).find(Boolean);
  if(Object.values(mapping).some(g=>g?.id&&String(g.id)===giftId))return {accepted:false,reason:'answer_gift'};
  const userId=eventIdentity(event.user?.id)||eventIdentity(event.user?.userId)||eventIdentity(event.user?.idStr)||eventIdentity(event.userId);
  const raw=Number(event.common?.createTime??event.createTime),time=raw<1e12?raw*1000:raw;
  if(!giftId||!userId||!Number.isFinite(time)||time<=0||Math.abs(this.now()-time)>120000)return {accepted:false,reason:'invalid_event',detail:!giftId?'missing_gift_id':!userId?'missing_sender':!Number.isFinite(time)||time<=0?'missing_time':'stale_event'};
  const combo=sources.some(g=>g.combo===true)||[event.giftType,...sources.flatMap(g=>[g.type,g.giftType,g.gift_type])].some(type=>Number(type)===1);
  const final=!combo||[event.repeatEnd,...sources.map(g=>g.repeat_end)].some(value=>value===true||Number(value)===1);
  const count=positive(event.repeatCount,...sources.map(g=>g.repeat_count),event.comboCount)||1;
  const group=eventIdentity(event.groupId),message=eventIdentity(event.common?.msgId)||eventIdentity(event.msgId),order=eventIdentity(event.orderId);
  // Protobuf can send orderId="0"; never let that sentinel hide every later donor.
  const eventId=message?'message:'+message+(combo?':'+count+':'+Number(final):''):order?'order:'+order+(combo?':'+count+':'+Number(final):''):group?'group:'+userId+':'+giftId+':'+group+':'+count+':'+Number(final):null;
  if(!eventId)return {accepted:false,reason:'missing_event_id'};
  if(this.seen.has(eventId))return {accepted:false,reason:'duplicate_event'};
  const senderGift=userId+':'+giftId,active=this.active.get(senderGift);
  const seriesKey=combo?(group?'group:'+senderGift+':'+group:active&&this.now()-active.at<30000?active.key:'stream:'+senderGift+':'+eventId):'single:'+eventId;
  const previous=this.series.get(seriesKey);
  if(previous?.final)return {accepted:false,reason:'duplicate_event'};
  if(previous&&count<previous.count&&!final)return {accepted:false,reason:'older_streak_update'};
  if(previous&&count===previous.count&&!final)return {accepted:false,reason:'duplicate_event'};
  this.seen.add(eventId);if(this.seen.size>10000)this.seen.delete(this.seen.values().next().value);
  const totalCount=Math.max(count,previous?.count||0),unitValue=positive(event.diamondCount,...sources.flatMap(g=>[g.diamondCount,g.diamond_count]))||previous?.unitValue||null;
  const coins=unitValue&&unitValue*totalCount<=1000000000?unitValue*totalCount:null;
  const publicKey=previous?.publicKey||randomUUID();
  this.series.set(seriesKey,{count:totalCount,unitValue,final,publicKey});if(this.series.size>2000)this.series.delete(this.series.keys().next().value);
  if(combo&&!final)this.active.set(senderGift,{key:seriesKey,at:this.now()});else this.active.delete(senderGift);if(this.active.size>2000)this.active.delete(this.active.keys().next().value);
  const old=this.entries.find(row=>row.userId===userId);
  this.entries=this.entries.filter(row=>row.userId!==userId);
  const person={userId,key:publicKey,name:String(event.user?.nickname||event.user?.displayId||event.user?.uniqueId||event.nickname||event.uniqueId||old?.name||'Zuschauer').slice(0,40),avatar:profileAvatar(event)||old?.avatar||null,username:profileUsername(event)||old?.username||null,giftName:String(sources.map(g=>g.giftName||g.name).find(Boolean)||event.giftName||old?.giftName||'Geschenk').slice(0,60),coins,count:totalCount,giftId,tier:supporterTier(coins),pending:!final,at:this.now()};
  this.entries.unshift(person);this.entries=this.entries.slice(0,this.limit);
  return {accepted:true,pending:!final,updated:Boolean(previous),count:totalCount,coins};
 }
 snapshot(){return this.entries.map(({userId,...row})=>row);}
}

export const DEFAULT_GIFT_STYLE={basis:'coins',levels:{simple:11,silver:51,gold:101,diamond:500,vip:1000}};
export function validGiftStyle(config){
 if(!config||!['coins','count'].includes(config.basis)||!config.levels)return false;
 let previous=0;for(const tier of ['simple','silver','gold','diamond','vip']){const value=config.levels[tier];if(!Number.isSafeInteger(value)||value<=previous||value>1000000000)return false;previous=value;}return true;
}
export function styledGiftTier(person,config=DEFAULT_GIFT_STYLE){
 const value=person[config.basis];if(!Number.isSafeInteger(value)||value<1)return 'bubble';
 let result='bubble';for(const tier of ['simple','silver','gold','diamond','vip'])if(value>=config.levels[tier])result=tier;return result;
}
