import {mkdirSync,readFileSync,writeFileSync,existsSync,chmodSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
async function limitedBytes(response,max){if(Number(response.headers.get('content-length'))>max)throw Error('Oversized private sample');const parts=[];let count=0;for await(const part of response.body){count+=part.length;if(count>max)throw Error('Oversized private sample');parts.push(Buffer.from(part));}return Buffer.concat(parts);}
export function privateStorageError(status){const detail=status===401||status===403?'دسترسی نوشتن به ذخیرهٔ خصوصی را بررسی کنید.':status===429?'محدودیت موقت ذخیره‌سازی؛ کمی بعد دوباره بزنید.':status===409?'ذخیره هم‌زمان بود؛ دوباره تلاش کنید.':'نمونه حفظ شده است؛ دوباره ذخیره کنید.';return Error('ذخیرهٔ خصوصی نمونه ناموفق بود (HTTP '+status+'). '+detail);}
export class PrivateTeacherFiles{
 constructor(store,directory){this.store=store;this.directory=directory;mkdirSync(directory,{recursive:true,mode:0o700});chmodSync(directory,0o700);}
 path(hash){if(!/^[a-f0-9]{64}$/.test(hash))throw Error('Invalid private word hash');return join(this.directory,hash+'.wav');}
 async save(hash,bytes){const path=this.path(hash);if(createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('Word integrity mismatch');
  if(this.store.repo){if(!this.store.ready||!this.store.token)throw Error('ذخیرهٔ خصوصی آماده نیست.');
   // JSON uses ordinary Git storage; Dataset WAV paths normally require the LFS upload protocol.
   const envelope=JSON.stringify({version:1,sha256:hash,audio:bytes.toString('base64')});const body=[{key:'header',value:{summary:'Save owner pronunciation example'}},{key:'file',value:{path:'teacher-words/'+hash+'.json',content:Buffer.from(envelope).toString('base64'),encoding:'base64'}}].map(x=>JSON.stringify(x)).join('\n')+'\n';
   const r=await fetch(`https://huggingface.co/api/datasets/${this.store.repo}/commit/main`,{method:'POST',headers:{Authorization:'Bearer '+this.store.token,'Content-Type':'application/x-ndjson'},body,signal:AbortSignal.timeout(20000)});if(!r.ok)throw privateStorageError(r.status);await r.arrayBuffer();}
  writeFileSync(path,bytes,{mode:0o600});return path;
 }
 async load(hash){const path=this.path(hash);let bytes;if(existsSync(path))bytes=readFileSync(path);else{
  if(!this.store.repo||!this.store.ready||!this.store.token)throw Error('نمونهٔ تلفظ خصوصی در دسترس نیست.');
  const read=ext=>fetch(`https://huggingface.co/datasets/${this.store.repo}/resolve/main/teacher-words/${hash}.${ext}`,{headers:{Authorization:'Bearer '+this.store.token},signal:AbortSignal.timeout(15000)});
  let r=await read('json');if(r.status===404){r=await read('wav');if(!r.ok)throw Error('نمونهٔ تلفظ خصوصی خوانده نشد.');bytes=await limitedBytes(r,2646044);}else{if(!r.ok)throw Error('نمونهٔ تلفظ خصوصی خوانده نشد.');const data=JSON.parse((await limitedBytes(r,3540000)).toString('utf8'));if(data.version!==1||data.sha256!==hash||typeof data.audio!=='string'||data.audio.length>3528060||!/^[A-Za-z0-9+/]*={0,2}$/.test(data.audio))throw Error('Invalid private sample envelope');bytes=Buffer.from(data.audio,'base64');}
 }
  if(bytes.length>2646044||createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('Private sample integrity mismatch');writeFileSync(path,bytes,{mode:0o600});return bytes;
 }
}
