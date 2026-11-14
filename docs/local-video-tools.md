# Local video tools

OpenFilm **0.3.2** is the project's primary local companion editor and coded-motion tool.
The existing Python/FFmpeg daily renderer and its quality gates remain the delivery authority.
The editor does not generate or measure lip sync. No hosted plan or connected generation service is enabled.

## Install and edit

Requires Node **24.22.3+**, FFmpeg and Git. Dependencies and integrity hashes are pinned in
`tools/video/package-lock.json`; tools are separate from the worker's runtime dependencies.

```sh
npm run video:setup
npm run video:open -- renders/cinematic-series/EPISODE/openfilm/HASH
```

OpenFilm downloads Chromium once on its first preview/render. Local CPU, disk and render
time are still required. Editing and MP4 export require no paid API or account. Keep
Settings → Services empty for this workflow; `openfilm get` can otherwise fall through
to a connected generation provider and is deliberately not called here.

After a non-preview daily master passes the existing duration, frame, sound and motion
gates, `cinematic_openfilm.py` writes a portable project automatically. The nine natural-speed
five-second picture cuts are muted; one continuous audio track preserves the approved
mix and its speech pauses. Captions are baked into the existing master, **not independently
editable text layers**. Modify caption text in the episode plan and original renderer.
The bundle contains the original master, quality report and source hashes; a matching
resume preserves manual film.html edits. A changed master gets a separate bundle.
The daily artifact includes these files and `openfilm-export.json`, including failures.

In the bundle directory, use the pinned CLI by its absolute path:

```sh
node /ABSOLUTE/REPO/tools/video/node_modules/openfilm/bin/openfilm.mjs look
node /ABSOLUTE/REPO/tools/video/node_modules/openfilm/bin/openfilm.mjs render --out reviewed-edit.mp4 --workers 1
```

From the repository root the equivalent commands are
`npm run video:look -- renders/.../openfilm/HASH` and
`npm run video:render -- renders/.../openfilm/HASH --workers 1`. A revised edit is never sent automatically: rerun
the existing media and delivery checks. Never use a Studio export to bypass daily quota,
the Berlin-day gate, image-preview receipts, speaker separation or Telegram receipts.

## AgentRun: offline export helper

Only the standalone **@parcha/agentrun-dsl 0.1.0-beta.37** engine is used, under Apache-2.0.
It needs no model key. It executes a fixed workflow with one allowed local Python exporter;
there is no generic shell tool, model adapter, cloud computer, hosted server, new schedule
or Telegram tool. This is an optional recovery helper, not a second production scheduler:

```sh
npm run video:export -- renders/cinematic-series/EPISODE/MASTER.mp4
```

The durable journal is stored next to the master in `openfilm-journal`. Its identity binds
the exact master and quality bytes. Committed exports are not replayed; an interrupted
effect with unknown outcome is refused for inspection. Do not delete a journal merely
to force retry. The exporter itself also preserves a complete matching bundle.
The daily companion export uses Python directly and needs no npm install or AgentRun
server. Existing GPU credit controls and generation receipts stay authoritative.

## Upstream sources and licenses

- [OpenFilm README](https://github.com/openfilm/openfilm): local editor/render capabilities.
- [OpenFilm specification](https://github.com/openfilm/openfilm/blob/main/packages/openfilm/SPEC.md): vertical stage, cuts and separate audio.
- [OpenFilm license](https://github.com/openfilm/openfilm/blob/main/LICENSE): MIT for software; keep notices when copying source. Media have their own terms.
- [AgentRun standalone DSL](https://github.com/Parcha-ai/agentrun/tree/main/packages/dsl): offline validation, execution and durable journals.
- [AgentRun README](https://github.com/Parcha-ai/agentrun): hosted computers/models can incur costs; they are not part of this integration.

No third-party media, voice, music or generated clips are downloaded by the bundle exporter.
