"""Resident native Persian Piper voice. NDJSON stdin/stdout; no network or shell."""
import base64,hashlib,importlib.util,io,json,os,sys,wave
from pathlib import Path
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('speech_prepare',ROOT/'prepare-narration.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
import onnxruntime as ort
from runtime_pronunciation import reading
from piper.voice import PiperVoice
from piper.config import PiperConfig,SynthesisConfig
voices={}
for language in ['fa','de']:
 meta=module.VOICES[language];cache=Path(os.environ.get('QUIZ_VOICE_CACHE',ROOT/'.voice-cache'))/language
 for name,expected in meta['files'].items():
  if hashlib.sha256((cache/name).read_bytes()).hexdigest()!=expected:raise RuntimeError('Native voice cache integrity failed')
 options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1;options.enable_cpu_mem_arena=False
 voices[language]=PiperVoice(config=PiperConfig.from_dict(json.loads((cache/(meta['voice']+'.onnx.json')).read_text())),session=ort.InferenceSession(str(cache/(meta['voice']+'.onnx')),sess_options=options,providers=['CPUExecutionProvider']))
for line in sys.stdin:
 request={}
 try:
  if len(line)>500000:raise ValueError('Request too long')
  request=json.loads(line);text=request['text']
  if not isinstance(text,str) or not 1<=len(text)<=1600:raise ValueError('Invalid speech length')
  if request.get('operation')=='learn':
   from pronunciation_learning import learn
   reference=base64.b64decode(request['reference'],validate=True)
   if len(reference)>240000 or len(text)>60:raise ValueError('Invalid pronunciation sample')
   def native(spoken):
    output=io.BytesIO();reading(module,text,voices,output,[{'word':text,'spoken':spoken}],request.get('style',{}));return output.getvalue()
   from types import SimpleNamespace
   from standard_persian import speech_text as standard_text
   result=learn(SimpleNamespace(speech_text=lambda text,lang:standard_text(text)),text,reference,native,lambda spoken:voices['fa'].phonemize(module.speech_text(spoken,'de')))
   print(json.dumps({'id':request['id'],'learned':result},ensure_ascii=True),flush=True)
   continue
  buffer=io.BytesIO()
  reading(module,text,voices,buffer,request.get('rules',[]),request.get('style',{}))
  data=buffer.getvalue()
  with wave.open(io.BytesIO(data)) as audio:duration=round(audio.getnframes()/audio.getframerate()*1000)
  if not 400<=duration<=120000 or len(data)>5500000:raise ValueError('Speech exceeds bound')
  print(json.dumps({'id':request['id'],'duration_ms':duration,'audio':base64.b64encode(data).decode('ascii')},ensure_ascii=True),flush=True)
 except Exception:
  print(json.dumps({'id':request.get('id'),'error':'Native Persian speech could not be prepared'}),flush=True)
