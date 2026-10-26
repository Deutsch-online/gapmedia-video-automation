import {mkdirSync,readFileSync,writeFileSync,existsSync,chmodSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export class PrivateTeacherFiles{
 constructor(store,directory){this.store=store;this.directory=directory;mkdirSync(directory,{recursive:true,mode:0o700});chmodSync(directory,0o700);}
 path(hash){if(!/^[a-f0-9]{64}$/.test(hash))throw Error('Invalid private word hash');return join(this.directory,hash+'.wav');}
 async save(hash,bytes){const path=this.path(hash);if(createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('Word integrity mismatch');
  if(this.store.repo){if(!this.store.ready||!this.store.token)throw Error('ذخیرهٔ خصوصی آماده نیست.');const body=[{key:'header',value:{summary:'Save owner pronunciation example'}},{key:'file',value:{path:'teacher-words/'+hash+'.wav',content:bytes.toString('base64'),encoding:'base64'}}].map(x=>JSON.stringify(x)).join('\n')+'\n';const r=await fetch(`https://huggingface.co/api/datasets/${this.store.repo}/commit/main`,{method:'POST',headers:{Authorization:'Bearer '+this.store.token,'Content-Type':'application/x-ndjson'},body,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('ذخیرهٔ خصوصی نمونه ناموفق بود.');await r.arrayBuffer();}
  writeFileSync(path,bytes,{mode:0o600});return path;
 }
 async load(hash){const path=this.path(hash);let bytes;if(existsSync(path))bytes=readFileSync(path);else{if(!this.store.repo||!this.store.ready||!this.store.token)throw Error('نمونهٔ تلفظ خصوصی در دسترس نیست.');const r=await fetch(`https://huggingface.co/datasets/${this.store.repo}/resolve/main/teacher-words/${hash}.wav`,{headers:{Authorization:'Bearer '+this.store.token},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('نمونهٔ تلفظ خصوصی خوانده نشد.');const length=Number(r.headers.get('content-length'));if(length>240000)throw Error('Oversized private sample');bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>240000)throw Error('Oversized private sample');}
  if(createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('Private sample integrity mismatch');writeFileSync(path,bytes,{mode:0o600});return bytes;
 }
}
