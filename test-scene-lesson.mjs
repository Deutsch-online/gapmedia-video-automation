// The "scene" style (owner's reference reel, 2026-09-27): painted scenes with
// German bubbles. Checks the builder and the scene-prompt contract.
import { readFileSync } from "node:fs";
import { buildSceneHTML, SCENE_VARIANTS } from "./lib/build-scene.mjs";
import { scenePrompt, LEARNER } from "./lib/lesson-scenes.mjs";
import { GERMAN_A1 } from "./lib/german-a1.mjs";

let failed = 0;
const ok = (c, l) => { console.log(`${c ? "✅" : "🔴"} ${l}`); if (!c) failed++; };
const u = GERMAN_A1.find((x) => x.id === "a1-40-authorities");
const items = u.items.map((it) => { const [exDe, exFa] = it.example.split(" — "); return { de: it.de, fa: it.fa, exDe, exFa }; });
const img = "public/german-lesson-logo.png";
const gsap = readFileSync("public/gsap.min.js", "utf8");
const html = {};
for (const v of Object.keys(SCENE_VARIANTS)) {
  html[v] = buildSceneHTML({ variant: v, episodeNo: 40, total: 100, topic: u.topic, hook: u.hook, loopLine: "x", nextTopic: "y", outroLine: "z",
    items, images: { hook: img, items: items.map(() => img), outro: img }, beats: null,
    hookDuration: 7.3, tipDurations: [11.3, 11.3, 11.3, 11.3], outroDuration: 9.3 });
}
for (const [v, h] of Object.entries(html)) {
  ok(!/Math\.random|Date\.now/.test(h.split(gsap).join("")), `${v}: deterministic outside the vendored GSAP`);
  ok((h.match(/class="clip scene"/g) || []).length === items.length + 2, `${v}: one scene per beat (hook, phrases, outro)`);
  ok(items.every((it) => h.includes(it.de.split(" ")[0])), `${v}: every German phrase is in a bubble`);
  ok(/data:image\/png;base64,/.test(h) && !/src="https?:/.test(h), `${v}: images are embedded, never fetched at render time`);
  ok(/AI-generated/.test(h), `${v}: generated pictures are labelled AI-generated on screen`);
  ok(/color:#[0-9A-F]{6}">Termin\./.test(h), `${v}: a German noun is shown in the key colour`);
}
ok(/flash/.test(html.tiktok) && /\{opacity:0\},\{opacity:1,duration:\.45/.test(html.instagram), "TikTok punches, Instagram dissolves");
const p = scenePrompt({ setting: "a bakery", action: "buying bread" });
ok(p.includes(LEARNER) && /no text/.test(p), "every prompt carries the same learner and forbids text in the picture");
console.log(failed ? `\n🔴 ${failed} check(s) failed` : "\n✅ scene lesson builder is sound");
process.exit(failed ? 1 : 0);
