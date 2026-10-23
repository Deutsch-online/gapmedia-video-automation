import {randomUUID} from 'node:crypto';
import {profileAvatar} from './gifts.mjs';
export const compactLikes=n=>n<1000?String(n):new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(n);
export class LikeWall{
 constructor({now=()=>Date.now()}={}){this.now=now;this.clear();}
 clear(){this.users=new Map();this.seen=new Set();}
 observe(event){
  const userId=String(event.user?.id??event.user?.userId??event.userId??'');
  const id=String(event.common?.msgId??event.msgId??'');
  const raw=Number(event.common?.createTime??event.createTime),time=raw<1e12?raw*1000:raw;
  // count is this sender's delta; total is the room total and must never be added.
  const count=Number(event.count);
  if(!userId||!id||!Number.isFinite(time)||Math.abs(this.now()-time)>120000||!Number.isSafeInteger(count)||count<=0||count>100000)return {accepted:false,reason:'invalid_event'};
  if(this.seen.has(id))return {accepted:false,reason:'duplicate_event'};
  this.seen.add(id);if(this.seen.size>10000)this.seen.delete(this.seen.values().next().value);
  const old=this.users.get(userId),likes=(old?.likes||0)+count;
  if(!Number.isSafeInteger(likes))return {accepted:false,reason:'invalid_count'};
  const row={userId,key:old?.key||randomUUID(),kind:'like',name:String(event.user?.nickname||event.user?.displayId||'Zuschauer').slice(0,40),avatar:profileAvatar(event)||old?.avatar||null,likes,likeLabel:compactLikes(likes),tier:likes>=1000?'crown':likes>100?'liked':'basic',at:this.now()};
  this.users.set(userId,row);if(this.users.size>5000)this.users.delete(this.users.keys().next().value);
  return {accepted:true};
 }
 snapshot(){return [...this.users.values()].sort((a,b)=>b.likes-a.likes||b.at-a.at).slice(0,20).map(({userId,...row},i)=>({...row,rank:i+1}));}
}
export function activityWall(likes,supporters,limit=8){
 const donors=supporters.entries,donorIds=new Set(donors.map(p=>p.userId));
 const fans=[...likes.users.values()].sort((a,b)=>b.likes-a.likes||b.at-a.at).filter(p=>!donorIds.has(p.userId));
 const gifts=donors.slice(0,fans.length?4:limit).map((p,i)=>({...p,kind:'gift',newest:i===0,likes:likes.users.get(p.userId)?.likes||0}));
 const rows=[...gifts,...fans.slice(0,limit-gifts.length).map((p,i)=>({...p,rank:i+1}))];
 return rows.map(({userId,...row})=>({...row,likeLabel:compactLikes(row.likes||0)}));
}
