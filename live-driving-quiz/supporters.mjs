import {randomUUID} from 'node:crypto';
import {profileAvatar,profileUsername} from './gifts.mjs';
export function supporterTier(coins){
 if(!Number.isFinite(coins)||coins<=10)return 'bubble';
 if(coins>=1000)return 'vip';if(coins>=500)return 'diamond';if(coins>100)return 'gold';if(coins>50)return 'silver';return 'simple';
}
export class SupporterWall{
 constructor({now=()=>Date.now(),limit=8}={}){this.now=now;this.limit=limit;this.entries=[];this.seen=new Set();}
 clear(){this.entries=[];this.seen.clear();}
 gift(event,mapping){
  const gift=event.giftDetails||event.gift||event.extendedGiftInfo||{};
  const giftId=String(event.giftId??gift.id??gift.gift_id??'');
  if(Object.values(mapping).some(g=>g?.id&&String(g.id)===giftId))return {accepted:false,reason:'answer_gift'};
  const userId=String(event.user?.id??event.user?.userId??event.user?.idStr??event.userId??'');
  const rawTime=Number(event.common?.createTime??event.createTime),time=rawTime<1e12?rawTime*1000:rawTime;
  if(!giftId||giftId==='0'||!userId||!Number.isFinite(time)||Math.abs(this.now()-time)>120000)return {accepted:false,reason:'invalid_event'};
  const combo=gift.combo===true||Number(gift.type??gift.giftType??event.giftType??gift.gift_type)===1;
  if(combo&&!(event.repeatEnd===true||Number(event.repeatEnd??gift.repeat_end)===1))return {accepted:false,reason:'streak_not_finished'};
  const group=event.groupId&&String(event.groupId)!=='0'?`${userId}:${giftId}:${event.groupId}`:null;
  const id=group||String(event.orderId||event.common?.msgId||event.msgId||'');if(!id)return {accepted:false,reason:'missing_event_id'};
  if(this.seen.has(id))return {accepted:false,reason:'duplicate_event'};
  this.seen.add(id);if(this.seen.size>10000)this.seen.delete(this.seen.values().next().value);
  const value=Number(event.diamondCount??gift.diamondCount??gift.diamond_count);
  const count=Number(event.repeatCount??gift.repeat_count??1);
  const coins=Number.isSafeInteger(value)&&value>0&&Number.isSafeInteger(count)&&count>0&&value*count<=1000000000?value*count:null;
  const old=this.entries.find(row=>row.userId===userId);
  this.entries=this.entries.filter(row=>row.userId!==userId);
  this.entries.unshift({userId,key:randomUUID(),name:String(event.user?.nickname||event.user?.displayId||event.user?.uniqueId||event.nickname||event.uniqueId||'Zuschauer').slice(0,40),avatar:profileAvatar(event),username:profileUsername(event)||old?.username||null,giftName:String(gift.giftName||gift.name||event.giftName||'Geschenk').slice(0,60),coins,count:Number.isSafeInteger(count)&&count>0?count:null,giftId,tier:supporterTier(coins),at:this.now()});
  this.entries=this.entries.slice(0,this.limit);return {accepted:true};
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
