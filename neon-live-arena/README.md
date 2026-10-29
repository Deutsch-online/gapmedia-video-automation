---
title: Neon LIVE Arena
emoji: 💃
colorFrom: purple
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# Neon LIVE Arena

A textured human dance stage with a private studio panel. Public output: `/dance`.
Private studio entry: `/?studio=1` (requires the owner key). Profiles remain in
name badges; the body uses a protective suit and the face is a photographic 3D
scan. All guests share the same human mesh with four material finishes. The
source scan has closed eyes and a fixed expression, without facial lip sync.

Six movement modes are retained. Latin mode retargets a captured SambaDance
performance to 65 joints. Assets load locally without paid inference calls.
Asset attribution, modifications and licenses: `dist/models/LICENSE.txt` and
`dist/models/HEAD-LICENSE.txt`; attribution is also linked from the live stage.

Node 24: `npm ci --ignore-scripts`, `npm test`, `npm start`.
For hosting set `PORT=7860`, `PUBLIC_URL`, and a private `LUDO_ADMIN_TOKEN`.
Runtime state and management keys must never be committed.

The GitHub workflow `deploy-neon-live.yml` publishes this directory to its own
Hugging Face CPU-basic Space, verifies the exact running build and model assets,
and sends the public stage plus the private studio link to the configured
private owner Telegram chat. It does not alter the Nations Race Space.
