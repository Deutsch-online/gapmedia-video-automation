import {randomUUID} from 'node:crypto';

export const PERSONA={name:'آریانا',englishName:'Aryana',language:'فارسی دری و English',description:'گرم، مؤدب و خوش‌صحبت؛ یک مجری مجازی بزرگسال، با پاسخ‌های کوتاه و محترمانه.'};
const approved=new Set(('مریم سارا زهرا لیلا فاطمه نرگس نازنین مینا ستاره آریانا پریسا مهسا شبنم فرشته رویا سمیرا زینب عایشه خدیجه یاسمین مژگان ناهید شادی احمد محمد محمود علی حسن حسین فرید وحید حمید حامد امیر امید سعید نوید مجید رضا مصطفی مرتضی رحیم کریم لطیف جواد عباس یوسف داوود ابراهیم اسماعیل عبدالقادر عبدالرحمن عبدالله عبدالکریم محسن منصور نصیر ناصر بشیر شفیق شکیب سهراب فهیم رامین رفیع صابر صادق عزیز مهدی mohammad muhammad ahmad ahmed ali hassan hussein farid hamid wahid omid said saeed reza maryam mariam sara sarah zahra leila fatima aisha zainab mina nazanin ariana aryana john james david michael daniel anna emma sophia olivia emily noah liam lucas').split(' '));
const normalize=s=>String(s||'').normalize('NFC').replaceAll('ي','ی').replaceAll('ك','ک').trim();
const vowels=/[\u064b-\u065f\u0670]/g;
export const languageOf=text=>/[\u0600-\u06ff]/.test(text)?'fa':'en';
export function spokenName(value,extra=[]){
 const raw=normalize(value);
 if(!raw||/[\p{N}]/u.test(raw))return null;
 const name=raw.replace(/[^\p{L}\p{M}\s]/gu,'').replace(/\s+/g,' ').trim();
 const words=name.split(' ');if(words.length>3)return null;
 const first=words[0]?.toLowerCase();
 return approved.has(first)||extra.some(n=>normalize(n).toLowerCase()===name.toLowerCase())?name:null;
}
export function correctionKey(text){return normalize(text).replace(vowels,'');}
export function applyCorrections(text,rules){
 return normalize(text).split(/([\p{L}\p{M}\u200c]+)/u).map(part=>rules[correctionKey(part)]||part).join('');
}
export function greeting(name,level,language='fa'){
 if(!name)return language==='en'?'Thank you for joining!':'تشکر از همراهی‌تان!';
 if(Number.isInteger(level)&&level>25)return language==='en'?`A very warm welcome, ${name}. It is lovely to have you here!`:`${name} جان، با احترام فراوان خوش آمدید! از حضور و همراهی‌تان خوشحال هستم.`;
 return language==='en'?`Welcome, ${name}!`:`${name} جان، خوش آمدید!`;
}

