"""Original child/grandmother learning sitcom; no cloned voices or identities."""
import hashlib
import json
from pathlib import Path

PROFILE = 'lina-oma-v1'
TEACHING_FROM_EPISODE = 23
PRAISE = ('sehr gut','gut gemacht','prima','bravo','perfekt','richtig','genau','klasse','sehr schön')
SOURCE = 'https://www.goethe.de/ins/de/de/prf/grm.html'
SOURCES = ('https://www.schubert-verlag.de/aufgaben/xg/xg03_03.htm', SOURCE,
           'https://www.goethe.de/ins/de/de/m/prf/grm.html',
           'https://www.open.edu/openlearn/languages/beginners-german-food-and-drink/content-section-0/?printable=1')
VOICES = {'lina': 'de-DE-AmalaNeural', 'oma': 'de-DE-KatjaNeural'}
DESCRIPTIONS = {
    'lina': 'Lina, a fictional healthy eight-year-old newcomer girl, naturally slender child proportions, warm brown skin, brown eyes, dark curly hair in two puffs with coral bows, mustard shirt, teal dungaree dress, coral backpack and sneakers',
    'oma': 'Oma Rosi, a lively slender grandmother aged about seventy, silver pixie hair with a playful curl, small red glasses, plum cardigan, ivory floral blouse, rust skirt and comfortable teal shoes',
}


def active(config, episode):
    rule = config.get('lina_oma_series', {})
    return rule.get('enabled') is True and episode >= rule.get('from_episode', 10**9)


def is_plan(plan):
    return plan.get('cast_profile') == PROFILE


def grammar_source(fetch, episode):
    for url in SOURCES:
        try:
            return fetch(episode, preferred_url=url, strict_preferred=True)
        except RuntimeError:
            continue
    raise RuntimeError('All approved beginner grammar sources unavailable; no invented research fallback')


def validate(plan, history=()):
    if {s['speaker'] for s in plan['scenes']} != set(VOICES):
        raise ValueError('Lina and Oma must be the only speaking characters')
    error = plan.get('language_error', {})
    wrong, correct = error.get('wrong'), error.get('correct')
    if not isinstance(wrong, str) or not isinstance(correct, str) or not wrong or wrong == correct:
        raise ValueError('A language misunderstanding requires a distinct wrong phrase and correction')
    if wrong.casefold() not in plan['scenes'][0]['de'].casefold():
        raise ValueError('Open with the child language misunderstanding')
    if not any(correct.casefold() in s['de'].casefold() for s in plan['scenes'] if s['speaker'] == 'oma'):
        raise ValueError('Oma must supply the actual correct German phrase')
    if not any(correct.casefold() in s['de'].casefold() for s in plan['scenes'][1:] if s['speaker'] == 'lina'):
        raise ValueError('Lina must use the corrected phrase herself')
    if plan.get('episode',0)>=TEACHING_FROM_EPISODE:
        scenes=plan['scenes']
        if (len(scenes)<4 or scenes[1]['speaker']!='oma' or
                correct.casefold() not in scenes[1]['de'].casefold()):
            raise ValueError('Oma must correct immediately in the next shot')
        if scenes[2]['speaker']!='lina' or correct.casefold() not in scenes[2]['de'].casefold():
            raise ValueError('Lina must immediately repeat the correct phrase after Oma')
        praise=scenes[3]['de'].casefold().strip()
        if (scenes[3]['speaker']!='oma' or not any(praise.startswith(word) for word in PRAISE) or
                any(word in praise.split() for word in ('falsch','dumm','blöd','aber'))):
            raise ValueError('Oma must immediately encourage the correct repetition')
    if len(error.get('explanation', '')) < 20:
        raise ValueError('Explain the intended meaning and why the first phrase is wrong for it')
    normalize=lambda value: ' '.join(str(value).casefold().strip(' .!?…').split())
    if any(is_plan(h) and normalize(h.get('language_error',{}).get('wrong'))==normalize(wrong) and
           normalize(h.get('language_error',{}).get('correct'))==normalize(correct) for h in history):
        raise ValueError('Daily episodes need a new language distinction')
    if plan.get('research_source',{}).get('url') not in SOURCES:
        raise ValueError('The learning sitcom requires matching live grammar research')


