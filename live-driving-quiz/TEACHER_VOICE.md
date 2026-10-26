# Private teacher speech, text corrections and voice copy

The owner panel identifies the current or queued 30-question lesson and teaching note. Practice plays question/custom Persian text in the private panel without TikTok, the public screen or a LIVE connection. Text edits persist as owner overrides keyed by question ID; German source text, source question bank and answer keys remain unchanged. Reset restores the original Persian question. A recording is matched to its question text by SHA-256, so editing that text prevents an outdated recording from playing for it.

## Record the sentence directly beneath its text

Read the visible sentence using the microphone, finish, listen locally, then save. Capture is bounded to 60 seconds; surrounding silence is trimmed with padding. The exact owner recording plays for that question in practice and the live screen. A short-word recorder remains separate, bounded to five seconds. Recordings require explicit capture and save; there is no spoken acknowledgement.

Optional pacing adaptation compares the recorded sentence length with locally synthesized speech for the same text and adjusts future Persian pacing within 1.05–1.6. It does not infer a viewer's emotions or train a new language model.

## Approximate owner voice on new sentences

A clear owner recording of 5–60 seconds can serve as a private reference. OpenVoice V2 performs CPU-only tone conversion on the existing Persian speech output. Initial reference creation leaves conversion disabled; the owner can hear a newly generated example and enable conversion for new sentences and LIVE. Updating an existing reference retains the owner's enabled/disabled setting. Exact question recordings bypass conversion and preserve the original expression. Native German recordings and prebuilt welcomes/introduction remain unchanged.

This is approximate voice copying, not guaranteed identical expression, pronunciation or emotional behaviour. The owner's portrait remains a still image; this feature does not create live facial lip sync. The existing prerecorded introduction contains real facial movement.

Model: myshell-ai/OpenVoiceV2@f36e7edfe1684461a8343844af60babc2efbb727, converter checkpoint SHA-256 9652c27e92b6b2a91632590ac9962ef7ae2b712e5c5b7f4c34ec55ee2b37ab9e. Source: https://github.com/myshell-ai/OpenVoice, revision 74a1d147b17a8c3092dd5430504bd83ef6c7eb23, MIT. The build downloads and checksum-verifies source and weights and retains its LICENSE. PyTorch 2.6.0 CPU wheels only; no CUDA, paid inference API or GPU hardware is requested. Runtime does not download models. Model-generated watermarks are disabled through the library's supported no-watermark path, avoiding an additional network model; the UI describes generated examples as copied speech.

Private references remain WAV/PCM, never uploaded Python/Torch objects. Speaker embeddings are kept only in worker memory. Conversion is serialized, bounded by timeout, cached and released after idle. When enabled conversion fails, an explicit error is returned; no paid or undisclosed voice fallback is used.

## Private persistence

Samples are validated, integrity-checked 22050 Hz mono PCM, at most 60 seconds. Original samples are cached outside public assets and stored as base64 in small JSON files in the existing private HF Dataset. JSON uses the ordinary Git commit protocol; raw WAV paths normally require LFS. Reads remain compatible with legacy WAV files. Remote reads are bounded and verified after decoding. Raw audio is never committed to GitHub or sent to an external inference API. Deleting a mapping does not erase Dataset history. A synthetic-only workflow test verifies upload and cold-cache reload without altering owner rules or question progress.

## Guest audio and recognition

The event connector supplies TikTok comments/likes/gifts, not guest sound. Explicitly share a tab including audio, or route guest/LIVE Studio sound into a virtual microphone. There is no silent fallback to a different source. The owner must permit capture and can stop it.

Edge/Chrome SpeechRecognition is not used. WebAudio captures bounded commands with 300 ms pre-roll, 750 ms trailing silence and a five-second cap. Authenticated clips are transcribed in memory on CPU by faster-whisper 1.2.1/PyAV 16.1.0, multilingual small model Systran/faster-whisper-small@536b0662742c02347bc0e980a01041f333bce120. These command clips/transcripts are not persisted. Stopping discards late responses. Only enumerated teacher commands execute; identity is not verified, so use the input only for the owner's teaching segment and use headphones. Recognition can be imperfect; text and explicit recording are available.

/live-demo stays isolated from real lesson progress and simulates its gifts.
