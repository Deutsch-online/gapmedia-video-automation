import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const plan=JSON.parse(await fs.readFile('ai-cast/eleven-faceless-60s.json','utf8'));
const folder='renders/eleven-faceless-60s/cache';
await fs.mkdir(folder,{recursive:true});
const key=process.env.ELEVEN_API_KEY;
if(!key)throw Error('ELEVEN_API_KEY is not configured');
if(plan.duration_seconds!==60||plan.scenes.length!==8||plan.scene_seconds!==7.5||!plan.faceless)throw Error('This request is scoped to one faceless 60-second video');
const total=plan.scenes.reduce((n,s)=>n+s.narration.length,0);
if(total>plan.voice.max_total_characters||plan.voice.max_total_characters>1600)throw Error('Narration exceeds this production scope');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
async function get(endpoint){
  const r=await fetch('https://api.elevenlabs.io'+endpoint,{headers:{'xi-api-key':key},signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw Error('ElevenLabs metadata HTTP '+r.status);
  return r.json();
}
const [catalog,models]=await Promise.all([get('/v1/voices'),get('/v1/models')]);
const voice=catalog.voices.find(v=>v.voice_id===plan.voice.id&&['premade','professional'].includes(v.category));
if(!voice||!voice.verified_languages?.some(l=>l.language==='de'&&l.model_id===plan.voice.model))throw Error('The selected licensed voice is not verified for this German model');
if(!models.some(m=>m.model_id===plan.voice.model&&m.can_do_text_to_speech&&m.languages.some(l=>l.language_id==='de')))throw Error('German synthesis is not supported by the chosen model');
const ledgerFile=path.join(folder,'generation-ledger.json');
let ledger=[];try{ledger=JSON.parse(await fs.readFile(ledgerFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
for(let i=0;i<plan.scenes.length;i++){
  const scene=plan.scenes[i];
  const settings={stability:i<3?0.4:0.55,similarity_boost:0.8,style:i<3?0.45:0.3,use_speaker_boost:true,speed:plan.voice.speed};
  const request={text:scene.narration,model_id:plan.voice.model,voice_settings:settings,seed:310016+i};
  const signature=hash(JSON.stringify({voice_id:plan.voice.id,request}));
  const stem=path.join(folder,String(i).padStart(2,'0'));
  let cached=false;
  try{const receipt=JSON.parse(await fs.readFile(stem+'.json','utf8'));cached=receipt.signature===signature&&receipt.audio_sha256===hash(await fs.readFile(stem+'.mp3'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(cached){console.log('Reused verified German narration '+(i+1)+'/8');continue;}
  if(ledger.some(x=>x.signature===signature&&x.status==='uncertain'))throw Error('A previous synthesis response was uncertain; refusing an automatic duplicate charge');
  if(ledger.reduce((n,x)=>n+x.characters,0)+scene.narration.length>plan.voice.max_total_characters)throw Error('This video has reached its bounded narration-character scope');
  const subscription=await get('/v1/user/subscription');
  if(!Number.isFinite(subscription.character_limit)||!Number.isFinite(subscription.character_count)||subscription.character_limit-subscription.character_count<scene.narration.length+64)throw Error('Included character capacity is insufficient; overage and top-ups are not authorized');
  const entry={signature,characters:scene.narration.length,status:'uncertain',index:i};
  ledger.push(entry);await fs.writeFile(ledgerFile,JSON.stringify(ledger,null,2));
  const response=await fetch('https://api.elevenlabs.io/v1/text-to-speech/'+plan.voice.id+'/with-timestamps?output_format=mp3_44100_128',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error('ElevenLabs synthesis HTTP '+response.status+'; no automatic retry');
  const result=await response.json();
  const audio=Buffer.from(result.audio_base64||'','base64');
  if(audio.length<1000||!result.alignment)throw Error('Speech or timing data is missing; no automatic retry');
  await fs.writeFile(stem+'.mp3',audio);
  await fs.writeFile(stem+'.json',JSON.stringify({signature,audio_sha256:hash(audio),voice_id:plan.voice.id,model:plan.voice.model,language:'de',alignment:result.alignment,settings},null,2));
  entry.status='saved';await fs.writeFile(ledgerFile,JSON.stringify(ledger,null,2));
  console.log('Saved actual ElevenLabs German narration '+(i+1)+'/8');
}
console.log('All eight German narration files are ready; no account top-up, cloning or publication requested.');
