# Resilient story preparation

Fresh official research remains the first requirement. From episode 18, the producer first selects an unused, topic-matched original story from ai-cast/story-bank.json. Selection runs the same validate_plan function used for model output. Story IDs and titles prevent re-use across 45/60-second authored variants; no audio or video is shortened to change duration. The current episode-duration contract still selects the variant. An outstanding specific owner story is never replaced by this queue.

The initial queue covers a doctor phone call, railway direction, recognizing a bus stop, posting a letter and separating a glass jar/lid. These are illustrative everyday reenactments, with short German lines, Persian translations, a coherent location, relevant objects and a practical resolution. They do not invent actual appointments, prices, routes, legal rules or engagement metrics.

The queue is finite. Maintainers can add new original stories with research_urls, authored scene indices per duration and all normal production fields. Every new entry must pass tests/test_cinematic_story_bank.py. Once a matching topic queue is exhausted, the existing verified-free text providers remain eligible; if those also fail, production stops with an explicit error. No paid or weaker-quality fallback is introduced.

Run python ai-cast/cinematic-series.py plan-only --file renders/story-plan-preview.json to validate the next plan without rendering, Telegram delivery or production-counter changes. Live research needs network access. The story-planning-probe workflow runs this path without service credentials and keeps the exact plan as an artifact.

Planning failures are recorded separately. The daily production attempt is durably claimed only after the plan passes validation. Failed text requests no longer consume the one daily GPU-production start. Existing deliveries and cached scenes are never reset by this change.
