"""Bounded owner-only CPU transcription; in-memory audio, no runtime network/API."""
import base64,io,json,os,sys,wave
from pathlib import Path
from faster_whisper import WhisperModel
root=Path(os.environ.get('QUIZ_ASR_MODEL','/home/node/asr-model'))
model=WhisperModel(str(root),device='cpu',compute_type='int8',cpu_threads=2,num_workers=1,local_files_only=True)
for line in sys.stdin:
    request={}
    try:
        if len(line)>330000:raise ValueError('Oversized audio')
        request=json.loads(line);audio=base64.b64decode(request['audio'],validate=True)
        if not 44<=len(audio)<=240000:raise ValueError('Invalid audio')
        with wave.open(io.BytesIO(audio)) as wav:
            if wav.getframerate()!=22050 or wav.getnchannels()!=1 or wav.getsampwidth()!=2 or not .15<=wav.getnframes()/22050<=5:raise ValueError('Invalid PCM')
        segments,_=model.transcribe(io.BytesIO(audio),language='fa',task='transcribe',beam_size=3,temperature=0,condition_on_previous_text=False,vad_filter=False,initial_prompt='درس رانندگی به فارسی دری. دستیار، سوال بعدی. سوال قبلی. توقف. این کلمه را اینطور تلفظ کن. پاسخ را نشان بده. تکرار جلسه.',no_speech_threshold=.6,log_prob_threshold=-1,compression_ratio_threshold=2.4)
        text=' '.join(s.text.strip() for s in segments if s.no_speech_prob<.6 and s.avg_logprob>-1).strip()
        if len(text)>240:raise ValueError('Long transcript')
        print(json.dumps({'id':request['id'],'text':text},ensure_ascii=False),flush=True)
    except Exception:
        print(json.dumps({'id':request.get('id'),'error':'local_recognition_failed'}),flush=True)
