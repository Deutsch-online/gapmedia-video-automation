import {readFileSync,existsSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('.',import.meta.url));
export const bankManifest=JSON.parse(readFileSync(join(root,'data/bank-manifest.json'),'utf8'));
function integrity(bytes,row,limit){
 if(bytes.length!==row.bytes||bytes.length>limit||createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('Question media failed integrity check: '+row.question_id);
 return bytes;
}
export function validateImage(bytes,row){
 integrity(bytes,row,6000000);
 if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)!==row.width||bytes.readUInt32BE(20)!==row.height)throw Error('Question image failed integrity check: '+row.question_id);
 return bytes;
}
export function validateVideo(bytes,row){
 integrity(bytes,row,30000000);
 if(bytes.length<16||bytes.toString('ascii',4,8)!=='ftyp'||!Number.isInteger(row.duration_ms)||row.duration_ms<1000||row.duration_ms>30000)throw Error('Invalid question video: '+row.question_id);
 return bytes;
}
export function mediaRows(){
 const seen=new Set();
 return [...bankManifest.images,...(bankManifest.videos||[])].map(row=>{
  const video=row.file.endsWith('.mp4'),folder=video?'videos':'images';
  const pinned=`https://raw.githubusercontent.com/${bankManifest.upstream_repository}/${bankManifest.upstream_commit}/${folder}/${row.file}`;
  const original=new URL(row.url);
  const publisher=original.origin==='https://storage.googleapis.com'&&new RegExp('^/theory-svc-production-media/media/de/\\d{4}-\\d{2}-\\d{2}/'+row.question_id.replaceAll('.','\\.')+'\\.png$').test(original.pathname)&&!original.search&&!original.hash;
  if(!/^[0-9A-Za-z_-]+\.(png|mp4)$/.test(row.file)||seen.has(row.file)||!/^[a-f0-9]{64}$/.test(row.sha256)||!Number.isInteger(row.bytes)||row.bytes<24||row.bytes>(video?30000000:6000000)||(row.url!==pinned&&!(publisher&&!video)))throw Error('Invalid media manifest');
  seen.add(row.file);return row;
 });
}
export function imageRows(){return mediaRows().filter(row=>row.file.endsWith('.png'));}
export function loadBankMedia(questions){
 const rows=mediaRows(),files=new Map();
 for(const q of questions){
  if(q.source_kind!=='imported-question-bank')continue;
  const image=rows.find(r=>r.question_id===q.id&&q.image==='/media/'+r.file);if(!image)throw Error('Question/image association missing: '+q.id);
  files.set(q.image,validateImage(readFileSync(join(root,'public/media',image.file)),image));
  if(q.video){const video=rows.find(r=>r.question_id===q.id&&q.video==='/media/'+r.file&&q.video_duration_ms===r.duration_ms);if(!video)throw Error('Question/video association missing: '+q.id);files.set(q.video,validateVideo(readFileSync(join(root,'public/media',video.file)),video));}
 }
 return files;
}
export async function fetchBankMedia(){
 const rows=mediaRows(),directory=join(root,'public/media');mkdirSync(directory,{recursive:true});
 for(const row of rows){
  const target=join(directory,row.file),validate=row.file.endsWith('.mp4')?validateVideo:validateImage;
  if(existsSync(target)){try{validate(readFileSync(target),row);continue;}catch{}}
  let last;
  for(let attempt=0;attempt<3;attempt++){
   try{const response=await fetch(row.url,{signal:AbortSignal.timeout(30000),redirect:'error'});if(!response.ok)throw Error('Media download HTTP '+response.status);const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>row.bytes)throw Error('Oversized question media');chunks.push(chunk);}const bytes=validate(Buffer.concat(chunks),row);writeFileSync(target+'.tmp',bytes);renameSync(target+'.tmp',target);last=null;break;}catch(e){last=e;}
  }
  if(last)throw last;
 }
 console.log(`Verified ${bankManifest.images.length} source images and ${(bankManifest.videos||[]).length} source videos.`);
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await fetchBankMedia();
