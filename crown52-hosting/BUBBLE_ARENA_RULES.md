# Bubble studio — version 64

Display: three podium portraits and twelve lower bubbles, maximum fifteen visible participants; additional viewers enter the existing waiting queue. Lower bubbles show only a portrait and numeric score in a separate bottom rim inside the bubble; names and extra text are hidden. The image ends above the score so numbers do not cover the face. Rank 1 uses gold, rank 2 silver-blue, rank 3 violet-bronze. Motion honours reduced-motion preferences.

Latest owner scoring instruction: each received like = 1 point; each received gift coin = 1 point; correct quiz answer = 10 points. These are actual events, deduplicated and finalised before credit. Entry remains free and no monetary, gift or redemption prizes are offered. No spoken or written requests to send gifts, like or follow were reinstated. This update is not a guarantee of TikTok approval; the platform's exact warning and current monetization rules remain relevant.

Bubble diameter and light intensity follow relative real points. On an overtake, a brief contact animation makes the rival recoil visually. No points are stolen or deducted. Ranking and real points remain authoritative. Like count and gift-coin count are separate below the bubble. Incoming like flashes do not cover the face.

The original round duration and start/pause controls remain. A new free question appears every30 seconds within the round. Each viewer has one answer per question; repeated messages do not buy extra quiz points. Gift and like receipt identifiers remain deduplicated.

Private test: sample bubbles, test growth/contact, and test new leader. Fictional scores are labelled SAMPLE and never enter the live server.

## Evidence and root-cause limits

- Historical bridge failures were upstream signature rate limits, independent of Studio broadcasting. Current read-only checks reported familydramaaf connected but zero received comment/like/gift counters. Connected transport alone does not prove events are flowing or that the username is the current broadcaster. No reconnect loop or quota bypass is added.
- The host panel now separates connected-with-no-confirmed-events from real event receipt and shows latest receipt time/count. Confirm using a free comment from another real viewer; test controls do not count as that proof.
- A wrong answer earns0, and a duplicate earns no additional quiz score. These are now explained in the panel event status rather than appearing as a silent failure.
- Previous lower card counts made portraits too small; the fifteen-person view gives each portrait more space and keeps overflow queued.
- One unchanged question for an entire multi-minute round was repetitive. Questions now advance every30 seconds, with a countdown and one-answer rule.
- No retention, conversion or audience-growth outcome has been measured. Success should be assessed from actual received events, returning viewers and the platform's LIVE analytics, not invented activity.
