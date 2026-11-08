"""Approved two-person storybook scene with prominent lower frosted-glass subtitles."""
import hashlib
import json
import re
import subprocess
from functools import lru_cache
from pathlib import Path

PROFILE = 'storybook-duo-glass-v2'
ASSET_PROFILE = 'original-cast-realistic-v1'
# Shared conservative 1080x1920 safe area for Reels/TikTok controls.
# Leave 168px at right and 310px below the panel; preview overlays may vary.
CARD = (48, 1270, 864, 340)
DE_SIZE, FA_SIZE = 48, 40
DE_LEADING, FA_LEADING = 58, 54


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


def wrap(text, font, width=800, direction=None):
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
    height = len(lines_de)*DE_LEADING + len(lines_fa)*FA_LEADING + 24
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
            draw.text((x+w/2+1,cursor+2),line,font=font,anchor='mt',direction=direction,
                      fill=(0,0,0,185),stroke_width=1,stroke_fill=(0,0,0,185))
            draw.text((x+w/2,cursor),line,font=font,anchor='mt',direction=direction,
                      fill=color,stroke_width=1,stroke_fill=(0,0,0,215))
            boxes.append({'language':language,'text':line,'y':cursor,'height':leading})
            cursor += leading
        cursor += 24 if language == 'de' else 0
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
    shot=plan['scenes'].index(scene)
    framing=('medium action shot','closer face-and-object reaction shot','medium reaction shot with the working hand visible')[shot%3]
    person = ('Marta, adult woman aged about 28, olive skin, chestnut curly bob, mustard top, '
              'teal dungarees, coral shoes' if scene['speaker']=='marta' else
              'Lukas, adult man aged about 30, copper quiff, round turquoise glasses, coral hoodie, navy trousers')
    return ('Use the ORIGINAL adult identities in the reference, translated into realistic human anatomy. '
            'Show ONLY '+person+'. The friend is off camera, never a second visible face. '
            'Cinematic near-photoreal 3D adults, natural human eye size, realistic skin and fabric, '
            'subtle asymmetry and believable adult proportions; preserve hair, wardrobe and identity cues. '
            'No oversized cartoon eyes, plastic doll skin or caricature. '
            'One coherent location: '+location_description(plan)+'. '
            'Use a '+framing+'; keep the mouth large, visible and unobstructed; '
            'one readable hand-to-object action. Keep important objects above the lower subtitle panel. '
            'Visible objects: '+', '.join(scene['visible_objects'])+'. '
            'Starting action: '+scene['object_action']+'. '
            'Natural closed mouth before speech. Full 9:16 scene, crisp optical detail, soft motivated light. '
            'No extra objects, no subtitles, logos or watermark. Preserve the requested room, not the reference backdrop.')


def image_signature(reference_signature,prompt,seed):
    return hashlib.sha256(json.dumps([ASSET_PROFILE,reference_signature,prompt,seed],
                                    ensure_ascii=False,sort_keys=True).encode()).hexdigest()


def speaking_motion(scene):
    return ('Only the visible adult '+scene['speaker']+' speaks to the friend off camera. '
            'Mouth and jaw follow the supplied German audio at natural speed; lips close during silence. '
            'One small intentional gesture only: '+scene['object_action']+'. '
            'Keep head largely steady and mouth visible; restrained expression, natural blinking. '
            'No simultaneous speech, exaggerated mouth, camera shake, extra limbs or new objects.')


def apply_plan(plan):
    location=location_description(plan)
    plan['location_description']=location
    plan['visual_profile']=PROFILE
    plan['render_style']='original-cast-realistic-comedy-v1'
    for scene in plan['scenes']:
        scene['scene']=('One visible adult '+scene['speaker']+' in the same '+location+
                        '. The friend is off camera. '+scene['object_action'])
        scene['motion']=speaking_motion(scene)
    return plan
