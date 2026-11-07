"""Approved two-person storybook scene with prominent lower frosted-glass subtitles."""
import hashlib
import json
import re
import subprocess
from functools import lru_cache
from pathlib import Path

PROFILE = 'storybook-duo-glass-v2'
ASSET_PROFILE = 'storybook-duo-2d-v1'
CARD = (40, 1380, 1000, 380)
DE_SIZE, FA_SIZE = 56, 48
DE_LEADING, FA_LEADING = 68, 60


def enabled(config, episode=None):
    profile = config.get('visual_profile')
    if not profile:
        return False
    if profile.get('id') != PROFILE:
        raise ValueError('Unknown production visual profile')
    return episode is None or episode >= profile.get('from_episode', 19)


def full_frame_layout():
    return ('scale=1080:1920:force_original_aspect_ratio=increase:force_divisible_by=2,'
            'crop=1080:1920,setsar=1,fps=30')


@lru_cache(maxsize=4)
def font_file(family):
    path = subprocess.check_output(['fc-match', '-f', '%{file}', family], text=True).strip()
    if not Path(path).is_file() or 'Bold' not in Path(path).name:
        raise RuntimeError('The approved bold subtitle font is unavailable: ' + family)
    return path


def wrap(text, font, width=920, direction=None):
    if any(c in text for c in ('\n', '\r', '{', '}', '\\')):
        raise ValueError('Subtitle/control markup is not permitted')
    result, line = [], ''
    for word in text.split():
        value = (line + ' ' + word).strip()
        if line and font.getlength(value, direction=direction) > width:
            result.append(line);line = word
        else:
            line = value
    if line:
        result.append(line)
    if not result or any(font.getlength(line, direction=direction) > width for line in result):
        raise ValueError('Subtitle contains a word too wide for the safe area')
    return result


def caption_card(de, fa, target):
    from PIL import Image, ImageDraw, ImageFont
    de_path = font_file('DejaVu Sans:style=Bold')
    fa_path = font_file('Noto Sans Arabic:style=Bold')
    german = ImageFont.truetype(de_path, DE_SIZE)
    persian = ImageFont.truetype(fa_path, FA_SIZE)
    lines_de, lines_fa = wrap(de, german), wrap(fa, persian, direction='rtl')
    height = len(lines_de)*DE_LEADING + len(lines_fa)*FA_LEADING + 20
    if len(lines_de) > 3 or len(lines_fa) > 2 or height > CARD[3]-24:
        raise ValueError('Shorten the subtitle before rendering; do not shrink the approved bold type')
    image = Image.new('RGBA',(1080,1920));draw = ImageDraw.Draw(image)
    x,y,w,h = CARD
    draw.rounded_rectangle((x,y,x+w,y+h),radius=28,fill=(12,22,32,92),outline=(255,255,255,110),width=2)
    cursor = y+(h-height)/2
    boxes = []
    for language, lines, font, leading, color, direction in [
            ('de',lines_de,german,DE_LEADING,'#FFFFFF',None),
            ('fa',lines_fa,persian,FA_LEADING,'#FFF4D6','rtl')]:
        for line in lines:
            draw.text((542,cursor+3),line,font=font,anchor='mt',direction=direction,
                      fill=(0,0,0,185),stroke_width=3,stroke_fill=(0,0,0,185))
            draw.text((540,cursor),line,font=font,anchor='mt',direction=direction,
                      fill=color,stroke_width=2,stroke_fill=(0,0,0,215))
            boxes.append({'language':language,'text':line,'y':cursor,'height':leading})
            cursor += leading
        cursor += 20 if language == 'de' else 0
    target = Path(target);target.parent.mkdir(parents=True,exist_ok=True);image.save(target)
    return {'de_size':DE_SIZE,'fa_size':FA_SIZE,'bold':True,'card':CARD,'text_boxes':boxes,
            'fonts':[Path(de_path).name,Path(fa_path).name],
            'de':de,'fa':fa,'caption_sha256':hashlib.sha256(image.tobytes()).hexdigest()}


