"""Five-second two-person takes; verified 85s xlarge = 170 quota-unit maximum."""
import ast
import shutil
import subprocess
import urllib.request

SPACE = 'multimodalart/ltx2-audio-to-video'
QUOTA_MAXIMUM = 170
_VERIFIED = False


def verify_contract(source):
    tree=ast.parse(source)
    for node in ast.walk(tree):
        if not isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)) or node.name!='generate':
            continue
        for decorator in node.decorator_list:
            if (not isinstance(decorator,ast.Call) or not isinstance(decorator.func,ast.Attribute)
                    or decorator.func.attr!='GPU' or not isinstance(decorator.func.value,ast.Name)
                    or decorator.func.value.id!='spaces'):
                continue
            keywords={k.arg:k.value.value for k in decorator.keywords if isinstance(k.value,ast.Constant)}
            if keywords.get('duration')==85 and keywords.get('size')=='xlarge':
                return QUOTA_MAXIMUM
    raise RuntimeError('quota: provider maximum changed or cannot be verified; no GPU submission admitted')


def verify_live_contract():
    global _VERIFIED
    if not _VERIFIED:
        url='https://huggingface.co/spaces/'+SPACE+'/raw/main/app.py'
        request=urllib.request.Request(url,headers={'User-Agent':'GapMedia-Provider-Contract/1.0'})
        with urllib.request.urlopen(request,timeout=25) as response:
            source=response.read(1_000_000).decode('utf-8')
        verify_contract(source)
        _VERIFIED=True


def reject_whiteout(path):
    data=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-vf',
            'scale=16:16,format=gray','-an','-f','rawvideo','-'])
    consecutive=0
    for offset in range(0,len(data),256):
        frame=data[offset:offset+256]
        white=len(frame)==256 and sum(frame)/256>247
        consecutive=consecutive+1 if white else 0
        if consecutive>=2:
            raise RuntimeError('Generated take fades to an empty white frame; visual quality gate failed')


def generate_take(image,audio,output,motion,seed):
    verify_live_contract()  # Read-only metadata, before reservation or generation.
    import shots
    from gradio_client import handle_file
    from cinematic_budget import run_gpu
    prompt=('Locked medium two shot, warm illustrated storybook animation. '
            'Keep EXACTLY the two adult friends and the room shown in the reference image. '
            'Marta is the woman on the LEFT; Lukas is the man on the RIGHT. '
            +motion+' Preserve face shapes, stable eyes, restrained mouth movement and natural blinking. '
            'The image continues through the final frame, with all people and background retained.')
    negative=('third person, extra phone, extra hands, captions, subtitles, text, letters, watermark, '
              'title card, fade out, white screen, scene transition, face distortion, enormous mouth')
    def call():
        result=shots.client(SPACE).predict(handle_file(str(image)),handle_file(str(audio)),
                  prompt,negative,5.0,seed,api_name='/generate')
        result=result[0] if isinstance(result,(tuple,list)) else result
        if isinstance(result,dict):
            result=result.get('video',result.get('path',result))
            if isinstance(result,dict):result=result['path']
        shutil.copyfile(result,output)
    run_gpu(call,required_seconds=QUOTA_MAXIMUM)
    reject_whiteout(output)
