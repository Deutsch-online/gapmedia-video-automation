import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BEFIEHLT, BEFIEHLT_EPISODES, BEFIEHLT_CAST } from "./lib/befiehlt-series.mjs";
import { linesOf } from "./lib/easy-series.mjs";
const q = (x) => Math.ceil(x / 0.5 - 1e-6) * 0.5;
for (const E of Object.values(BEFIEHLT_EPISODES)) {
  let t = 0, imperatives = 0;
  for (const s of E.shots) {
    assert.ok(BEFIEHLT.characters[s.who] && BEFIEHLT_CAST[s.who], `shot character ${s.who}`);
    let cur = t + 0.1;
    linesOf(s).forEach((l, i) => {
      assert.ok(BEFIEHLT.characters[l.by], `line character ${l.by}`); assert.ok(l.fa, "Persian subtitle"); assert.ok(l.say.includes(l.hl), `hl "${l.hl}" is in "${l.say}"`);
      if (/!$/.test(l.say)) imperatives++;
      cur += (i ? (l.joke ? 0.5 : l.cut ? -0.2 : 0.22) * 0.6 : 0) + l.say.length * 0.055;
    });
    t += q(cur - t + 0.15);
  }
  // the real German voices ran 1.28x the estimate (Karim run: 62.5 s estimated, 80 s real)
  const real = (t + 3.5) * 1.28;
  assert.ok(real <= 64, `${E.title}: about ${real.toFixed(0)} s real, over the 65 s limit`);
  // a story shorter than 60 s is stretched by holding every shot (lib/easydeutsch.mjs layout): a shot may not need more than
  // about 5 s, the longest motion clip the model makes, or its last frame would be held too long
  const perShot = Math.max(61.5, real) / E.shots.length;
  assert.ok(perShot <= 5.0, `${E.title}: ${perShot.toFixed(1)} s a shot, more than one 5 s clip can carry`);
  assert.ok(imperatives >= 6, "at least six commands");
}
const wf = readFileSync(".github/workflows/befiehlt-video.yml", "utf8");
assert.doesNotMatch(wf, /schedule:/, "manual only"); assert.match(wf, /node befiehlt-build\.mjs/); assert.match(wf, /group: gapmedia-lesson/);
console.log("befiehlt: ok");
