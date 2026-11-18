"""Fill episode 25 clips that the included 480s LongCat call can no longer cover.

Clips 6-8 were rendered on the free ZeroGPU duplicate
virakon/LongCat-Video-Avatar-ZeroGPU (same model and API, 120s GPU cap).
Clip 9 is rendered here with the account's included token on that same free
space. This does not enable PAID_FALLBACK or any paid inference provider.
"""
import json
import shutil
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / 'ai-cast/e0025-free-clips'
CACHE = ROOT / 'renders/cinematic-series-cache/e0025-lina-oma-v1'
SPACE = 'virakon/LongCat-Video-Avatar-ZeroGPU'
STORY = 'lina-oma-gift-bekommen-v1'


def copy_seed():
    if not SEED.is_dir():
        return
    CACHE.mkdir(parents=True, exist_ok=True)
    for path in SEED.iterdir():
        if not path.is_file():
            continue
        target = CACHE / path.name
        if not target.exists():
            shutil.copy2(path, target)
            print('Installed free clip file ' + path.name, flush=True)


def missing(plan):
    import cinematic_design as design
    import cinematic_speech as speech
    gaps = []
    for index, scene in enumerate(plan['scenes']):
        video = CACHE / f'{index:02}.mp4'
        marker = CACHE / f'{index:02}.speech.json'
        image = CACHE / f'{index:02}.png'
        audio = CACHE / f'{index:02}.aligned.wav'
        motion = design.speaking_motion(scene)
        seed = plan['episode'] * 1009 + index * 11
        expected = {
            'audio_sha256': speech.audio_sha(audio) if audio.is_file() else '',
            'image_sha256': speech.audio_sha(image) if image.is_file() else '',
            'model': speech.model_identity('longcat-light'),
            'motion': motion,
            'seed': seed,
            'timing': 'aligned-wav-native-speed-v1',
        }
        saved = json.loads(marker.read_text()) if marker.is_file() else None
        if video.is_file() and saved == expected:
            continue
        gaps.append((index, scene, expected, image, audio, video, marker))
    return gaps


def render_one(index, expected, image, audio, video):
    import os
    from gradio_client import Client, handle_file
    import cinematic_speech as speech
    from cinematic_longcat import check_native_shape, expected_light_shape
    token = os.getenv('HF_TOKEN')
    if not token:
        raise RuntimeError('Included Hugging Face token is required for the last free clip')
    if os.getenv('PAID_FALLBACK', 'off').lower() not in ('off', '0', 'false'):
        raise RuntimeError('PAID_FALLBACK must stay off')
    prompt = ('Exactly one visible speaking character. Preserve the age, identity and proportions '
              'of the supplied single-person image. No second face or listener in the frame. '
              'Only this mouth follows the audio; mouth closed during silence. '
              'Stable face, natural eyes and restrained mouth movement. ' + expected['motion'])
    try:
        client = Client(SPACE, token=token)
    except TypeError:
        client = Client(SPACE, hf_token=token)
    last = None
    for attempt in range(3):
        if attempt:
            time.sleep((5, 15)[attempt - 1])
        try:
            print(f'Rendering scene {index + 1} on free space {SPACE}, attempt {attempt + 1}', flush=True)
            result = client.predict(
                handle_file(str(image)), handle_file(str(audio)), prompt, '480p', expected['seed'],
                'Clean speech (fast)', 'DBCache faster', api_name='/generate')
            result = result[0] if isinstance(result, (list, tuple)) else result
            if isinstance(result, dict):
                result = result.get('video', result.get('path', result))
                if isinstance(result, dict):
                    result = result['path']
            shutil.copyfile(result, video)
            info = speech.probe(video)
            stream = next(item for item in info['streams'] if item['codec_type'] == 'video')
            duration = float(info['format']['duration'])
            check_native_shape(stream, expected=expected_light_shape(image))
            if not 5 <= duration <= 5.3:
                raise RuntimeError(f'Scene {index + 1} duration {duration} is outside 5-5.3s')
            return
        except Exception as exc:
            last = exc
            text = (type(exc).__name__ + ' ' + str(exc)).lower()
            if 'quota' in text and 'included' not in text and 'zerogpu quota' in text:
                raise
            if 'quota' in text:
                raise
            transient = any(token in text for token in (
                'cancel', 'timeout', 'timed out', 'queue', 'stream', '502', '503', '504'))
            print(f'Scene {index + 1} attempt failed transient={transient}: {type(exc).__name__}', flush=True)
            if not transient:
                raise
    raise RuntimeError(f'Scene {index + 1} failed on the free space: {last}')


def main():
    state = json.loads((ROOT / '.cinematic-series-state.json').read_text())
    plan = (state.get('pending') or {}).get('plan') or {}
    if plan.get('episode') != 25 or plan.get('story_id') != STORY:
        print('Episode 25 is not the pending story; no free-clip install.', flush=True)
        return
    copy_seed()
    gaps = missing(plan)
    if not gaps:
        print('All nine episode 25 speaking clips are already signed.', flush=True)
        return
    print('Missing speaking clips: ' + ','.join(str(item[0] + 1) for item in gaps), flush=True)
    for index, _scene, expected, image, audio, video, marker in gaps:
        if not image.is_file() or not audio.is_file():
            raise RuntimeError(f'Scene {index + 1} is missing its cached still or aligned audio')
        render_one(index, expected, image, audio, video)
        marker.write_text(json.dumps(expected, sort_keys=True))
        print(f'Signed scene {index + 1}', flush=True)


if __name__ == '__main__':
    main()
