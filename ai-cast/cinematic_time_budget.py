"""Durable, conservative quota accounting; no unverified or paid fallback."""
import json
import math
import os
import time
from datetime import datetime, timezone
from pathlib import Path


def policy():
    path = Path('.cinematic-series.json')
    if not path.exists():
        return None
    config = json.loads(path.read_text())
    value = config.get('time_budget', {})
    if not value:
        return None  # Versioned legacy requests keep their old policy.
    if value.get('mode') != 'verified-included-only':
        raise ValueError('Unknown GPU time-budget policy')
    reserve = value.get('reserve_seconds', 30)
    if isinstance(reserve, bool) or not isinstance(reserve, (int, float)) or not math.isfinite(reserve) or reserve < 30:
        raise ValueError('GPU reserve must be finite and at least 30 quota units')
    minimum = value.get('minimum_stage_seconds', 120)
    if isinstance(minimum, bool) or not isinstance(minimum, (int, float)) or not math.isfinite(minimum) or minimum <= 0:
        raise ValueError('Minimum GPU stage must be finite and positive')
    return {**value, 'reserve_seconds': reserve}


def amount(value, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
        raise RuntimeError('quota: cannot verify ' + label)
    return float(value)


class TimeBudget:
    def __init__(self, available, reserve, journal):
        available = amount(available, 'included allowance')
        self.path = Path(journal)
        self.data = {'version': 1, 'started_at': datetime.now(timezone.utc).isoformat(),
                     'included_at_start': available, 'reserve_seconds': reserve,
                     'limit_seconds': max(0, available - reserve), 'spent_seconds': 0,
                     'route': 'hf-included', 'paid_route': False, 'entries': []}
        if self.path.exists():
            saved = json.loads(self.path.read_text())
            # Re-entry in the same run cannot grant a new allowance or replay an uncertain call.
            if any(e.get('status') in ('reserved', 'failed-or-uncertain') for e in saved['entries']):
                raise RuntimeError('quota: unresolved prior GPU reservation; reconcile before resuming')
            self.data = saved
        self.save()

    def save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_suffix('.tmp')
        temporary.write_text(json.dumps(self.data, indent=2))
        temporary.replace(self.path)

    def run(self, callback, requested, current, read_after, scene=None):
        requested = amount(requested, 'provider maximum')
        if requested <= 0:
            raise ValueError('Provider maximum must be positive')
        current = amount(current, 'current included allowance')
        remaining = self.data['limit_seconds'] - self.data['spent_seconds']
        if requested > remaining or current < requested + self.data['reserve_seconds']:
            raise RuntimeError(f'quota: verified time budget cannot cover provider maximum {requested:g}s '
                               f'plus reserve; run remaining={remaining:g}s, account remaining={current:g}s')
        entry = {'scene': scene, 'maximum_seconds': requested, 'before': current,
                 'charged_bound': requested, 'status': 'reserved'}
        self.data['entries'].append(entry)
        self.data['spent_seconds'] += requested
        self.save()  # Reserve BEFORE the remote call, including uncertain failures.
        started = time.monotonic()
        try:
            result = callback()
        except BaseException:
            entry['status'] = 'failed-or-uncertain'
            raise
        else:
            entry['status'] = 'completed'
            try:
                after = amount(read_after(), 'allowance after generation')
                entry['after'] = after
                if 0 <= after < current:
                    # Other consumers may inflate this debit; that remains conservative.
                    debit = current - after
                    self.data['spent_seconds'] += debit - requested
                    entry['charged_bound'] = debit
                # A reset/increase or unchanged reading cannot prove consumption: keep full reserve.
            except Exception:
                entry['settlement'] = 'unverified; retained provider maximum'
            return result
        finally:
            entry['wall_seconds'] = round(time.monotonic() - started, 3)
            self.save()


def journal_path():
    run = os.getenv('GITHUB_RUN_ID', 'local')
    attempt = os.getenv('GITHUB_RUN_ATTEMPT', '1')
    if not all(part.replace('-', '').isalnum() for part in (run, attempt)):
        raise ValueError('Invalid run identity')
    return Path('renders/cinematic-series-cache/budgets') / f'{run}-{attempt}.json'
