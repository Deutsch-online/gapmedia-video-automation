import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { KARIM, KARIM_EPISODES } from "./lib/karim-series.mjs";
import { linesOf } from "./lib/easy-series.mjs";
const q = (x) => Math.ceil(x / 0.5 - 1e-6) * 0.5;
for (const E of Object.values(KARIM_EPISODES)) {
  let t = 0;
  for (const s of E.shots) {
    assert.ok(KARIM.characters[s.who], `shot character ${s.who}`);
    let cur = t + 0.1;
    linesOf(s).forEach((l, i) => {
      assert.ok(KARIM.characters[l.by], `line character ${l.by}`); assert.ok(l.fa, "Persian subtitle"); assert.ok(l.say.includes(l.hl), `hl "${l.hl}" is in "${l.say}"`);
      cur += (i ? (l.joke ? 0.5 : l.cut ? -0.2 : 0.22) * 0.6 : 0) + l.say.length * 0.055;
    });
    t += q(cur - t + 0.15);
  }
  assert.ok(t + 3.5 <= 65, `${E.title}: about ${(t + 3.5).toFixed(0)} s`);
}
const wf = readFileSync(".github/workflows/karim-video.yml", "utf8");
assert.doesNotMatch(wf, /schedule:/, "manual only"); assert.match(wf, /group: gapmedia-lesson/); assert.match(wf, /node karim-build\.mjs/);
console.log("karim: ok");
