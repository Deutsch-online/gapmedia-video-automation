# Marta und Lukas — daily cinematic German/Persian serial

Owner request, 2026-10-15: preserve the approved cinematic taxi design, make each
new episode at least one minute, continue the story as a serial, and create at
least one episode each day for delivery to the private Telegram bot chat.

The daily build starts at 07:30 Europe/Berlin (CET/CEST automatically). GitHub
checks every 15 minutes; queue and rendering time determine actual delivery time.
A first manual build can run immediately and counts as today's episode.

Each episode contains thirteen distinct five-second animated shots, approximately
65 seconds at 1080×1920, native German character voices, and German/Persian
subtitles. The three approved illustrations under `public/ai-cast/cinematic-taxi`
are the character and art references. New scenes use reference-conditioned
cinematic images and genuine Wan image-to-video motion. Flat SVG characters,
static image pans, repeated video loops, silent output and shorter episodes are
not fallback options.

Episode one is authored locally. Later episodes are written by the configured
Gemini/Groq text providers using the full delivered story history and latest
cliffhanger. Missing/invalid translations, repeated stories, missing motion or
narration stop the run. Hugging Face uses the existing free/PRO quota with
`PAID_FALLBACK=off`; no paid video fallback is enabled.

`.cinematic-series-state.json` stores the next episode, approved pending script,
all delivered dates and receipts. It advances only after Telegram confirms a
video. Completed scenes are cached for recovery. At most two attempts are made
per Berlin day; the same unfinished episode continues on the next day. A crash
while sending leaves `dispatching`, which requires receipt reconciliation before
another upload; this avoids blindly duplicating a possibly delivered episode.

The scheduler is `.github/workflows/cinematic-series.yml`. Configuration is
`.cinematic-series.json`. Run tests with:

    python -m unittest discover -s tests -p test_cinematic_series.py -v
    python ai-cast/cinematic-series.py check

The manual workflow's `force` input starts today's episode early but never
replays an already delivered day. A push can do the same only when that push
actually changes `.cinematic-series-request.json`.

Video descriptions and Telegram video captions are German only, with relevant German/English hashtags. Persian text remains in the in-video subtitles and is not included in video metadata.

## Current owner requirements (2026-10-16)

Every delivered video is exactly 60 seconds (minimum = maximum = target). The complete story, speech and embedded subtitles are retimed together by 65/60; no ending is cut. The private delivery helper measures and enforces the duration, including a master from an already running legacy job.

Daily eligibility begins at 00:00 Berlin; GPU reset availability controls continuation rather than a fixed 07:30 start. Quota errors preserve the provider's `Try again in H:MM:SS` message. The next eligible time is that interval plus two minutes; only if absent is a conservative five-hour wait used. Ready work resumes on the next GitHub cron check (minutes 7,22,37,52). GitHub may delay schedules, so reset time is eligibility, never a guaranteed start or delivery time. Completed scenes are cached and retries stay bounded; no paid fallback is enabled.
