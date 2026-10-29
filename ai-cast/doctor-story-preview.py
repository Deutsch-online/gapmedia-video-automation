"""Render a 45-second motion storyboard, explicitly without final 3D or speech.

Usage: python ai-cast/doctor-story-preview.py --output /tmp/doctor-preview
No network requests, credentials, generation credits or messages are used.
"""
import argparse
import importlib.util
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw
from cinematic_graphics import STEPS, font, panel, tap_ring, prepare_step

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('series_preview', ROOT / 'ai-cast/cinematic-series.py')
series = importlib.util.module_from_spec(spec)
spec.loader.exec_module(series)


def wrap(draw, text, face, width):
    result, line = [], ''
    for word in text.split():
        trial = (line + ' ' + word).strip()
        if draw.textlength(trial, font=face) > width:
            result.append(line)
            line = word
        else:
            line = trial
    return result + [line]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('/tmp/doctor-preview'))
    parser.add_argument('--audio-cache', type=Path, help='Validated production narration cache; never generates audio')
    args = parser.parse_args()
    folder = args.output.resolve()
    folder.mkdir(parents=True, exist_ok=True)
    plan = series.load_json(ROOT / 'ai-cast/doctor-appointment-45s.json')
    plan['research_source'] = {'url': plan['research_url']}
    # Validate the authored structure only; this preview does not assert live research.
    series.validate_plan(plan, plan['episode'], [])
    audios = []
    if args.audio_cache:
        import os
        import cinematic_speech as speech
        os.environ['CINEMATIC_CACHED_ONLY'] = 'on'
        voices = series.prepare_narration(plan, args.audio_cache, series.load_json(series.CONFIG))
        for i, source in enumerate(voices):
            aligned = args.audio_cache / f'{i:02}.aligned.wav'
            speech.aligned_audio(source, aligned)
            audios.append(aligned)
    labels = ['Das Problem', 'Mit dem Freund sprechen', 'Die Sprachbarriere',
              'Praxis suchen', 'Praxis prüfen', 'Zeit wählen', 'Angaben prüfen',
              'Absenden und warten', 'Bestätigung lesen']
    thumbs, parts = [], []
    for i, scene in enumerate(plan['scenes']):
        still = Image.new('RGB', (1080, 1920), '#EEF4F8')
        draw = ImageDraw.Draw(still)
        draw.text((50, 40), 'MARTA & LUKAS', font=font(35, True), fill='#173B45')
        label = 'STORYBOARD · 3D-ANIMATION AUSSTEHEND' if audios else 'STORYBOARD · OHNE 3D / SPRACHE'
        draw.text((50, 98), label, font=font(24, True), fill='#765531')
        for index in range(9):
            x = 50 + index * 110
            draw.rounded_rectangle((x, 160, x + 90, 169), radius=4,
                                   fill='#137F82' if index <= i else '#CEDDDF')
        width = 500 if i >= 3 else 980
        draw.rounded_rectangle((40, 245, 40 + width, 1050), radius=30, fill='white')
        draw.text((75, 290), f'{i + 1:02} / 09', font=font(30, True), fill='#137F82')
        y = 375
        for line in wrap(draw, labels[i], font(43, True), width - 70):
            draw.text((75, y), line, font=font(43, True), fill='#173B45')
            y += 65
        draw.text((75, y + 45), scene['speaker'].upper(), font=font(28, True), fill='#B16733')
        for j, line in enumerate(wrap(draw, scene['de'], font(37), width - 70)):
            draw.text((75, y + 105 + j * 58), line, font=font(37), fill='#173B45')
        draw.text((60, 1180), '45 Sekunden · ein Problem · eine Lösung', font=font(32, True), fill='#137F82')
        if i >= 3:
            phone = panel(scene['graphic_step'], folder / f'phone-{i}.png')
            still.paste(Image.open(phone), (580, 210), Image.open(phone))
        image_path = folder / f'board-{i}.png'
        still.save(image_path)
        thumbs.append(still.resize((270, 480)))
        output = folder / f'part-{i}.mp4'
        inputs = ['-loop', '1', '-framerate', '30', '-i', str(image_path)]
        audio_options = []
        if audios:
            inputs += ['-i', str(audios[i])]
            vf = '[0:v]null[v];[1:a]anull[a]'
            if scene.get('graphic_step'):
                graphic = prepare_step(scene, audios[i], folder, i)
                inputs += ['-loop', '1', '-framerate', '30', '-i', str(graphic['ring']), '-i', str(graphic['audio'])]
                onset = graphic['tap_at']
                vf = '[0:v]null[v];' if onset is None else f"[0:v][2:v]overlay=580:210:enable='between(t,{onset},{onset+.28})'[v];"
                vf += '[1:a][3:a]amix=inputs=2:normalize=0:duration=first[a]'
            audio_options = ['-map', '[a]', '-c:a', 'aac', '-ar', '48000', '-b:a', '192k']
        elif i >= 3 and scene['graphic_step'] != 'confirmed':
            ring = folder / f'ring-{i}.png'
            tap_ring(scene['graphic_step'], ring)
            inputs += ['-loop', '1', '-framerate', '30', '-i', str(ring)]
            vf = "[0:v][1:v]overlay=580:210:enable='between(t,3.8,4.08)'[v]"
        else:
            vf = '[0:v]null[v]'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', vf,
                        '-map', '[v]', *audio_options, '-t', '5', '-c:v', 'libx264', '-preset', 'ultrafast',
                        '-pix_fmt', 'yuv420p', str(output)], check=True)
        parts.append(output)
    concat = folder / 'concat.txt'
    concat.write_text(''.join(f"file '{p.as_posix()}'\nduration 5.000000\n" for p in parts))
    captions = folder / 'subtitles.ass'
    captions.write_text(series.build_subtitles(plan))
    final = folder / ('doctor-voiced-review-45s.mp4' if audios else 'doctor-storyboard-45s.mp4')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(concat),
                    '-vf', f'ass={captions}', '-t', '45', '-r', '30', '-c:v', 'libx264',
                    '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart', str(final)], check=True)
    if audios:
        series.conform_duration(final, 45)
    contact = Image.new('RGB', (810, 1440), 'white')
    for i, thumb in enumerate(thumbs):
        contact.paste(thumb, ((i % 3) * 270, (i // 3) * 480))
    contact.save(folder / 'contact.jpg')
    info = series.ffprobe(final)
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    if float(info['format']['duration']) != 45 or int(video['nb_frames']) != 1350:
        raise RuntimeError('Storyboard exceeds its exact 45-second contract')
    report = {'kind': 'motion-storyboard', 'final_3d': False, 'spoken_audio': bool(audios),
              'live_source_fetched': False, 'duration_seconds': 45, 'frames': 1350,
              'width': 1080, 'height': 1920, 'real_booking': False}
    (folder / 'preview-report.json').write_text(json.dumps(report, indent=2))
    print(final)


if __name__ == '__main__':
    main()
