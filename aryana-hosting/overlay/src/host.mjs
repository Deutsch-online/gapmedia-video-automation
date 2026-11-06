import {randomUUID} from 'node:crypto';
import {latinLabel} from '../public/latin-label.js';

export const PERSONA={name:'آریانا',englishName:'Aryana',language:'فارسی دری و English',description:'گرم، مؤدب و خوش‌صحبت؛ یک مجری مجازی بزرگسال، با پاسخ‌های کوتاه و محترمانه.'};
const approved=new Set(('مریم سارا زهرا لیلا فاطمه نرگس نازنین مینا ستاره آریانا پریسا مهسا شبنم فرشته رویا سمیرا زینب عایشه خدیجه یاسمین مژگان ناهید شادی احمد محمد محمود علی حسن حسین فرید وحید حمید حامد امیر امید سعید نوید مجید رضا مصطفی مرتضی رحیم کریم لطیف جواد عباس یوسف داوود ابراهیم اسماعیل عبدالقادر عبدالرحمن عبدالله عبدالکریم محسن منصور نصیر ناصر بشیر شفیق شکیب سهراب فهیم رامین رفیع صابر صادق عزیز مهدی mohammad muhammad ahmad ahmed ali hassan hussein farid hamid wahid omid said saeed reza maryam mariam sara sarah zahra leila fatima aisha zainab mina nazanin ariana aryana john james david michael daniel anna emma sophia olivia emily noah liam lucas').split(' '));
const normalize=s=>String(s||'').normalize('NFC').replaceAll('ي','ی').replaceAll('ك','ک').trim();
const vowels=/[\u064b-\u065f\u0670]/g;
export const languageOf=text=>/[\u0600-\u06ff]/.test(text)?'fa':'en';
export function spokenName(value,extra=[]){
 const raw=normalize(value);
 if(raw.length>80)return null;
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
 if(!name)return language==='en'?'Welcome!':'سلام، خوش آمدید!';
 if(Number.isInteger(level)&&level>25)return language==='en'?`A very warm welcome, ${name}. It is lovely to have you here!`:`${name} جان، با احترام فراوان خوش آمدید! از حضور و همراهی‌تان خوشحال هستم.`;
 return language==='en'?`Welcome, ${name}!`:`${name} جان، خوش آمدید!`;
}

