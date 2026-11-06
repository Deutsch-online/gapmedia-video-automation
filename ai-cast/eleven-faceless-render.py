"""Faceless 60-second motion story; real cached ElevenLabs narration only."""
import argparse
from functools import lru_cache
import hashlib
import json
import math
from pathlib import Path
import subprocess
import wave
import array
from PIL import Image, ImageDraw, ImageFont

W,H,FPS=1080,1920,30
CREAM='#F5F2E8'; MINT='#8CE0C0'; CORAL='#FF866B'; GOLD='#FFD18B'
ROOT=Path(__file__).resolve().parents[1]

@lru_cache(None)
def font(size):
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',size)

def fit(text,size,width=920):
    face=font(size)
    while face.getlength(text)>width and size>24:
        size-=2; face=font(size)
    return face

def centered(d,text,y,size=68,color=CREAM,x=540,width=920):
    face=fit(text,size,width)
    d.text((x,y),text,font=face,fill=color,anchor='mt')

def wrap(text,face,width):
    lines=[]; line=''
    for word in text.split():
        candidate=(line+' '+word).strip()
        if line and face.getlength(candidate)>width:
            lines.append(line); line=word
        else:line=candidate
    return lines+[line]

@lru_cache(None)
def backdrop():
    im=Image.new('RGB',(W,H)); d=ImageDraw.Draw(im)
    for y in range(H):
        q=y/H
        d.line((0,y,W,y),fill=(round(11+8*q),round(29+36*q),round(40+32*q)))
    d.ellipse((650,-240,1390,510),fill='#173C45')
    d.ellipse((-400,1330,320,2050),fill='#163E43')
    return im

def phone(d,amount,status,progress,color=CORAL):
    y=470+round(10*math.sin(progress*math.pi*2))
    d.rounded_rectangle((246,y+14,846,y+714),radius=52,fill='#081821')
    d.rounded_rectangle((230,y,830,y+700),radius=52,fill='#183D49',outline='#77ADA9',width=5)
    d.rounded_rectangle((451,y+18,609,y+37),radius=9,fill='#081821')
    centered(d,'WOHNUNGSANGEBOT',y+85,30,MINT,x=530,width=510)
    centered(d,amount,y+230,138,CREAM,x=530,width=510)
    centered(d,'Euro vorab?',y+394,39,GOLD,x=530,width=510)
    d.rounded_rectangle((290,y+492,770,y+606),radius=26,fill=color)
    centered(d,status,y+526,43,'#102730',x=530,width=430)

def key(d,x,y,scale=1,color=GOLD):
    r=int(49*scale); width=max(4,int(19*scale))
    d.ellipse((x-r,y-r,x+r,y+r),outline=color,width=width)
    d.line((x+r,y,x+int(230*scale),y),fill=color,width=width)
    for off in (165,205):
        d.line((x+int(off*scale),y,x+int(off*scale),y+int(40*scale)),fill=color,width=width)

def check(d,x,y,r=42):
    d.ellipse((x-r,y-r,x+r,y+r),fill=MINT)
    d.line((x-r*.45,y,x-r*.06,y+r*.35,x+r*.52,y-r*.38),fill='#103438',width=10)

