"""Story-specific human staging with three reviewed starting compositions."""
FROM_EPISODE=29
SETTINGS=('park-path','school-entrance','bus-stop','shop','hallway','laundry-room','library','living-room','kitchen')
FRAMINGS=('medium-wide-action','medium-demonstration','closer-face-and-object')
CAMERAS=('locked','gentle-push','gentle-follow')


def human(plan):
    return plan.get('cast_profile')=='lina-oma-v1' and plan.get('episode',0)>=FROM_EPISODE


def reference_spec(config,episode):
    rule=config['visual_profile'].get('human_cast',{})
    if rule and episode>=rule['from_episode']:
        return {'image':rule['reference_image'],'sha':rule['speaker_reference_sha256'],'regions':rule['speaker_regions']}
    return {'image':config['visual_profile']['reference_image'],
            'sha':config.get('lina_oma_series',{}).get('speaker_reference_sha256'),'regions':None}


def previous_setting(plan):
    if plan.get('setting_type'):return plan['setting_type']
    text=str(plan.get('location_description','')).casefold()
    if 'sofa' in text or 'living-room' in text:return 'living-room'
    if 'kitchen' in text:return 'kitchen'
    return None


def validate(plan,history=()):
    if not human(plan):return
    setting=plan.get('setting_type')
    if setting not in SETTINGS:raise ValueError('A staged episode needs a concrete story-specific setting type')
    if setting in [previous_setting(h) for h in history[-2:]]:
        raise ValueError('Do not repeat either of the last two episode settings')
    groups={};demonstrations=0
    for scene in plan['scenes']:
        if scene.get('location_key')!=plan.get('location_key'):
            raise ValueError('Keep all shots inside the same coherent episode location')
        if scene.get('framing') not in FRAMINGS or scene.get('camera_action') not in CAMERAS:
            raise ValueError('Specify a deliberate framing and restrained camera action for every shot')
        group=scene.get('keyframe_group')
        if not isinstance(group,str) or not group or len(group)>60:
            raise ValueError('Each shot needs a staged keyframe group')
        specification=(scene['speaker'],tuple(sorted(scene['visible_objects'])),scene['framing'])
        if group in groups and groups[group]!=specification:
            raise ValueError('A shared keyframe cannot change speaker, objects or framing')
        groups[group]=specification
        obj=scene.get('demonstrated_object')
        if obj is not None:
            if obj not in scene['visible_objects'] or len(scene.get('demonstration',''))<25:
                raise ValueError('Demonstrations must name an actually visible prop and its physical action')
            demonstrations+=1
    if len(groups)!=3 or {value[0] for value in groups.values()}!={'lina','oma'}:
        raise ValueError('Use exactly three distinct compositions across the two speakers')
    if demonstrations<5:raise ValueError('Show at least five concrete object demonstrations, not a portrait-only conversation')


def guidance():
    return (' From episode 29 use PHOTOREALISTIC fictional human Lina and Oma, natural eyes, skin and hands, '
        'not cartoon or plastic faces. Every new episode needs its own real everyday setting; do not use either '
        'of the last two setting types. Keep that location coherent across all nine shots. Include setting_type '
        'from '+', '.join(SETTINGS)+'. Show real full-size objects and actual safe actions, not toy substitutes or '
        'a sofa conversation about unseen events. Use exactly THREE keyframe_group values: two distinct Lina '
        'action/framing stages and one Oma demonstration stage. Each shared group has the same speaker, '
        'visible_objects and framing. Every scene needs framing from '+', '.join(FRAMINGS)+' and camera_action '
        'from '+', '.join(CAMERAS)+'. At least five scenes need demonstrated_object (an exact visible_objects '
        'entry) and demonstration (a concrete physical manipulation). These are plans, not claims that an output '
        'was visually verified. Foreground object, hands and face stay above the lower subtitle panel. Include '
        'Keep scene, motion and demonstration fields concise, one short physical sentence each. Use genuine hand-to-object action; do not substitute nodding, smiling or pointing off camera for showing '
        'the task. One visible speaking face, other person fully off camera. No traffic risk or reckless activity.')
