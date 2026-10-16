
"""One-time recovery of a proven pre-upload duration rejection. No GPU calls."""
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('series', Path(__file__).with_name('cinematic-series.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
state = m.load_json(m.STATE)
date = '2026-10-16'
pending = state.get('pending') or {}
path = Path('renders/cinematic-series/e0002/e0002-cinematic-fa-de.mp4')
if date in state['deliveries']:
    print('Already delivered; recovery is a no-op')
    raise SystemExit(0)
if pending.get('status') != 'dispatching' or pending.get('file') != str(path) or pending.get('plan', {}).get('episode') != 2:
    raise RuntimeError('Recovery does not match the saved delivery intent')
quality = m.load_json(path.parent / 'quality.json')
info = m.ffprobe(path)
# Artifact from run 38892001615 proves conform rejected before sendVideo:
# original QC is 65s, while the attempted conformed file has a 60.008s AAC tail.
if not 65 <= quality['duration'] <= 65.3 or abs(float(info['format']['duration']) - 60.008) > .001:
    raise RuntimeError('Artifact does not prove the known pre-upload failure; do not resend')
if not all(quality.get(k) for k in ('genuine_motion', 'German_audio', 'bilingual_subtitles')):
    raise RuntimeError('Original quality gates must have passed')
m.conform_duration(path)
quality['duration'] = 60.0
m.atomic_json(path.parent / 'quality.json', quality)
result = m.bot('send', str(path))
if not result.get('message_id'):
    raise RuntimeError('Missing Telegram receipt; never automatically retry this upload')
m.atomic_json(path.parent / 'delivery-receipt.json', result)
state['deliveries'][date] = {'episode': 2, 'message_id': result['message_id']}
state['history'].append(pending['plan'])
state['next_episode'] = 3
state['pending'] = None
m.checkpoint(state)
print('Episode 2 delivered; Telegram message ' + str(result['message_id']), flush=True)
