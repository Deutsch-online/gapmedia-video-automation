# Marta und Lukas — daily cinematic German/Persian serial

Owner request, 2026-10-15: preserve the approved cinematic taxi design, make each
new episode at least one minute, continue the story as a serial, and create at
least one episode each day for delivery to the private Telegram bot chat.

The daily build starts at 17:30 Europe/Berlin (CET/CEST automatically). GitHub
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
