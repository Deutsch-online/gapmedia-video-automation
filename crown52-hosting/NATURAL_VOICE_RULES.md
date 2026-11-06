# Natural voice and question atmosphere (v70)

Use the existing female ElevenLabs voice with Eleven v3 in English and the configured Persian model (currently Eleven v3), stability0.5, similarity0.75, speed0.96. Static preview files carry natural_profile70 and regenerate once; runtime URLs carry a voice-profile cache buster so an old clip is not replayed as a new voice test.

No espeak or browser SpeechSynthesis fallback. If natural speech is unavailable (including the unchanged5000-character/day runtime allowance), stop that clip and show a brief notice. Do not substitute a robotic voice or falsely report that the requested voice played. The visual question and game continue.

Ordinary new narration waits for an ongoing sentence to finish. A high-priority comment may interrupt as requested. Browser sound mute, zero volume, host microphone ducking and narrator-off remain respected. Playback uses normal rate/pitch; the provider sets voice pace. The45second watchdog pauses audio before clearing it, preventing an abandoned clip from playing over another one.

Short, conversational feedback replaces long formal praise. Welcome invitations ask about the current question. A new full-width, readable challenge strip offers9 varied prompts per language across early/thinking/next-question phases, and contextual name/encouragement on real comment feedback. It does not reveal the correct option, invent participation or cover faces. Reduced-motion preferences are respected.

Voice quality is subjective; model/codec/playback checks do not prove that every listener will find the voice natural. Private test buttons use the same runtime voice path. Model failures and daily quota are visible; no subscription upgrade or increased daily credit allowance.

## v71: diagnosed quota and reusable natural replies
Read-only production diagnostics found4995/5000characters already used today and low volume0.05. Do not change the owner's volume automatically. Add18 pre-recorded ElevenLabs files (9kinds per language) for encouragement, comment greeting, like/gift thanks, welcome, general question invitation, exact private question example, and round close. They are generated once and reused; runtime allowance is not raised. A signed request over its remaining budget can use an approved kind-matched general clip; X-Voice-Mode: cached-general makes this distinction explicit. No name, amount or answer is invented in a generic clip. Current questions/feedback stay on screen. New personalized reading is limited until the daily allowance renews, visibly noted on the screen. Cached generic invitation must never masquerade as reading the actual question. Private example uses the exact fixed football question.
