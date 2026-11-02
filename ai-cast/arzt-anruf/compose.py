import argparse, array, hashlib, json, math, pathlib, subprocess, wave
from PIL import Image, ImageDraw, ImageFont

p=argparse.ArgumentParser()
p.add_argument('--assets',type=pathlib.Path,default=pathlib.Path(__file__).parent)
p.add_argument('--scene',type=int)
a=p.parse_args();root=a.assets.resolve()
events=json.loads((root/'timing.json').read_text())
de='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
fa='/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf'
def wrap(text,font,width,direction=None):
    lines=[];current=''
    for word in text.split():
        candidate=(current+' '+word).strip()
        if current and font.getlength(candidate,direction=direction)>width:
            lines.append(current);current=word
        else:current=candidate
    if current:lines.append(current)
    return lines
def command(args):subprocess.run([str(x) for x in args],check=True)

if not (root/'generated-60.mp4').exists() and all((root/f'clip-{n:02d}.mp4').exists() for n in range(1,13)):
    args=['ffmpeg','-v','error','-y']
    for n in range(1,13):args+=['-i',root/f'clip-{n:02d}.mp4']
    parts=[f'[{n}:v]trim=duration=5,setpts=PTS-STARTPTS[v{n}]' for n in range(12)]
    parts.append(''.join(f'[v{n}]' for n in range(12))+'concat=n=12:v=1:a=0[joined]')
    command(args+['-filter_complex_threads','1','-filter_complex',';'.join(parts),'-map','[joined]','-an','-r','24','-t','60','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',root/'generated-60.mp4'])
for i,e in enumerate(events):
    image=Image.new('RGBA',(1080,1920));d=ImageDraw.Draw(image)
    color={'learner':'#263A43','helper':'#216A58','reception':'#355A86'}[e['role']]
    font=ImageFont.truetype(de,54);lines=wrap(e['text'],font,900)
    label=e['role']=='reception';y=54;h=72+66*len(lines)+(40 if label else 0)
    d.rounded_rectangle((45,y,1035,y+h),radius=32,fill=(255,255,250,247),outline=color,width=4)
    text_y=y+28
    if label:
        d.text((88,text_y),'Praxis · am Telefon',font=ImageFont.truetype(de,29),fill=color)
        text_y+=40
    for line in lines:
        d.text((540,text_y),line,font=font,anchor='mt',fill=color)
        text_y+=66
    if not label:
        x=290 if e['role']=='learner' else 790
        d.polygon([(x-20,y+h-2),(x+20,y+h-2),(x,y+h+25)],fill=(255,255,250,247))
    f=ImageFont.truetype(fa,43);flines=wrap(e['fa'],f,875,'rtl')
    fh=58*len(flines)+35;fy=1750-fh
    d.rounded_rectangle((65,fy,1015,1750),radius=24,fill=(17,32,40,225))
    for n,line in enumerate(flines):
        d.text((540,fy+15+n*58),line,font=f,anchor='mt',direction='rtl',fill='white')
    image.save(root/f'caption-{i:02d}.png')

# Small contextual graphics support the phone-call story; they never claim a real booking.
def graphic(name,kind,count=3):
    im=Image.new('RGBA',(1080,1920));d=ImageDraw.Draw(im)
    if kind=='notes':
        d.rounded_rectangle((110,1340,970,1525),radius=24,fill=(255,248,221,247),outline='#B68B54',width=3)
        d.text((145,1363),'Vor dem Anruf',font=ImageFont.truetype(de,31),fill='#675137')
        for j,word in enumerate(['Name','Anliegen','Zeit'][:count]):
            x=145+j*270
            d.ellipse((x,1425,x+28,1453),fill='#26775F')
            d.text((x+42,1420),word,font=ImageFont.truetype(de,36),fill='#263A43')
    elif kind=='call':
        d.rounded_rectangle((195,1438,885,1512),radius=32,fill=(24,57,62,237))
        d.ellipse((224,1464,244,1484),fill='#A7E0BB')
        d.text((270,1457),'Hausarztpraxis · Anruf',font=ImageFont.truetype(de,32),fill='white')
    elif kind=='appointment':
        d.rounded_rectangle((180,1360,900,1500),radius=24,fill=(240,255,245,245),outline='#26775F',width=4)
        d.text((540,1382),'Notiert',font=ImageFont.truetype(de,29),anchor='mt',fill='#26775F')
        d.text((540,1425),'Dienstag · 10:00',font=ImageFont.truetype(de,46),anchor='mt',fill='#263A43')
    im.save(root/name)
