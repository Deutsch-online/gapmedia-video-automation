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
    approval = os.getenv('CINEMATIC_CREDIT_APPROVAL')
    if approval == 'door-style-preview-20261019':
        return SCENE in ((9001, 0), (9001, 1), (9001, 2))
    return approval == 'episode5-final15s-20261019' and SCENE in ((5, 9), (5, 10), (5, 11))


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
