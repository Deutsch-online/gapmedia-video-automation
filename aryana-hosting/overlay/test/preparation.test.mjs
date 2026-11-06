import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,writeFileSync,symlinkSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import net from 'node:net';
test('Slow cold conversation models do not block voice preparation or cached reactions',{timeout:12000},async()=>{
 const root=fileURLToPath(new URL('..',import.meta.url)),dir=mkdtempSync(join(tmpdir(),'aryana-preparation-'));
 const listener=net.createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(r=>listener.close(r));
 cpSync(join(root,'src'),join(dir,'src'),{recursive:true});cpSync(join(root,'public'),join(dir,'public'),{recursive:true});writeFileSync(join(dir,'package.json'),'{"type":"module"}');symlinkSync(join(root,'node_modules'),join(dir,'node_modules'),'dir');writeFileSync(join(dir,'model.gguf'),'stub');
 const python=join(dir,'fake-python');writeFileSync(python,`#!/usr/bin/env python3
import sys,json,time
print(json.dumps({'ready':True}),flush=True)
for line in sys.stdin:
 request=json.loads(line)
 if sys.argv[1].endswith('speech.py'):print(json.dumps({'id':request['id'],'ok':True,'result':{'warmed':True}}),flush=True)
 else:time.sleep(300)
`);chmodSync(python,0o700);
 const child=spawn(process.execPath,['src/server.mjs'],{cwd:dir,detached:true,stdio:'ignore',env:{...process.env,PORT:String(port),PUBLIC_URL:'',SPACE_HOST:'',ARYANA_ADMIN_TOKEN:'',ARYANA_STATE_REPO:'',ARYANA_STATE_TOKEN:'',ARYANA_LIPSYNC_TOKEN:'',ARYANA_VOICE_PROVIDER:'',ARYANA_VOICE_PROFILE_B64:'',ARYANA_PYTHON:python,ARYANA_CHAT_PYTHON:python,ARYANA_CHAT_MODEL:join(dir,'model.gguf')}});
 const base='http://127.0.0.1:'+port;
 try{let key;for(let n=0;n<60;n++){try{key=(await(await fetch(base+'/api/session')).json()).key;if(key)break;}catch{}await new Promise(r=>setTimeout(r,50));}assert(key,'fixture server started');const headers={'x-aryana-key':key,'content-type':'application/json'};assert.equal((await fetch(base+'/api/lip-prepare',{method:'POST',headers,body:'{}'})).status,200);
 let state;for(let n=0;n<50;n++){state=await(await fetch(base+'/api/state',{headers})).json();if(state.livePreparation.status==='ready')break;await new Promise(r=>setTimeout(r,50));}
 assert.equal(state.livePreparation.status,'ready');assert.equal(state.voiceEngine.warmed,true);assert.notEqual(state.conversationStatus,'ready');assert.notEqual(state.programModelStatus,'ready');
 }finally{try{process.kill(-child.pid,'SIGTERM');}catch{}await Promise.race([once(child,'exit'),new Promise(r=>setTimeout(r,1000))]);rmSync(dir,{recursive:true,force:true});}
});
