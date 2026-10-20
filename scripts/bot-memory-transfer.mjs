// Only encrypted chat data or a public encryption key enter GitHub.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const REPO='Deutsch-online/gapmedia-video-automation';
const ROOT='https://afghanfollowers-telegram.afghan-video-bot.workers.dev';
const payload=JSON.parse(readFileSync('.bot-memory-transfer.json','utf8'));
if(!['prepare','import'].includes(payload.action))throw new Error('Invalid transfer action');
if(payload.action==='import'&&('messages' in payload||'preferences' in payload))throw new Error('Plaintext chat must never enter GitHub');
const signature=createHash('sha256').update('gapmedia-monitor-v1:'+process.env.TELEGRAM_BOT_TOKEN).digest('hex');
let response;
for(let attempt=0;attempt<16;attempt++){
  response=await fetch(ROOT+'/internal/project-memory',{method:'POST',headers:{'content-type':'application/json','X-Project-Authorization':signature},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
  if(response.ok)break;
  if(![404,503].includes(response.status))throw new Error('Private transfer rejected '+response.status);
  await new Promise(resolve=>setTimeout(resolve,15000));
}
if(!response?.ok)throw new Error('Private memory endpoint not ready');
const result=await response.json();
if(payload.action==='prepare'){
  const url=`https://api.github.com/repos/${REPO}/contents/.bot-memory-import-public-key.json`;
  const headers={authorization:'Bearer '+process.env.GH_TOKEN,accept:'application/vnd.github+json','user-agent':'GapMedia-Memory-Transfer','content-type':'application/json'};
  const old=await fetch(url+'?ref=main',{headers});
  if(!old.ok&&old.status!==404)throw new Error('Could not check public import key');
  const sha=old.ok?(await old.json()).sha:null;
  const saved=await fetch(url,{method:'PUT',headers,body:JSON.stringify({message:'memory: publish temporary public encryption key',branch:'main',content:Buffer.from(JSON.stringify(result,null,2)+'\n').toString('base64'),...(sha?{sha}:{})})});
  if(!saved.ok)throw new Error('Public encryption key publication failed');
  console.log('Public encryption key prepared. No chat content was published.');
}else{
  console.log(JSON.stringify({imported:true,messages:result.messages,preferences:result.preferences}));
}
