"""Mandatory daily evidence review and full-episode quota forecast, with live per-call guards."""
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo


def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()


def read(path, default=None):
    try:return json.loads(Path(path).read_text())
    except (OSError,ValueError):return default


def save(path,value):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_suffix('.tmp');temporary.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');temporary.replace(path)


def berlin_day(now=None):
    return (now or datetime.now(timezone.utc)).astimezone(ZoneInfo('Europe/Berlin')).date().isoformat()


def active(config,episode):
    policy=config.get('production_readiness',{})
    return policy.get('enabled') is True and episode>=policy.get('from_episode',10**9)


def collect_review(fetch, now=None, root=Path('renders/cinematic-series-cache/readiness')):
    now=now or datetime.now(timezone.utc);day=berlin_day(now)
    path=Path(root)/day/'prior-post-review.json'
    previous=read(path,{})
    try: age=(now-datetime.fromisoformat(previous['checked_at'])).total_seconds()
    except (KeyError,ValueError,TypeError):age=86400
    if previous.get('day')==day and previous.get('attempted') is True and 0 <= age < (3600 if previous.get('status')=='available' else 900):
        return previous
    result={'day':day,'attempted':True,'checked_at':now.isoformat(),'status':'unavailable',
            'causal_explanation_verified':False,'visual_reviewed':False,'experiments':[],
            'prior_post_observations':[], 'missing':['watch-time or completion may be unavailable; views alone do not prove causes']}
    try:
        fetch('/internal/social-run',{})  # Existing authenticated monitor, with its own hourly lease.
        result['refresh']='requested'
    except Exception as exc:result['refresh']='unavailable:'+type(exc).__name__
    try:
        value=fetch('/internal/creative-feedback')
        stamp=datetime.fromisoformat(str(value.get('updated_at','')).replace('Z','+00:00'))
        if stamp.tzinfo is None or not 0 <= (now-stamp).total_seconds() <= 86400:
            raise ValueError('No fresh daily evidence')
        if value.get('status')!='available':raise ValueError('No available evidence')
        result.update(status='available',source_updated_at=stamp.isoformat(),
                      evidence_level=str(value.get('evidence_level','unknown'))[:100])
        for item in value.get('experiments',[])[:3]:
            if isinstance(item,dict) and all(isinstance(item.get(k),str) for k in ('change','measure','evidence')):
                result['experiments'].append({k:item[k][:700] for k in ('change','measure','evidence')})
        for item in value.get('reference_candidates',[])[:3]:
            if isinstance(item,dict):
                result['prior_post_observations'].append({k:item.get(k) for k in ('id','url','views','relative_to_median')})
        if isinstance(value.get('render_qc'),dict):
            result['render_qc']={k:value['render_qc'].get(k) for k in ('duration','width','height','frozen_seconds','lip_sync_measured')}
    except Exception as exc:result['evidence_error']=type(exc).__name__
    result['next_test']=(result['experiments'] or [{'change':'Show the language mistake and its object immediately; correct, repeat and praise in the first four turns.',
        'measure':'Compare retention/completion and shares per view at the same post age when available.',
        'evidence':'baseline_quality_test; analytics unavailable, no proven cause'}])[0]
    save(path,result)
    return result


