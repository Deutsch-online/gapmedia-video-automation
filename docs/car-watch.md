# Family car watch
Runs at minutes 7 and 37 each hour (GitHub Actions may delay scheduled jobs).
Uses the existing TELEGRAM_BOT_TOKEN and private destination from
TELEGRAM_REVIEW_CHAT_ID or the previously learned .telegram-bot-chat.json.
Never falls back to sending to a channel: getChat must confirm private.

Hard gates: EUR6500 full advertised price, 170000 km, 110–140 PS,
Kombi, known chain-driven engine variant, petrol without turbo or diesel
with a green-sticker claim, stated HU through2027 or later, and OSRM road
route no more than160km from Burg town centre to the seller street address.
The owner's exact home address is not known; this is explicitly a town-centre
origin. All seller claims remain unverified until documents/inspection.

This is a conservative structured-data search, not exhaustive marketplace
coverage. Only direct ads with readable Car/Vehicle JSON-LD are processed.
Blocked, redirected, ambiguous, missing-address or missing-HU ads are skipped.
Exa searches five regional groups; coverage/failure reasons are uploaded as
an artifact. An unavailable search is a failed run, not a no-match claim.
The initial supported engine list covers Avensis1.8, Auris Hybrid and
i30/Ceed1.6 variants; Opel/Ford/VW are not guessed to be chain-driven.

Only new or changed candidates are sent. Delivery success is checked before
recording the fingerprint. Fingerprints are cached; cache eviction can cause
a repeat. No seller is contacted and no offer or purchase is made.
Fuel and insurance are labelled illustrations. Tax requires registration
documents and remains unknown in the automated message.

Manual run: Actions > Family car search to private Telegram > Run workflow.
Tests: node --test scripts/test-car-watch.mjs
