"""Owner authorized credit use only to finish the last 15 seconds of episode 5."""
import hashlib
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location('series', Path(__file__).with_name('cinematic-series.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
state = m.load_json(m.STATE)
if state.get('next_episode') != 5:
    raise RuntimeError('This one-off authorization is only for unfinished episode 5')
plan = state['pending']['plan']
approved = m.load_json('ai-cast/episode5-preview-plan.json')
if plan != approved or len(plan['scenes']) != 12:
    raise RuntimeError('The authorized plan changed; refusing credit use')
cache = Path('renders/cinematic-series-cache/e0005')
for i in range(9):
    # Never use credit authorization as a reason to regenerate finished takes.
    for suffix in ('.png', '.mp4', '.aligned.wav', '.speech.json', '.audio.sig', '.sig'):
        if not (cache / f'{i:02}{suffix}').is_file():
            raise RuntimeError('A completed take is missing from cache')
    marker = json.loads((cache / f'{i:02}.speech.json').read_text())
    for key, suffix in (('audio_sha256', '.aligned.wav'), ('image_sha256', '.png')):
        if marker[key] != hashlib.sha256((cache / f'{i:02}{suffix}').read_bytes()).hexdigest():
            raise RuntimeError('Completed take signature mismatch')
m.production(force=True)