export class HostSession{
 constructor({now=()=>Date.now()}={}){this.now=now;this.reset();}
 reset(){this.donors=new Map();this.likers=new Map();this.seen=new Set();this.combos=new Map();this.startedAt=null;this.joins=[];this.log=[];this.lastThanks=0;}
 identity(event){return String(event.user?.id??event.user?.userId??event.userId??'');}
 profile(event,settings){
  const name=spokenName(event.user?.nickname||event.name,settings.names),urls=event.user?.avatarThumb?.urlList||[];
  let avatar=null;for(const url of urls){try{const u=new URL(url);if(u.protocol==='https:'&&/(^|\.)(tiktokcdn(-us|-eu)?\.com|byteimg\.com|ibyteimg\.com|ibytedtos\.com)$/.test(u.hostname)){avatar=u.href;break;}}catch{}}
  return {name:name||'همراه',spokenName:name,avatar};
 }
 remember(key){if(this.seen.has(key))return false;this.seen.add(key);while(this.seen.size>5000)this.seen.delete(this.seen.values().next().value);return true;}
 record(kind,text){this.log.unshift({key:randomUUID(),kind,text,at:this.now()});this.log=this.log.slice(0,30);}
 accept(kind,event,settings){
  const id=this.identity(event);if(!id)return null;
  const msg=String(event.common?.msgId||event.msgId||'');if(!msg||/^0+$/.test(msg))return null;
  const profile=this.profile(event,settings),at=this.now();
  if(kind==='gift'){
   const count=Number(event.repeatCount||1),unit=Number(event.diamondCount??event.giftDetails?.diamondCount??event.gift?.diamondCount);
   if(!Number.isSafeInteger(count)||count<1||count>1000000)return null;
   const combo=Number(event.giftDetails?.giftType??event.gift?.type??event.giftType)===1;
   if(combo&&![true,1,'1'].includes(event.repeatEnd))return null;
   const group=String(event.groupId||''),giftId=String(event.giftId||event.giftDetails?.id||event.gift?.id||'');
   const key=combo&&group&&!/^0+$/.test(group)?'combo:'+id+':'+giftId+':'+group:'gift:'+msg;
   if(!this.remember(key))return null;
   const old=this.donors.get(id);if(!old&&this.donors.size>=5000)return null;
   const known=Number.isSafeInteger(unit)&&unit>0&&unit*count<=1e9;
   this.donors.set(id,{key:old?.key||this.likers.get(id)?.key||randomUUID(),...profile,coins:(old?.coins||0)+(known?unit*count:0),count:(old?.count||0)+count,unknown:Boolean(old?.unknown||!known),at});
   this.startedAt??=at;this.record(kind,profile.name+' · '+(known?unit*count+' کوین':'گیفت با ارزش نامعلوم'));
   return {kind,profile,text:profile.spokenName?`${profile.spokenName} جان، از گیفت‌تان بسیار تشکر!`:'از گیفت‌تان تشکر!'};
  }
  if(!this.remember(kind+':'+msg))return null;
  if(kind==='like'){
   const count=Number(event.count);if(!Number.isSafeInteger(count)||count<1||count>100000)return null;
   const old=this.likers.get(id);if(!old&&this.likers.size>=5000)return null;
   this.likers.set(id,{key:old?.key||this.donors.get(id)?.key||randomUUID(),...profile,likes:(old?.likes||0)+count,at});
   return {kind,profile,text:profile.spokenName?`${profile.spokenName} جان، تشکر از لایک‌های‌تان!`:'از لایک‌های‌تان تشکر!'};
  }
  if(kind==='join'){
   const level=Number(event.user?.payGrade?.level);const row={key:randomUUID(),...profile,at};this.joins.push(row);this.joins=this.joins.slice(-20);
   this.record(kind,profile.name+' وارد شد');return {kind,profile,text:greeting(profile.spokenName,Number.isInteger(level)?level:null),vip:Boolean(profile.spokenName&&level>25)};
  }
  return null;
 }
 snapshot(){
  const gifts=[...this.donors.values()].sort((a,b)=>b.coins-a.coins||b.count-a.count),likes=[...this.likers.values()].sort((a,b)=>b.likes-a.likes);
  const gift=gifts[0],like=likes[0],giftTurn=gift&&(!like||Math.floor((this.now()-(this.startedAt??this.now()))/60000)%2===0);
  const focus=giftTurn?{...gift,kind:'gift'}:like?{...like,kind:'like'}:null;
  const displayed=new Set(focus?[focus.key]:[]);
  const rows=[...gifts.slice(0,5).map(p=>({...p,kind:'gift'})),...likes.slice(0,5).map(p=>({...p,kind:'like'}))].filter(p=>{if(displayed.has(p.key))return false;displayed.add(p.key);return true;});
  return {focus,rows,joins:this.joins.filter(p=>this.now()-p.at<9000),log:this.log,giftTotal:gifts.reduce((n,p)=>n+p.coins,0),likeTotal:likes.reduce((n,p)=>n+p.likes,0)};
 }
}
