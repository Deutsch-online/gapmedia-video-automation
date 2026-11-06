# Interactive quiz narrator (v69)

FA/EN follows the existing saved display/narration language. The screen reads each current question and its four options once per presentation. A real newcomer can receive a varied welcome and an invitation to reason about the question. Encourage attention, curiosity and effort; never infer intelligence from an answer.

Priority: comments > question reading > gift thanks > like thanks > welcome. A new comment interrupts a question/welcome/thanks, but does not interrupt another person's comment response. An interrupted question may restart after the response only if it is still current. Stale speech is discarded. Host microphone ducking, narrator switch, audio mute and volume remain authoritative.

A first accepted correct answer receives warm encouragement and a question about their reasoning. A wrong answer receives reassurance, without announcing the correct option to other contestants. Duplicate/closed answers explain that a new question offers another chance; they do not award points. Greetings, rules, thanks and other comments receive bounded, curated conversational replies. This is not an unrestricted AI chat service and does not claim to understand arbitrary comments. Raw comment text is never spoken or sent to ElevenLabs; only approved generated replies and sanitized names are sent.

Real likes receive a short thank-you at the start of activity, coalesced to once per person per30seconds; gifts once per person per15seconds and only after finalized, deduplicated receipts. Comment speech is coalesced per person per6seconds. Queue capacity24; expired replies are dropped rather than replayed late. No solicitations for gifts/likes/follows, no purchases or paid entry, no prizes. Private/test events never generate LIVE thanks or greetings. Existing scores/lifetimes and the221-question one-hour repeat protection are unchanged.

Seven private test buttons cover question reading, correct answer, wrong answer, comment greeting, like thanks, gift thanks, and newcomer invitation in either language. They return signed audio to the requesting administrator only and do not modify LIVE scores, users, round, mode or language.

Use existing female ElevenLabs voice and FA/EN models, signed endpoints and cached clips. Existing5000-character daily runtime allowance remains; no plan upgrade or increased credit cap. Browser voice fallback remains available when the selected language has an installed voice. Audio requires an enabled/unlocked browser source. TikTok receipt is still dependent on the connected live bridge; narration cannot invent missing events or remove an account restriction.

Validated locally with test-quiz-narrator69.mjs, test-narrator69-server.mjs (mock provider), narrator69-ui.mjs (12 private FA/EN playback routes); no production test interactions injected.
