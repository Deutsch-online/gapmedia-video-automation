import { writeFileSync, rmSync } from "node:fs";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { pausedTopics, pausedTopicIds } from "./lib/paused-topics.mjs";
import { featureFor, aiFeatureFor, featureById } from "./lib/features.mjs";

const TMP = "/tmp/paused-test.json";

// A pause is a withholding, not a deletion. The daily lane spent 2026-09-14
// failing for lack of any search index (Exa 402, DuckDuckGo 403), and the
// danger in that situation is a content pool that quietly shrinks every time
// sourcing breaks. So: the feature must still EXIST, and clearing the file
// must put it straight back.

// --- The live list is honoured, and every entry explains itself ---
{
  const live = pausedTopics();
  assert.ok(live.size > 0, "the live pause list should be readable");
  for (const [id, meta] of live) {
    assert.ok(String(meta.why || "").trim(), `${id} must say WHY it is paused`);
    assert.ok(String(meta.until || "").trim(), `${id} must say what ends the pause`);
    assert.ok(featureById(id), `${id} must still exist in lib/features.mjs — a pause never deletes content`);
  }
}

// --- A paused id is never selected, on any path ---
{
  const paused = pausedTopicIds();
  let selected = 0;
  for (let day = 20689; day < 20689 + 60; day++) {
    for (const cat of ["tiktok", "instagram", "tools"]) {
      const f = featureFor(cat, day);
      if (f && paused.has(f.id)) selected++;
    }
    const ai = aiFeatureFor(day);
    if (ai && paused.has(ai.id)) selected++;
  }
  assert.equal(selected, 0,
    "a paused id reachable through the demand tier, the category list or the least-recently-used fallback is a pause in name only");
}

// --- An entry missing its reason is ignored, not silently obeyed ---
{
  writeFileSync(TMP, JSON.stringify({ paused: {
    "explained": { why: "no real screen", until: "an index answers" },
    "unexplained": {},
    "half": { why: "something" },
  } }));
  try {
    const ids = pausedTopicIds(TMP);
    assert.deepEqual([...ids], ["explained"],
      "an unexplained pause is indistinguishable from an accidental deletion — it must not take effect");
  } finally { rmSync(TMP, { force: true }); }
}

// --- Unreadable or absent: the rotation runs in full, never blocked ---
{
  assert.equal(pausedTopicIds("/tmp/does-not-exist-at-all.json").size, 0);
  writeFileSync(TMP, "{ not json");
  try {
    assert.equal(pausedTopicIds(TMP).size, 0, "a broken pause file must never block the whole rotation");
  } finally { rmSync(TMP, { force: true }); }
}

// --- The gate is untouched: this changes what is OFFERED, not what passes ---
{
  const proof = readFileSync("lib/visual-proof.mjs", "utf8");
  assert.match(proof, /Math\.max\(size\.width, size\.height\) < 1080 \|\| size\.width \* size\.height < 700000/,
    "pausing a topic must not touch the Visual Truth Gate's floor");
  // Checked as a real dependency, not as a word: the module's own header
  // mentions dedupe.mjs precisely to say it stays out of it.
  const paused = readFileSync("lib/paused-topics.mjs", "utf8");
  assert.ok(!/^\s*import[^\n]*dedupe/m.test(paused),
    "the pause list must not import duplicate detection");
  assert.ok(!/^\s*import[^\n]*visual-proof/m.test(paused),
    "the pause list must not import the Visual Truth Gate either");
}

console.log("ok   paused topics are withheld with a stated reason, still exist, and the gate is untouched");
