"""Two source keyframes, nine independent speaking takes; no quota-policy changes."""
PROFILE = 'two-speaker-keyframes-v1'
STAGED_PROFILE = 'story-staged-keyframes-v2'

def selected_policy(plan,config):
    staged=config.get('visual_profile',{}).get('staged_keyframes',{})
    return staged if staged and plan['episode']>=staged.get('from_episode',10**9) else config.get('visual_profile',{}).get('keyframe_economy',{})

def profile_id(plan,config):
    return selected_policy(plan,config).get('id',PROFILE)


def keyframe_anchors(plan, config):
    policy = selected_policy(plan,config)
    if not policy or plan['episode'] < policy.get('from_episode', 10**9):
        return None
    if policy.get('id') == STAGED_PROFILE:
        from cinematic_staging import validate
        validate(plan)
        if policy.get('maximum_generated_stills')!=3:
            raise ValueError('Staged economy requires exactly three source compositions')
        first={}
        return [first.setdefault(scene['keyframe_group'],i) for i,scene in enumerate(plan['scenes'])]
    if policy.get('id') != PROFILE or policy.get('maximum_generated_stills') != 2:
        raise ValueError('Unknown keyframe economy policy')
    if plan.get('cast_profile') != 'lina-oma-v1' or len(plan.get('scenes', [])) != 9:
        raise ValueError('Economy requires the nine-shot Lina and Oma series')
    first, props = {}, {}
    anchors = []
    for i, scene in enumerate(plan['scenes']):
        role = scene['speaker']
        if role not in ('lina', 'oma') or scene.get('location_key') != plan.get('location_key'):
            raise ValueError('Economy requires fixed speakers and one coherent location')
        visible = tuple(sorted(scene.get('visible_objects', [])))
        if not 1 <= len(visible) <= 3:
            raise ValueError('Economy requires one to three fixed props per speaker')
        if role in props and props[role] != visible:
            raise ValueError('Economy requires the same visible props in every shot of a speaker')
        first.setdefault(role, i)
        props[role] = visible
        anchors.append(first[role])
    if len(first) != 2:
        raise ValueError('Both Lina and Oma must have their own source keyframe')
    return anchors


def report(plan, config):
    anchors = keyframe_anchors(plan, config)
    return {'profile': profile_id(plan,config) if anchors else 'individual-stills',
            'planned_image_submissions': len(set(anchors)) if anchors else len(plan['scenes']),
            'planned_independent_video_takes': len(plan['scenes']),
            'output_seconds': plan.get('duration_seconds'),
            'cached_submissions_may_be_zero': True,
            'full_episode_quota_guaranteed': False,
            'per_call_live_quota_guard_unchanged': True}

