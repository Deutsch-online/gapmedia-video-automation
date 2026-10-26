"""Local, CPU-only owner-voice conversion; never uploads recordings or profiles.

Run inside an isolated OpenVoice environment; see PERSONAL_PRESENTER.md.
The original reference, speaker vectors and generated samples must stay private.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

MODEL_SHA = '9652c27e92b6b2a91632590ac9962ef7ae2b712e5c5b7f4c34ec55ee2b37ab9e'
CONFIG_SHA = '9dfff60350b8c63f2c664efd92a61b2516efb22671466960f0e5dfebd881fa47'


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--reference', required=True)
    p.add_argument('--source', required=True, help='Already generated spoken WAV')
    p.add_argument('--output', required=True)
    p.add_argument('--openvoice-root', required=True)
    p.add_argument('--model-dir', required=True)
    args = p.parse_args()
    model = Path(args.model_dir).resolve()
    for file, expected in [('checkpoint.pth', MODEL_SHA), ('config.json', CONFIG_SHA)]:
        if hashlib.sha256((model / file).read_bytes()).hexdigest() != expected:
            raise RuntimeError('Pinned public model integrity check failed: ' + file)
    for file in [args.reference, args.source]:
        if not Path(file).is_file():
            raise ValueError('An input recording is missing')
    sys.path.insert(0, str(Path(args.openvoice_root).resolve()))
    import librosa
    import numpy as np
    import soundfile as sf
    import torch
    from openvoice.api import ToneColorConverter
    torch.set_num_threads(2)
    torch.set_num_interop_threads(1)
    converter = ToneColorConverter(str(model / 'config.json'), device='cpu')
    converter.load_ckpt(str(model / 'checkpoint.pth'))
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='fahrfit-private-voice-') as directory:
        os.chmod(directory, 0o700)
        reference = Path(directory) / 'reference.wav'
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i',
                        str(Path(args.reference).resolve()), '-ar', '22050', '-ac', '1',
                        '-af', 'highpass=f=70,alimiter=limit=0.95', '-y', str(reference)], check=True)
        data, rate = sf.read(reference)
        if rate != 22050 or data.ndim != 1 or not np.isfinite(data).all():
            raise ValueError('Invalid reference recording')
        data, _ = librosa.effects.trim(data, top_db=32)
        if not 5 * rate <= len(data) <= 120 * rate:
            raise ValueError('Reference must contain 5–120 seconds of clear owner speech')
        parts = []
        for i, part in enumerate(np.array_split(data, 3)):
            path = Path(directory) / f'part-{i}.wav'
            sf.write(path, part, rate)
            parts.append(str(path))
        target = converter.extract_se(parts)
        source = converter.extract_se(str(Path(args.source).resolve()))
        converter.convert(str(Path(args.source).resolve()), source, target,
                          output_path=str(output), message='FahrFit AI voice')
    data, rate = sf.read(output)
    if not np.isfinite(data).all() or len(data) < rate / 2:
        raise RuntimeError('Generated voice sample failed validation')
    print(json.dumps({'output': str(output), 'seconds': round(len(data) / rate, 3),
                      'cpu_only': True, 'paid': False, 'reference_uploaded': False,
                      'method': 'OpenVoice V2 tone conversion',
                      'quality': 'requires listening; no exact-clone claim'}))


if __name__ == '__main__':
    main()
