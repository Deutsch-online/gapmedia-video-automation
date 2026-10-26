import {controlMedia} from './media-viewer.js';
// Standalone client demo. No LIVE events, admin requests, gifts or progress writes.
export async function startSalesPreview(render){
 const response=await fetch('/api/demo');if(!response.ok)throw Error('Demo unavailable');const {questions}=await response.json();
 let previousPhase,pausedAt;
 let index=0,round=0,phase,opened,closes,videoAt,answer=new Set(),showPersian=true,input='comments',score=0,lastWinner=null,giftAt=0,coins=0,likes=1200;
 const person={key:'demo-person',name:'Demo Alex',avatar:null},fan={key:'demo-fan',personKey:'demo-fan',kind:'like',name:'Demo Mia',avatar:null,likes,likeLabel:'1.2K',tier:'crown',username:null};
 function start(){round++;const now=Date.now(),watch=questions[index].video?questions[index].video_duration_ms+2000:0;phase=watch?'watching':'open';videoAt=watch?now+2000:null;opened=now+watch;closes=opened+30000;answer=new Set();emit();}
 function reveal(){if(phase==='watching')return;phase='revealed';const correct=questions[index].correct;const win=answer.size===correct.length&&correct.every(k=>answer.has(k));if(win&&!lastWinner?.roundId?.endsWith(':'+round)){score++;lastWinner={roundId:'sales:'+round,questionId:questions[index].id,at:Date.now(),count:1,people:[person]};}emit();}
 function state(){const q=questions[index],{correct,explanation_de,explanation_fa,source,...question}=q;if(phase==='revealed')Object.assign(question,{correct,explanation_de,explanation_fa,source});question.multiple=correct.length>1;
 const gift=coins?{key:'demo-gift',personKey:'demo-gift',kind:'gift',name:'Demo Sam',avatar:null,giftName:'Demo Rose',coins,count:Math.max(1,Math.round(coins/10)),likes:0,likeLabel:'0',tier:coins>=1000?'vip':coins>=500?'diamond':coins>100?'gold':'silver',username:null,at:giftAt}:null;
 return {build:'isolated-sales-demo',mode:'demo',connection:{status:'demo',autoReconnect:false},navigation:{hasPrevious:index>0},question,index,total:questions.length,phase,roundId:'sales:'+round,serverTime:Date.now(),opensAt:opened,closesAt:closes,videoStartedAt:videoAt,questionSeconds:30,answerInput:input,showPersian,username:'Sales Demo',liveReady:false,autoplay:false,counts:Object.fromEntries('ABC'.split('').map(k=>[k,answer.has(k)?1:0])),participants:Object.fromEntries('ABC'.split('').map(k=>[k,answer.has(k)?[person]:[]])),voters:answer.size?1:0,gifts:{A:{symbol:'🌹',name:'Demo Rose'},B:{symbol:'🎵',name:'Demo TikTok'},C:{symbol:'🎁',name:'Demo Gift'}},guests:[],activityDisplay:{side:'right',count:3,top:220},activityFocus:gift&&Date.now()-giftAt<60000?gift:fan,supporters:[...(gift?[gift]:[]),fan],celebration:lastWinner,celebrationMusic:true,musicVolume:20,timerSound:true,narrationEnabled:false,narrationReplay:0,revealReason:'manual',leaderboard:[{name:person.name,score}],session:{number:1,position:index+1,size:questions.length,review:false,finished:false}};
 }
 function emit(){const s=state();render(s);window.parent.postMessage({type:'fahrfit-demo-state',phase,index,total:questions.length,score,questionId:s.question.id,video:Boolean(s.question.video),hasPrevious:index>0},location.origin);}
 function command(action,data={}){
  if(action==='next'){index=(index+1)%questions.length;start();}if(action==='previous'&&index>0){index--;start();}if(action==='repeat'||action==='start')start();if(action==='pause'&&phase!=='paused'){previousPhase=phase;pausedAt=Date.now();phase='paused';emit();}if(action==='resume'&&phase==='paused'){const delay=Date.now()-pausedAt;opened+=delay;closes+=delay;if(videoAt)videoAt+=delay;phase=previousPhase||'open';emit();}if(action==='media')controlMedia(data.action,data.value);if(action==='reveal')reveal();
  if(action==='language'){showPersian=Boolean(data.enabled);emit();}if(action==='input'){input=data.input==='gifts'?'gifts':'comments';answer=new Set();emit();}
  if(action==='answer'&&phase==='open'){const digits=String(data.value||'').match(/[123]/g)||[];for(const n of digits)answer.add('ABC'[Number(n)-1]);emit();}
  if(action==='support'){coins+=500;giftAt=Date.now();emit();}
  if(action==='video'){const found=questions.findIndex(q=>q.video);if(found>=0){index=found;start();}}
 }
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===window.parent&&e.data?.type==='fahrfit-demo-command')command(e.data.action,e.data.data);});
 document.addEventListener('quiz-demo-command',e=>command(e.detail.action,e.detail.data));
 setInterval(()=>{if(phase==='watching'&&Date.now()>=opened)phase='open';if(phase==='open'&&Date.now()>=closes)reveal();else emit();},500);
 document.body.classList.add('sales-preview');start();
}
