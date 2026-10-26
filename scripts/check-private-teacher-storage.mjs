// Verify the actual private Dataset path with synthetic audio only; no owner profile changes.
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PrivateTeacherFiles} from '../live-driving-quiz/private-teacher-files.mjs';
import {pcmWav} from '../live-driving-quiz/public/teacher-audio.js';
import {validateWordAudio} from '../live-driving-quiz/teacher-profile.mjs';
const token=process.env.HF_TOKEN;
if(!token)throw Error('Private storage verification needs the configured hosting credential');
const identity=await fetch('https://huggingface.co/api/whoami-v2',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
if(!identity.ok)throw Error('Hosting identity check failed: HTTP '+identity.status);
const owner=(await identity.json()).name;if(!/^[A-Za-z0-9_-]+$/.test(owner))throw Error('Invalid hosting identity');
const repo=owner+'/fahrfit-quiz-state';
const attrs=await fetch('https://huggingface.co/datasets/'+repo+'/resolve/main/.gitattributes',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
const wavLfs=attrs.ok&&/^\*\.wav\s+filter=lfs/m.test(await attrs.text());
const samples=Float32Array.from({length:11025},(_,i)=>Math.sin(i/10)*.15),bytes=Buffer.from(await pcmWav(samples,22050).arrayBuffer()),info=validateWordAudio(bytes);
const dir=mkdtempSync(join(tmpdir(),'teacher-storage-check-'));
try{const store={repo,token,ready:true};await new PrivateTeacherFiles(store,join(dir,'upload')).save(info.sha256,bytes);const remote=await new PrivateTeacherFiles(store,join(dir,'reload')).load(info.sha256);if(!remote.equals(bytes))throw Error('Remote pronunciation sample differs');console.log(JSON.stringify({ok:true,private_json_round_trip:true,wav_requires_lfs:Boolean(wavLfs),synthetic_audio_only:true}));}finally{rmSync(dir,{recursive:true,force:true});}
