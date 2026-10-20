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

## Two platform exports (owner request, 2026-10-16)

Each completed story produces separate TikTok and Instagram Reels MP4 exports: both 60 seconds, 1080x1920, 30 fps, H.264 High / AAC. TikTok targets 4.5 Mbps, Reels 3.5 Mbps, each below the private bot upload budget. German/Persian embedded subtitles remain; German captions identify the platform and contain relevant hashtags. Both files go to the private Telegram bot chat. Each confirmed platform message ID is checkpointed before the next upload; unresolved uploads stop automatic replay. An episode advances only after both receipts. Episode 2 receives these two exports as a one-time addition to its already delivered master.

## New cartoon comedy season (owner selection, 2026-10-16)

Starting with episode 3, the active series is **Marta & Lukas: WG-Chaos**. The two speaking characters are redesigned as young adult flatmates in Berlin, with exaggerated expressive 3D cartoon faces and clear silhouettes. Their generated portrait reference is `public/ai-cast/wg-chaos/characters.png`; it replaces the elderly/taxi reference for new production. Earlier delivered episodes remain in history.

`ai-cast/comedy-pilot.json` is episode 3: **Der Chef vom Staubsauger**. A proud flatmate's robot vacuum steals a sock and slipper; he must chase it, and his supposedly manual broom then rides away on it. Thirteen unique animated actions build a complete visual joke. Later stories use only this comedy season's memory, a surprising opening visual, escalating everyday misunderstandings and a final visual punchline. The validator requires concrete hook/setup/payoff fields and rejects legacy taxi assets. No view-count guarantees are made.

This is configured for the next daily episode, not a resend of today's already delivered episode 2. All sixty-second, two-platform, private delivery, language and GPU safeguards still apply.

## Caption design v2

The black rail is removed. Two rounded translucent cream cards separate German and Persian, with teal/coral accents. German uses bold DejaVu Sans up to 64 px (three-line fallback 60 px); Persian uses bold Noto Naskh Arabic up to 92 px. Whole-word line breaks are measured with the actual fonts; long captions stay readable instead of being clipped. This layout was rasterized and visually checked on the new portrait and fitted against all thirteen pilot lines. A revised short preview reuses cached animated scenes and gets separate receipts, leaving the original preview intact.

## Everyday-life direction supersedes comedy (owner correction, 2026-10-16)

The active season is now **Marta & Lukas: Alltag in Deutschland**, version `wg-alltag-v1`. 3D cartoon visuals and established character references stay, but invented slapstick, fantasy devices and mandatory punchlines are removed from production prompts and validation. Episode 3 is `ai-cast/everyday-pilot.json`: **Einkaufen ohne Einkaufstasche**, a natural supermarket conversation about a forgotten reusable bag, buying essentials, arranging fragile eggs and sharing the carrying.

Later episodes follow familiar daily activities with credible actions and natural dialogue. History is filtered to this active direction, so the vacuum gag is not continued. Required story fields are `visual_hook`, `everyday_problem`, `practical_resolution`, and `content_basis: everyday-reenactment`. These are illustrative reenactments; neither captions nor narration may falsely claim a documented true event or invent named sources. A supplied real personal account can be adapted when one is provided. Previously sent comedy previews remain historical samples, not the active daily story.

## Audio-conditioned speaking takes

`ai-cast/cinematic_speech.py` supplies the exact aligned five-second German WAV to LongCat-Video-Avatar and to the final mix. One 120 ms leading delay is baked into that WAV; the mux does not add another delay. Speaking clips keep their native speed, with no per-shot time stretching. Single-speaker stills keep the listener off-camera to avoid ambiguous two-face speech. Audio/image/model signatures invalidate generic cached clips. A failed speech provider stops production rather than silently using Wan motion. Delivery requires `audio_conditioned_lips` and `no_slow_motion` quality evidence; these describe how the take was generated, not a claim of perfect phoneme accuracy. The three-shot everyday grocery preview uses a fresh receipt ledger.

## Cheerful instrumental in pauses only

