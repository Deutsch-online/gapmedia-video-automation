# ElevenLabs repository credential connection

## Verified account result

The integration-branch workflow run
[41288737329](https://github.com/Deutsch-online/gapmedia-video-automation/actions/runs/41288737329)
found the existing secret under `ELEVEN_API_KEY`. Authentication succeeded and
the subscription endpoint returned the **Creator** tier. Both image and video
listing endpoints returned **402 paid_plan_required**. Upgrading to an eligible
plan is an account action; no subscription change or paid generation was made.
The workflow's failing preflight therefore reports a confirmed entitlement
block, not missing credentials. Local unit tests passed in GitHub Actions.

The read-only **ElevenLabs key and media access** workflow passes the existing
GitHub Actions secret into the provider check as an environment variable.
Supported secret names are `ELEVENLABS_API_KEY`, `ELEVEN_LABS_API_KEY`, and
`ELEVEN_API_KEY`, in that order. The value is never printed, committed, or
uploaded as an artifact.

The workflow runs on changes to its own files on `main` or the integration
branch and can be started manually. It checks subscription metadata and image
and video listing access using GET requests only. It does not generate content,
upload media, spend generation credits, publish, or send Telegram messages.
The report distinguishes a missing key, rejected credentials, missing media
permissions, and network errors. Successful listing is not proof that generation
is available or that credits remain. The Image & Video API requires the
appropriate account plan and key permissions.

Repository Secrets are available to a GitHub Actions job only when explicitly
mapped into that job. Environment-scoped secrets additionally require the job
to select the matching GitHub environment. This workflow intentionally does not
guess or select a production environment.

GitHub cannot return an Actions secret value through its REST API. This workflow
therefore keeps the key in GitHub; it does not transfer it to a Codex cloud
environment or the local Numera/ElevenLabs MCP processes. Those processes still
need their own managed `ELEVENLABS_API_KEY` binding or a privately configured key.

Local test (no key or provider requests needed):

```sh
node --test test-elevenlabs-preflight.mjs
```

Local read-only provider check, when the key is already available securely in
the process environment:

```sh
node scripts/elevenlabs-preflight.mjs
```

## Run with the existing GitHub secret

The manual **ElevenLabs manual image and video** workflow runs the pinned official
CLI `@elevenlabs/cli@1.8.0` inside GitHub Actions. It reuses `ELEVEN_API_KEY` in
place; no copy of the key is sent to Codex. The default operation is local
`validate-image`. Choose `validate-video` to check a video request without a
provider call. Provide the exact ElevenLabs model body in `request_json`.

`submit-image` or `submit-video` additionally requires explicit
`allow_paid_generation=true` for exactly one request. A read-only account
preflight runs first and blocks submission while the Creator/402 restriction
remains. The request is locally validated before a single no-retry POST. This
workflow is manual only; it has no schedule, push generation, or automatic
resubmission. Do not use GitHub's rerun button for an uncertain paid submission.

`status-image` and `status-video` read an existing `generation_id`. Logs contain
only the provider, modality, job ID and recognised status. Prompts, reference
media, API headers and signed output URLs are not logged or uploaded as
artifacts. The workflow does not publish or deliver media. A final download
still requires an authenticated API client; the workflow does not export the
secret or a private content URL into this public repository's logs.

Secret-free PR checks test both modules. Current validation coverage is ten
tests covering credential handling, paid-operation guards, dry-run behaviour,
single submission, uncertain-outcome handling, and status-only reads.
