# One-off German faceless video

Owner request, 2026-10-31: use the configured `ELEVEN_API_KEY`, German speech,
no single-person image, and a one-minute video. This request supersedes the
45-second/3D actor format for this standalone deliverable; it does not rewrite
the completed series or its delivery history.

The illustrated housing-payment near miss uses eight 7.5-second motion scenes,
1080×1920 at 30 fps. It contains no human image, face/voice clone, real listing,
payment, booking or report. German narration is synthesized by ElevenLabs;
German/Persian captions and original local graphics are rendered on CPU.
The chosen premade Lily voice has a verified German locale for multilingual v2.

The implementation caps this production at 1,600 submitted text characters,
checks included capacity before every speech request, and does not buy credit
or permit overage. The author's full script is below this cap. A submitted
request with an uncertain response is not blindly repeated. Completed audio is
saved and bound to the exact script, settings and bytes so render retries do
not submit duplicate speech requests. Natural narration longer than a scene is
rejected; words are never cropped or audio stretched. The key is read only from
the runner environment and is never written to a file or printed.

No GPU, Telegram message or public social post is requested. The final MP4 and
quality evidence are retained as an artifact for review.

Sources read:

- https://www.polizei-beratung.de/aktuelles/detailansicht/vorsicht-vor-betrug-bei-der-wohnungssuche/
- https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps
- https://elevenlabs.io/docs/api-reference/voices/search

Run `node ai-cast/eleven-faceless-voice.mjs`, then
`python ai-cast/eleven-faceless-render.py`. `--contact-only` generates no speech.
