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

## Free provider routing (2026-10-20)

Story planning first tries BeatAPI only when a GitHub Actions key is configured.
It reads BeatAPI's live free-tier catalog and permits only a listed text model
whose ID ends in `-free`. A paid sibling, promotional balance, image task or
video task is never treated as zero cost. If BeatAPI is unavailable, the existing
Gemini/Groq planning fallbacks remain. The moving video shots still use the
quota-guarded ZeroGPU route, and the series uses Edge's German TTS.

Google Veo is not a free-tier video API. MiniMax credits or a monthly plan are
eligible for automatic use only after the specific account and request can be
verified as included with no extra charge. A configured MiniMax API key or a
positive balance alone does not prove that. Do not start a billable generation
request to test a supposed free grant.

## Telegram approval supersedes old environment permissions

Credit requests now have inline Approve/Reject buttons in the verified private chat.
Only the matching owner, message, nonce, unexpired request and unchanged plan can approve.
Approval is claimed for one workflow attempt and only the requested remaining scenes;
rejection or silence never authorizes credit use. Old hardcoded sample/episode environment
permissions are retired. The existing Telegram poller handles callbacks; delivery of a
click to the workflow depends on that poller and GitHub scheduling, not an instant webhook.

## Exhaust eligible free choices before reporting (2026-10-20)

Story planning snapshots the live BeatAPI catalog, filters only zero-price text
IDs ending in `-free`, and tries them sequentially until one unchanged quality
validation passes. Timeout, rate-limit failure, malformed JSON and quality rejection
advance to the next eligible model within the same production attempt. The
existing bounded Retry-After handling remains per model. Catalog models without
`-free`, image/audio/video models and unverified direct account credits are not
submitted. A failed preferred model does not force a paid sibling.

Only the final success or exhausted-cycle summary is sent to private Worker
storage. The post-failure diagnostic bot lists attempted failures separately from
unconfigured or cost-unverified skips, after the complete cycle. `/fallbacks` reads
that summary. This does not reset daily attempts or remove duration, lip-sync,
quality or GPU allowance gates. Available moving-video backends still require an
approved compatible GPU environment; an unavailable backend is not claimed tested.

For read-only web research, a failed keyless Exa MCP search falls back to the
existing free DuckDuckGo search tool. Existing official-source research already
checks its configured official alternatives before giving up.
