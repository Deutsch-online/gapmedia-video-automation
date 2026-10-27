# Live Crown — interactive motion and fun mode

- Portrait broadcast: logical 540 × 960, displayed at 1080 × 1920 or scaled to the control preview.
- Game: no separate participant/result row. Each opened result remains in the original numbered cell with its owner photo. Admission requires the configurable gift minimum (100 coins by default). Private manual approval remains available to the host.
- Profile admission: six different finite entrance families, with per-card depth, rotation and duration variants.
- Gift-card reveal: a deterministic, seekable 5-second choreography, then the real gift artwork and owner badge for the configurable hold duration (10 seconds by default). Each of 52 cards has a unique seeded path. The result stays open with its owner's photo.
- Hidden values remix every 20 seconds during play. Chosen prizes and revealed results stay unchanged. The private control preview can inspect current hidden values without revealing them publicly.
- Prize catalog: five ten-card groups with repeated gifts within every group, plus small and medium extras. Lion, Galaxy and TikTok Universe are included. A tie advances only tied players; exactly one final winner is marked after all choices finish.
- New LIVE arrivals: queued avatar/name bubbles directly below the active board, five seconds by default, configurable from one to thirty seconds.
- Fun: opt-in automatic numbered arrival cards, or number-only comments. A new automatic card waits five seconds with only its number blinking. No public comment invitation is shown. Unanswered cards disappear. A confirmed profile stays sixty seconds from its number comment.
- Fun: 52 white numbered cards and twelve selectable portrait treatments, plus mixed rotation. Fun portrait pixels: local editorial CMYK halftone with fixed 15/75/0/45 degree screens, ink crosshatch, or a fantasy poster treatment. Public portrait CDN requests use a bounded, host-allowlisted image proxy. No paid inference is used.
- Audio: 120 BPM electronic game music, tonal card flick / shuffle / reveal / return cues. Microphone analysis stays in the browser; only voice-active booleans are relayed. Voice lowers the music bus to 12% and effects to 45%, with a three-second server lease to prevent a stuck duck.

Motion references applied: HyperFrames `references/motion.md`, `references/runtimes.md`, and media treatment recipes for Editorial Halftone and Crosshatched Sketch. This is an interactive browser scene, not a rendered HyperFrames movie.

Validation: Node engine checks cover timing, prize secrecy, duplicate prize groups, single-winner settlement, value remix, owned fun comments, five/sixty-second expiry and unique paths. Chromium checks cover independent private/public views, actual portrait shader output, game and fun switching, 10-second result retention, minimum entry gifts, and actual microphone-triggered music ducking. Local test data is separate from the published game.

Update: game-start and manual shuffle use a fast five-second riffle burst; card motion countdowns are hidden. Opening and result display durations are visible in the main control panel.

White standard French-suit deck: 13 ranks in each of four suits, red hearts/diamonds and black spades/clubs, with readable 1–52 entry labels. Arrival bubbles queue beneath the board; below them a two-by-two dashboard shows top/latest gifters and likers. No duplicate participant row.