def prompt(episode, research, history):
    memory = [{k: h.get(k) for k in ('story_id', 'title_de', 'summary', 'language_error')}
              for h in history if is_plan(h)]
    return (
        'Create an ORIGINAL daily 45-second German A1 learning comedy with exactly nine five-second shots. '
        'Lina is a newly arrived eight-year-old girl with some German; Oma Rosi is her warm funny grandmother. '
        'Only speakers lina and oma. Never Marta or Lukas. Lina is clever, playful and never mocked for accent, '
        'nationality or intelligence. Oma responds with a gentle visual joke and explicitly corrects one word or '
        'sentence; Lina repeats and uses that correction. MANDATORY FIRST FOUR SHOTS: '
        '0 Lina says the wrong phrase; 1 Oma immediately gives the exact correct phrase; '
        '2 Lina repeats that correct phrase; 3 Oma immediately praises her warmly, e.g. Sehr gut!, Prima!, '
        'Gut gemacht!, Bravo! or Klasse! No delayed correction, sarcasm or joke instead of praise. '
        'A gentle smile or tiny visual joke may accompany correction, but never postpone it. '
        'Only after these four linked turns continue the SAME everyday story and its comic payoff. '
        'The final visible joke grows from the SAME language '
        'misunderstanding and props; no random joke or disconnected vocabulary drill. Family-safe ordinary '
        'activities only. One coherent location and original fixed reference outfits. No nationality, real child '
        'identity, cloned voice, dangerous activity, employment or legal/medical plot. The first line contains '
        'the wrong phrase. Lina speaks in the first and last shot and at least five shots. Each line preferably '
        '3-6 words, under 40 characters, natural speech with meaningful pauses. Do not invent a new error by '
        'calling a grammatical and contextually correct phrase incorrect. All stories and people are fictional. '
        'Use only the supplied live official grammar context for language claims. The camera shows only the '
        'current speaker in a close or medium single-person shot, listener completely outside the frame; '
        'never put both faces or a second moving mouth in a generated speaking shot. Same breakfast table or '
        'other coherent location, matching eyelines across the cut, pauses with mouths closed. '
        'Return only JSON with: episode, story_id (unique original string), title_de, title_fa, summary, '
        'cliffhanger (small bridge to tomorrow), series_version:wg-alltag-v1, series_name:Lina & Oma Rosi, '
        'cast_profile:lina-oma-v1, content_basis:everyday-reenactment, mood:comic, duration_seconds:45, '
        'location_key, location_description, visual_hook, everyday_problem, practical_resolution, '
        'marta_goal and marta_decision (legacy schema keys describing LINAS goal and own action), visual_payoff, '
        'language_error:{wrong,correct,explanation}, comedy_beats:{setup:0,escalations:[two linked increasing '
        'intermediate indices],payoff:8}, creative_review:{previous_weakness_addressed,visible_comic_action,'
        'next_experiment}, documented_basis:{report_url (exact source URL),type:documented-problem-adaptation,'
        'verified_problem (source-supported grammar-learning context),invented_elements (nonempty array)}, '
        'scenes:[nine objects with speaker,de,fa (accurate Persian),scene,motion,visible_objects (one to three '
        'concrete props),object_action (one readable physical action),location_key,story_beat]. '
        'Keep German and Persian captions readable without shrinking. No newline/control markup in scene '
        'strings, no generated text or logos in image instructions. Never repeat a prior story, wrong/correct '
        'pair, title or four prior lines. Episode: '+str(episode)+'. Live source: '+json.dumps(research,ensure_ascii=False)+
        '. Previous child-series stories: '+json.dumps(memory,ensure_ascii=False))


def contact_sheet(images, target):
    from PIL import Image, ImageDraw
    if len(images) != 9:
        raise ValueError('Preview must show every scene before video generation')
    sheet = Image.new('RGB', (1080, 1920), '#17252c')
    draw = ImageDraw.Draw(sheet)
    for i, path in enumerate(images):
        with Image.open(path) as image:
            image = image.convert('RGB')
            image.thumbnail((344, 590))
            x, y = (i % 3)*360+8, (i // 3)*640+24
            sheet.paste(image, (x+(344-image.width)//2,y))
            draw.text((x+8,y+600), str(i+1), fill='white')
    target = Path(target)
    sheet.save(target, quality=91)
    return {'file':str(target),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}


def deliver_preview(state, info, save, send):
    """Write intent before upload; never replay an unknown Telegram result."""
    preview = state['pending'].get('image_preview', {})
    if preview.get('status') == 'sent':
        if preview.get('sha256') != info['sha256']:
            raise RuntimeError('Images changed after preview; reconcile before generating video')
        return
    if preview.get('status') == 'dispatching':
        raise RuntimeError('Image preview delivery uncertain; reconcile before replay')
    state['pending']['image_preview'] = {**info, 'status':'dispatching'}
    save(state)
    receipt = send('preview', info['file'])
    if not receipt.get('message_id'):
        raise RuntimeError('Image preview receipt is missing')
    state['pending']['image_preview'].update(status='sent',message_id=receipt['message_id'])
    save(state)
