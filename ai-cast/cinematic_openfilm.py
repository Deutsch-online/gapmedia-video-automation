"""Offline editable OpenFilm copy of an already checked daily master. No AI calls."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tempfile


def digest(path):
    with Path(path).open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def export_project(master):
    master = Path(master).resolve(strict=True)
    quality_path = master.parent / 'quality.json'
    quality = json.loads(quality_path.read_text(encoding='utf-8'))
    if (quality.get('width'), quality.get('height')) != (1080, 1920):
        raise ValueError('OpenFilm requires the checked vertical 1080x1920 master')
    if abs(float(quality.get('duration', 0)) - 45) > .00001:
        raise ValueError('Only completed 45-second episodes can be exported')
    if not all(quality.get(key) is True for key in
               ('genuine_motion', 'German_audio', 'bilingual_subtitles', 'no_slow_motion', 'pause_music')):
        raise ValueError('The daily master must pass the existing media gates first')
    signature = {'source_sha256': digest(master), 'quality_sha256': digest(quality_path)}
    identity = hashlib.sha256(json.dumps(signature, sort_keys=True).encode()).hexdigest()[:16]
    root = master.parent / 'openfilm'
    root.mkdir(exist_ok=True)
    target = root / identity
    if target.exists():
        manifest = json.loads((target / 'manifest.json').read_text(encoding='utf-8'))
        if any(manifest.get(k) != v for k, v in signature.items()):
            raise ValueError('OpenFilm source identity changed')
        if not (target / 'film.html').is_file() or digest(target / 'assets/master.mp4') != signature['source_sha256']:
            raise ValueError('OpenFilm bundle is incomplete or its source was modified')
        # Preserve all manual timeline edits when this exact master is resumed.
        return target / 'film.html'
    stage = Path(tempfile.mkdtemp(prefix='.building-', dir=root))
    try:
        (stage / 'assets').mkdir()
        shutil.copyfile(master, stage / 'assets/master.mp4')
        shutil.copyfile(quality_path, stage / 'quality.json')
        if (master.parent / 'episode.json').is_file():
            shutil.copyfile(master.parent / 'episode.json', stage / 'episode.json')
        shots = '\n'.join(
            f'<video id="shot-{i+1:02d}" src="assets/master.mp4#t={i*5},{(i+1)*5}" '
            f'at="{i*5}" muted style="width:1080px;height:1920px"></video>'
            for i in range(9))
        (stage / 'film.html').write_text(
            '<!doctype html>\n<html><head><meta charset="utf-8">\n'
            '<meta name="viewport" content="width=1080, height=1920">\n'
            '<title>Lina &amp; Oma — editable daily cut</title></head><body>\n'
            '<section id="picture">\n' + shots + '\n</section>\n'
            '<section id="approved-mix"><audio src="assets/master.mp4#t=0,45"></audio></section>\n'
            '</body></html>\n', encoding='utf-8')
        (stage / 'manifest.json').write_text(json.dumps({
            'version': 1, **signature, 'tool': 'openfilm', 'tested_version': '0.3.2',
            'duration_seconds': 45, 'shots': 9, 'paid_services': False,
            'media_generation_calls': 0, 'caption_mode': 'existing-approved-burn-in',
            'audio_mode': 'one-continuous-approved-mix',
            'automatic_publication': False,
        }, indent=2) + '\n', encoding='utf-8')
        (stage / 'README.md').write_text(
            '# Editable daily cut\n\nOpen film.html with OpenFilm 0.3.2. Nine five-second '
            'cuts reference one local master at natural speed. The continuous audio track '
            'preserves the approved speech and pause music. Captions are already burned into '
            'this master: change their text in the source daily plan and caption renderer, '
            'not by adding duplicate captions here. Manual timeline edits are preserved on '
            'resume. Edited exports must pass all existing quality gates before any delivery. '
            'No service keys or generation calls are needed.\n', encoding='utf-8')
        stage.rename(target)
    finally:
        if stage.exists():
            shutil.rmtree(stage)
    return target / 'film.html'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('master')
    args = parser.parse_args()
    print(json.dumps({'film': str(export_project(args.master))}))
