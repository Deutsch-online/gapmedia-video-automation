# Remote deployment preparation

This is an authenticated remote boundary for the independent Aryana app. It does **not** provision a server or provide a realtime GPU avatar. The included container supports speech, TikTok events and existing media. The existing optional SadTalker renderer is offline; running it on a GPU does not by itself make continuous lip synchronization available.

Keep the original Node server on loopback port 4321. Expose only bridge port 4322 through an HTTPS reverse proxy. Set:

- `ARYANA_REMOTE_KEY`: a random secret of at least 24 characters. Generate it in the server secret manager. Never commit it.
- `ARYANA_ALLOWED_ORIGINS`: comma-separated exact HTTPS origins of the hosted studio, without a trailing slash.
- `ARYANA_BRIDGE_HOST`: `0.0.0.0` only inside the intended hosted container/network boundary; defaults to loopback for local use.
- Optional existing `ARYANA_LLM_*` environment variables for conversation, as documented in README.

Start with `node tools/start-cloud.mjs` in the cloud container. `Dockerfile.cloud` is a CPU service container for a managed Docker host. It has not been deployed. Do not expose the original application port; `/api/session` must remain private. Store `.private` in a volume owned by the non-root `node` user if settings should persist.

The online studio connects with HTTPS + an Authorization bearer header. Websockets get 15-second single-use origin-bound tickets. Keys are not placed in playback links, browser storage or query strings. Media is fetched with authorization into in-memory blobs. The studio and output must stay open in the same browser profile; use Window Capture in LIVE Studio. Unauthenticated state/media/commands and unapproved origins are rejected. `/healthz` exposes only a non-sensitive bridge identity, not account data.

For a genuine realtime avatar, a GPU inference service or supported paid avatar API still needs to be selected, integrated and measured for latency, image quality, Persian pronunciation and 2–3 hour stability. No paid service is activated by these files.
