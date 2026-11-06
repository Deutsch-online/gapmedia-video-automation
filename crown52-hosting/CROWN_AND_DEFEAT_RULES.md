# User-confirmed seat/crown/scoring and defeat effects (v76)

Clarifications received from the owner:100points qualifies for a seat,200likes earns silver. Gift thresholds mean total coin value, not number of gifts. Keep the existing quiz (correct10, incorrect0),6minute timer and real activity pipeline.

For new gift events:1coin=100points, so one1coinRose equals100likes (one like=one point). Preserve actual coins in metadata/archive and do not rewrite past scores. Automatic live seats require>=100chart points. Manual host placement remains explicit. Round results still use the existing highest round score; seat eligibility is a separate live-placement rule.

Earned crowns, active real participants only, highest applicable tier:
- Likes:200silver,1000gold,2000ice-dragon.
- Coins:10silver,100gold,500ice-dragon.
- A100point seat by itself has no crown.
- No automatic gold crown on rank1 or illustrative empty seats.
- Crown styling: reflective silver, warm gold, icy blue with snowflake and wing/horn decoration. Use actual accumulated LIVE activity, not profile-page follower/like counts. Frozen/inactive profiles lose the visible earned crown until activity resumes.

Keep continuous short, genuine-activity battle bursts from v75. Target patterns vary between the leader and nearby rivals, allowing rank2 to defend itself too. On losing rank or a previously positive POWER bar reaching zero, display a local energy explosion and briefly shrink the struck portrait; retain real points, picture and the chance to return. Takeover banners now distinguish a seat without crown from an earned crown, and cannot announce a seat below100points.

On actual expiry/removal, clone only that portrait into a short smoke ghost before the real node leaves; remove the ghost after1.6seconds. Apply to podium and lower bubbles. Moving from lower bubbles into a seat is not expiry and must not trigger smoke. No whole-screen blur or effect on other faces. Reduced-motion bypasses the smoke/particle animation.

Private controls include attack/defence/takeover, expiry smoke,1Rosevs100likes scoring examples and a crown-tier preview. They do not mutate LIVE state or consume voice credits. Natural speech settings, no-robot fallback, one-hour question history, muted music preference and saved timer remain unchanged.

Validated: exact thresholds and first-Rose score;100seat without crown; actual coins unchanged; no test/showcase crown; attack/reflection/defeat burst/expiry in normal and reduced-motion; actual lower-bubble expiry and promotion guard; crown removal on freeze; quiz/narrator regression checks.
