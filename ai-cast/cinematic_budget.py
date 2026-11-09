"""Check included ZeroGPU allowance before authenticated generation.

Explicit owner approvals are scoped to particular episodes and scene indices.
Remote calls are sequential; other account users can still consume quota concurrently.
"""
import json
import os
import re
import math
from datetime import datetime, timezone
import urllib.request
from cinematic_time_budget import policy as time_policy, TimeBudget, journal_path

SCENE = None
_TIME_SESSION = None


def set_scene(episode, index):
    global SCENE
    SCENE = (episode, index)


def credit_authorized():
    import hashlib
    from pathlib import Path
    run = os.getenv('GITHUB_RUN_ID')
    if not run or SCENE is None:
        return False
    try:
        request = json.loads(Path('.cinematic-credit-request.json').read_text())
        state = json.loads(Path('.cinematic-series-state.json').read_text())
        plan = (json.loads(Path('ai-cast/newcomer-preview-plan.json').read_text())
                if request.get('kind') == 'preview' else state['pending']['plan'])
        digest = hashlib.sha256(json.dumps(plan, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
        return (request['status'] == 'running' and request['active_run'] == run + ':' + os.getenv('GITHUB_RUN_ATTEMPT', '1')
                and request['plan_sha'] == digest and request['episode'] == SCENE[0] and SCENE[1] in request['scenes'])
    except (OSError, ValueError, KeyError, TypeError):
        return False


def read_quota(token):
    req = urllib.request.Request('https://huggingface.co/api/spaces/zero-gpu/quota',
                                 headers={'Authorization': 'Bearer ' + token})
    with urllib.request.urlopen(req, timeout=20) as response:
        data = json.load(response)
    if isinstance(data.get('current'), bool):
        raise ValueError('Invalid quota value')
    remaining = float(data['current'])
    if not math.isfinite(remaining):
        raise ValueError('Quota is not finite')
    if remaining < 0:
        remaining = 0
    return remaining



def read_reset_at(token=None):
    """Read the service's own reset timestamp; never infer it from the calendar."""
    token=token or os.getenv('HF_TOKEN')
    if not token:raise RuntimeError('Quota reset credential unavailable')
    req=urllib.request.Request('https://huggingface.co/api/spaces/zero-gpu/quota',
                               headers={'Authorization':'Bearer '+token})
    with urllib.request.urlopen(req,timeout=20) as response:data=json.load(response)
    stamp=datetime.fromisoformat(data['resetsAt'].replace('Z','+00:00'))
    if stamp.tzinfo is None or stamp<=datetime.now(timezone.utc):
        raise ValueError('Quota reset timestamp is not a verified future instant')
    return stamp

def guard(token, required_seconds, allow_credit=True):
    if not token:
        return  # Anonymous calls cannot bill the account.
    if allow_credit and credit_authorized():
        return  # Scope is explicitly limited to the three remaining takes.
    try:
        remaining = read_quota(token)
    except Exception:
        raise RuntimeError('quota: cannot verify included allowance; credit approval required before authenticated generation') from None
    # Reserve the provider maximum, not a guessed average, plus a small margin.
    if remaining < required_seconds + 30:
        raise RuntimeError(f'quota: included allowance {remaining:.0f}s below safe request {required_seconds + 30}s; credit approval required')


def preflight(token=None):
    """Read account allowance before planning. This never starts a GPU task."""
    token = token or os.getenv('HF_TOKEN')
    result = {'checked_at': datetime.now(timezone.utc).isoformat(),
              'generation_requested': False, 'order': ['hf-included', 'hf-anonymous-free']}
    strict = time_policy()
    if strict:
        result.update(order=['hf-included'], strict_time_budget=True, paid_route=False,
                      can_admit_minimum_stage=False)
    if not token:
        return {**result, 'status': 'missing_token', 'remaining_seconds': None,
                'can_admit_one_speaking_take': False, 'fallback': None if strict else 'hf-anonymous-free'}
    try:
        remaining = read_quota(token)
        if strict:
            minimum = strict.get('minimum_stage_seconds', 120)
            result['can_admit_minimum_stage'] = remaining >= minimum + strict['reserve_seconds']
        return {**result, 'status': 'verified', 'remaining_seconds': remaining,
                'can_admit_one_speaking_take': remaining >= 510,
                'fallback': 'hf-anonymous-free' if not strict and remaining < 510 else None}
    except Exception:
        return {**result, 'status': 'unverified', 'remaining_seconds': None,
                'can_admit_one_speaking_take': False, 'fallback': None if strict else 'hf-anonymous-free'}


def run_gpu(fn, required_seconds):
    """Account included allowance first, then explicitly unauthenticated free use.

    No automatic transition to paid credits. guard() retains exact owner-approved
    scene exceptions. False disables huggingface_hub implicit token discovery.
    """
    if os.getenv('CINEMATIC_CACHED_ONLY') == 'on':
        raise RuntimeError('Cached-only finishing cannot request GPU generation')
    import build
    token = os.getenv('HF_TOKEN') or None
    strict = time_policy()
    if strict:
        global _TIME_SESSION
        if not token:
            raise RuntimeError('quota: verified included time requires the configured account token')
        try:
            remaining = read_quota(token)
        except Exception:
            raise RuntimeError('quota: cannot verify included time; no GPU request admitted') from None
        if _TIME_SESSION is None:
            _TIME_SESSION = TimeBudget(remaining, strict['reserve_seconds'], journal_path())
        previous = build.TOKEN
        try:
            build.TOKEN = token
            return _TIME_SESSION.run(fn, required_seconds, remaining, lambda: read_quota(token), SCENE)
        finally:
            build.TOKEN = previous
    previous = build.TOKEN
    errors = []
    for name, credential in ([('hf-included', token)] if token else []) + [('hf-anonymous-free', False)]:
        try:
            build.TOKEN = credential
            guard(credential, required_seconds, allow_credit=False)
            return fn()
        except Exception as exc:
            detail = str(exc)
            if token:
                detail = detail.replace(token, '[REDACTED]')
            detail = re.sub(r'https?://[^\s]+', '[URL]', detail)
            errors.append(name + ': ' + detail[:300])
            print('GPU route unavailable: ' + name + '; trying next eligible free route.', flush=True)
        finally:
            build.TOKEN = previous
    # A valid, already-claimed per-scene approval may be used only AFTER both
    # free routes fail. This does not create or infer a credit authorization.
    if token and credit_authorized():
        try:
            build.TOKEN = token
            return fn()
        finally:
            build.TOKEN = previous
    prefix = 'quota: ' if any('quota' in error.lower() for error in errors) else ''
    raise RuntimeError(prefix + 'All eligible free GPU routes exhausted: ' + ' | '.join(errors))
