import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const sha=data=>createHash('sha256').update(data).digest('hex');
// A recorded mouth animation may only accompany its exact recorded sentence.
export function loadReactionClips(publicDir){
 const clips=new Map();
 try{
  const manifest=JSON.parse(readFileSync(join(publicDir,'assets/reaction-clips.json'),'utf8'));
  if(manifest.version!==1||manifest.portraitSha256!==sha(readFileSync(join(publicDir,'assets/aryana.png'))))return clips;
  for(const entry of (manifest.entries||[]).slice(0,20)){
   if(typeof entry.text!=='string'||!entry.text.trim()||entry.text.length>200||!Number.isFinite(entry.duration)||entry.duration<=0||entry.duration>30)continue;
   const valid=(path,ext,hash)=>typeof path==='string'&&(new RegExp('^/assets/reaction-[a-z-]+\\.'+ext+'$').test(path)||path==='/assets/introduction.'+ext)&&/^[a-f0-9]{64}$/.test(hash||'')&&sha(readFileSync(join(publicDir,path.slice(1))))===hash;
   try{if(valid(entry.audio,'mp3',entry.audioSha256)&&valid(entry.video,'mp4',entry.videoSha256))clips.set(entry.text,{audio:entry.audio,video:entry.video});}catch{}
  }
 }catch{}
 return clips;
}