for n in range(1,4):graphic(f'notes-{n}.png','notes',n)
graphic('call.png','call');graphic('appointment.png','appointment')

for scene in ([a.scene] if a.scene else range(1,6)):
    overlays=[]
    for i,e in enumerate(events):
        if e['scene']==scene:overlays.append((root/f'caption-{i:02d}.png',e['start']-(scene-1)*12,e['end']-(scene-1)*12))
    if scene==2:
        overlays.extend([(root/'notes-1.png',.5,2.5),(root/'notes-2.png',2.5,4.5),(root/'notes-3.png',4.5,12)])
    elif scene in (3,4):overlays.append((root/'call.png',0,12))
    elif scene==5:overlays.append((root/'appointment.png',4,12))
    args=['ffmpeg','-v','error','-y']
    if (root/'generated-60.mp4').exists():
        args+=['-ss',str((scene-1)*12),'-i',root/'generated-60.mp4']
    else:args+=['-i',root/f'raw-{scene:02d}.mp4']
    for image,_,_ in overlays:args+=['-loop','1','-i',image]
    filters=['[0:v]trim=duration=12,setpts=PTS-STARTPTS,crop=432:768:40:0,scale=1080:1920:flags=lanczos,setsar=1[base]']
    previous='base'
    for j,(_,start,end) in enumerate(overlays):
        output=f'v{j}'
        filters.append(f'[{previous}][{j+1}:v]overlay=0:0:shortest=1:enable=\'gte(t,{start:.6f})*lt(t,{end:.6f})\'[{output}]')
        previous=output
    args+=['-filter_complex_threads','1','-filter_complex',';'.join(filters),'-map',f'[{previous}]','-an','-t','12','-r','24','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p',root/f'scene-{scene:02d}.mp4']
    command(args)

if not a.scene or a.scene==5:
    (root/'concat.txt').write_text(''.join(f"file '{root}/scene-{n:02d}.mp4'\n" for n in range(1,6)))
    output=root/'arzt-anruf-story-60s.mp4'
    cues=[(22.3,.65,425,.014),(54.4,.22,660,.009)]
    sfx=array.array('h',[0])*(48000*60)
    for start,duration,hz,volume in cues:
        if any(start<e['speech_end']+.12 and start+duration>e['speech_start']-.12 for e in events):
            raise ValueError('A sound cue overlaps protected dialogue')
        for n in range(round(duration*48000)):
            t=n/48000
            fade=min(1,t/.025,(duration-t)/.06)
            value=math.sin(2*math.pi*hz*t)
            if hz==660:value=(value+math.sin(2*math.pi*880*t))*.5
            sfx[round(start*48000)+n]=round(32767*volume*fade*value)
    with wave.open(str(root/'sfx.wav'),'wb') as f:
        f.setparams((1,2,48000,0,'NONE','not compressed'));f.writeframes(sfx.tobytes())
    command(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',root/'concat.txt','-i',root/'story.m4a','-i',root/'sfx.wav','-filter_complex','[1:a][2:a]amix=inputs=2:normalize=0:duration=first[a]','-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-t','60','-movflags','+faststart',output])
    info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(output)]))
    v=next(s for s in info['streams'] if s['codec_type']=='video')
    if float(info['format']['duration'])!=60 or (v['width'],v['height'],v['nb_frames'])!=(1080,1920,'1440'):raise ValueError('Exact output duration/frame validation failed')
    (root/'quality.json').write_text(json.dumps({'duration':60,'width':1080,'height':1920,'fps':24,'frames':1440,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'audio_source':'ElevenLabs','motion_source':'multimodalart/ltx2-audio-to-video','reception_voice_only':True,'published':False},indent=2))
