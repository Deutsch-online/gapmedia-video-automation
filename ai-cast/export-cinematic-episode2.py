
"""Deliver two platform exports of the already approved episode 2; no GPU calls."""
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('series', Path(__file__).with_name('cinematic-series.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
state = m.load_json(m.STATE)
date = '2026-10-16'
delivery = state['deliveries'].get(date, {})
if delivery.get('episode') != 2:
    raise RuntimeError('Approved episode 2 delivery is required')
if all(p in delivery.get('platforms', {}) for p in m.PLATFORM_PROFILES):
    print('Both platform exports are already delivered')
    raise SystemExit(0)
pending = state.get('pending')
if pending and not (pending.get('backfill') and pending.get('plan', {}).get('episode') == 2):
    raise RuntimeError('Another episode is pending; do not overwrite it')
if not pending:
    plan = next(h for h in state['history'] if h['episode'] == 2)
    state['pending'] = {'plan': plan, 'date': date, 'status': 'exporting', 'backfill': True}
    m.checkpoint(state)
master = Path('renders/cinematic-series/e0002/e0002-cinematic-fa-de.mp4')
receipts = m.deliver_platforms(state, master)
delivery['platforms'] = receipts
state['pending'] = None
m.checkpoint(state)
print('Episode 2 platform deliveries confirmed: ' + str(receipts), flush=True)
