"""Render a local SadTalker preview from an authorised portrait and exact audio.

No uploads, paid endpoint, GPU request or unrelated talking loop is used.
Dependencies/checkpoint setup is documented in PERSONAL_PRESENTER.md.
"""
import argparse
from pathlib import Path
import subprocess
import sys


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--sadtalker-root', required=True)
    p.add_argument('--portrait', required=True)
    p.add_argument('--audio', required=True)
    p.add_argument('--output-dir', required=True)
    args = p.parse_args()
    root = Path(args.sadtalker_root).resolve()
    image, audio = Path(args.portrait).resolve(), Path(args.audio).resolve()
    if not (root / 'inference.py').is_file() or not image.is_file() or not audio.is_file():
        raise ValueError('Local model, authorised portrait or exact spoken audio is missing')
    # Compatibility corrections preserve the upstream operations. No face/image
    # manipulation is performed here; the audio-driven model generates frames.
    import re
    for path in (root / 'src').rglob('*.py'):
        old = path.read_text()
        text = re.sub(r'\bnp\.(float|int|bool)\b', lambda m: m[1], old)
        text = text.replace('trans_params = np.array([w0, h0, s, t[0], t[1]])',
                            'trans_params = np.array([float(np.asarray(v).reshape(-1)[0]) for v in [w0, h0, s, t[0], t[1]]])')
        if text != old:
            path.write_text(text)
    path = root / 'src/facerender/animate.py'
    old = path.read_text()
    text = old.replace('from src.utils.face_enhancer import enhancer_generator_with_len, enhancer_list',
                      'def enhancer_generator_with_len(*args, **kwargs):\n'
                      '    from src.utils.face_enhancer import enhancer_generator_with_len as run\n'
                      '    return run(*args, **kwargs)\n'
                      'def enhancer_list(*args, **kwargs):\n'
                      '    from src.utils.face_enhancer import enhancer_list as run\n'
                      '    return run(*args, **kwargs)')
    if text != old:
        path.write_text(text)
    subprocess.run([sys.executable, '-u', '-c',
                    'import torch,runpy;torch.set_num_threads(2);torch.set_num_interop_threads(1);runpy.run_path("inference.py",run_name="__main__")',
                    '--driven_audio', str(audio), '--source_image', str(image),
                    '--result_dir', str(Path(args.output_dir).resolve()),
                    '--preprocess', 'full', '--size', '256', '--batch_size', '1',
                    '--expression_scale', '0.85', '--cpu'], cwd=root, check=True)


if __name__ == '__main__':
    main()
