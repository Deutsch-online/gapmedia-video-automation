// The animated re-telling of a German lesson (lib/build-anim.mjs) and the
// switch that selects it. Since 2026-09-28 every episode is the character
// film; a correction request naming the unit may still ask for "ink".
import { readFileSync } from "node:fs";
import { buildAnimHTML, ANIM_VARIANTS, animSettingFor } from "./lib/build-anim.mjs";
import { readPhrase } from "./lib/anim-room.mjs";
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
  ok(/immediateRender:false/.test(h), `${v}: tweens that repeat a target do not paint over the first frames`);
}
ok(html.tiktok !== html.instagram && /scaleY:0,transformOrigin:"50% 0%"},\{scaleY:1/.test(html.tiktok) && /\{x:120,opacity:0\}/.test(html.instagram),
  "the two formats are different designs, not one recoloured");
for (const [v, h] of Object.entries(html)) {
  ok(/class="v-thN"/.test(h) && /class="v-uN"/.test(h) && /class="c-head"/.test(h), `${v}: the characters are jointed rigs (thigh, arm, head bones)`);
  ok(/\.v-m\.m-A/.test(h) && /\.v-m\.m-O/.test(h), `${v}: the visitor's mouth moves with the German vowels`);
  ok(/\.v-lid/.test(h), `${v}: the characters blink`);
}

// Every other lesson plays in the everyday room, acted only with what its words name.
ok(animSettingFor("a1-40-authorities") === "office" && animSettingFor("a1-42-possession") === "room", "the office is for the authorities lesson; every other lesson gets the room");
const r42 = GERMAN_A1.find((u) => u.id === "a1-42-possession");
const items42 = r42.items.map((it) => { const [exDe, exFa] = it.example.split(" — "); return { de: it.de, fa: it.fa, exDe, exFa }; });
for (const v of Object.keys(ANIM_VARIANTS)) {
  const h = buildAnimHTML({ ...base, topic: r42.topic, hook: r42.hook, items: items42, setting: "room", variant: v });
  ok(/class="obj-tisch"/.test(h) && !/SCHALTER/.test(h) && !/TERMIN/.test(h), `${v}: the room has no office props`);
  ok(/class="ic-schluessel"/.test(h) && /class="ic-buch"/.test(h), `${v}: the key and the book the phrases name are the props`);
  ok(/\.ring-tisch/.test(h), `${v}: "auf dem Tisch" points at the table in the room`);
  ok(/data-duration="61\.8"/.test(h) && !/Math\.random|Date\.now/.test(h.split(gsap).join("")), `${v}: same timing contract, still deterministic`);
}
const q = readPhrase("Das gehört mir nicht."), k = readPhrase("Das ist mein Schlüssel."), n0 = readPhrase("Wie geht es Ihnen?");
ok(q.negation && q.self && q.noun === null, "a negation about me, with no picture guessed");
ok(k.kind === "hold" && k.noun === "schluessel" && k.self, "a key is held up, with a hand on the chest for \"mein\"");
ok(n0.kind === "none" && n0.question, "no noun, no picture: gestures only");

const build = readFileSync("german-lesson-build.mjs", "utf8");
ok(/let lessonStyle = "anim";/.test(build), "every episode is the character film by default (owner, 2026-09-28)");
ok(/request\.unit === correctionUnitId && \["anim", "ink"\]\.includes\(request\.style\)/.test(build),
  "only a correction request naming this unit can switch the style");
ok(/setting: animSettingFor\(unit\.id\)/.test(build), "the build picks the scene from the unit");

console.log(failed ? `\n🔴 ${failed} check(s) failed` : "\n✅ animated lesson builder is sound");
process.exit(failed ? 1 : 0);
