import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FREUNDE, FREUNDE_EPISODES, FREUNDE_CAST } from "./lib/freunde-series.mjs";
import { linesOf } from "./lib/easy-series.mjs";
const q = (x) => Math.ceil(x / 0.5 - 1e-6) * 0.5;
for (const E of Object.values(FREUNDE_EPISODES)) {
  let t = 0;
  for (const s of E.shots) {
    assert.ok(FREUNDE.characters[s.who] && FREUNDE_CAST[s.who]);
    let cur = t + 0.1;
    linesOf(s).forEach((l, i) => {
      assert.ok(l.fa, "Persian subtitle"); assert.ok(l.say.includes(l.hl), `hl "${l.hl}" is in "${l.say}"`);
      cur += (i ? (l.joke ? 0.5 : l.cut ? -0.2 : 0.22) * 0.6 : 0) + l.say.length * 0.055;
    });
    t += q(cur - t + 0.15);
  }
  const real = (t + 3.5) * 1.28;
  assert.ok(real <= 64, `${E.title}: about ${real.toFixed(0)} s real`);
  assert.ok(Math.max(61.5, real) / E.shots.length <= 5.2, "a shot may not need more than one ~5 s clip can carry");
  assert.ok(E.shots.length >= 12 && E.shots.length <= 13, "six scenes: a wrong sentence and a right one each");
}
const wf = readFileSync(".github/workflows/freunde-video.yml", "utf8");
assert.doesNotMatch(wf, /schedule:/, "manual only"); assert.match(wf, /node freunde-build\.mjs/); assert.match(wf, /group: gapmedia-lesson/);
console.log("freunde: ok");
