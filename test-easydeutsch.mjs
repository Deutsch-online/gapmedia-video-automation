// EasyDeutsch (owner, 2026-09-28): German only, the brand logo, the verb in colour.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildAnimHTML, verbIndex } from "./lib/build-anim.mjs";
import { easyText } from "./lib/easydeutsch.mjs";
import { GERMAN_A1 } from "./lib/german-a1.mjs";

const verb = (s) => s.split(" ")[verbIndex(s)].replace(/[.,!?]/g, "");
assert.equal(verb("Ich habe kein Geld."), "habe");
assert.equal(verb("Haben Sie Zeit?"), "Haben");
assert.equal(verb("Wo ist der Bahnhof?"), "ist");
assert.equal(verb("Keine Sorge, das ist kein Problem."), "ist");
assert.equal(verb("Tut mir leid, ich habe keine Zeit."), "Tut");
assert.equal(verb("Entschuldigung, ich spreche noch nicht gut Deutsch."), "spreche");
assert.equal(verb("Heute habe ich kein Geld dabei."), "habe");

const u = GERMAN_A1.find((x) => x.id === "a1-43-negation-kein");
const items = u.items.map((it) => ({ de: it.de, fa: "", exDe: String(it.example).split(" — ")[0], exFa: "" }));
const html = buildAnimHTML({
  easy: true, variant: "tiktok", setting: "cafe", episodeNo: 43, total: 100, topic: easyText(u).title, hook: easyText(u).hook,
  loopLine: "Hör zu und sprich nach.", nextTopic: "Möbel", outroLine: "Bis morgen – tschüss!", items,
  beats: items.map(() => ({ de: 0.3, deDur: 1.4, ex: 3.9, exDur: 2.2, fa: 6.3 })), hookDuration: 4, tipDurations: items.map(() => 7.5), outroDuration: 4,
});
assert.doesNotMatch(html, /[؀-ۿ]/, "no Persian anywhere in an EasyDeutsch film");
assert.match(html, /<img class="logo" src="data:image\/jpeg;base64,/, "the EasyDeutsch logo is embedded");
assert.match(html, /<span class="w verb">habe<\/span>/);
assert.match(html, /\.verb\{color:#DD0000\}/);
for (const x of GERMAN_A1) assert.doesNotMatch(`${easyText(x).title} ${easyText(x).hook}`, /[؀-ۿ]/, x.id);

const build = readFileSync("german-lesson-build.mjs", "utf8");
assert.match(build, /\["anim", "ink", "easy"\]\.includes\(request\.style\)/);
assert.match(build, /await runEasyDeutsch\(/);
const easy = readFileSync("lib/easydeutsch.mjs", "utf8");
assert.match(easy, /de-DE-KatjaNeural/, "the approved German voice");
assert.match(easy, /GERMAN_WORD_VOICE_SETTINGS\.speed/);
console.log("easydeutsch: ok");
