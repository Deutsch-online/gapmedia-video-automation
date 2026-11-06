import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('ElevenLabs uses the selected natural voice and never buys overage or leaks keys',()=>{
 const code=`import os,json,tempfile,sys,io,urllib.error
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,'src')
import elevenlabs_voice as voice
os.environ.update(ELEVENLABS_API_KEY='test-key-only',ELEVENLABS_VOICE_ID='test_voice',ELEVENLABS_MODEL_ID='eleven_v3',ARYANA_VOICE_PROVIDER='elevenlabs')
calls=[]
class Response(io.BytesIO):
 def __enter__(self):return self
 def __exit__(self,*args):self.close()
def respond(req,timeout):
 calls.append(req)
 if req.data is None:return Response(json.dumps({'character_limit':1000,'character_count':5}).encode())
 return Response(b'ID3'+b'0'*2000)
with tempfile.TemporaryDirectory() as folder,patch('urllib.request.urlopen',respond):
 assert voice.warmup()['clone'] is False
 result=voice.synthesize('سلام، خوش آمدید!','fa',Path(folder)/'speech.mp3')
 assert result['provider']=='elevenlabs'
 body=json.loads(calls[-1].data)
 assert body['language_code']=='fa' and body['model_id']=='eleven_v3'
 assert body['voice_settings']['speed']==1.0
 assert calls[-1].get_header('Xi-api-key')=='test-key-only'
 assert 'test-key-only' not in json.dumps(result)
 calls.clear()
 def empty(req,timeout):
  calls.append(req);return Response(b'{"character_limit":5,"character_count":5}')
 with patch('urllib.request.urlopen',empty):
  try:voice.synthesize('No overage allowed.','en',Path(folder)/'blocked.mp3');raise AssertionError('Unexpected generation')
  except voice.VoiceUnavailable as error:assert str(error)=='elevenlabs_quota_empty'
  assert len(calls)==1 and calls[0].data is None
 def denied(req,timeout):raise urllib.error.HTTPError(req.full_url,401,'secret details',None,None)
 with patch('urllib.request.urlopen',denied):
  try:voice.warmup();raise AssertionError('Unexpected access')
  except voice.VoiceUnavailable as error:assert str(error)=='elevenlabs_access_denied'
def catalog(req,timeout):
 if req.full_url.endswith('/models'):data=[{'model_id':'eleven_v3','can_do_text_to_speech':True,'languages':[{'language_id':'fa'},{'language_id':'en'}]},{'model_id':'english_only','can_do_text_to_speech':True,'languages':[{'language_id':'en'}]}]
 elif req.full_url.endswith('/voices'):data={'voices':[{'voice_id':'clone','category':'cloned','labels':{'gender':'female','language':'fa'}},{'voice_id':'natural','name':'Sarah','category':'premade','labels':{'gender':'female'}}]}
 else:data={'character_limit':1000,'character_count':5}
 return Response(json.dumps(data).encode())
with patch('urllib.request.urlopen',catalog):
 config=voice.select_configuration('test-key-only')
 assert config=={'voice_id':'natural','model_id':'eleven_v3','remaining_characters':995}
print('ok')
`;
 const root=fileURLToPath(new URL('..',import.meta.url));assert.match(execFileSync('python3',['-c',code],{cwd:root,encoding:'utf8'}),/ok/);
});
