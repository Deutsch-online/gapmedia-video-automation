# Optional Venice fallback

Base URL: https://api.venice.ai/api/v1 . Store an existing key only as the Worker
Secret `VENICE_API_KEY`, not in repository vars, GitHub plaintext or chat. Merely
saving the base URL does not configure an API credential. `/venice` reports safe
readiness metadata without key values or monetary balances.

Workers AI remains primary. On a real primary exception, the optional adapter
reads the live Venice model catalog and authenticated `/api_keys/rate_limits`.
It permits a text model only when all advertised USD token rates (including
cache rates) are explicitly zero, or the account explicitly reports a `free`
tier with `isCharged: false`, permitted access, all balances zero, and positive
model-specific limits. Unknown account state fails closed. Gift USD, bundled
credits and DIEM are never proof of free access. A free-tier account that fails
this strict proof is skipped until its terms can be verified; no trial inference
is used to discover pricing. No purchasing, staking or auto top-up is performed.

At most three eligible chat candidates are used within one synchronous bot
request to bound latency. Outputs return through existing intent, owner, quality
and credit gates. Provider prose is not executable code. There is no change to
video/GPU rendering or its credits. Private history is sent only as the selected
chat context that the existing assistant call would receive, not as an archive.

The metadata-only workflow `check-venice.yml` verifies readiness after deployment;
it never calls `/chat/completions`. Published prices: https://docs.venice.ai/overview/pricing .
Account limits: https://docs.venice.ai/api-reference/endpoint/api_keys/rate_limits .