def prepare_captions(plan, folder):
    from PIL import Image, ImageDraw
    folder=Path(folder);folder.mkdir(parents=True,exist_ok=True)
    reports=[caption_card(scene['de'],scene['fa'],folder/f'caption-{i:02d}.png')
             for i,scene in enumerate(plan['scenes'])]
    mask=Image.new('L',(CARD[2],CARD[3]),0)
    ImageDraw.Draw(mask).rounded_rectangle((0,0,CARD[2]-1,CARD[3]-1),radius=28,fill=255)
    mask.save(folder/'glass-mask.png')
    (folder/'caption-design.json').write_text(json.dumps({'profile':PROFILE,'captions':reports},ensure_ascii=False,indent=2))
    return reports


def glass_filters(base, card_input, mask_input, output='captioned'):
    x,y,w,h=CARD
    return (f'[{base}]split=2[glass-clean][glass-source];'
            f'[glass-source]crop={w}:{h}:{x}:{y},boxblur=12:1,format=rgba[glass-blurred];'
            f'[{mask_input}:v]format=gray[glass-mask];'
            '[glass-blurred][glass-mask]alphamerge[glass-layer];'
            f'[glass-clean][glass-layer]overlay={x}:{y}:shortest=1[glass-base];'
            f'[glass-base][{card_input}:v]overlay=0:0:shortest=1[{output}]')


def location_description(plan):
    if plan.get('location_description'):
        return plan['location_description']
    first=plan['scenes'][0]['scene']
    match=re.search(r'in the same (.+?)\. The other person is off camera\.',first)
    if not match:
        raise ValueError('A two-person story needs one explicit location_description')
    return match.group(1)


def still_prompt(plan,scene):
    safe_height=1050 if scene.get('graphic_step') else 1300
    return ('Preserve EXACTLY the two original adult friends from this reference: '
            'Marta LEFT, brown wavy shoulder-length hair, mustard cardigan, teal trousers. '
            'Lukas RIGHT, short brown hair, blue jacket, grey shirt. Same faces, age and clothing. '
            'Warm hand-illustrated 2D storybook, soft textured shading and natural warm light. '
            'Both people visible together in a medium two shot; natural closed mouths, stable eyes. '
            'One coherent location throughout this story: '+location_description(plan)+'. '
            f'Keep both faces, hands and important objects inside the central 80 percent width and above y={safe_height} in a 1080x1920 frame. '
            'Calm lower area for later glass subtitles; the picture fills all of 9:16 without white borders. '
            'Visible objects: '+', '.join(scene['visible_objects'])+'. '
            'Starting action: '+scene['object_action']+'. '
            'Only one of each named object unless explicitly plural. No extra phones, no third person, '
            'no captions, writing, logos or watermark. Keep the kitchen from the reference only when the requested location is a kitchen.')


def image_signature(reference_signature,prompt,seed):
    return hashlib.sha256(json.dumps([ASSET_PROFILE,reference_signature,prompt,seed],
                                    ensure_ascii=False,sort_keys=True).encode()).hexdigest()


def speaking_motion(scene):
    speaker='LEFT woman Marta' if scene['speaker']=='marta' else 'RIGHT man Lukas'
    listener='RIGHT man Lukas' if scene['speaker']=='marta' else 'LEFT woman Marta'
    return (f'Only {speaker} speaks, synchronized to the provided audio. '
            f'{listener} listens with lips closed. During silence both keep lips closed. '
            'Preserve exactly these two visible adults and their positions. '
            'Small natural gestures, stable eyes, restrained mouth shapes. '
            'Object action: '+scene['object_action']+'. '
            'Do not introduce another object, phone or person. Maintain the same room through the final frame.')


def apply_plan(plan):
    location=location_description(plan)
    plan['location_description']=location
    plan['visual_profile']=PROFILE
    for scene in plan['scenes']:
        scene['scene']=('Exactly two adult friends, Marta left and Lukas right, together in the same '+
                        location+'. '+scene['object_action']+' Both faces, hands and objects stay above the lower caption panel.')
        scene['motion']=speaking_motion(scene)
    return plan
