import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const plan=JSON.parse(await fs.readFile('ai-cast/eleven-dialogue-60s.json','utf8'));
const root='renders/eleven-dialogue-60s/cache';await fs.mkdir(root,{recursive:true});
const key=process.env.ELEVEN_API_KEY;if(!key)throw Error('ELEVEN_API_KEY is not configured');
if(plan.duration_seconds!==60||plan.rounds.length!==5||plan.round_seconds!==12)throw Error('This request is scoped to one 60-second dialogue');
const turns=plan.rounds.flatMap((r,round)=>r.turns.map((t,turn)=>({...t,round,turn})));
if(turns.reduce((n,t)=>n+t.text.length,0)>1600)throw Error('Dialogue exceeds its character scope');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
async function get(p){const r=await fetch('https://api.elevenlabs.io'+p,{headers:{'xi-api-key':key},signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('ElevenLabs metadata HTTP '+r.status);return r.json();}
const [catalog,models]=await Promise.all([get('/v1/voices'),get('/v1/models')]);
if(!models.some(m=>m.model_id===plan.model&&m.can_do_text_to_speech))throw Error('Requested speech model unavailable');
for(const v of Object.values(plan.voices)){
 const found=catalog.voices.find(x=>x.voice_id===v.id&&['premade','professional'].includes(x.category));
 if(!found?.verified_languages?.some(l=>l.language==='de'&&l.model_id===plan.model))throw Error('Both licensed voices must be verified for German');
}
let ledger=[];try{ledger=JSON.parse(await fs.readFile(root+'/ledger.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
for(let i=0;i<turns.length;i++){
 const turn=turns[i],voice=plan.voices[turn.role];
 const body={text:turn.text,model_id:plan.model,voice_settings:{stability:0.5,similarity_boost:0.8,style:0.35,use_speaker_boost:true,speed:turn.role==='learner'?0.9:0.94},seed:610031+i};
 const signature=sha(JSON.stringify({voice_id:voice.id,body}));const stem=root+'/'+String(i).padStart(2,'0');
 let cached=false;try{const j=JSON.parse(await fs.readFile(stem+'.json','utf8'));cached=j.signature===signature&&j.audio_sha256===sha(await fs.readFile(stem+'.mp3'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(cached){console.log('Reused verified dialogue '+(i+1)+'/20');continue;}
 if(ledger.some(x=>x.signature===signature&&x.status==='uncertain'))throw Error('Uncertain earlier submission; refusing an automatic duplicate');
 if(ledger.reduce((n,x)=>n+x.characters,0)+turn.text.length>1600)throw Error('One-dialogue generation cap reached');
 const quota=await get('/v1/user/subscription');
 if(!Number.isFinite(quota.character_limit)||!Number.isFinite(quota.character_count)||quota.character_limit-quota.character_count<turn.text.length+64)throw Error('Included capacity insufficient; no top-up or overage');
 const item={signature,characters:turn.text.length,status:'uncertain'};ledger.push(item);await fs.writeFile(root+'/ledger.json',JSON.stringify(ledger));
 const r=await fetch('https://api.elevenlabs.io/v1/text-to-speech/'+voice.id+'/with-timestamps?output_format=mp3_44100_128',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
 if(!r.ok)throw Error('ElevenLabs synthesis HTTP '+r.status+'; no automatic retry');
 const j=await r.json();const audio=Buffer.from(j.audio_base64||'','base64');if(audio.length<1000||!j.alignment)throw Error('Missing actual audio or timing');
 await fs.writeFile(stem+'.mp3',audio);await fs.writeFile(stem+'.json',JSON.stringify({signature,audio_sha256:sha(audio),voice_id:voice.id,model:plan.model,text:turn.text,role:turn.role,alignment:j.alignment}));
 item.status='saved';await fs.writeFile(root+'/ledger.json',JSON.stringify(ledger));console.log('Saved German dialogue '+(i+1)+'/20');
}
