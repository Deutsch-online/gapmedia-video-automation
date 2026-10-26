# Private teacher controls

Open the private owner control panel, then **درس نوبت و مدرس**. The next lesson is a separate, ordered 30-question queue. Enable Persian and the assistant independently. At the end, explicitly repeat the same lesson or select the next lesson; no automatic repeat is introduced.

## Guest audio

The TikTok event connector supplies comments, likes and gifts, not a guest's audio. The owner can explicitly share a TikTok browser tab **including its audio** through the panel, or route LIVE Studio/guest audio into the browser's default microphone using a virtual audio input. Tab-track speech recognition requires a browser supporting `SpeechRecognition.start(audioTrack)`; older browsers may not support it. Test the input before using it in a lesson. No live guest audio has been verified until the owner performs that test. Neither this feature nor the connector joins a TikTok guest seat automatically.

Microphone/tab sharing starts only after the owner clicks its button. Stop sharing releases all tracks. Recognition uses the browser's speech service when available, with `fa-AF`; there is no paid API fallback. The input does not verify a speaker's identity: enable it only for the owner's teaching segment. Only the enumerated lesson actions are accepted, never shell commands or arbitrary code.

## Silent pronunciation correction

Say `این کلمه را اینطور تلفظ کن`, pause, then say only the corrected word. The command arms a 30-second private server window. Specify the written target in the panel if recognition is uncertain. A separate record/stop workflow provides the reliable fallback: enter the target, record only that word, stop to save. No spoken acknowledgement is enqueued.

Authenticated PCM uploads are mono 22050 Hz, 16-bit, 0.15–5 seconds, at most 240 kB, with silence and integrity validation. Original samples are cached outside public assets and stored in the existing private HF session Dataset. They are not committed to GitHub or sent to an external inference API. SHA-256 metadata is persisted with the owner's profile. Deleting a correction removes its active mapping; historical private Dataset commits are not erased.

Future Persian assistant/question speech splices the teacher's actual word recording into locally generated surrounding speech. This is not complete voice cloning or continuous training. Recorded introductions, prebuilt welcome clips and German recordings are unchanged. Explicitly reread a current question to prepare corrected narration; public audio GET requests cannot trigger synthesis.

Private style settings store pace, volume and approved greeting/confusion/thanks/winner phrases. The winner template must retain `{names}` and receives only genuine winners. These are explicit preferences and examples, not inferred personality or emotional model training. The connected project's API credentials are not automatically copied to this app or billed by this feature.

## LIVE demo

`/live-demo` provides an isolated mobile preview with previous/next/repeat, pause/resume, answer reveal, image zoom, image/video height and demo gifts. Pause preserves the demo's question/video timeline. Demo messages are accepted only from the same-origin parent window and never invoke owner endpoints or alter real session progress. Real screen controls remain owner-token protected.
