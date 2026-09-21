// Owner directive 2026-09-21: "نریشن نباید هیچگاه خاموش باشد" —
// narration must never be off.
//
//   node test-narration-never-off.mjs
//
// PROJECT_RULES and CLAUDE.md already said a missing audio file is a build
// error, and german-cycle.mjs's own comment already claimed this workflow
// runs with REQUIRE_VOICE=on. The workflow said "off", so the three guards in
// german-lesson-build.mjs were all dead: a TTS failure was swallowed and the
// episode shipped music-only — silent, but delivered as if finished.
//
// This test exists so that can never come back quietly.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/news-scan.yml", "utf8");
const build = readFileSync("german-lesson-build.mjs", "utf8");

// ── the lesson workflow demands narration ────────────────────────────────
assert.match(workflow, /REQUIRE_VOICE: "on"/,
  'the German lesson build must run with REQUIRE_VOICE="on" — a silent episode must fail, not ship');
assert.doesNotMatch(workflow, /REQUIRE_VOICE: "off"/,
  "REQUIRE_VOICE must never be turned off in the lesson workflow");

// ── and the build honours it in all three places ─────────────────────────
// One guard is not enough: narration can fall over at planning, at assembly,
// or by simply producing no file. Each path had its own bail-out and each
// must keep it, or "off" comes back through whichever one was dropped.
const guards = build.match(/REQUIRE_VOICE === "on"/g) || [];
assert.ok(guards.length >= 3,
  `all three narration failure paths must still refuse to ship silent (found ${guards.length})`);
assert.match(build, /if \(!voice && process\.env\.REQUIRE_VOICE === "on"\)[\s\S]{0,120}throw new Error/,
  "a missing narration file must throw, not fall through to a music-only render");
assert.match(build, /voice assembly failed, continuing music-only[\s\S]{0,160}REQUIRE_VOICE === "on"\) throw/,
  "the music-only fallback must stay unreachable while narration is required");

console.log("narration is required: a German lesson with no voice fails instead of shipping silent");
