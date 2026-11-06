import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {mkdtempSync,writeFileSync,chmodSync,readdirSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {privateMediaUploader} from '../src/voice-archive-upload.mjs';
test('Private media uses the official SDK and refuses a public dataset',()=>{
 const code=`import sys,types,importlib.util,tempfile,os,json
from pathlib import Path
from types import SimpleNamespace
calls=[]
class Operation:
 def __init__(self,**kwargs):self.__dict__.update(kwargs)
class Api:
 private=True
 def __init__(self,token):assert token=='test-owner-token'
 def repo_info(self,repo,repo_type):assert repo_type=='dataset';return SimpleNamespace(private=self.private)
 def create_commit(self,**kwargs):calls.append(kwargs)
sys.modules['huggingface_hub']=SimpleNamespace(HfApi=Api,CommitOperationAdd=Operation)
spec=importlib.util.spec_from_file_location('private_upload','tools/voice-archive-client.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
os.environ['ARYANA_STATE_TOKEN']='test-owner-token'
with tempfile.TemporaryDirectory() as folder:
 source=Path(folder)/'video.mp4';source.write_bytes(b'validated-video')
 data={'repo':'afgtakrun/aryana-live-private-state','files':[{'path':'voice-video/'+'a'*64+'/'+'b'*64+'.mp4','source':str(source)}]}
 result=module.upload(data);assert result=={'ok':True,'files':1};assert len(calls)==1
 assert calls[0]['operations'][0].path_or_fileobj==str(source)
 assert 'test-owner-token' not in json.dumps(result)
 Api.private=False
 try:module.upload(data);raise AssertionError('Public dataset accepted')
 except ValueError:pass
 assert len(calls)==1
print('ok')
`;
 assert.match(execFileSync('python3',['-c',code],{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'}),/ok/);
});
test('Media transfer sends local file paths without credentials and cleans temporary files',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'aryana-transfer-'));try{const python=join(dir,'fake-python');writeFileSync(python,`#!/usr/bin/env python3
import sys,json
from pathlib import Path
data=json.load(sys.stdin)
assert set(data)=={'repo','files'}
assert Path(data['files'][0]['source']).read_bytes()==b'video-bytes'
assert data['files'][0]['path'].endswith('.mp4')
print('ARYANA_VOICE_ARCHIVE '+json.dumps({'ok':True}))
`);chmodSync(python,0o700);const upload=privateMediaUploader({python,script:'unused',repo:'afgtakrun/aryana-live-private-state',directory:dir});await upload([['voice-video/'+'a'.repeat(64)+'/'+'b'.repeat(64)+'.mp4',Buffer.from('video-bytes')]]);assert.deepEqual(readdirSync(dir),['fake-python']);}finally{rmSync(dir,{recursive:true,force:true});}
});
