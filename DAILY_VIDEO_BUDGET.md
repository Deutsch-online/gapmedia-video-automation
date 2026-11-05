# Daily video production and included GPU time

The existing cinematic production path is the active entry point. It starts at most once per Europe/Berlin calendar day, from 07:30 local time. GitHub checks 05:30 and 06:30 UTC to cover CET/CEST; the durable Berlin-day gate rejects the irrelevant early wakeup or an already-started day. GitHub scheduling can be delayed, so 07:30 is an earliest start, not a minute-level delivery guarantee. Code/config pushes run verification only unless an explicit production request file is changed.

Every admitted GPU call reserves the caller-provided provider maximum (quota units, including hardware multipliers) before execution. A live included-allowance read and a run-wide budget must both admit it, with 30 units left as reserve. For example, an 85-second xlarge request charged at 2x needs a 170-unit reservation, not 85. The existing conservative image and speech maxima remain unchanged. New providers must declare their full charged maximum before being added.

Verified quota decreases settle the reservation; resets, unchanged readings, unavailable reads and uncertain failures retain the full maximum. The original run ceiling never grows after a reset. Reports under renders/cinematic-series-cache/budgets are cached and uploaded. This bounds billed GPU quota, not queue time, CPU export time or total wall-clock time. No real model call or Telegram message is made by the tests.

The active mode never falls through to anonymous allowance, old credit approvals or paid credits. When a stage no longer fits, the production stops, preserves completed assets and resumes the same pending episode in the next eligible daily slot after the provider's reset. A daily slot is a bounded attempt; a complete video cannot be guaranteed when included quota is insufficient. No quality gate or audio/video duration is relaxed to fill the schedule.

Configuration: .cinematic-series.json. Entry: .github/workflows/cinematic-series.yml. Tests cover winter/summer offsets, repeated/manual starts, quota recovery, uncertain sends, per-call admission, run-wide limits, quota reset and failed settlement.
