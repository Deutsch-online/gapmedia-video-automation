import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { FAMILY_CFG, FAMILY_EPISODES, FAMILY } from "./lib/family-series.mjs";
import { EPISODES, SERIES } from "./lib/easy-series.mjs";
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
  for (const s of e.shots) { assert.ok(SERIES.characters[s.who]); if (s.hl) assert.ok(s.say.toLowerCase().includes(s.hl.toLowerCase().replace(/[.!?]+$/, ""))); }
}
const wf = readFileSync(".github/workflows/family-daily.yml", "utf8");
assert.match(wf, /group: gapmedia-lesson/); assert.match(wf, /series-shots-fa-/); assert.match(wf, /node family-build\.mjs/);
const de = readFileSync(".github/workflows/news-scan.yml", "utf8");
assert.doesNotMatch(de, /"17:30"/, "German: one slot a day"); assert.match(de, /SERIES_ONLY: "on"/);
console.log("family: ok");
