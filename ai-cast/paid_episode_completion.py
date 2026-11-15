"""One owner-authorized prepaid continuation. Normal daily policy stays included-only."""
import hashlib
import importlib.util
import json
import math
import os
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REQUEST = Path('.cinematic-paid-final-request.json')
EPISODE, STORY, SCENES = 23, 'lina-oma-water-spoon-holiday-v1', (8,)
MAXIMUM, TOTAL = 480, 480


def digest(plan):
    return hashlib.sha256(json.dumps(plan,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()


def verify_request(request, plan, now=None):
    now=now or datetime.now(timezone.utc)
    if request.get('status')!='approved' or request.get('authorization')!='explicit-owner-paid-continuation':
        raise RuntimeError('No unused explicit owner paid authorization')
    if (request.get('episode')!=EPISODE or plan.get('episode')!=EPISODE or
            plan.get('story_id')!=STORY or request.get('story_id')!=STORY or
            request.get('plan_sha')!=digest(plan) or request.get('scenes')!=list(SCENES)):
        raise RuntimeError('Paid authorization does not match the exact remaining scenes and plan')
    if (request.get('max_calls')!=1 or request.get('max_request_units')!=MAXIMUM or
            request.get('max_total_units')!=TOTAL or request.get('purchase_credits') is not False):
        raise RuntimeError('Paid continuation requires one bounded call and no credit purchase')
    expires=datetime.fromisoformat(request['expires_at'].replace('Z','+00:00'))
    if expires.tzinfo is None or expires<=now:
        raise RuntimeError('Paid authorization expired')
    if request.get('calls'):
        raise RuntimeError('A prior paid submission cannot be replayed')


class PaidCalls:
    def __init__(self, request, run, save, quota):
        self.request,self.run_id,self.save,self.quota=request,run,save,quota

    def run(self, callback, requested, scene):
        r=self.request
        if r.get('status')!='running' or r.get('active_run')!=self.run_id:
            raise RuntimeError('Paid attempt is not claimed by this workflow run')
        if scene is None or tuple(scene) not in [(EPISODE,i) for i in SCENES] or requested!=MAXIMUM:
            raise RuntimeError('Paid scope forbids image generation, completed clips and other provider bounds')
        calls=r.setdefault('calls',[])
        if (len(calls)>=1 or any(c['scene']==scene[1] for c in calls) or
                sum(c['reserved_units'] for c in calls)+requested>TOTAL or
                any(c['status']!='completed' for c in calls)):
            raise RuntimeError('Paid call cap reached or prior request is uncertain; no automatic retry')
        entry={'scene':scene[1],'reserved_units':requested,'status':'reserved','before':self.quota()}
        calls.append(entry)
        self.save()  # Persist to GitHub before a potentially billable submission.
        try:
            result=callback()
        except BaseException:
            entry['status']='failed-or-uncertain'
            self.save()
            raise
        entry['status']='completed'
        try:entry['after']=self.quota()
        except Exception:entry['settlement']='unverified; full reservation retained'
        self.save()
        return result


def account_quota():
    token=os.environ['HF_TOKEN']
    req=urllib.request.Request('https://huggingface.co/api/spaces/zero-gpu/quota',
                              headers={'Authorization':'Bearer '+token})
    with urllib.request.urlopen(req,timeout=20) as response:data=json.load(response)
    safe={}
    for key in ('base','current','overquotaUsed'):
        value=data.get(key)
        if value is not None:
            if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value):
                raise RuntimeError('Unverified account quota metadata')
            safe[key]=value
    if 'base' not in safe or 'current' not in safe:
        raise RuntimeError('Missing account quota metadata')
    return safe


def verify_assets(module, plan, config, cache):
    import cinematic_design as design
    import cinematic_speech as speech
    sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
    refs=design.speaker_references(config['visual_profile']['reference_image'],
        cache/'single-speaker-references',config['lina_oma_series']['speaker_reference_sha256'])
    reference_sha=hashlib.sha256(b''.join(refs[role].read_bytes() for role in ('lina','oma'))).hexdigest()
    for i,scene in enumerate(plan['scenes']):
        image,audio,wav=cache/f'{i:02}.png',cache/f'{i:02}.mp3',cache/f'{i:02}.aligned.wav'
        expected=design.image_signature(reference_sha,design.still_prompt(plan,scene),EPISODE*1009+i*11)
        if (not image.exists() or image.with_suffix('.sig').read_text()!=expected or
                audio.with_suffix('.audio.sig').read_text()!=module.narration_signature(scene)):
            raise RuntimeError('Protected image or narration changed; no paid regeneration allowed')
        aligned=json.loads(wav.with_suffix('.alignment.json').read_text())
        if (aligned.get('signature')!={'source':sha(audio),'timing':'120ms-5s-mono48k-v1'} or
                aligned.get('wav')!=sha(wav)):
            raise RuntimeError('Protected aligned speech does not match the saved narration')
        if not .4<module.seconds(audio)<=4.5:
            raise RuntimeError('Existing narration exceeds unchanged timing gate')
        if i not in SCENES:
            clip=cache/f'{i:02}.mp4'
            marker=json.loads(clip.with_suffix('.speech.json').read_text())
            signature={'audio_sha256':sha(wav),'image_sha256':sha(image),
                       'model':speech.model_identity('longcat-light'),'motion':design.speaking_motion(scene),
                       'seed':EPISODE*1009+i*11,'timing':'aligned-wav-native-speed-v1'}
            if marker!=signature or not 5<=module.seconds(clip)<=5.3:
                raise RuntimeError('A completed protected speaking clip changed')


def main():
    root=Path(__file__).resolve().parents[1];os.chdir(root)
    spec=importlib.util.spec_from_file_location('paid_series',root/'ai-cast/cinematic-series.py')
    m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
    state,config=m.load_json(m.STATE),m.load_json(m.CONFIG)
    pending=state.get('pending') or {};plan=pending.get('plan') or {}
    request=m.load_json(REQUEST,{})
    verify_request(request,plan)
    if pending.get('status')!='render-failed' or pending.get('platform_receipts') or state['next_episode']!=EPISODE:
        raise RuntimeError('Episode is complete, already dispatching, or not eligible for protected recovery')
    m.validate_plan(plan,EPISODE,state['history'])
    if config['visual_profile']['speech_backend']!='longcat-light':
        raise RuntimeError('Paid permission does not authorize changing provider or profile')
    preview=pending.get('image_preview',{})
    if preview.get('status')!='sent' or not preview.get('message_id'):
        raise RuntimeError('Required image storyboard delivery is not confirmed')
    cache=Path('renders/cinematic-series-cache/e0023-lina-oma-v1')
    verify_assets(m,plan,config,cache)
    quota=account_quota()
    if quota['base']<2400:
        raise RuntimeError('The account is not verified as eligible for ZeroGPU prepaid extension')
    print('Paid scope verified: only scene 8; maximum 480 charged GPU units; no purchase.',flush=True)
    m.bot('verify')
    run=os.environ['GITHUB_RUN_ID']+':'+os.getenv('GITHUB_RUN_ATTEMPT','1')
    m.CREDIT_REQUEST=REQUEST
    request.update(status='running',active_run=run,quota_before=quota,calls=[])
    key=m.local_date().date().isoformat()+'#'+request['id']
    if state['attempts'].get(key):raise RuntimeError('The explicit paid continuation was already started')
    state['attempts'][key]=1
    state['pending'].update(status='rendering',date=key,paid_request=request['id'])
    def save():
        m.atomic_json(REQUEST,request);m.checkpoint(state)
    save()
    guard=PaidCalls(request,run,save,account_quota)
    import cinematic_budget as budget
    import build
    original=budget.run_gpu
    def run_paid(fn,required_seconds):
        previous=build.TOKEN
        try:
            build.TOKEN=os.environ['HF_TOKEN']
            return guard.run(fn,required_seconds,budget.SCENE)
        finally:build.TOKEN=previous
    def confirm_preview(info):
        if info['sha256']!=preview['sha256']:
            raise RuntimeError('Images changed after the confirmed preview; no paid submission')
    budget.run_gpu=run_paid
    try:
        final=m.render(plan,config,history=state['history'],persist_preview=confirm_preview)
        request['status']='generated';save()
        m.finish_delivery(state,plan,config,final,key)
        request['status']='completed';save()
        print('Paid continuation completed and both private output receipts saved.',flush=True)
    except BaseException as exc:
        request.update(status='failed-or-uncertain',error=m.provider_error(exc))
        if state.get('pending') and state['pending'].get('status')!='dispatching':
            state['pending']['status']='render-failed'
        save()
        raise
    finally:budget.run_gpu=original


if __name__=='__main__':
    main()
