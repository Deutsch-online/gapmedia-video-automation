
"""Add music only to pauses in the reviewed preview; reuse the exact approved video."""
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('series', Path(__file__).with_name('cinematic-series.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
from cinematic_music import add_pause_music
folder = Path('renders/cinematic-series/preview-e0003')
manifest = m.load_json(folder / 'preview-exports.json')
for platform, file in manifest['files'].items():
    report = add_pause_music(file)
    if not report['music_windows']:
        raise RuntimeError('No suitable pauses for the requested music')
    print(platform + ' music windows: ' + str(report['music_windows']), flush=True)
manifest['quality'].update(pause_music=True, music_during_speech_samples=0, duration=15.0)
m.atomic_json(folder / 'preview-exports.json', manifest)
m.command(['node', 'ai-cast/send-comedy-preview.mjs', str(folder / 'preview-exports.json')])
