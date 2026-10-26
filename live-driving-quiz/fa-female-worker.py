"""Free keyless female Persian synthesis; cached by the private Node adapter."""
import asyncio,base64,io,json,os,ssl,subprocess,sys,wave
import edge_tts
from standard_persian import speech_text
from runtime_pronunciation import correction_matches,pronunciation_key
# Honor the configured environment CA; never turn certificate validation off.
if os.environ.get('SSL_CERT_FILE'):
 import edge_tts.communicate as transport
 transport._SSL_CTX=ssl.create_default_context(cafile=os.environ['SSL_CERT_FILE'])
async def render(request):
 text=request['text']
 if not isinstance(text,str) or not 1<=len(text)<=1600:raise ValueError('Invalid text')
 rules=[r for r in request.get('rules',[]) if isinstance(r.get('spoken'),str) and pronunciation_key(r.get('word',''))==pronunciation_key(r['spoken'])]
 for start,end,rule in reversed(correction_matches(text,rules)):text=text[:start]+rule['spoken']+text[end:]
 text=speech_text(text);pace=float(request.get('style',{}).get('pace',1.25));rate=max(-30,min(5,round((1.25/pace*.9-1)*100)))
 communicate=edge_tts.Communicate(text,voice='fa-IR-DilaraNeural',rate=f'{rate:+d}%',proxy=os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy'))
 parts=[]
 async for item in communicate.stream():
  if item['type']=='audio':parts.append(item['data'])
  if sum(map(len,parts))>5500000:raise ValueError('Oversized speech')
 result=subprocess.run(['ffmpeg','-v','error','-i','pipe:0','-ar','22050','-ac','1','-f','wav','-c:a','pcm_s16le','pipe:1'],input=b''.join(parts),capture_output=True,timeout=15,check=True).stdout
 # Repack ffmpeg's pipe WAV (unknown RIFF length) to a regular bounded PCM WAV.
 with wave.open(io.BytesIO(result)) as source:frames=source.readframes(22050*121)
 if not 400<=len(frames)/44.1<=120000:raise ValueError('Invalid duration')
 out=io.BytesIO()
 with wave.open(out,'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050);w.writeframes(frames)
 return {'id':request['id'],'audio':base64.b64encode(out.getvalue()).decode(),'duration_ms':round(len(frames)/44.1)}
for line in sys.stdin:
 request={}
 try:
  if len(line)>500000:raise ValueError('Oversized input')
  request=json.loads(line);print(json.dumps(asyncio.run(asyncio.wait_for(render(request),40))),flush=True)
 except Exception:print(json.dumps({'id':request.get('id'),'error':'female_persian_unavailable'}),flush=True)
