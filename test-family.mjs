import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { FAMILY_CFG, FAMILY_EPISODES, FAMILY } from "./lib/family-series.mjs";
import { EPISODES, SERIES, linesOf } from "./lib/easy-series.mjs";
import { GERMAN_A1 } from "./lib/german-a1.mjs";
for (const [k, e] of Object.entries(FAMILY_EPISODES)) {
  assert.ok(e.shots.length >= 10 && e.shots.length <= 12, `${k}: 10-12 shots (the GPU budget)`);
  for (const s of e.shots) {
    assert.ok(FAMILY.characters[s.who], `${k}: known speaker`);
    assert.equal(s.chars.length, 1, `${k}: solo shots keep the identity`);
    assert.ok(existsSync(FAMILY_CFG.cast[s.who].ref), "portrait exists");
    if (s.hl) assert.ok(s.say.includes(s.hl), `${k}: hl in line: ${s.say}`);
    assert.match(s.say, /[؀-ۿ]/, "Persian line"); assert.ok(!/[A-Za-z]{4,}/.test(s.say.replace(/Nein/, "")), "no English");
  }
}
for (const [k, e] of Object.entries(EPISODES)) {
  assert.ok(GERMAN_A1.some((u) => u.id === k), `${k} is a curriculum unit`);
  for (const s of e.shots) { assert.ok(SERIES.characters[s.who]); for (const l of linesOf(s)) { assert.ok(SERIES.characters[l.by || s.who]); if (l.hl) assert.ok(l.say.toLowerCase().includes(l.hl.toLowerCase().replace(/[.!?]+$/, ""))); } }
}
const wf = readFileSync(".github/workflows/family-daily.yml", "utf8");
assert.match(wf, /group: gapmedia-lesson/); assert.match(wf, /series-shots-fa-/); assert.match(wf, /node family-build\.mjs/);
const de = readFileSync(".github/workflows/news-scan.yml", "utf8");
assert.doesNotMatch(de, /"17:30"/, "German: one slot a day"); assert.match(de, /SERIES_ONLY: "on"/);
console.log("family: ok");
// owner, 2026-10-04: one minute, at most 65 s (estimate from the line length; the build also checks the real timing)
const easy = readFileSync("lib/easydeutsch.mjs", "utf8");
assert.match(easy, /SERIES_TARGET = 61\.5, SERIES_MIN = 60, SERIES_MAX = 65/); assert.match(easy, /duration > SERIES_MAX\) throw/);
const q = (x) => Math.ceil(x / 0.5 - 1e-6) * 0.5;
for (const E of [...Object.values(EPISODES), ...Object.values(FAMILY_EPISODES)]) {
  // natural pace estimate (0.055 s a character at normal speed); the build stretches a short story to 60 s
  // and tightens a long one, and refuses one that still passes 65 s before any GPU time is spent
  let t = 0; for (const s of E.shots) { let cur = t + 0.1; linesOf(s).forEach((l, i) => { cur += (i ? (l.joke ? 0.5 : l.cut ? -0.2 : 0.22) * 0.6 : 0) + l.say.length * 0.055; }); t += q(cur - t + 0.15); }
  assert.ok(t + 3.5 <= 65, `${E.title}: even with tight breaths about ${(t + 3.5).toFixed(0)} s`);
}
console.log("family durations: ok");