def render_frame(plan,i,t):
    scene=plan['scenes'][i]; q=t/7.5
    im=backdrop().copy(); d=ImageDraw.Draw(im)
    for n in range(12):
        x=int((n*113+14*math.sin(t*.7+n))%W); y=int(300+(n*157+t*15)%900)
        d.ellipse((x,y,x+4,y+4),fill='#37676A')
    d.text((75,80),'DEUTSCH IM ALLTAG',font=font(32),fill=MINT)
    d.text((75,135),'Beispielgeschichte',font=font(25),fill='#9CB8B8')
    d.text((975,90),f'{i+1:02} / 08',font=font(27),fill='#9CB8B8',anchor='rt')
    d.text((75,218),scene['tag'],font=font(28),fill=GOLD)
    lines=wrap(scene['title'],font(78),930)
    for j,line in enumerate(lines):centered(d,line,280+j*92,78)
    kind=scene['kind']; pulse=1+.025*math.sin(t*math.pi*1.4)
    if kind=='offer':
        amount=round(800*min(1,t/0.8))
        phone(d,f'{amount} €','JETZT ZAHLEN?',q)
        r=int(26+12*(.5+.5*math.sin(t*3)))
        d.ellipse((715-r,1015-r,715+r,1015+r),outline=CREAM,width=4)
    elif kind=='unseen':
        for n,label in enumerate(('Schöne Fotos','Tolle Lage','Noch nie gesehen')):
            x=150+int(22*math.sin(t*.8+n)); y=510+n*180
            d.rounded_rectangle((x,y,930,y+140),radius=26,fill='#244B55',outline='#477E82',width=3)
            d.text((x+42,y+42),label,font=font(46),fill=GOLD if n==2 else CREAM)
            if n<2:check(d,850,y+70,26)
        key(d,380+int(12*math.sin(t)),1130,.85)
    elif kind=='warning':
        cx,cy=540,760; r=int(245*pulse)
        d.polygon(((cx,cy-r),(cx-r,cy+r*.73),(cx+r,cy+r*.73)),fill=CORAL)
        centered(d,'!',cy-150,238,'#112B36')
        centered(d,'STOPP',1050,116,CORAL)
        centered(d,'Ein Warnsignal. Kein Beweis.',1195,34,GOLD)
    elif kind=='stop':
        phone(d,'800 €','NICHT SENDEN',q,color=MINT)
        u=min(1,max(0,(t-.4)/1))
        d.line((290,710,290+480*u,710+360*u),fill=CORAL,width=16)
        if t>1.2:d.line((770,710,290,1070),fill=CORAL,width=16)
    elif kind=='evidence':
        for n in range(3):
            x=180+n*56+int(17*math.sin(t+n)); y=490+n*115
            d.rounded_rectangle((x,y,x+610,y+520),radius=28,fill=('#22434D','#2A535A','#326168')[n],outline='#7AA6A0',width=3)
            d.line((x+30,y+72,x+580,y+72),fill='#83AFA7',width=3)
            d.text((x+42,y+120),'ANZEIGE' if n<2 else 'NACHRICHTEN',font=font(37),fill=CREAM)
            for z in range(3):d.rounded_rectangle((x+43,y+220+z*66,x+480-z*70,y+234+z*66),radius=7,fill='#82AAA5')
        check(d,844,1110,58)
        centered(d,'Als Screenshot sichern',1190,39,MINT)
    elif kind=='report':
        y=510+int(12*math.sin(t*.9))
        d.rounded_rectangle((125,y,955,y+640),radius=30,fill='#224B55',outline='#75AAA2',width=4)
        d.text((175,y+50),'WOHNUNGSPORTAL',font=font(37),fill=MINT)
        d.line((160,y+120,920,y+120),fill='#5E9390',width=3)
        centered(d,'Verdächtiges Angebot',y+203,48)
        d.rounded_rectangle((200,y+340,880,y+480),radius=24,fill=CORAL)
        centered(d,'VERDACHT MELDEN',y+386,43,'#18313B',width=610)
        centered(d,'Meldung wird geprüft',y+535,33,GOLD)
    elif kind=='cancel':
        d.rounded_rectangle((160,505,920,1125),radius=36,fill='#214C53',outline='#72B6A4',width=4)
        centered(d,'Noch nicht gesendet',560,40,GOLD)
        centered(d,'800 €',675,158,CREAM)
        y=890+int(8*math.sin(t))
        d.rounded_rectangle((230,y,850,y+130),radius=24,fill=MINT)
        centered(d,'ABGEBROCHEN',y+39,47,'#12383D')
        centered(d,'0 Euro überwiesen',1175,44,MINT)
    else:
        for n,label in enumerate(('Keine Vorkasse','Belege sichern','Verdacht melden')):
            y=520+n*178
            d.rounded_rectangle((140,y,940,y+134),radius=24,fill='#244E56')
            check(d,212,y+67,32)
            d.text((282,y+40),label,font=font(49),fill=CREAM)
        centered(d,'Kanntest du diese Masche?',1140,40,GOLD)
        centered(d,'polizei-beratung.de',1200,28,'#9CB8B8')
    # Integrate a dark caption bed into the full-frame design, without white cards.
    d.rounded_rectangle((45,1280,1035,1790),radius=30,fill='#102F3A')
    d.line((75,1830,1005,1830),fill='#305A62',width=5)
    d.line((75,1830,75+int(930*((i+q)/8)),1830),fill=MINT,width=5)
    return im

