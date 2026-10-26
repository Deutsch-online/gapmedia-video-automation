# OmniVoice for Persian lesson speech — 2026-10-26

Repository: https://github.com/k2-fsa/OmniVoice
Reviewed revision: `08be0b4ccbac3e13e374e86fbfead4b4cac343e2` (master).
Model metadata revision: `c5fdb5ccb189668d56333f77ba2629f4cd7535f4`.
Evidence: README, supported-language table, tips, pyproject.toml, inference CLI, model source, device selection, public model metadata and config. No weights downloaded, inference run, owner sample uploaded, runtime installed or paid service activated in this review.

## What is confirmed

- The supported-language table explicitly lists **Persian**, ID `fa`, ISO `fas`, with **366.07 training hours**. The table lists 646 languages in total. This verifies declared Persian coverage, not Persian pronunciation quality.
- No separate Dari/`prs` entry was found in that table. Authentic Afghan vocabulary, pronunciation, ezafe and accent require listening tests; a Persian entry does not certify them.
- Repository code is Apache-2.0. Local inference does not require a hosted API key. CPU is an actual code fallback in `get_best_device`; GPU is not an absolute implementation requirement.
- Auto Voice works without reference audio, but its voice is random. Voice Design accepts attributes, while the README says its training was Chinese/English-only and generalization to other languages can be unstable.
- Explicit pronunciation overrides are documented for English CMU phonemes and Chinese pinyin. Equivalent supported Persian phoneme override syntax was not established. Do not feed English phoneme instructions to Persian and claim this is supported.
- Output is 24 kHz. FahrFit uses validated 22050 Hz mono PCM: an adapter must resample, recompute durations and preserve audio bounds.
- The project already has an older `ai-cast/omnivoice-say.py` CPU helper for German samples. Its presence is not evidence of a current installation, a Persian listening test or use by the LIVE assistant.

## Suitability for our free CPU server

Public HF metadata reports 612,577,288 parameters, almost all F32 (about 2.45 GB of parameter storage alone). Dependencies include PyTorch, torchaudio, transformers >=5.3, accelerate and audio libraries. Runtime memory exceeds bare parameter storage; an end-to-end memory/latency benchmark on our two-CPU/CPU-basic host is still needed. This is substantially heavier than the current Piper worker.

The advertised low RTF and FlashInfer timings are GPU benchmark results (including H100), not CPU-basic latency evidence. The default diffusion pass uses 32 steps; 16 steps is an exposed speed/quality tradeoff, not a validated Persian quality setting. The tips warn that unreferenced 1–2 second speech may be unreliable. It is therefore more promising for pre-rendered complete lesson sentences than immediate short LIVE acknowledgements until measured.

## Owner policy and recommended evaluation

Owner recordings remain pronunciation coaching examples only. Do not use them as OmniVoice cloning references or replace the assistant persona with the owner's voice. A future isolated free-CPU test can use Auto Voice to evaluate intelligibility, and a fixed synthetic assistant reference with known transcript to evaluate consistent identity. Supplying the transcript avoids implicit Whisper reference transcription/download. Voice Design alone is not a verified Persian/Dari solution.

Listen and compare the same short Persian/Dari lesson passages against Piper: موتر باری، دریور، فلش، فاصله، حق تقدم، پاسخ‌های درست، sentence boundaries, numbers, decimal values and mixed German/Persian labels. Record wall time, generated seconds, peak RAM, skipped/repeated words, voice consistency and owner-rated pronunciation. Compare 16 vs 32 steps. Keep the active teacher service independent during the test. If free memory/time is insufficient, report it and keep the existing voice; never request paid hardware or consume credits automatically.

## Decision

Useful candidate for a future **offline Persian TTS comparison**, saved as a source. Current assistant remains unchanged. Persian support is confirmed from documentation; improved quality, authentic Dari, real-time CPU speed and automatic pronunciation learning have not been demonstrated.

Sources:
- https://github.com/k2-fsa/OmniVoice/blob/08be0b4ccbac3e13e374e86fbfead4b4cac343e2/docs/languages.md
- https://github.com/k2-fsa/OmniVoice/blob/08be0b4ccbac3e13e374e86fbfead4b4cac343e2/README.md
- https://github.com/k2-fsa/OmniVoice/blob/08be0b4ccbac3e13e374e86fbfead4b4cac343e2/docs/tips.md
- https://github.com/k2-fsa/OmniVoice/blob/08be0b4ccbac3e13e374e86fbfead4b4cac343e2/pyproject.toml
- https://huggingface.co/k2-fsa/OmniVoice
