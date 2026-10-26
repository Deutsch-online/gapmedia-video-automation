# Ten owner-supplied TTS projects — Persian suitability, 2026-10-26

Evidence: official GitHub repository metadata and current README read for each item. This is a source review, not a listening test, model installation, quality guarantee or endorsement of every promotional benchmark. Repository code licenses do not automatically cover voice datasets or model weights.

| Project | Persian finding | Decision for this assistant |
| --- | --- | --- |
| [Pocket TTS](https://github.com/kyutai-labs/pocket-tts) | Current official language list: English, French, German, Portuguese, Italian, Spanish, Dutch. No Persian. Small October 2026 models are English. | CPU efficiency is useful for supported languages; not a confirmed Persian replacement. |
| [Kokoro](https://github.com/hexgrad/kokoro) | The 82M README lists American/British English, Spanish, French, Hindi, Italian, Japanese, Brazilian Portuguese and Chinese. No Persian language code. | Do not select a female English voice and claim it reads Persian correctly. |
| [Zonos](https://github.com/Zyphra/Zonos) | Official v0.1 languages: English, Japanese, Chinese, French and German. | No verified ready Persian model. CPU is documented as too slow for likely interactive use; GPU recommendation is 6GB+ VRAM. |
| [FireRedTTS3](https://github.com/FireRedTeam/FireRedTTS3) | Its explicit 24-language list does not contain Persian. | Voice design/editing are not evidence of Persian support. Optional LLM text normalization requires separate API credentials; leave it off. |
| [Orpheus TTS](https://github.com/canopyai/Orpheus-TTS) | Main README describes English checkpoints and a multilingual research family; no ready Persian checkpoint established in this review. | A possible fine-tuning research framework, not a verified free Persian voice ready for LIVE. |
| [OuteTTS](https://github.com/edwko/OuteTTS) | CPU/llama.cpp and reusable profiles are documented; only one default English voice is offered in README. Persian checkpoint quality is unverified. | Neither speaker-profile support nor cross-lingual claims prove correct Persian pronunciation. |
| [Parler-TTS](https://github.com/huggingface/parler-tts) | Main Mini/Large checkpoints and controllable speakers are documented; no ready Persian checkpoint verified from README. | Voice description does not add a missing language. CPU fallback exists, with no Persian latency test here. |
| [StyleTTS2](https://github.com/yl4579/StyleTTS2) | Main released models/evaluations are English; non-English training needs a suitable PL-BERT and dataset. | Training/adaptation research only; pretrained-voice terms require separate review. No Persian training run or clone authorized here. |
| [MeloTTS](https://github.com/myshell-ai/MeloTTS) | Listed languages: English, Spanish, French, Chinese, Japanese, Korean. No Persian. | Useful CPU engine for its supported languages, not a confirmed Persian assistant voice. |
| [Soprano](https://github.com/ekwek1/soprano) | README explicitly says English-only and no voice cloning. | Not suitable for this Persian reading task, regardless of speed. |

The independently reviewed [OmniVoice](omnivoice-persian-review-2026-10-26.md) does explicitly list Persian, but Dari quality and CPU-basic latency are not demonstrated. It is a separate offline test candidate; none of these references was installed into the LIVE service.

## Actual female Persian audition

For the owner's immediate request, the existing free Edge neural TTS path was tested with `fa-IR-DilaraNeural`, edge-tts 7.3.1. A fresh neutral Persian sample was generated without an API key or paid service. The GitHub Actions check succeeded in 1.59s. Local execution also succeeded after using the configured network proxy and CA trust; TLS verification stayed enabled. The old dependency-free raw-TLS adapter failed locally, so it is not used for the new assistant path.

This is an online free/keyless speech endpoint, not an offline model or a guaranteed service quota. Newly generated sentences require server internet. The Node adapter keeps bounded private generated-PCM cache files so identical clips can be replayed without another request. It does not activate a paid API or fall back silently to a male/owner voice. Network errors are surfaced. No claim that every Persian word or accent is correct: compare against literal source text and retain owner pronunciation feedback.

The owner specifically requests standard female Persian reading, without replacing written words with Afghan vocabulary. The assistant adapter keeps original vocabulary, uses a specific `یِک` vowel spelling to disambiguate «یک», and only accepts same-word vowel corrections. The owner's voice remains a pronunciation example, never output speech.
