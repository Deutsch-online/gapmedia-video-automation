"""Audio-driven speaking takes using WanGP (https://github.com/deepbeepmeep/Wan2GP).

Runs under WanGP's isolated Python, never under the production media environment.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import wave

REVISION = 'fdc63bdf89358fb13c93cf6b38693fd89a859f00'
MODEL = 'longcat_avatar_v1_5'


def make_settings(image, audio, prompt, seed):
    image, audio = Path(image).resolve(), Path(audio).resolve()
    if not image.is_file():
        raise ValueError('A scene-specific single-speaker image is required')
    with wave.open(str(audio), 'rb') as wav:
        duration = wav.getnframes() / wav.getframerate()
        if wav.getframerate() != 48000 or wav.getnchannels() != 1 or abs(duration - 5) > .00001:
            raise ValueError('Use the exact aligned five-second, mono, 48 kHz WAV from the final mix')
    return {'model_type': MODEL, 'prompt': prompt, 'seed': seed,
            'image_start': str(image), 'image_prompt_type': 'S',
            'audio_guide': str(audio), 'audio_prompt_type': 'A',
            'resolution': '480x832', 'video_length': 125, 'force_fps': 25,
            'num_inference_steps': 8, 'guidance_scale': 1.0,
            'audio_guidance_scale': 1.0, 'sample_solver': 'distill'}


def check_runtime(root):
    root = Path(root).resolve()
    if not (root / 'wgp.py').is_file():
        raise RuntimeError('WAN2GP_ROOT must point to an installed Wan2GP checkout')
    actual = subprocess.check_output(['git', '-C', str(root), 'rev-parse', 'HEAD'], text=True).strip()
    if actual != REVISION:
        raise RuntimeError('WanGP revision differs from the tested integration pin; install the pinned revision')
    import torch
    if not torch.cuda.is_available():
        raise RuntimeError('WanGP is installed, but no usable NVIDIA CUDA GPU is available')
    return {'revision': actual, 'torch': torch.__version__, 'gpu': torch.cuda.get_device_name(0)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', default=os.getenv('WAN2GP_ROOT', '/workspace/Wan2GP'))
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--prepare-only', action='store_true')
    parser.add_argument('--image')
    parser.add_argument('--audio')
    parser.add_argument('--prompt')
    parser.add_argument('--seed', type=int, default=0)
    parser.add_argument('--output')
    args = parser.parse_args()
    if args.check:
        print(json.dumps(check_runtime(args.root)))
        return
    if not all((args.image, args.audio, args.prompt, args.output)):
        parser.error('image, audio, prompt and output are required')
    settings = make_settings(args.image, args.audio, args.prompt, args.seed)
    if args.prepare_only:
        print(json.dumps(settings))
        return
    check_runtime(args.root)
    root = Path(args.root).resolve()
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    sys.path.insert(0, str(root))
    os.chdir(root)
    # Use WanGP's published API; no shell commands or generic-motion fallback.
    from shared.api import init
    with tempfile.TemporaryDirectory(prefix='wan2gp-', dir=output.parent) as tmp:
        session = init(root=root, output_dir=Path(tmp),
                       cli_args=['--attention', 'sdpa', '--profile', '4'])
        settings = {**session.get_default_settings(MODEL), **settings}
        result = session.submit_task(settings).result()
        if not result.success:
            raise RuntimeError('WanGP generation failed: ' + '; '.join(e.message for e in result.errors))
        videos = [Path(p) for p in result.generated_files if Path(p).suffix.lower() == '.mp4']
        if len(videos) != 1 or not videos[0].is_file():
            raise RuntimeError('WanGP must return exactly one speaking video')
        shutil.copyfile(videos[0], output)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError) as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(2)
