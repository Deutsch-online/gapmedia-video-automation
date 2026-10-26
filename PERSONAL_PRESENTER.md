# Personal voice and presenter: local preview pipeline

The owner supplied a 48.34-second recording on 2026-10-26 and authorised cloning their own voice. The actual original recording is not in this repository. Raw recordings, cropped references, speaker embeddings, intermediate coefficients and generated personal samples must not be committed or printed in logs.

The private local test uses OpenVoice V2 tone conversion of the existing Piper narration. This preserves the spoken wording and timing; it does not train a new Dari language model or guarantee an exact voice match. A 13.398-second sample was generated on two CPU threads. Objective speaker-embedding similarity increased, but that is not proof of perceptual identity or pronunciation quality. Listen before selecting it for production.

Code: `myshell-ai/OpenVoice` at `74a1d147b17a8c3092dd5430504bd83ef6c7eb23`; pretrained converter: `myshell-ai/OpenVoiceV2` at `f36e7edfe1684461a8343844af60babc2efbb727`. OpenVoice code and V2 models are MIT licensed. The local script checks the converter and configuration SHA-256 digests.

```bash
python scripts/fahrfit-personal-voice.py --reference /private/owner.m4a --source /private/exact-spoken.wav --output /private/converted.wav --openvoice-root /models/OpenVoice --model-dir /models/openvoice-converter
```

A separate local SadTalker preview drives the portrait from that exact audio. It generates facial motion rather than playing an unrelated speaking loop. It is **offline preprocessing**, not a realtime video assistant on the two-core free host. The website portrait stays static until an appropriate verified clip is deliberately integrated; these scripts do not change the live assistant's voice or claim full live lip sync.

Source: `OpenTalker/SadTalker` at `cd4c0465ae0b54a6f85af57f5c65fec9fe23e7f8`; checkpoints: `vinthony/SadTalker-V002rc` at `df6f230f2fbec618d69e47229ea32dd224fc9c5c`. Retain the upstream Apache 2.0 and third-party notices. Use `SadTalker_V0.0.2_256.safetensors` and `mapping_00109-model.pth.tar` for this full-image preview. CPU rendering is slow. The launcher releases face/audio preprocessing models before loading the renderer to reduce peak memory; sampling is seeded for reproducibility. No GPU upgrade or paid fallback is performed.

The isolated tested environment uses Python 3.12, torch 2.6.0+cpu, torchaudio 2.6.0+cpu, torchvision 0.21.0+cpu, numpy 1.26.4, opencv-python 4.10.0.84, contourpy 1.3.2 and tifffile 2024.9.20. The additional libraries are librosa, soundfile, scipy, inflect, unidecode, eng_to_ipa, pypinyin, cn2an, jieba, langid, wavmark, imageio, imageio-ffmpeg, scikit-image, kornia, yacs, pyyaml, joblib, facexlib, safetensors and pydub 0.25.1. Keep NumPy and OpenCV pinned when installing dependencies. Set writable `HF_HOME` and `TORCH_HOME` cache directories; never change `HOME` or disable TLS verification.

```bash
python scripts/fahrfit-avatar-cpu.py --sadtalker-root /models/SadTalker --portrait /private/studio.png --audio /private/converted.wav --output-dir /private/avatar-preview
```

Public Hugging Face lip-sync attempts failed with upload HTTP 502 and an upstream GPU duration request of 480 seconds exceeding the allowed maximum. There is no paid fallback. The owner explicitly approved the specified public portrait/synthetic-audio upload and later the cloned-voice sample upload to the named Victor Space. Those permissions do not make raw recordings or embeddings public, and these local scripts do not upload any of them.
