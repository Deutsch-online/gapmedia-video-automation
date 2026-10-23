import {readFileSync,existsSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('.',import.meta.url));
export const bankManifest=JSON.parse(readFileSync(join(root,'data/bank-manifest.json'),'utf8'));
export function validateImage(bytes,row){
 if(bytes.length!==row.bytes||bytes.length>6000000||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.length<24||bytes.readUInt32BE(16)!==row.width||bytes.readUInt32BE(20)!==row.height||createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('Question image failed integrity check: '+row.question_id);
 return bytes;
}
export function imageRows(){
 const seen=new Set();
 return bankManifest.images.map(row=>{
  if(!/^[0-9A-Za-z_-]+\.png$/.test(row.file)||seen.has(row.file)||!/^[a-f0-9]{64}$/.test(row.sha256)||!Number.isInteger(row.bytes)||row.bytes<24||row.bytes>6000000||row.url!==`https://raw.githubusercontent.com/${bankManifest.upstream_repository}/${bankManifest.upstream_commit}/images/${row.file}`)throw Error('Invalid image manifest');
  seen.add(row.file);return row;
 });
}
export function loadBankMedia(questions){
 const rows=imageRows();const files=new Map();
 for(const q of questions){if(q.source_kind!=='imported-question-bank')continue;const row=rows.find(r=>r.question_id===q.id&&q.image==='/media/'+r.file);if(!row)throw Error('Question/image association missing: '+q.id);const bytes=validateImage(readFileSync(join(root,'public/media',row.file)),row);files.set(q.image,bytes);}
 return files;
}
export async function fetchBankMedia(){
 const rows=imageRows();const directory=join(root,'public/media');mkdirSync(directory,{recursive:true});
 for(const row of rows){
  const target=join(directory,row.file);
  if(existsSync(target)){try{validateImage(readFileSync(target),row);continue;}catch{}}
  let last;
  for(let attempt=0;attempt<3;attempt++){
   try{const response=await fetch(row.url,{signal:AbortSignal.timeout(30000),redirect:'error'});if(!response.ok)throw Error('Image download HTTP '+response.status);const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>row.bytes)throw Error('Oversized question image');chunks.push(chunk);}const bytes=validateImage(Buffer.concat(chunks),row);writeFileSync(target+'.tmp',bytes);renameSync(target+'.tmp',target);last=null;break;}catch(e){last=e;}
  }
  if(last)throw last;
 }
 console.log(`Verified ${rows.length} pinned question images.`);
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await fetchBankMedia();
