# Private pronunciation coaching — assistant voice only

Owner policy updated 2026-10-26: owner recordings are examples for pronunciation rehearsal only. Questions, practice and assistant explanations are generated with the native assistant voice. Raw owner words/sentences are never inserted into lesson audio. Previously enabled owner tone-copy preferences are forcibly disabled on load; enabling tone copy through the old endpoint is rejected. The production image no longer installs OpenVoice/Torch or owner tone-copy model weights. Old helper source remains for historical reference, unused by lesson playback.

## Word rehearsal and its limits

The private **اصلاح تلفظ** menu lists automatically suspected words and lets the owner pronounce the displayed word. Saving a short recording (0.15–5 seconds, 22050 Hz mono PCM) stores it privately as training input. The existing Piper voice then rehearses a bounded set of at most 28 vowel spellings based on the reviewed Persian/Afghan dictionary. Local NumPy MFCC features, cepstral normalization and dynamic time warping compare the assistant candidates with the reference. Equivalent phoneme candidates are deduplicated. Only a spelling/score/method and review flag go to the synthesis rules; owner audio does not.

This is bounded acoustic candidate selection, not fine-tuning model weights or phoneme recognition with guaranteed accuracy. It cannot learn arbitrary missing consonants, every accent, long phrases or emotions. High distance or ambiguous alternatives remain marked for review; the owner can hear the assistant reread a sentence and repeat the correction. Failure to rehearse preserves the private sample and shows it as needing review; it never falls back to playing the owner recording. Explicit written vowel corrections remain available. Corrections apply to newly synthesized matching words across lessons and explanations; Arabic/Persian yeh/kaf and vowel marks are normalized for matching while longer unrelated words are preserved.

Existing word references are migrated in the background during lesson pauses. A result is applied only on a subsequent pause and only if the original reference hash still matches, protecting a newer owner correction. The menu automatically advances to the next unresolved word. Saving or merely reporting a word is not a claim that its phonetics have been verified.

## Sentence reference and offline practice

The owner can edit Persian question text and record a full sentence directly beneath it. The recording remains private and can serve as a pacing example; it is never used for question playback. Optional pace adaptation compares the reference duration with local synthesized speech, bounded to 1.05–1.6. Whole-sentence pronunciation is not automatically transferred from this recording: precise pronunciation rehearsal uses the short-word section. The private local recording preview remains available to review one's own input. Pressing the main lesson/practice playback always generates the assistant voice. Full-sentence references are SHA-256 bound to question text, so editing prevents an old reference being presented as current. The German source and answer keys stay unchanged.

## Automatic pronunciation review

During pauses, a separate CPU Whisper worker compares the current or next queued 30-question lesson's available Persian audio with source text. It checks one available clip at a time, without manual word selection. Existing corrected clips must be staged before they can be inspected. Exact owner sentence references are not treated as lesson output. A clip is bounded to 60 seconds/120 seconds processing; commands remain bounded to five seconds. Unavailable/invalid audio reports a retry state. Audio/text hashes prevent repeating the same check after restart.

Only short interior substitutions in at least 60%-aligned transcripts become suspects. Reviewed Afghan aliases are equivalent. Omissions, cut-off endings and wholesale recognition failure do not become confirmed errors. ASR normalizes words and cannot certify pronunciation/accent. The menu shows suspects and the recognised alternative; no source word or answer key is rewritten by uncertain ASR. Up to 200 corrections and 500 review entries are bounded.

## References and local execution

- Piper Persian Amir: rhasspy/piper-voices@5041a7a49ae5b3a0f30e6837769eb03fdbb231bd, fa_IR-amir-medium. Base accent is Iranian Persian; no guarantee of authentic Dari for uncorrected words.
- Reviewed Afghan vocabulary and speech normalization: `prepare-narration.py` (`fa-dari-mixed-v5`). A font library is not a pronunciation reference.
- Command/audit recognition: faster-whisper 1.2.1, PyAV 16.1.0, multilingual small model Systran/faster-whisper-small@536b0662742c02347bc0e980a01041f333bce120, CPU int8, two threads, local-files-only. Audit has no initial prompt to avoid seeding expected words.

Everything uses existing free CPU runtimes; no paid inference, GPU or external sample upload. Raw word/sentence references are cached outside public assets and stored as bounded base64 JSON files in the existing private HF Dataset. Integrity-checked reads support legacy WAV files. No recording is committed to GitHub. Removing a mapping does not erase Dataset history. Command audio/transcripts remain in memory only. All synthesis rules are spoken text only, including for legacy records containing an audio field.

The TikTok event connector supplies comments/likes/gifts, not guest audio. Explicitly share a tab with audio or use a virtual microphone. Browser permission is required; stopping discards late recognition. Only enumerated teacher commands execute, and identity is not verified. Use headphones. Owner portrait remains static; this does not provide live facial lip sync. Prerecorded intro/welcome audio is unchanged. `/live-demo` remains isolated from real progress.
