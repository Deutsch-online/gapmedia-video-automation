import json, subprocess, pathlib, textwrap, argparse
from PIL import Image, ImageDraw, ImageFont

parser=argparse.ArgumentParser()
parser.add_argument('--assets', type=pathlib.Path, default=pathlib.Path(__file__).parent)
parser.add_argument('--scene', type=int, help='Compose only this scene, numbered 1–5')
opts=parser.parse_args()
ROOT=opts.assets.resolve()
TIMING=json.loads((ROOT/'timing.json').read_text())
GER='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FA='/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf'
def run(args): subprocess.run(args,check=True)
for index,e in enumerate(TIMING):
    im=Image.new('RGBA',(1080,1920))
    d=ImageDraw.Draw(im)
    phase=index%4
    text=e['correct'] if phase in (1,2) else e['text']
    lines=textwrap.wrap(text,width=26)
    font=ImageFont.truetype(GER,59)
    height=68*len(lines)+66
    y=42
    color='#216A58' if phase in (1,2) else '#263A43'
    d.rounded_rectangle((46,y,1034,y+height),radius=34,fill=(255,255,250,247),outline=color,width=4)
    tailx=245 if e['role']=='learner' else 824
    d.polygon([(tailx-21,y+height-3),(tailx+24,y+height-3),(tailx,y+height+29)],fill=(255,255,250,247))
    for n,line in enumerate(lines):
        box=d.textbbox((0,0),line,font=font)
        d.text(((1080-(box[2]-box[0]))/2,y+25+n*68),line,font=font,fill=color)
    if phase in (1,2):
        d.rounded_rectangle((115,1650,965,1760),radius=28,fill=(15,34,41,220))
        f=ImageFont.truetype(FA,49)
        d.text((540,1698),e['fa'],font=f,anchor='mm',direction='rtl',fill='white')
    im.save(ROOT/f'bubble-{index:02d}.png')

for scene in ([opts.scene-1] if opts.scene else range(5)):
    source=ROOT/f'round-{scene+1:02d}.mp4'
    args=['ffmpeg','-v','error','-y','-i',str(source)]
    for p in range(4):args+=['-loop','1','-i',str(ROOT/f'bubble-{scene*4+p:02d}.png')]
    filters=['[0:v]trim=duration=12,setpts=PTS-STARTPTS,crop=324:576:94:0,scale=1080:1920:flags=lanczos,setsar=1[base]']
    previous='base'
    for p in range(4):
        e=TIMING[scene*4+p];start=e['start']-scene*12;end=e['end']-scene*12
        target=f'v{p}'
        filters.append(f'[{previous}][{p+1}:v]overlay=0:0:enable=\'gte(t,{start:.6f})*lt(t,{end:.6f})\':shortest=1[{target}]')
        previous=target
    args+=['-filter_complex_threads','1','-filter_complex',';'.join(filters),'-map',f'[{previous}]','-an','-t','12','-r','24','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p',str(ROOT/f'scene-{scene+1:02d}.mp4')]
    run(args)
if not opts.scene or opts.scene==5:
    (ROOT/'concat.txt').write_text(''.join(f"file '{ROOT}/scene-{n:02d}.mp4'\n" for n in range(1,6)))
    run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(ROOT/'concat.txt'),'-i',str(ROOT/'arzttermin-dialogue-60s.m4a'),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','160k','-t','60','-movflags','+faststart',str(ROOT/'arzttermin-huggingface-elevenlabs-60s.mp4')])
