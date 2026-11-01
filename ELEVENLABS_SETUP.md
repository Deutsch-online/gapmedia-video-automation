# ElevenLabs repository credential connection

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
