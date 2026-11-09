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
        _VERIFIED=True


def generate_take(image,audio,output,motion,seed,light=False):
    verify_live_contract()
    resolution='480p' if light else '720p'
    acceleration=LIGHT_ACCELERATION if light else ACCELERATION
    reservation=LIGHT_QUOTA_MAXIMUM if light else QUOTA_MAXIMUM
    minimum_side=480 if light else 720
    import shots
    from gradio_client import handle_file
    from cinematic_budget import run_gpu
    from cinematic_speech import probe
    from cinematic_ltx2 import reject_whiteout
    prompt=('One visible adult, realistic human proportions, clear unobstructed mouth. '
            'Stable face, natural eyes and restrained mouth movement. '+motion)
    def call():
        result=shots.client(SPACE).predict(handle_file(str(image)),handle_file(str(audio)),
                   prompt,resolution,seed,'Clean speech (fast)',acceleration,api_name='/generate')
        result=result[0] if isinstance(result,(list,tuple)) else result
        if isinstance(result,dict):
            result=result.get('video',result.get('path',result))
            if isinstance(result,dict):result=result['path']
        shutil.copyfile(result,output)
    run_gpu(call,required_seconds=reservation)
    video=next(s for s in probe(output)['streams'] if s['codec_type']=='video')
    if min(video['width'],video['height'])<minimum_side:
        Path(output).unlink(missing_ok=True)
        raise RuntimeError('Native video is below the explicitly requested '+resolution+' profile')
    reject_whiteout(output)
