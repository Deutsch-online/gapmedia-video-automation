// The animated re-telling of a German lesson (lib/build-anim.mjs) and the
// switch that selects it. The scheduled episodes must stay on ink; only a
// correction request naming the unit with "style": "anim" may change that.
import { readFileSync } from "node:fs";
import { buildAnimHTML, ANIM_VARIANTS } from "./lib/build-anim.mjs";
import { GERMAN_A1 } from "./lib/german-a1.mjs";

let failed = 0;
const ok = (cond, label) => { console.log(`${cond ? "✅" : "🔴"} ${label}`); if (!cond) failed++; };

const unit = GERMAN_A1.find((u) => u.id === "a1-40-authorities");
const items = unit.items.map((it) => { const [exDe, exFa] = it.example.split(" — "); return { de: it.de, fa: it.fa, exDe, exFa }; });
const base = {
  episodeNo: 40, total: 100, topic: unit.topic, hook: unit.hook, loopLine: "چهار جملهٔ کوتاه؛ تا آخر ببین",
  nextTopic: "x", outroLine: "y", items, beats: null,
  hookDuration: 7.3, tipDurations: [11.3, 11.3, 11.3, 11.3], outroDuration: 9.3,
};
const gsap = readFileSync("public/gsap.min.js", "utf8");
const html = {};
for (const v of Object.keys(ANIM_VARIANTS)) html[v] = buildAnimHTML({ ...base, variant: v });

for (const [v, h] of Object.entries(html)) {
  const authored = h.split(gsap).join("");
  ok(!/Math\.random|Date\.now/.test(authored), `${v}: no clock or randomness outside the vendored GSAP`);
  ok(items.every((it) => h.includes(it.de.split(" ")[0])), `${v}: every German phrase is on screen`);
  ok(!/font-family="Baloo"|font-family:"Baloo"/.test(h), `${v}: no Latin text set in the Arabic-only Baloo subset`);
  ok(/data-duration="61\.8"/.test(h), `${v}: root duration is the sum of the scenes`);
  ok(h.includes('window.__timelines["main"] = tl'), `${v}: one timeline registered as "main"`);
  ok(/immediateRender:false/.test(h), `${v}: repeated cut tweens do not paint over the first frames`);
}
ok(html.tiktok !== html.instagram && /shutter/.test(html.tiktok) && /sheet/.test(html.instagram),
  "the two formats are different designs, not one recoloured");

const build = readFileSync("german-lesson-build.mjs", "utf8");
ok(/if \(request\.unit === correctionUnitId && request\.style === "anim"\) lessonStyle = "anim";/.test(build),
  "only a correction request naming this unit can select the animated style");
ok(/let lessonStyle = "ink";/.test(build), "the scheduled episodes default to ink");

console.log(failed ? `\n🔴 ${failed} check(s) failed` : "\n✅ animated lesson builder is sound");
process.exit(failed ? 1 : 0);
