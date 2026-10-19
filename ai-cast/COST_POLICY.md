# Cinematic series cost policy

Owner instruction, 2026-10-19: minimize generation time and cost, aim to finish each
exactly 60-second episode within included GPU allowance, and ask before using
credits when included allowance cannot finish it. A full minute within the daily
allowance is a goal, not a guarantee with the current hosted model.

- Preserve matching image, narration and audio-conditioned video caches. Never
  stretch, loop or substitute generic motion to save GPU time.
- Reuse unchanged aligned WAVs after validating source and output hashes.
- Complete GPU generation before CPU layout/mux work; failures do not repeatedly
  encode all earlier scenes.
- Cache keys include run attempt, so retries can save newly finished work.
- For authenticated generation, check the official ZeroGPU quota endpoint before
  every request. Reserve 480 seconds for speech video, 120 seconds for reference
  image editing, plus 30 seconds of margin. These are admission bounds, not prices.
- If quota cannot be read or is insufficient, fail closed, preserve outputs, and
  request permission in the verified private Telegram chat. Unknown notification
  sends are not automatically replayed. A reply does not automatically authorize
  code; the project's assistant must record the explicit scope.
- `PAID_FALLBACK=off` alone does not prevent HF ZeroGPU automatic over-quota billing.
  The preflight guard reduces that risk but cannot lock quota against unrelated
  concurrent usage of the same account. Provider-side billing caps remain separate.
- One exception already authorized: finish episode 5 scenes 10, 11 and 12 only
  (15 seconds of output). The dedicated workflow pins the completed cache, validates
  the approved plan and nine completed takes, and sets a scoped authorization.
  No account top-up or purchase is performed. The normal scheduled workflow never
  sets that authorization. Missing prepaid credit is still a provider blocker.

The 480p, native-speed single-speaker model and quality gates stay in force.
Reducing inference steps or changing models needs an actual quality comparison;
unverified speed estimates are not presented as savings.