def remaining_work(plan,config,cache,narration_signature):
    import cinematic_design as design
    import cinematic_speech as speech
    from cinematic_economy import keyframe_anchors
    cache=Path(cache);cache.mkdir(parents=True,exist_ok=True)
    refs=design.speaker_references(config['visual_profile']['reference_image'],cache/'single-speaker-references',
                                  config['lina_oma_series']['speaker_reference_sha256'])
    reference_sha=hashlib.sha256(b''.join(refs[role].read_bytes() for role in ('lina','oma'))).hexdigest()
    pooled=keyframe_anchors(plan,config);anchors=pooled or list(range(len(plan['scenes'])))
    image_valid=[];video_missing=[]
    for i,scene in enumerate(plan['scenes']):
        anchor=anchors[i];seed=plan['episode']*1009+anchor*11
        sig=design.image_signature(reference_sha,design.still_prompt(plan,plan['scenes'][anchor]),seed)
        if pooled:sig=hashlib.sha256(('two-speaker-keyframes-v1:'+sig).encode()).hexdigest()
        image,audio,wav=cache/f'{i:02}.png',cache/f'{i:02}.mp3',cache/f'{i:02}.aligned.wav'
        valid=False;clip_valid=False
        try:
            valid=image.is_file() and image.with_suffix('.sig').read_text()==sig
            audio_valid=audio.is_file() and audio.with_suffix('.audio.sig').read_text()==narration_signature(scene)
            alignment=read(wav.with_suffix('.alignment.json'),{})
            wav_valid=audio_valid and wav.is_file() and alignment.get('signature')=={
                'source':speech.audio_sha(audio),'timing':'120ms-5s-mono48k-v1'} and alignment.get('wav')==speech.audio_sha(wav)
            expected={'audio_sha256':speech.audio_sha(wav),'image_sha256':speech.audio_sha(image),
                'model':speech.model_identity('longcat-light'),'motion':design.speaking_motion(scene),
                'seed':plan['episode']*1009+i*11,'timing':'aligned-wav-native-speed-v1'} if valid and wav_valid else None
            clip_valid=expected is not None and (cache/f'{i:02}.mp4').is_file() and read(cache/f'{i:02}.speech.json')==expected
        except OSError:clip_valid=False
        image_valid.append(valid)
        if not clip_valid:video_missing.append(i)
    image_missing=[i for i in sorted(set(anchors)) if not image_valid[i]]
    return {'images':len(image_missing),'videos':len(video_missing),'video_indices':video_missing,
            'cached_videos':len(plan['scenes'])-len(video_missing)}


def observed_bound(journals,maximum):
    samples=[]
    for path in sorted(Path(journals).glob('*.json'))[-20:]:
        for entry in read(path,{}).get('entries',[]):
            value=entry.get('charged_bound')
            if entry.get('status')=='completed' and entry.get('maximum_seconds')==maximum and isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value) and value>0:
                samples.append(float(value))
    recent=samples[-9:]
    if len(recent)<3:return maximum,'published_maximum_no_sufficient_history'
    # Account debits can include other consumers. Never reduce an inflated observation.
    return max(recent)*1.2,'recent_account_debit_upper_plus_20_percent'


def forecast(work,available,journals,reserve=30):
    available=float(available)
    if not math.isfinite(available) or available<0:raise ValueError('Unverified available quota')
    image,image_basis=observed_bound(journals,120)
    video,video_basis=observed_bound(journals,480)
    total=work['images']*image+work['videos']*video
    # Keep the full published maximum available for the final outstanding request.
    headroom=max(0,480-video) if work['videos'] else max(0,120-image) if work['images'] else 0
    required=total+headroom+reserve if work['images'] or work['videos'] else 0
    return {'work':work,'available_units':available,'estimated_generation_units':total,
        'required_units_with_headroom':required,'admitted':available>=required,
        'image_bound':image,'video_bound':video,'image_basis':image_basis,'video_basis':video_basis,
        'reserve_units':reserve,'final_request_headroom':headroom,
        'full_episode_guaranteed':False,'per_call_live_guard_required':True,'paid_fallback':False}


def proof_path(plan):
    return Path('renders/cinematic-series-cache/readiness')/berlin_day()/f"episode-{plan['episode']:04}.json"


def prepare(plan,config,quota,review,narration_signature):
    if not active(config,plan['episode']):return None
    if config['visual_profile'].get('speech_backend')!='longcat-light':
        raise ValueError('Whole-episode budget profile needs a reviewed provider cost model')
    cache=Path('renders/cinematic-series-cache')/f"e{plan['episode']:04}-lina-oma-v1"
    work=remaining_work(plan,config,cache,narration_signature)
    if (work['images'] or work['videos']) and quota.get('status')!='verified':
        raise RuntimeError('quota: full episode allowance is unverified')
    available=quota.get('remaining_seconds') if quota.get('status')=='verified' else 0
    value=forecast(work,available,cache.parent/'budgets',config['time_budget']['reserve_seconds'])
    value['quota_status']=quota.get('status','unverified')
    value.update(day=berlin_day(),episode=plan['episode'],plan_sha=digest(plan),review_attempted=review.get('attempted') is True,
                 review_status=review.get('status'),review_source_at=review.get('source_updated_at'),selected_test=review.get('next_test'))
    save(proof_path(plan),value)
    return value


def assert_prepared(plan,config):
    if not active(config,plan['episode']):return
    proof=read(proof_path(plan),{})
    if proof.get('plan_sha')!=digest(plan) or proof.get('day')!=berlin_day() or proof.get('review_attempted') is not True or proof.get('admitted') is not True:
        raise RuntimeError('quota: daily prior-post review and full-episode admission must pass before rendering')
