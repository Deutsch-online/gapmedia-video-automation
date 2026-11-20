from pathlib import Path

def edit(filename, pairs):
    path = Path('public') / filename
    source = path.read_text()
    for old, new in pairs:
        if source.count(old) != 1:
            raise SystemExit(f'Unable to identify one {old!r} in {filename}')
        source = source.replace(old, new, 1)
    path.write_text(source)

edit('quiz-show-view.mjs',[
 ('export function profileFollow', '''export function framePortrait(avatar){
 const frame=document.createElement('span');
 frame.className='fire-portrait';
 const flame=document.createElement('span');
 flame.className='portrait-flame';
 flame.setAttribute('aria-hidden','true');
 frame.append(flame,avatar);
 return frame;
}
export function profileFollow'''),
 ("const podium=$('showPodium');podium.replaceChildren();const leaders=", "const podium=$('showPodium');const leaders="),
 ("podium.classList.toggle('winner-celebration',s.phase==='finished'&&leaders.length>0);", """const celebrating=s.phase==='finished'&&leaders.length>0;
podium.classList.toggle('winner-celebration',celebrating);
const podiumKey=JSON.stringify([lang,s.round,celebrating,leaders]);
if(podium.dataset.renderKey!==podiumKey){
podium.dataset.renderKey=podiumKey;
podium.replaceChildren();"""),
 ('slot.append(portrait,rank,name,score);','slot.append(celebrating?framePortrait(portrait):portrait,rank,name,score);'),
 ("podium.append(empty);}$('showStandingsRows')","podium.append(empty);}}$('showStandingsRows')")
])
edit('math-duel-ui.mjs',[
 ("buildShowOption,profileFollow} from './quiz-show-view.mjs?v=107'","buildShowOption,profileFollow,framePortrait} from './quiz-show-view.mjs?v=109'"),
 ('root.append(heading,context,portrait,name,points,order)','root.append(heading,context,framePortrait(portrait),name,points,order)'),
 ('others.append(item);','const avatar=item.querySelector(\'.player-avatar\');const before=avatar.nextSibling;item.insertBefore(framePortrait(avatar),before);others.append(item);')
])
edit('math-duel.html',[
 ('quiz-show.css?v=107','quiz-show.css?v=109'),
 ('math-duel-ui.mjs?v=108','math-duel-ui.mjs?v=109')
])
css=Path('public/quiz-show.css')
css.write_text(css.read_text()+Path(__file__).with_name('portrait-styles109.css').read_text())
