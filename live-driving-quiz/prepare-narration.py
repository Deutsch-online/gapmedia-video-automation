"""Build natural German question audio once on free CPU; playback is local WAV."""
import hashlib
import json
import os
from pathlib import Path
import re
import urllib.request
import wave

ROOT = Path(__file__).resolve().parent
REVISION = '5041a7a49ae5b3a0f30e6837769eb03fdbb231bd'
FILES = {
    'de_DE-thorsten-medium.onnx': '7e64762d8e5118bb578f2eea6207e1a35a8e0c30595010b666f983fc87bb7819',
    'de_DE-thorsten-medium.onnx.json': '974adee790533adb273a1ac88f49027d2a1b8f0f2cf4905954a4791e79264e85',
    'MODEL_CARD': '5196b5ab0794e6056263a1f37c18bec407b61ac187529bee29d1c366871e5c9e',
}


def prepare():
    import onnxruntime as ort
    from piper.voice import PiperVoice
    from piper.config import PiperConfig, SynthesisConfig
    cache = Path(os.environ.get('QUIZ_VOICE_CACHE', ROOT / '.voice-cache'))
    cache.mkdir(parents=True, exist_ok=True)
    for name, expected in FILES.items():
        path = cache / name
        if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            url = f'https://huggingface.co/rhasspy/piper-voices/resolve/{REVISION}/de/de_DE/thorsten/medium/{name}'
            with urllib.request.urlopen(url, timeout=120) as response:
                data = response.read()
            if hashlib.sha256(data).hexdigest() != expected:
                raise RuntimeError('German voice checksum mismatch: ' + name)
            path.write_bytes(data)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    options.enable_cpu_mem_arena = False
    options.use_deterministic_compute = True
    voice = PiperVoice(
        config=PiperConfig.from_dict(json.loads((cache / 'de_DE-thorsten-medium.onnx.json').read_text())),
        session=ort.InferenceSession(str(cache / 'de_DE-thorsten-medium.onnx'), sess_options=options, providers=['CPUExecutionProvider']),
    )
    directory = ROOT / 'public/narration'
    directory.mkdir(parents=True, exist_ok=True)
    manifest = {'engine': 'piper-1.3.0', 'voice': 'de_DE-thorsten-medium', 'model_revision': REVISION, 'dataset_license': 'CC0', 'questions': {}}
    questions = json.loads((ROOT / 'data/questions.json').read_text())
    for question in questions:
        if not re.fullmatch(r'[A-Za-z0-9.-]+', question['id']):
            raise ValueError('Invalid question ID')
        # Read complete German sentences, never one synthesis request per word.
        text = re.sub(r'\s+', ' ', re.sub(r'[\[\]]', '', question['de'])).strip()
        path = directory / (question['id'] + '.wav')
        with wave.open(str(path), 'wb') as output:
            voice.synthesize_wav(text, output, syn_config=SynthesisConfig(length_scale=1.0, noise_scale=0.667, noise_w_scale=0.8, normalize_audio=True, volume=0.85))
        with wave.open(str(path)) as audio:
            duration = round(audio.getnframes() / audio.getframerate() * 1000)
            if audio.getnchannels() != 1 or audio.getsampwidth() != 2 or duration < 400:
                raise RuntimeError('Invalid German recording')
        manifest['questions'][question['id']] = {'duration_ms': duration, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'text_sha256': hashlib.sha256(question['de'].encode()).hexdigest()}
    (directory / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False) + '\n')
    print(f"Prepared {len(questions)} natural German Piper recordings on CPU.", flush=True)


if __name__ == '__main__':
    prepare()
