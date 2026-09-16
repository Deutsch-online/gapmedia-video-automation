// Exa is the only PAID index in LAW 7 (layer 3). Owner directive 2026-09-16:
// keep it registered, keep every line of its code, but make spending OPT-IN so
// the default build costs nothing. Two switches now have to agree —
// ENABLE_EXA=true says "I want to spend", EXA_API_KEY says "I can" — and this
// test pins all three combinations against the REAL findLessonImage(), not a
// reimplementation of it.
//
// It matters because "optional" used to mean "it still calls Exa, the call
// just fails": lib/lesson-image.mjs sent a keyless request per vocabulary
// word and logged «Exa 401», which in a build log is indistinguishable from a
// paid key that broke. A skipped layer and a broken layer must not look alike.
//
// ENABLE_EXA and EXA_API_KEY are read at module load in lib/auto-image.mjs, so
// each combination needs its own process — this file re-executes itself.
//
//   node test-exa-optional.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const self = fileURLToPath(import.meta.url);
const mode = process.argv[2];

// ── child: run one combination and report whether Exa was reached ──────────
if (mode) {
  const seen = [];
  console.error = () => {};
  globalThis.fetch = async (url) => {
    const u = String(url);
    seen.push(u);
    if (u.includes("de.wikipedia.org")) {
      return { ok: true, status: 200, json: async () => ({ query: { pages: {} } }) };
    }
    if (u.includes("api.exa.ai")) {
      return { ok: false, status: 402, text: async () => "", json: async () => ({}) };
    }
    // Pollinations (LAW 7 layer 4) fails closed here so the chain lands on the
    // labelled local graphic — this test is about layer 3, not about a hit.
    throw new Error("offline in test");
  };

  const { findLessonImage } = await import("./lib/lesson-image.mjs");
  const result = await findLessonImage("two friends greeting outdoors", "سلام", "Hallo");
  process.stdout.write(JSON.stringify({
    exaCalled: seen.some((u) => u.includes("api.exa.ai")),
    sourceType: result?.sourceType || null,
  }));
  process.exit(0);
}

// ── parent: the three combinations ────────────────────────────────────────
const run = (env) => JSON.parse(execFileSync(process.execPath, [self, "child"], {
  encoding: "utf8",
  env: {
    ...process.env,
    // A judge key must be present, or lib/lesson-image.mjs's layer-3 gate
    // refuses Exa for its own separate reason (a hit is useless with no judge)
    // and the test would pass for the wrong reason.
    GEMINI_API_KEY: "test-gemini-key",
    PEXELS_API_KEY: "",
    ENABLE_EXA: "",
    EXA_API_KEY: "",
    ...env,
  },
}));

const cases = [
  ["$0 default — no flag, no key", {}, false],
  // The one the directive is actually about: the key is registered (it stays
  // in the environment, nothing was deleted) and it still must not be spent.
  ["key registered but flag off — still free", { EXA_API_KEY: "test-exa-key" }, false],
  ["flag on without a key — nothing to spend", { ENABLE_EXA: "true" }, false],
  ["flag on with the key — paid layer runs", { ENABLE_EXA: "true", EXA_API_KEY: "test-exa-key" }, true],
];

let bad = 0;
for (const [name, env, wantExa] of cases) {
  const got = run(env);
  const ok = got.exaCalled === wantExa;
  if (!ok) bad++;
  console.log(`${ok ? "  ok  " : "  NOT "} ${name}`);
  if (!ok) console.log(`         expected exaCalled=${wantExa}, got ${got.exaCalled}`);
  // Whatever the mode, the build never stops: with every real layer empty and
  // Pollinations offline, LAW 7 layer 6's labelled local graphic stands in.
  assert.equal(got.sourceType, "generated-fallback",
    `${name}: the chain must still end in a labelled fallback, not a hard stop`);
}

console.log("");
console.log(bad === 0
  ? `ok   Exa is opt-in: ${cases.length} combinations, only ENABLE_EXA=true with a key spends`
  : `${bad} of ${cases.length} wrong`);
process.exit(bad === 0 ? 0 : 1);