`ai-cast/cinematic_music.py` uses the project's existing instrumental `public/music/kitchen-2.mp3` at -23 LUFS. Speech is detected from the unmixed voice track; gaps shorter than 700 ms are kept inside the utterance. The full utterance gets 150 ms leading and 250 ms trailing protection. Only remaining gaps of at least 650 ms receive music, with 120 ms fades. The actual gated PCM music stem is checked for zero nonzero samples inside protected speech intervals. The voice keeps its level and timing, and the video stream is copied. Per-file JSON reports record the intervals and checks. The accepted single-speaker preview is reused to demonstrate this change without GPU inference.

## Requested complete episode 3

The owner requested the full sixty-second version after accepting the single-speaker lip-sync preview and pause-only music. Episode 3, **Vor dem Einkauf**, is a natural grocery-list conversation at the supermarket entrance. The manual request `full-episode3-approved-style` authorizes one additional episode without overwriting episode 2's existing delivery. Delivery/attempt keys for this request include the Berlin day and request ID; completion advances to episode 4, so the request cannot replay. Unknown uploads and bounded GPU retries still block duplication. If delivery crosses midnight it also fulfils the new calendar day's slot when that day has no delivery yet.

Single-speaker takes use the approved individual portraits directly to avoid introducing a second speaking face. The two unchanged, approved preview shots may be adopted from cache, but image/audio/motion signatures must still match. Cache v2 restores partial full-episode work first, then approved preview work. Duration remains exactly sixty seconds and both platform receipts are required.


### نمایش موضوع گفتگو — اصلاح صاحب پروژه، ۲۰۲۶-۱۰-۱۷

از قسمت چهارم، گفتگو تنها به پرترهٔ گوینده محدود نمی‌شود. هر صحنه یک تا سه شیء واقعیِ همان موقعیت را در `visible_objects` و کنش ملموس مرتبط را در `object_action` مشخص می‌کند. اجناس مورد بحث باید در پیش‌زمینه و قابل تشخیص باشند و شخصیت آن‌ها را نشان دهد، بردارد، مقایسه کند یا جابه‌جا کند. اشیای غایب نباید حاضر نشان داده شوند؛ متن و مکان باید با موجود بودن آن‌ها سازگار باشد. تصویر هر صحنه از مرجع تک‌گوینده با ترکیب و پس‌زمینهٔ متناسب ساخته می‌شود، نه کپی ثابت مرجع. فقط یک چهرهٔ گوینده دیده می‌شود؛ لب‌خوانی شرطی به همان صوت، ۶۰ ثانیه، زیرنویس و دو خروجی حفظ می‌شوند. اثرانگشت صحنه و حالت ساخت تصویر مانع استفادهٔ کش پرترهٔ قدیمی می‌شود. وجود فیلدها تأیید بصریِ خروجی نیست؛ نتیجهٔ رندر باید از نظر دیده‌شدن اشیا بررسی شود.


## 2026-10-20 direction (episode 7 onward)

The bot's display name is **ویدیو آلمانی**. Private text is a conversation; explicit commands remain available through `/help`, `/chat`, `/status`, `/episode`, and `/credit`. Future episodes are exactly **65 seconds**: 13 distinct five-second audio-conditioned speaking shots. Neither speech nor lip motion is retimed to meet delivery length. Each platform export is checked separately. Before drafting, the runner retrieves an official Goethe-Institut, Deutsche Bahn, or VBB page, records its URL, excerpt and retrieval time in `episode.json`, and stops if research cannot be verified. The source informs the real-world context; the plot remains an original everyday reenactment, usually comic and occasionally poignant. Paid generation remains disabled without a specific approval.

## Duration correction, 2026-10-20

Every ordinary new episode and both exports are exactly **60 seconds** (12 distinct five-second shots). An explicitly authorized episode number in `.cinematic-series.json` `duration_exceptions` may instead be exactly **65 seconds** (13 shots). The list is empty by default; a model cannot opt itself into the exception. Final media gates reject any other length without retiming speech or lip motion.

## Character-led comedy direction, 2026-10-20

Marta is the adult newcomer protagonist. The first two seconds show her ordinary problem and its physical object; two credible escalations lead to a self-directed choice and a visual payoff. Lukas supports the scene without solving everything for her. Most episodes use warm situational comedy, with occasional poignant stories. The planner now records her goal, decision and payoff, checks that she owns the opening and closing shots, and keeps her in the majority of shots. Medium action, close face-and-object, and reaction framings alternate while the mouth, hands and relevant object stay readable above the caption area. These are creative and structural checks; actual audience views cannot be guaranteed.
