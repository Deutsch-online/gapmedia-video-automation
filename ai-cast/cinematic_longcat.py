"""Native 720p single-speaker takes with conservative charged-time admission."""
import ast
import shutil
import urllib.request
from pathlib import Path

SPACE = 'victor/LongCat-Video-Avatar-1.5'
ACCELERATION = 'DBCache fast'
LIGHT_ACCELERATION = 'DBCache faster'
LIGHT_QUOTA_MAXIMUM = 480
DECLARED_QUOTA_MAXIMUM = 480  # published 240s xlarge, charged twice
QUOTA_MAXIMUM = 720  # conservative admission reservation after a 641.85-unit observed account debit
_VERIFIED = False

# Official 480p area buckets (height, width), not a minimum-short-side promise.
# https://huggingface.co/spaces/victor/LongCat-Video-Avatar-1.5/blob/main/longcat_video/utils/bukcet_config.py
LIGHT_BUCKETS = {
    '0.26': (320,1216), '0.31': (352,1120), '0.38': (384,1024), '0.43': (416,960),
    '0.52': (448,864), '0.58': (480,832), '0.67': (512,768), '0.74': (544,736),
    '0.86': (576,672), '0.95': (608,640), '1.05': (640,608), '1.17': (672,576),
    '1.29': (704,544), '1.35': (736,544), '1.50': (768,512), '1.67': (800,480),
    '1.73': (832,480), '2.00': (896,448), '2.31': (960,416), '2.58': (992,384),
    '2.75': (1056,384), '3.09': (1088,352), '3.70': (1184,320), '3.80': (1216,320),
    '3.90': (1248,320), '4.00': (1280,320),
}


def verify_light_buckets(source):
    for node in ast.parse(source).body:
        if isinstance(node, ast.Assign) and any(
                isinstance(t, ast.Name) and t.id == 'ASPECT_RATIO_627' for t in node.targets):
            raw = ast.literal_eval(node.value)
            actual = {key: tuple(value[0]) for key, value in raw.items()}
            if actual == LIGHT_BUCKETS:
                return
            break
    raise RuntimeError('Unverified native 480p bucket table; no GPU submission')


def expected_light_shape(image):
    from PIL import Image
    with Image.open(image) as reference:
        ratio = reference.height / reference.width
    key = min(LIGHT_BUCKETS, key=lambda item: abs(float(item) - ratio))
    height, width = LIGHT_BUCKETS[key]
    return width, height


def check_native_shape(video, expected=None, minimum_side=720):
    actual = (video['width'], video['height'])
    if expected is not None:
        if actual != expected:
            raise RuntimeError(f'Native 480p bucket mismatch: got {actual}, expected {expected}; no upscaling accepted')
    elif min(actual) < minimum_side:
        raise RuntimeError(f'Native video {actual} is below the explicitly requested 720p profile')


def verify_contract(source):
    tree = ast.parse(source)
    functions = {n.name:n for n in tree.body if isinstance(n,ast.FunctionDef)}
    duration = functions.get('_check_duration')
    statements = duration.body if duration else []
    if len(statements)!=1 or not isinstance(statements[0],ast.Return) or not isinstance(statements[0].value,ast.Constant) or statements[0].value.value!=240:
        raise RuntimeError('quota: unverified provider maximum; no GPU submission')
    generate = functions.get('generate')
    for decorator in generate.decorator_list if generate else []:
        if (isinstance(decorator,ast.Call) and isinstance(decorator.func,ast.Attribute)
                and isinstance(decorator.func.value,ast.Name) and decorator.func.value.id=='spaces'
                and decorator.func.attr=='GPU'):
            kw={k.arg:k.value for k in decorator.keywords}
            if (isinstance(kw.get('duration'),ast.Name) and kw['duration'].id=='_check_duration'
                    and isinstance(kw.get('size'),ast.Constant) and kw['size'].value=='xlarge'):
                return DECLARED_QUOTA_MAXIMUM
    raise RuntimeError('quota: unverified provider hardware; no GPU submission')


def verify_live_contract():
    global _VERIFIED
    if not _VERIFIED:
        request=urllib.request.Request('https://huggingface.co/spaces/'+SPACE+'/raw/main/app.py',
                                       headers={'User-Agent':'GapMedia-Contract/1.0'})
        with urllib.request.urlopen(request,timeout=25) as response:
            verify_contract(response.read(1_000_000).decode())
        request=urllib.request.Request('https://huggingface.co/spaces/'+SPACE+
            '/raw/main/longcat_video/utils/bukcet_config.py', headers={'User-Agent':'GapMedia-Contract/1.0'})
        with urllib.request.urlopen(request,timeout=25) as response:
            verify_light_buckets(response.read(1_000_000).decode())
        _VERIFIED=True


def generate_take(image,audio,output,motion,seed,light=False):
    verify_live_contract()
    resolution='480p' if light else '720p'
    acceleration=LIGHT_ACCELERATION if light else ACCELERATION
    reservation=LIGHT_QUOTA_MAXIMUM if light else QUOTA_MAXIMUM
    expected = expected_light_shape(image) if light else None
    import shots
    from gradio_client import handle_file
    from cinematic_budget import run_gpu
    from cinematic_speech import probe
    from cinematic_ltx2 import reject_whiteout
    prefix=('Exactly one visible speaking character. Preserve the age, identity and proportions '
            'of the supplied single-person image. No second face or listener in the frame. '
            'Only this mouth follows the audio; mouth closed during silence. '
            if light else 'One visible adult, realistic human proportions, clear unobstructed mouth. ')
    prompt=(prefix+'Stable face, natural eyes and restrained mouth movement. '+motion)
    def call():
        from cinematic_transport import protect_stream
        client=protect_stream(shots.client(SPACE))
        result=client.predict(handle_file(str(image)),handle_file(str(audio)),
                   prompt,resolution,seed,'Clean speech (fast)',acceleration,api_name='/generate')
        result=result[0] if isinstance(result,(list,tuple)) else result
        if isinstance(result,dict):
            result=result.get('video',result.get('path',result))
            if isinstance(result,dict):result=result['path']
        shutil.copyfile(result,output)
    run_gpu(call,required_seconds=reservation)
    video=next(s for s in probe(output)['streams'] if s['codec_type']=='video')
    try:
        check_native_shape(video, expected=expected)
    except RuntimeError:
        # Preserve rejected provider evidence without signing it as an accepted take.
        Path(output).replace(Path(output).with_suffix('.rejected.mp4'))
        raise
    reject_whiteout(output)


