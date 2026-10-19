"""Check included ZeroGPU allowance before authenticated generation.

Explicit owner approvals are scoped to particular episodes and scene indices.
Remote calls are sequential; other account users can still consume quota concurrently.
"""
import json
import os
import urllib.request

SCENE = None


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
        plan = state['pending']['plan']
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
    remaining = float(data['current'])
    if remaining < 0:
        remaining = 0
    return remaining


def guard(token, required_seconds):
    if not token:
        return  # Anonymous calls cannot bill the account.
    if credit_authorized():
        return  # Scope is explicitly limited to the three remaining takes.
    try:
        remaining = read_quota(token)
    except Exception:
        raise RuntimeError('quota: cannot verify included allowance; credit approval required before authenticated generation') from None
    # Reserve the provider maximum, not a guessed average, plus a small margin.
    if remaining < required_seconds + 30:
        raise RuntimeError(f'quota: included allowance {remaining:.0f}s below safe request {required_seconds + 30}s; credit approval required')


def run_gpu(fn, required_seconds):
    import shots
    import build
    def checked():
        guard(build.TOKEN, required_seconds)
        return fn()
    return shots.run_free(checked)
