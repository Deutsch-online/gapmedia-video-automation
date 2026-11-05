"""One production start per Berlin calendar day, including retries and force."""
from datetime import datetime

MODE = 'daily-berlin-budget'


def daily_slot(state, config, local, force=False):
    if config.get('schedule_mode') != MODE:
        return None
    day = local.date().isoformat()
    if local.tzinfo is None or str(local.tzinfo) != 'Europe/Berlin':
        raise ValueError('Daily production requires Europe/Berlin local time')
    if config.get('timezone') != 'Europe/Berlin' or config.get('daily_episodes') != 1:
        raise ValueError('Daily production must be once per Berlin calendar day')
    if any(str(key).split('#', 1)[0] == day for key in state.get('deliveries', {})):
        return False, 'already-delivered', day
    if (state.get('pending') or {}).get('status') == 'dispatching':
        return False, 'delivery-needs-reconciliation', day
    starts = sum(int(value) for key, value in state.get('attempts', {}).items()
                 if str(key).split('#', 1)[0] == day)
    if starts >= 1:
        return False, 'daily-production-already-started', day
    recovery = state.get('quota_recovery', {})
    if recovery and (state.get('pending') or {}).get('status') == 'render-failed':
        ready = datetime.fromisoformat(recovery['not_before'])
        if ready.tzinfo is None:
            raise ValueError('Quota recovery timestamp must include timezone')
        if local < ready:
            return False, 'waiting-for-gpu-quota', day
    if not force and local.strftime('%H:%M') < config['time']:
        return False, 'before-daily-slot', day
    return True, 'daily-berlin-slot', day