export function gratitude(name,kind,milestone,language='fa',vip=false){
 if(!name)return language==='en'?'Thank you very much!':'بسیار تشکر!';
 if(language==='en')return kind==='gift'?'Thank you very much for the gift, '+name+'!'+(vip?' Your kindness is truly appreciated.':''):milestone?'Thank you very much for '+milestone+' likes, '+name+'!':'Thank you very much for your likes, '+name+'!';
 return kind==='gift'?name+' جان، از گیفت‌تان بسیار تشکر!'+(vip?' از مهربانی و همراهی‌تان با احترام قدردانی می‌کنم.':''):milestone?name+' جان، برای '+milestone+' لایک بسیار تشکر!':name+' جان، از لایک‌های‌تان بسیار تشکر!';
}
export class HostSession{
 constructor({now=()=>Date.now()}={}){this.now=now;this.reset();}
 export(){return {donors:[...this.donors],likers:[...this.likers],seen:[...this.seen],levels:[...this.levels],startedAt:this.startedAt};}
 restore(data){
  if(!data||!Array.isArray(data.donors)||!Array.isArray(data.likers))return false;
  const valid=rows=>rows.slice(0,5000).filter(item=>Array.isArray(item)&&typeof item[0]==='string'&&item[0].length<150&&item[1]&&typeof item[1].name==='string'&&item[1].name.length<=80&&['coins','count','likes'].every(k=>item[1][k]===undefined||Number.isSafeInteger(item[1][k])&&item[1][k]>=0&&item[1][k]<1e12));
  this.levels=new Map((Array.isArray(data.levels)?data.levels:[]).filter(row=>Array.isArray(row)&&typeof row[0]==='string'&&Number.isInteger(row[1])&&row[1]>=0&&row[1]<1000).slice(0,5000));this.donors=new Map(valid(data.donors));this.likers=new Map(valid(data.likers));this.seen=new Set((Array.isArray(data.seen)?data.seen:[]).filter(x=>typeof x==='string'&&x.length<250).slice(-5000));this.startedAt=Number.isFinite(data.startedAt)&&data.startedAt<=this.now()?data.startedAt:null;this.joins=[];this.log=[];return true;
 }
 reset(){this.donors=new Map();this.likers=new Map();this.levels=new Map();this.seen=new Set();this.combos=new Map();this.startedAt=null;this.joins=[];this.log=[];this.lastThanks=0;}
 identity(event){return String(event.user?.id??event.user?.userId??event.userId??'');}
 profile(event,settings){
  const name=spokenName(event.user?.nickname||event.name,settings.names),thumbnail=event.user?.avatarThumb,urls=[...(Array.isArray(thumbnail?.urlList)?thumbnail.urlList:[]),event.user?.profilePictureUrl,event.profilePictureUrl,typeof thumbnail==='string'?thumbnail:null].filter(value=>typeof value==='string');
  let avatar=null;for(const url of urls){try{const u=new URL(url);if(u.protocol==='https:'&&/(^|\.)(tiktokcdn(-us|-eu)?\.com|byteimg\.com|ibyteimg\.com|ibytedtos\.com)$/.test(u.hostname)){avatar=u.href;break;}}catch{}}
  const display=normalize(event.user?.nickname||event.name).replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,'').slice(0,80);
  return {name:display||name||'همراه',spokenName:name,avatar};
 }
 remember(key){if(this.seen.has(key))return false;this.seen.add(key);while(this.seen.size>5000)this.seen.delete(this.seen.values().next().value);return true;}
 record(kind,text){this.log.unshift({key:randomUUID(),kind,text,at:this.now()});this.log=this.log.slice(0,30);}
 accept(kind,event,settings){
  const id=this.identity(event);if(!id)return null;
  const msg=String(event.common?.msgId||event.msgId||'');if(!msg||/^0+$/.test(msg))return null;
  const profile=this.profile(event,settings),at=this.now();const incomingLevel=Number(event.user?.payGrade?.level);if(Number.isInteger(incomingLevel)&&incomingLevel>=0){this.levels.set(id,incomingLevel);while(this.levels.size>5000)this.levels.delete(this.levels.keys().next().value);}const level=this.levels.get(id),vip=Boolean(profile.spokenName&&level>25),language=settings.language==='en'?'en':'fa',voiceName=profile.spokenName?(language==='en'?latinLabel(profile.spokenName.split(/\s+/)[0]):profile.spokenName.split(/\s+/)[0]):null;
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
   return {kind,profile,vip,text:gratitude(voiceName,'gift',null,language,vip)};
  }
  if(!this.remember(kind+':'+msg))return null;
  if(kind==='like'){
   const count=Number(event.count);if(!Number.isSafeInteger(count)||count<1||count>100000)return null;
   const old=this.likers.get(id);if(!old&&this.likers.size>=5000)return null;
   const firstLike=old?.startThanked!==true;const total=(old?.likes||0)+count,previous=[100,500,1000].includes(old?.thankedMilestone)?old.thankedMilestone:0,milestone=[100,500,1000].filter(level=>total>=level&&level>previous).at(-1)||null;
   this.likers.set(id,{key:old?.key||this.donors.get(id)?.key||randomUUID(),...profile,likes:total,startThanked:true,thankedMilestone:milestone||previous,at});
   return {kind,profile,milestone,firstLike,text:milestone||firstLike?gratitude(voiceName,'like',milestone,language):(language==='en'?'Thank you very much!':'بسیار تشکر!')};
  }
  if(kind==='join'){
   const row={key:randomUUID(),...profile,at};this.joins.push(row);this.joins=this.joins.slice(-20);
   this.record(kind,profile.name+' وارد شد');return {kind,profile,text:greeting(voiceName,Number.isInteger(level)?level:null,language),vip};
  }
  return null;
 }
 snapshot(){
  const gifts=[...this.donors].map(([id,p])=>({...p,likes:this.likers.get(id)?.likes||0})).sort((a,b)=>b.coins-a.coins||b.count-a.count),likes=[...this.likers].map(([id,p])=>({...p,coins:this.donors.get(id)?.coins||0,count:this.donors.get(id)?.count||0,unknown:this.donors.get(id)?.unknown||false})).sort((a,b)=>b.likes-a.likes);
  const gift=gifts[0],like=likes[0],giftTurn=gift&&(!like||Math.floor((this.now()-(this.startedAt??this.now()))/60000)%2===0);
  const focus=giftTurn?{...gift,kind:'gift'}:like?{...like,kind:'like'}:null;
  const displayed=new Set(focus?[focus.key]:[]);
  const rows=[...gifts.slice(0,5).map(p=>({...p,kind:'gift'})),...likes.slice(0,5).map(p=>({...p,kind:'like'}))].filter(p=>{if(displayed.has(p.key))return false;displayed.add(p.key);return true;});
  return {focus,rows,joins:this.joins.filter(p=>this.now()-p.at<9000),log:this.log,giftTotal:gifts.reduce((n,p)=>n+p.coins,0),likeTotal:likes.reduce((n,p)=>n+p.likes,0)};
 }
}


