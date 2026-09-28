// The 3D lesson stage (owner, 2026-09-28: human characters, real motion).
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { build3DStageHTML, stageTimes } from "./lib/build-3d.mjs";
import { buildAnimHTML } from "./lib/build-anim.mjs";
import { MODELS, HIS_CLIPS } from "./lib/fetch-3d-assets.mjs";

const items = [
  { de: "Ich habe kein Geld.", fa: "من پول ندارم.", exDe: "Tut mir leid, ich habe kein Geld.", exFa: "متأسفم، پول ندارم." },
  { de: "Haben Sie Zeit?", fa: "وقت دارید؟", exDe: "", exFa: "" },
];
const a = {
  setting: "cafe", items, beats: [{ de: 0.2, deDur: 1.2, ex: 1.6, exDur: 1.6, fa: 3.4 }, { de: 0.2, deDur: 1.0, ex: 1.4, exDur: 0.9, fa: 2.6 }],
  hookDuration: 5, tipDurations: [6, 5], outroDuration: 4,
  episodeNo: 43, total: 100, topic: "نفی", hook: "هوک", loopLine: "تا آخر", nextTopic: "بعدی", outroLine: "خداحافظ",
};

// windows follow the voice beats, and the phrase reading drives the acting
const tm = stageTimes(a);
assert.equal(tm.total, 20);
assert.equal(tm.outroAt, 16);
assert.deepEqual(tm.phrases.map((p) => p.t0), [5, 11]);
assert.equal(tm.phrases[0].negation, true, "kein → she shakes her head");
assert.equal(tm.phrases[0].icon, "geld");
assert.equal(tm.phrases[0].crossed, true, "a thing that is NOT there is pictured struck out");
assert.equal(tm.phrases[1].question, true);
assert.equal(tm.phrases[1].hasEx, false, "no example sentence → he does not talk");

// the stage composition: one timed clip, the lesson in window.__stage3d, local modules only
const html = build3DStageHTML(a);
assert.match(html, /data-composition-id="main"[^>]*data-duration="20\.000"/);
assert.match(html, /window\.__stage3d = \{"setting":"cafe"/);
assert.match(html, /"three":"\.\/public\/3d\/vendor\/three\.module\.js"/);
assert.match(html, /<script type="module" src="public\/3d\/stage\.js"><\/script>/);
assert.match(html, /id="b-ic0" class="bub think"/);
assert.doesNotMatch(html, /https?:\/\//, "no network at render time");
for (const f of ["public/3d/stage.js", "public/3d/vendor/three.module.js", "public/3d/vendor/three.core.js",
  "public/3d/vendor/jsm/loaders/GLTFLoader.js", "public/3d/vendor/jsm/utils/SkeletonUtils.js"]) assert.ok(existsSync(f), f);

// the runtime is seek-driven and deterministic
const js = readFileSync("public/3d/stage.js", "utf8");
assert.match(js, /addEventListener\("hf-seek"/);
assert.match(js, /__hfThreeTime/);
assert.match(js, /buildReady/);
assert.doesNotMatch(js, /Math\.random|Date\.now|performance\.now|requestAnimationFrame|\.play\(\)\s*;?\s*$/m);
for (const f of Object.keys(MODELS)) assert.ok(js.includes(f), `stage loads ${f}`);
for (const c of Object.values(HIS_CLIPS)) assert.ok(js.includes(c.split("/").pop()), `stage loads ${c}`);
// every scene the lessons use has a 3D set
for (const s of ["home", "cafe", "station", "shop", "doctor", "school", "work", "park", "bureau", "office"]) assert.match(js, new RegExp(`\\b${s}\\(\\)`), `3D set for ${s}`);
// the old over-the-head wave is gone: he greets with a hand on the chest
assert.match(js, /M_Standing_Expressions_011/);

// the formats play the stage film and keep only the card animation
const card = buildAnimHTML({ ...a, variant: "tiktok", stageVideo: "public/3d/stage/x.mp4" });
assert.match(card, /<video id="stage3d" class="clip" src="public\/3d\/stage\/x\.mp4" muted/);
assert.doesNotMatch(card, /class="stage-svg"/);
assert.doesNotMatch(card, /\.v-move|\.cam-bg/, "no drawn-stage tweens left");
assert.match(card, /#k1 \.card/);
const drawn = buildAnimHTML({ ...a, variant: "tiktok" });
assert.match(drawn, /class="stage-svg"/);

// the lesson build renders the stage once and hands it to both formats
const build = readFileSync("german-lesson-build.mjs", "utf8");
assert.match(build, /build3DStageHTML\(/);
assert.match(build, /ensure3DAssets\(\)/);
assert.match(build, /items: animItems, stageVideo,/);
// people and mocap are fetched, never committed
const ignore = readFileSync(".gitignore", "utf8");
assert.match(ignore, /^public\/3d\/models\/$/m);
assert.match(ignore, /^public\/3d\/stage\/$/m);
const wf = readFileSync(".github/workflows/news-scan.yml", "utf8");
const job = Number(wf.match(/timeout-minutes: (\d+)/)[1]), deadline = Number(wf.match(/CYCLE_DEADLINE_MINUTES: "(\d+)"/)[1]);
assert.ok(job >= 100 && deadline < job, "the CPU-rendered 3D stage needs a longer job, and the cycle stops before the job does");

console.log("3d stage: ok");
