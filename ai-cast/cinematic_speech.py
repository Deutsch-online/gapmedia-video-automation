
"""Audio-conditioned speaking takes. No generic-motion fallback and no time stretching."""
import hashlib
import json
import os
import shutil
import subprocess
from pathlib import Path

MODEL = os.getenv('LIPSYNC_SPACE', 'victor/LongCat-Video-Avatar-1.5')

def backend():
    name = os.getenv('CINEMATIC_SPEECH_BACKEND', 'gradio')
    if name not in ('gradio', 'wan2gp'):
        raise ValueError('Unknown cinematic speech backend: ' + name)
    return name

def model_identity():
    if backend() == 'wan2gp':
        from wan2gp_worker import MODEL as model, REVISION
        return 'wan2gp:' + model + ':' + REVISION
    return MODEL

def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format',
                     '-show_streams', '-of', 'json', str(path)]))

def audio_sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def aligned_audio(source, target):
    target = Path(target)
    marker = target.with_suffix('.alignment.json')
    signature = {'source': audio_sha(source), 'timing': '120ms-5s-mono48k-v1'}
    if target.exists() and marker.exists():
        saved = json.loads(marker.read_text())
        if saved.get('signature') == signature and saved.get('wav') == audio_sha(target):
            return str(target)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(source), '-af',
                    'adelay=120|120,apad,atrim=duration=5,aresample=48000',
                    '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', str(target)], check=True)
    if abs(float(probe(target)['format']['duration']) - 5) > .00001:
        raise RuntimeError('The speaking model and final mix require the same exact five-second WAV')
    marker.write_text(json.dumps({'signature': signature, 'wav': audio_sha(target)}))
    return str(target)

def generate(png, audio, output, motion, seed):
    prompt = ('One visible speaking adult cartoon character. Accurate lip and jaw movement driven by the supplied German speech. '
              'Natural real-time blinking, breathing and small grounded body and hand gestures. No slow motion, no exaggerated acting. '
              'The listener is off-camera. Keep identity and facial anatomy stable. ' + motion)
    if backend() == 'wan2gp':
        root = Path(os.environ.get('WAN2GP_ROOT', '/workspace/Wan2GP')).resolve()
        python = os.environ.get('WAN2GP_PYTHON', str(root / '.venv/bin/python'))
        subprocess.run([python, str(Path(__file__).with_name('wan2gp_worker.py')),
                        '--root', str(root), '--image', str(Path(png).resolve()),
                        '--audio', str(Path(audio).resolve()), '--output', str(Path(output).resolve()),
                        '--prompt', prompt, '--seed', str(seed)], check=True)
        return
    import shots
    from gradio_client import handle_file
    def call():
        c = shots.client(MODEL)
        result = c.predict(handle_file(str(png)), handle_file(str(audio)), prompt,
                           '480p', seed, 'Clean speech (fast)', 'DBCache faster', api_name='/generate')
        if isinstance(result, (list, tuple)):
            result = result[0]
        if isinstance(result, dict):
            result = result.get('video') or result.get('path')
            if isinstance(result, dict):
                result = result.get('path')
        shutil.copyfile(result, output)
    from cinematic_budget import run_gpu
    run_gpu(call, required_seconds=480)

def ensure_clip(png, audio, output, motion, seed):
    output = Path(output)
    marker = output.with_suffix('.speech.json')
    signature = {'audio_sha256': audio_sha(audio), 'image_sha256': audio_sha(png),
                 'model': model_identity(), 'motion': motion, 'seed': seed, 'timing': 'aligned-wav-native-speed-v1'}
    if not output.exists() or not marker.exists() or json.loads(marker.read_text()) != signature:
        output.unlink(missing_ok=True)
        marker.unlink(missing_ok=True)
        generate(png, audio, output, motion, seed)
        duration = float(probe(output)['format']['duration'])
        if not 5 <= duration <= 5.3:
            output.unlink(missing_ok=True)
            raise RuntimeError('Speaking clip does not cover the aligned audio at natural speed')
        marker.write_text(json.dumps(signature, sort_keys=True))
    return str(output)
