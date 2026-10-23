import {randomUUID} from 'node:crypto';
import {SupporterWall} from './supporters.mjs';
import {profileAvatar} from './gifts.mjs';
export class GuestSupport {
 constructor(guests=[],{now=()=>Date.now()}={}){this.guests=guests;this.wall=new SupporterWall({now});this.donors=new Map();this.unassigned=0;}
 add(username,userId=''){
  username=String(username).replace(/^@/,'').trim().toLowerCase();userId=String(userId).trim();
  if(!/^[a-z0-9_.]{1,30}$/.test(username)||userId&&!/^\d{1,30}$/.test(userId))throw Error('یوزرنیم یا شناسهٔ عددی معتبر نیست.');
  const existing=this.guests.find(g=>g.username===username);
  if(this.guests.some(g=>g!==existing&&userId&&g.userId===userId))throw Error('این شناسه برای مهمان دیگری ثبت شده است.');
  if(existing){if(userId&&existing.userId&&userId!==existing.userId)throw Error('شناسهٔ ثبت‌شده متفاوت است؛ مهمان را حذف و دوباره اضافه کنید.');if(userId)existing.userId=userId;return;}
  if(this.guests.length>=20)throw Error('حداکثر ۲۰ مهمان ثبت می‌شود.');
  this.guests.push({key:randomUUID(),username,userId,avatar:null});
 }
 remove(key){this.guests=this.guests.filter(g=>g.key!==key);this.donors.delete(key);}
 observe(user){
  if(!user)return false;const name=String(user.uniqueId||'').toLowerCase(),id=String(user.id??user.userId??'');
  const guest=this.guests.find(g=>name&&g.username===name);
  if(!guest||!/^\d{1,30}$/.test(id)||guest.userId&&guest.userId!==id||this.guests.some(g=>g!==guest&&g.userId===id))return false;
  const avatar=profileAvatar({user});const changed=guest.userId!==id||avatar&&guest.avatar!==avatar;guest.userId=id;if(avatar)guest.avatar=avatar;return Boolean(changed);
 }
 clear(){this.wall.clear();this.donors.clear();this.unassigned=0;}
 gift(event){
  this.observe(event.toUser);const result=this.wall.gift(event,{});if(!result.accepted)return result;
  const receiver=String(event.receiverUserId??event.giftExtra?.toUserId??event.toUser?.id??event.toUser?.userId??'');
  const guest=this.guests.find(g=>g.userId&&g.userId===receiver);
  if(!guest){this.unassigned++;return {accepted:false,reason:'unknown_recipient'};}
  const row=this.wall.entries[0],id=row.userId;let donors=this.donors.get(guest.key);if(!donors){donors=new Map();this.donors.set(guest.key,donors);}
  // Bounded per-session memory. Never silently evict an existing donor's totals.
  if(!donors.has(id)&&donors.size>=500)return {accepted:false,reason:'donor_limit'};
  let donor=donors.get(id);if(!donor){donor={key:randomUUID(),name:row.name,avatar:row.avatar,gifts:[],totalCoins:0,unknownValue:false};donors.set(id,donor);}
  donor.name=row.name;donor.avatar=row.avatar||donor.avatar;donor.tier=row.tier;donor.latestCoins=row.coins;donor.at=row.at;
  if(row.coins===null)donor.unknownValue=true;else donor.totalCoins+=row.coins;
  let gift=donor.gifts.find(g=>g.id===row.giftId);if(!gift){gift={id:row.giftId,name:row.giftName,count:0,coins:0,unknownValue:false};donor.gifts.push(gift);}
  if(row.count!==null)gift.count+=row.count;if(row.coins===null)gift.unknownValue=true;else gift.coins+=row.coins;
  return {accepted:true,guest:guest.key};
 }
 snapshot(){return this.guests.map(({userId,...g})=>({...g,resolved:Boolean(userId),supporters:[...(this.donors.get(g.key)?.values()||[])].sort((a,b)=>b.at-a.at)}));}
}
