
"""Everyday-life preview with actual audio-conditioned lip movement and natural-speed acting."""
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('series', Path(__file__).with_name('cinematic-series.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
import os
plan = m.load_json('ai-cast/newcomer-preview-plan.json')
if not m.approved_credit({'pending': {'plan': plan}, 'next_episode': 9002}):
    raise RuntimeError('Waiting for the matching Telegram confirmation; no GPU request made')
m.bot('verify')
request = m.load_json(m.CREDIT_REQUEST)
request.update(status='running', active_run=os.environ['GITHUB_RUN_ID'] + ':' + os.getenv('GITHUB_RUN_ATTEMPT', '1'))
m.atomic_json(m.CREDIT_REQUEST, request)
m.checkpoint(m.load_json(m.STATE))
try:
    master = Path(m.render(plan, {**m.load_json(m.CONFIG), 'single_speaker_preview': True}, preview=True))
except Exception:
    m.close_credit_attempt('attempt-failed')
    m.checkpoint(m.load_json(m.STATE))
    raise
m.close_credit_attempt('completed')
m.checkpoint(m.load_json(m.STATE))
quality = m.load_json(master.parent / 'quality.json')
files = {}
for platform, (bitrate, maximum) in m.PLATFORM_PROFILES.items():
    folder = master.parent / platform
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / ('wg-chaos-preview-' + platform + '.mp4')
    m.command(['ffmpeg', '-y', '-v', 'error', '-i', master,
               '-c:v', 'libx264', '-preset', 'fast', '-b:v', bitrate, '-maxrate', maximum,
               '-bufsize', '10000k', '-pix_fmt', 'yuv420p', '-c:a', 'copy',
               '-movflags', '+faststart', target])
    info = m.ffprobe(target)
    if not 15 <= float(info['format']['duration']) <= 15.3:
        raise RuntimeError('Preview duration failed')
    files[platform] = str(target)
m.atomic_json(master.parent / 'preview-exports.json', {'files': files, 'quality': quality})
if __import__('os').getenv('PREVIEW_REVIEW_ONLY') != '1':
    m.command(['node', 'ai-cast/send-newcomer-preview.mjs', str(master.parent / 'preview-exports.json')])
