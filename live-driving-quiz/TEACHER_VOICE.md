# Private practice and local recognition

The owner panel identifies the current or queued 30-question lesson and teaching note. The pronunciation practice section plays question/custom Persian text directly in the private panel without TikTok, the public screen or a LIVE connection. Playback uses a separate CPU speech worker. Recorded corrections apply to the next preview. Stop discards pending playback.

## Input and recognition

TikTok events do not include guest audio. Explicitly share a TikTok tab including sound, or route guest/LIVE Studio sound into a virtual microphone. Capture requires the owner's browser permission. There is no silent fallback to a different input.

Edge/Chrome SpeechRecognition is no longer used. WebAudio captures bounded utterances with 300 ms pre-roll, 750 ms trailing silence and a five-second cap. Authenticated PCM is processed only on the existing free CPU host by faster-whisper 1.2.1 and PyAV 16.1.0. Multilingual small model revision: Systran/faster-whisper-small@536b0662742c02347bc0e980a01041f333bce120, MIT. Model files are downloaded during the image build; runtime uses local_files_only. No inference API, GPU or paid fallback is used. Raw command audio and transcripts stay in memory and are not persisted.

One transcription runs at a time, bounded by timeout; the worker is released after 120 seconds idle. Stopping ignores late results. Only explicit whitelisted lesson commands execute. The input does not verify speaker identity: enable it only for the owner's segment and use headphones. Persian/Dari recognition may be imperfect; typed commands and explicit recording remain available.

## Silent correction

Say «این کلمه را اینطور تلفظ کن», pause, then say only the corrected word. Specify its written form in the panel if uncertain. Alternatively enter the word, record its pronunciation and stop to save. No spoken acknowledgement is enqueued.

Correction samples are 22050 Hz mono 16-bit PCM, 0.15–5 seconds and at most 240 kB, validated and SHA-256 checked. They are stored in the existing private HF Dataset and cached outside public assets; never published to GitHub or sent to an external inference API. Deleting a mapping does not erase private Dataset history.

Future Persian speech splices the owner's recorded word into local speech. This is not full voice cloning, continuous emotional training or live facial lip sync. The portrait is a still image; only the recorded introduction has actual facial motion. German recordings, prebuilt welcomes and the recorded introduction are unchanged. Style settings are explicit preferences; winner templates retain real {names}.

/live-demo is an independent mobile preview. Its controls and simulated gifts never invoke owner actions or alter real lesson progress.
