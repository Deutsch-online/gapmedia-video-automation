"""Optional free remote portrait animation of synthetic media, for an offline preview.

This uploads the supplied synthetic portrait and audio to the named public Space.
It never runs automatically from the LIVE application and is not a realtime engine.
"""
import argparse
from pathlib import Path
import shutil
from gradio_client import Client, handle_file

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--image', required=True)
p.add_argument('--audio', required=True)
p.add_argument('--output', required=True)
args = p.parse_args()
client = Client('victor/LongCat-Video-Avatar-1.5', verbose=False)
job = client.submit(
    handle_file(args.image), handle_file(args.audio),
    'A single adult woman speaking warmly to camera. Accurate lip movement from the supplied audio, natural subtle blinking, stable facial identity, gentle smile. No other people, no camera motion.',
    '480p', 42, 'Clean speech (fast)', 'DBCache faster', api_name='/generate')
result = job.result(timeout=300)
if isinstance(result, (tuple, list)):
    result = result[0]
if isinstance(result, dict):
    result = result.get('video') or result.get('path')
    if isinstance(result, dict):
        result = result.get('path')
target = Path(args.output)
target.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(result, target)
print('Preview saved:', target)
