// A transcript disagreement is a review candidate, never proof of bad pronunciation.
import {createHash} from 'node:crypto';
import {pronunciationKey,validWord} from './teacher-profile.mjs';
const aliases=new Map(Object.entries({'راننده':'دریور','رانندگان':'دریورها','خودرو':'موتر','لاستیک':'تایر','ترمز':'بریک','موتور':'انجین','دنده':'گیر','لایو':'لایف','شییر':'شیر'}));
const tokens=text=>(pronunciationKey(text).match(/[\p{Script=Arabic}\u200c]+/gu)||[]).map(word=>({word,key:aliases.get(word)||word}));
export function suspectWords(expected,heard){
 const a=tokens(expected),b=tokens(heard);if(a.length<3||b.length<3||a.length>300||b.length>300)return [];
 const dp=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=a[i].key===b[j].key?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
 if(dp[0][0]/Math.max(a.length,b.length)<.6)return [];
 let i=0,j=0;const suspects=[];
 while(i<a.length&&j<b.length){if(a[i].key===b[j].key){i++;j++;continue;}const start=i,heardStart=j;while(i<a.length&&j<b.length&&a[i].key!==b[j].key){if(dp[i+1][j]>=dp[i][j+1])i++;else j++;}
 // Do not flag cut-off words, omissions or long unrecognised spans.
 const x=a.slice(start,i),y=b.slice(heardStart,j);if(start>0&&i<a.length&&j<b.length&&x.length===y.length&&x.length<=3)for(let k=0;k<x.length;k++)if(validWord(x[k].word)&&x[k].word.length>1)suspects.push({word:x[k].word,heard:y[k].word});
 }
 return suspects;
}
export const auditKey=(id,text,audio)=>createHash('sha256').update(id+'\n'+text+'\n').update(audio).digest('hex');
