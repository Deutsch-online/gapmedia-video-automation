"""Prepare complete native German/Persian WAVs once on free CPU, never paid TTS."""
import hashlib
import json
import os
from pathlib import Path
import re
import unicodedata
import urllib.request
import wave
import shutil

ROOT = Path(__file__).resolve().parent
REVISION = '5041a7a49ae5b3a0f30e6837769eb03fdbb231bd'
VOICES = {
 'de': {'voice': 'de_DE-thorsten-medium', 'path': 'de/de_DE/thorsten/medium', 'files': {
  'de_DE-thorsten-medium.onnx': '7e64762d8e5118bb578f2eea6207e1a35a8e0c30595010b666f983fc87bb7819',
  'de_DE-thorsten-medium.onnx.json': '974adee790533adb273a1ac88f49027d2a1b8f0f2cf4905954a4791e79264e85',
  'MODEL_CARD': '5196b5ab0794e6056263a1f37c18bec407b61ac187529bee29d1c366871e5c9e'}},
 'fa': {'voice': 'fa_IR-amir-medium', 'path': 'fa/fa_IR/amir/medium', 'files': {
  'fa_IR-amir-medium.onnx': 'fb815380d969ea372b0b21b0de14421f58fe481047e153e69685d079b6e1a9d1',
  'fa_IR-amir-medium.onnx.json': '75f918a3bf0f57a9179abe725af529f2a5c79d6c899e2a84aec76c685d5dfb9a',
  'MODEL_CARD': '0d7d315699945ac830162f82d485d79af51a33081a7649e8992726bd4bba2384'}}}

def speech_text(text, lang):
    # Never verbalize brackets, quotes, bullets or symbol names. Punctuation only
    # contributes a sentence pause; decimal numbers retain their numeric meaning.
    text = unicodedata.normalize('NFC', text)
    if lang == 'fa':
        text = text.translate(str.maketrans('يك٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', 'یک01234567890123456789')).replace('\u200c', ' ')
        text = re.sub(r'(?<=\d)[.٫](?=\d)', ' ممیز ', text)
        text = text.replace('%', ' درصد ').replace('٪', ' درصد ')
    text = re.sub(r'(?<=[\w\d])[؟?!;؛。](?=\s|$)', '.', text)
    text = ''.join(c if c in '.,' or not unicodedata.category(c).startswith(('P', 'S', 'C')) else ' ' for c in text)
    return re.sub(r'\s+', ' ', text).strip()

def prepare():
    import onnxruntime as ort
    from piper.voice import PiperVoice
    from piper.config import PiperConfig, SynthesisConfig
    cache = Path(os.environ.get('QUIZ_VOICE_CACHE', ROOT / '.voice-cache'));cache.mkdir(parents=True, exist_ok=True)
    directory = ROOT / 'public/narration';directory.mkdir(parents=True, exist_ok=True)
    manifest = {'engine': 'piper-1.3.0', 'voice': VOICES['de']['voice'], 'persian_voice': VOICES['fa']['voice'], 'model_revision': REVISION, 'dataset_license': 'CC0', 'questions': {}, 'persian_questions': {}, 'welcome': {}}
    questions = json.loads((ROOT / 'data/questions.json').read_text())
    messages = json.loads((ROOT / 'speech-texts.json').read_text())['welcome']
    for lang, meta in VOICES.items():
        model_cache=cache/lang;model_cache.mkdir(exist_ok=True)
        for name, expected in meta['files'].items():
            path = model_cache/name
            if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
                url=f"https://huggingface.co/rhasspy/piper-voices/resolve/{REVISION}/{meta['path']}/{name}"
                with urllib.request.urlopen(url, timeout=120) as response:data=response.read()
                if hashlib.sha256(data).hexdigest()!=expected:raise RuntimeError('Voice checksum mismatch: '+name)
                path.write_bytes(data)
        options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1;options.enable_cpu_mem_arena=False;options.use_deterministic_compute=True
        voice=PiperVoice(config=PiperConfig.from_dict(json.loads((model_cache/(meta['voice']+'.onnx.json')).read_text())),session=ort.InferenceSession(str(model_cache/(meta['voice']+'.onnx')),sess_options=options,providers=['CPUExecutionProvider']))
        output_dir=directory if lang=='de' else directory/'fa';output_dir.mkdir(exist_ok=True)
        synthesized={}
        items=[(q['id'],q[lang],False) for q in questions]+[('welcome-'+lang,messages[lang],True)]
        for identifier,raw,welcome in items:
            if not re.fullmatch(r'[A-Za-z0-9.-]+',identifier):raise ValueError('Invalid audio ID')
            text=speech_text(raw,lang);key=hashlib.sha256(text.encode()).hexdigest()
            path=(directory if welcome else output_dir)/(identifier+'.wav')
            if key in synthesized:shutil.copyfile(synthesized[key],path)
            else:
                with wave.open(str(path),'wb') as output:voice.synthesize_wav(text,output,syn_config=SynthesisConfig(length_scale=1.0,noise_scale=.667,noise_w_scale=.8,normalize_audio=True,volume=.85))
                synthesized[key]=path
            with wave.open(str(path)) as audio:
                duration=round(audio.getnframes()/audio.getframerate()*1000)
                if audio.getnchannels()!=1 or audio.getsampwidth()!=2 or duration<400:raise RuntimeError('Invalid recording')
            row={'duration_ms':duration,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'text_sha256':hashlib.sha256(raw.encode()).hexdigest(),'speech_sha256':key}
            if welcome:manifest['welcome'][lang]=row
            else:manifest['questions' if lang=='de' else 'persian_questions'][identifier]=row
        print(f"Prepared {len(questions)} {lang} readings + welcome ({len(synthesized)} unique utterances) on CPU.",flush=True)
    (directory/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False)+'\n')

if __name__=='__main__':prepare()