def probe(file):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(file)]))

def speech_signature(plan,i):
    settings={'stability':0.4 if i<3 else 0.55,'similarity_boost':0.8,'style':0.45 if i<3 else 0.3,'use_speaker_boost':True,'speed':plan['voice']['speed']}
    request={'text':plan['scenes'][i]['narration'],'model_id':plan['voice']['model'],'voice_settings':settings,'seed':310016+i}
    return hashlib.sha256(json.dumps({'voice_id':plan['voice']['id'],'request':request},ensure_ascii=False,separators=(',',':')).encode()).hexdigest()

def verified_narration(plan,cache,i):
    stem=Path(cache)/f'{i:02}';audio=stem.with_suffix('.mp3')
    receipt=json.loads(stem.with_suffix('.json').read_text())
    if receipt['signature']!=speech_signature(plan,i) or receipt['audio_sha256']!=hashlib.sha256(audio.read_bytes()).hexdigest():
        raise ValueError('Unmatched ElevenLabs narration cache')
    duration=float(probe(audio)['format']['duration'])
    if not .5<duration<=7.15:
        raise ValueError(f'Natural narration does not fit scene {i+1}: {duration:.3f}s; no stretching or cropped words allowed')
    return audio,duration

def captions(plan,out):
    font_fa=ImageFont.truetype(subprocess.check_output(['fc-match','-f','%{file}','Noto Naskh Arabic:style=Bold'],text=True).strip(),72)
    ass='''[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: DE,DejaVu Sans,64,&H00F5F2E8,&H00FFFFFF,&H003A2F10,&H00000000,-1,0,0,0,100,100,0,0,1,2,0,5,80,80,0,1
Style: FA,Noto Naskh Arabic,72,&H00F5F2E8,&H00FFFFFF,&H003A2F10,&H00000000,-1,0,0,0,100,100,0,0,1,2,0,5,80,80,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    def stamp(s):return f'0:{int(s)//60:02}:{s%60:05.2f}'
    for i,scene in enumerate(plan['scenes']):
        for lang,text,face,y,maximum in [('DE',scene['narration'],font(64),1415,4),('FA',scene['fa'],font_fa,1660,2)]:
            lines=wrap(text,face,900)
            if len(lines)>maximum:raise ValueError('Caption does not fit '+lang+' scene '+str(i))
            value=r'\N'.join(lines)
            ass+=f'Dialogue: 0,{stamp(i*7.5)},{stamp((i+1)*7.5)},{lang},,0,0,0,,{{\\pos(540,{y})}}{value}\n'
    (out/'subtitles.ass').write_text(ass)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=Path('renders/eleven-faceless-60s'));parser.add_argument('--contact-only',action='store_true');args=parser.parse_args()
    plan=json.loads((ROOT/'ai-cast/eleven-faceless-60s.json').read_text())
    if plan['duration_seconds']!=60 or len(plan['scenes'])!=8 or plan['scene_seconds']!=7.5 or not plan['faceless']:raise ValueError('Invalid one-minute faceless brief')
    out=args.output;out.mkdir(parents=True,exist_ok=True)
    contact=Image.new('RGB',(1080,960))
    for i in range(8):contact.paste(render_frame(plan,i,3).resize((270,480)),((i%4)*270,(i//4)*480))
    contact.save(out/'contact.jpg');captions(plan,out)
    if args.contact_only:return
    cache=out/'cache';durations=[];wav_parts=[]
    for i in range(8):
        stem=cache/f'{i:02}';audio,duration=verified_narration(plan,cache,i);durations.append(duration)
        wav=stem.with_suffix('.wav');wav_parts.append(wav)
        subprocess.run(['ffmpeg','-y','-v','error','-i',str(audio),'-af','aresample=48000,adelay=250|250,apad,atrim=end_sample=360000','-ar','48000','-ac','1','-c:a','pcm_s16le',str(wav)],check=True)
        onset=.25+duration+.3
        if i in (2,4,5,6) and onset<7.25:
            with wave.open(str(wav)) as source:
                samples=array.array('h',source.readframes(source.getnframes()))
            import sys
            if sys.byteorder!='little':samples.byteswap()
            for k in range(2400):
                v=k/48000
                samples[int(onset*48000)+k]+=round(1200*math.exp(-v*90)*math.sin(2*math.pi*780*v))
            if sys.byteorder!='little':samples.byteswap()
            with wave.open(str(wav),'wb') as dest:
                dest.setparams((1,2,48000,0,'NONE','not compressed'));dest.writeframes(samples.tobytes())
    with wave.open(str(out/'narration.wav'),'wb') as dest:
        dest.setparams((1,2,48000,0,'NONE','not compressed'))
        for p in wav_parts:
            with wave.open(str(p)) as source:dest.writeframes(source.readframes(source.getnframes()))
    silent=out/'motion.mp4'
    command=['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s','1080x1920','-r','30','-i','-','-an','-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p',str(silent)]
    process=subprocess.Popen(command,stdin=subprocess.PIPE)
    try:
        for frame in range(1800):
            i=frame//225;t=(frame%225)/FPS
            image=render_frame(plan,i,t)
            if frame%225<10 and i>0:
                previous=render_frame(plan,i-1,7.45)
                image=Image.blend(previous,image,(frame%225+1)/10)
            process.stdin.write(image.tobytes())
        process.stdin.close()
        if process.wait()!=0:raise RuntimeError('Motion render failed')
    finally:
        if process.poll() is None:process.terminate()
    final=out/'wohnung-800-euro-elevenlabs-60s.mp4'
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(silent),'-i',str(out/'narration.wav'),'-vf','ass='+str(out/'subtitles.ass'),'-af','loudnorm=I=-16:TP=-1.5:LRA=9','-map','0:v','-map','1:a','-t','60','-c:v','libx264','-crf','19','-preset','fast','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(final)],check=True)
    info=probe(final);v=next(s for s in info['streams'] if s['codec_type']=='video')
    if float(v['duration'])==60 and abs(float(info['format']['duration'])-60)>.00001:
        fixed=out/'audio-tail-fixed.mp4'
        subprocess.run(['ffmpeg','-y','-v','error','-i',str(final),'-c:v','copy','-af','aresample=48000,apad,atrim=end_sample=2880000,asetpts=N/SR/TB','-ar','48000','-c:a','aac','-b:a','192k','-t','60','-movflags','+faststart',str(fixed)],check=True)
        fixed.replace(final);info=probe(final);v=next(s for s in info['streams'] if s['codec_type']=='video')
    if (v['width'],v['height'],int(v['nb_frames']))!=(1080,1920,1800) or float(v['duration'])!=60 or abs(float(info['format']['duration'])-60)>.00001:raise RuntimeError('The final video is not exactly 60 seconds and 1800 frames')
    report={'duration':60,'frames':1800,'size':[1080,1920],'faceless':True,'human_images':False,'voice_provider':'ElevenLabs','voice':plan['voice']['name'],'model':plan['voice']['model'],'language':'de','real_narration_seconds':durations,'audio_time_stretch':False,'sfx_only_after_narration':True,'published':False,'messages_sent':False,'source':plan['source']}
    (out/'quality.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    (out/'german-narration.txt').write_text('\n\n'.join(s['narration'] for s in plan['scenes']))
    actual_contact=Image.new('RGB',(1080,960))
    for i in range(8):
        sample=out/f'review-frame-{i}.jpg'
        subprocess.run(['ffmpeg','-v','error','-ss',str(i*7.5+3.5),'-i',str(final),'-frames:v','1','-q:v','3',str(sample)],check=True)
        actual_contact.paste(Image.open(sample).resize((270,480)),((i%4)*270,(i//4)*480))
    actual_contact.save(out/'contact.jpg')
    silent.unlink()
    print('FACELESS_VIDEO_COMPLETE='+str(final),flush=True)

if __name__=='__main__':main()
