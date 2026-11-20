from pathlib import Path
import sys
from PIL import Image

def edit(filename, pairs):
    path=Path(filename)
    text=path.read_text()
    for old,new in pairs:
        if text.count(old)!=1:
            raise SystemExit(f'Expected one {old!r} in {filename}')
        text=text.replace(old,new,1)
    path.write_text(text)

edit('public/quiz-show-view.mjs',[
    ('framePortrait(avatar,crowned=false)',"framePortrait(avatar,style='gold',crowned=false)"),
    ("frame.className='fire-portrait';", "frame.className='fire-portrait heritage-portrait';\n frame.dataset.frame=style;"),
    ("""const metal=document.createElement('span');
 metal.className='portrait-metal';
 metal.setAttribute('aria-hidden','true');
 frame.append(metal);""",
     """const artwork=document.createElement('img');
 artwork.className='portrait-artwork';
 artwork.src='/quiz-frames/'+style+'.webp?v=112';
 artwork.alt='';
 artwork.draggable=false;
 artwork.setAttribute('aria-hidden','true');
 frame.append(artwork);"""),
    ('framePortrait(portrait,index===0)','framePortrait(portrait,[\'gold\',\'ice\',\'fire\'][index],index===0)'),
])
edit('public/math-duel-ui.mjs',[
    ("'./quiz-show-view.mjs?v=111'","'./quiz-show-view.mjs?v=112'"),
    ('framePortrait(portrait),name','framePortrait(portrait,\'fire\'),name'),
])
edit('public/math-duel.html',[
    ('quiz-show.css?v=111','quiz-show.css?v=112'),
    ('math-duel-ui.mjs?v=111','math-duel-ui.mjs?v=112'),
])
css=Path('public/quiz-show.css')
css.write_text(css.read_text()+Path(__file__).with_name('portrait-styles112.css').read_text())

out=Path('public/quiz-frames')
out.mkdir(exist_ok=True)
for style in ('fire','gold','ice'):
    with Image.open(Path(sys.argv[1])/(style+'.png')) as art:
        art=art.convert('RGBA').resize((640,640),Image.Resampling.LANCZOS)
        art.save(out/(style+'.webp'),format='WEBP',quality=90,method=6)
