import {photoQuestion} from './photo-quest.mjs';
// Free, non-monetary entertainment. No payment or engagement buys a result.
export const FREE_PLAY_VERSION=63;
import {QUIZ_BANK} from './question-bank.mjs';
export function roundQuiz(number=1,language='en'){const index=((Number(number)||1)-1)%QUIZ_BANK.length,q=QUIZ_BANK[index];return{id:q.id,index,question:language==='fa'?q.fa:q.en,options:language==='fa'?q.faOptions:q.enOptions,answer:q.answer,available:true};}
export function answerNumber(text){const n=String(text??'').replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).trim();return /^[1-4]$/.test(n)?Number(n):null;}
export function migrateFreePlay(s){if(s.freePlayVersion===FREE_PLAY_VERSION)return false;
 s.policyArchive??={};s.policyArchive.v62=structuredClone({profileLedger:s.fun?.profileLedger,profileRound:s.fun?.profileRound,football:s.fun?.football});
 s.admission.entryMode='comment';s.admission.minCoins=0;s.audio??={};s.audio.promotionalVoice=false;
 const f=s.fun??={people:[],queue:[]};f.profileThanksQueue=[];f.profileThanksActive=null;f.profileThanksLedger={};f.profileLedger={};f.profileAttract=null;f.podiumOverrides={};
 for(const person of [...(f.people||[]),...(f.queue||[])]){person.activity={likes:0,comments:0,coins:0,points:0};person.level=0;person.style=null;delete person.queuedActivity;}
 const old=f.profileRound||{};f.profileRound={...old,phase:'ready',remainingMs:(old.seconds||180)*1000,deadline:null,members:[],chartMembers:[],winner:null,throneId:null,chartThroneId:null,quizResponses:[],manualVersion:47};
 if(f.football){const l=f.football;l.scores=Array(12).fill(0);l.members=[];l.matchSupporters=[];l.previews=[];l.queue=[];l.nextVotes=[];l.active=null;l.results=null;l.attract=null;l.phase='lobby';l.remainingMs=(l.seconds||180)*1000;l.deadline=null;l.freeVoters=[];l.season=Array.from({length:12},()=>({points:0,leaguePoints:0,wins:0,last:0}));l.allSupporters=[];}
 if(s.liveExperience==='game'){s.liveExperience='portraits';s.viewMode='fun';f.layout='portraits';}
 s.freePlayVersion=FREE_PLAY_VERSION;return true;}

export function quizState(round={},time=Date.now(),language='en'){const period=round.gameMode==='photo'?60:30;const remaining=round.phase==='playing'?Math.max(0,(round.deadline||time)-time):Math.max(0,round.remainingMs??(round.seconds||180)*1000);const elapsed=Math.max(0,(round.seconds||180)*1000-remaining),slot=Math.min(Math.max(0,Math.ceil((round.seconds||180)/period)-1),Math.floor(elapsed/(period*1000)));const waiting={id:'waiting',question:language==='fa'?(round.phase==='ready'?'با شروع دور، سؤال تازه نمایش داده می‌شود.':'سؤال تازه به‌زودی آماده می‌شود.'):(round.phase==='ready'?'A fresh question appears when the round starts.':'A fresh question will be available shortly.'),options:[],answer:null,available:false};const quiz=round.questionIndex===null?waiting:(round.gameMode==='photo'?photoQuestion:roundQuiz)(Number.isInteger(round.questionIndex)?round.questionIndex+1:(round.number||1)+slot,language);return{...quiz,slot,nextIn:round.questionIndex===null&&round.quizCooldownUntil?Math.max(0,(round.quizCooldownUntil-time)/1000):Math.max(0,Math.min(period-elapsed%(period*1000)/1000,remaining/1000))};}
