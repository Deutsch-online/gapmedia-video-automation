
"""Cheerful instrumental only in pauses; speech and video timing remain unchanged."""
import array
import json
import math
import re
import subprocess
import sys
import wave
from pathlib import Path

def run(args):
    return subprocess.run([str(x) for x in args], check=True, capture_output=True, text=True)

def media_info(path):
    return json.loads(run(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', path]).stdout)

def protected_speech(path, duration):
    result = run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'silencedetect=noise=-42dB:d=0.12',
                  '-vn', '-f', 'null', '-'])
    silences = []
    start = None
    for kind, value in re.findall(r'silence_(start|end): ([0-9.]+)', result.stderr):
        if kind == 'start':
            start = float(value)
        elif start is not None:
            silences.append((start, float(value)))
            start = None
    if start is not None:
        silences.append((start, duration))
    voiced, cursor = [], 0.0
    for a, b in silences:
        if a > cursor:
            voiced.append([cursor, a])
        cursor = max(cursor, b)
    if cursor < duration:
        voiced.append([cursor, duration])
    # Keep an entire utterance protected, including ordinary inter-word pauses.
    merged = []
    for a, b in voiced:
        if merged and a - merged[-1][1] < .7:
            merged[-1][1] = b
        else:
            merged.append([a, b])
    if not merged:
        raise RuntimeError('No speech detected; refusing to treat the whole video as a music pause')
    guarded = []
    for a, b in merged:
        a, b = max(0, a-.15), min(duration, b+.25)
        if guarded and a <= guarded[-1][1]:
            guarded[-1][1] = max(guarded[-1][1], b)
        else:
            guarded.append([a, b])
    return guarded

def music_windows(protected, duration):
    result, cursor = [], 0.0
    for a, b in protected:
        if a - cursor >= .65:
            result.append([cursor, a])
        cursor = max(cursor, b)
    if duration - cursor >= .65:
        result.append([cursor, duration])
    return result

def gated_track(track, target, protected, duration):
    base = Path(target).with_suffix('.base.wav')
    run(['ffmpeg', '-y', '-v', 'error', '-stream_loop', '-1', '-i', track,
         '-af', f'loudnorm=I=-23:TP=-6:LRA=7,aresample=48000,atrim=duration={duration}',
         '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', '-t', str(duration), base])
    with wave.open(str(base)) as wav:
        rate, channels = wav.getframerate(), wav.getnchannels()
        samples = array.array('h', wav.readframes(wav.getnframes()))
    if sys.byteorder != 'little':
        samples.byteswap()
    gated = array.array('h', [0]) * len(samples)
    windows = music_windows(protected, duration)
    for a, b in windows:
        first, last = math.ceil(a*rate), min(len(samples)//channels, math.floor(b*rate))
        for frame in range(first, last):
            t = frame / rate
            gain = min(1.0, (t-a)/.12, (b-t)/.12)
            for channel in range(channels):
                index = frame*channels+channel
                gated[index] = round(samples[index] * max(0, gain))
    # This check is on the actual music stem, before encoding the final mix.
    leakage = 0
    for a, b in protected:
        first, last = math.floor(a*rate)*channels, min(len(gated), math.ceil(b*rate)*channels)
        leakage += sum(value != 0 for value in gated[first:last])
    if leakage:
        raise RuntimeError('Music overlaps the protected dialogue')
    if windows and not any(gated):
        raise RuntimeError('Pause music stem is unexpectedly silent')
    if sys.byteorder != 'little':
        gated.byteswap()
    with wave.open(str(target), 'wb') as wav:
        wav.setnchannels(channels); wav.setsampwidth(2); wav.setframerate(rate)
        wav.writeframes(gated.tobytes())
    base.unlink()
    return {'track': str(track), 'protected_speech': protected, 'music_windows': windows,
            'nonzero_music_samples_during_protected_speech': leakage, 'music_lufs': -23}

def add_pause_music(video, track='public/music/kitchen-2.mp3'):
    video = Path(video)
    info = media_info(video)
    stream = next(s for s in info['streams'] if s['codec_type'] == 'video')
    duration = float(stream.get('duration') or info['format']['duration'])
    protected = protected_speech(video, duration)
    music = video.with_name(video.stem + '-music-only.wav')
    report = gated_track(track, music, protected, duration)
    target = video.with_name(video.stem + '-music.mp4')
    run(['ffmpeg', '-y', '-v', 'error', '-i', video, '-i', music,
         '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first:normalize=0[a]',
         '-map', '0:v:0', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac',
         '-ar', '48000', '-b:a', '192k', '-t', f'{duration:.6f}',
         '-movflags', '+faststart', target])
    output = media_info(target)
    if abs(float(output['format']['duration']) - duration) > .001:
        raise RuntimeError('Adding music changed the duration')
    target.replace(video)
    report_path = video.with_name(video.stem + '-music-report.json')
    report_path.write_text(json.dumps(report, indent=2))
    music.unlink()
    return report
