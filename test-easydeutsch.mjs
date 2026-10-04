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
// the drawn cartoon look: German only, gestures from the words, lip-sync on syllables
import { buildEasyCartoonHTML, actionFor } from "./lib/easy-cartoon.mjs";
assert.equal(actionFor("Ich habe kein Geld."), "wallet");
assert.equal(actionFor("Ich habe keine Zeit."), "watch");
assert.equal(actionFor("Das ist kein Problem."), "thumbs");
assert.equal(actionFor("Ich spreche nicht gut Deutsch."), "chest");
assert.equal(actionFor("Wo ist der Bahnhof?"), "point");
const film = buildEasyCartoonHTML({ episodeNo: 43, title: "Nein sagen", hookDur: 3, outroAt: 10, total: 13,
  lines: [{ who: "lena", de: "Ich habe kein Geld.", action: "wallet", t: 3.4, dur: 1.8, again: { dur: 1.8, gap: 0.8 }, item: 0 }, { who: "braun", de: "Heute habe ich kein Geld dabei.", action: "none", t: 8, dur: 2, item: 0 }] });
assert.doesNotMatch(film, /[\u0600-\u06FF]/, "no Persian in the cartoon film");
assert.match(film, /class="lena-m1"/); assert.match(film, /class="braun-m2"/);
assert.match(film, /tl\.set\("\.lena-m1"/, "the mouth changes shape on the syllables");
assert.match(film, /<span class="verb">habe<\/span>/);
assert.match(easy, /buildEasyCartoonHTML/); assert.match(build, /look: easyLook/);
// the same film with 3D toon characters
const film3d = buildEasyCartoonHTML({ episodeNo: 43, title: "Nein sagen", hookDur: 3, outroAt: 10, total: 13, three: true,
  lines: [{ who: "lena", de: "Ich habe kein Geld.", action: "wallet", t: 3.4, dur: 1.8, again: { dur: 1.8, gap: 0.8 }, item: 0 }] });
assert.match(film3d, /<canvas id="three-stage"/); assert.match(film3d, /window\.__toon = /);
assert.match(film3d, /<script type="module" src="public\/3d\/toon-stage\.js">/);
assert.doesNotMatch(film3d, /class="lena-body"/, "no drawn characters in the 3D film");
assert.match(film3d, /id="cap0"/, "the caption card stays under the picture");
const toon = readFileSync("public/3d/toon-stage.js", "utf8");
assert.match(toon, /addEventListener\("hf-seek"/); assert.doesNotMatch(toon, /Math\.random|Date\.now|requestAnimationFrame/);
assert.match(easy, /three: look === "cartoon3d"/);
for (const k of ["cafe", "home", "station", "shop", "doctor", "school", "work", "park", "bureau"]) assert.ok(new RegExp(`(SCENES\\.${k}\\b|cafeScene)`).test(toon), `scene ${k}`);
import { EASY_TEXT, EASY_TITLE_COUNT } from "./lib/easy-titles.mjs";
assert.equal(EASY_TITLE_COUNT, GERMAN_A1.length); assert.equal(Object.keys(EASY_TEXT).length, GERMAN_A1.length);
assert.match(build, /let lessonStyle = "easy";/); assert.match(build, /let easyLook = "cartoon3d";/);
// the character editor (tools/character-editor) saves the looks; every lesson reads them
import { characterLooks } from "./lib/easydeutsch.mjs";
const looks = characterLooks();
for (const w of ["lena", "braun"]) for (const k of ["head", "body", "height", "tintAmt"]) assert.equal(typeof looks[w][k], "number", `${w}.${k}`);
assert.equal(characterLooks("no-such-file.json"), null, "no file: the original characters");
const filmLooks = buildEasyCartoonHTML({ episodeNo: 43, title: "x", hookDur: 3, outroAt: 10, total: 13, three: true, looks, lines: [] });
assert.match(filmLooks, /"looks":\{"lena":\{"head":/);
assert.match(easy, /looks: characterLooks\(\)/);
assert.match(toon, /function applyLook\(P, look\)/); assert.match(toon, /SCENES\.studio = /); assert.match(toon, /SCENES\.none = /);
const editor = readFileSync("tools/character-editor/index.html", "utf8");
for (const id of ["head", "body", "height", "tintAmt", "zin", "zout", "save", "reset", "export", "toproject", "strip"]) assert.match(editor, new RegExp(`id="${id}"`), id);
assert.doesNotMatch(editor, /fetch\(["']https?:/, "the editor keeps edits in the browser");
// a photo card of the word while it is taught (owner, 2026-09-29)
const withPic = buildEasyCartoonHTML({ episodeNo: 44, title: "Möbel", hookDur: 3, outroAt: 10, total: 13, three: true, lines: [],
  pics: [{ src: "data:image/jpeg;base64,AAAA", label: "der Tisch", t0: 3.3, t1: 8 }] });
assert.match(withPic, /<div id="pic0" class="pic"><img src="data:image\/jpeg;base64,AAAA" alt="der Tisch"\/><div class="pl">der Tisch<\/div><\/div>/);
assert.match(withPic, /tl\.fromTo\("#pic0"/, "the card pops in on the timeline");
assert.match(easy, /findLessonImage\(it\.img, it\.de\)/, "the same real-photo search and relevance gate as the older lessons");
assert.match(easy, /sourceType === "generated-fallback"/, "no placeholder graphic on a card");
for (const u of GERMAN_A1) for (const it of u.items) assert.ok(it.img, `${u.id}: "${it.de}" has a picture query`);
// every episode looks different (owner, 2026-09-29): staging, light, camera, outfits from the episode number
assert.match(film3d, /"vary":\{"seed":43\}/);
for (const re of [/const STAGING = LESSON && CFG\.vary \? pick\(STAGINGS, 7\)/, /const TOD = LESSON && CFG\.vary \? pick\(TODS, 5\)/, /const CAM = LESSON && CFG\.vary \? pick\(\["classic", "ots", "cuts", "dolly"\], 3\)/, /lena: pick\(\[/, /renderer\.shadowMap\.enabled = true/, /function walkState\(t\)/])
  assert.match(toon, re);
// dialogue lessons (owner, 2026-10-03): German dialogue, English explanation, Persian subtitles
import { DIALOGUES } from "./lib/easy-dialogues.mjs";
const norm = (x) => x.toLowerCase().replace(/[.,!?]/g, "").trim();
for (const [id, d] of Object.entries(DIALOGUES)) {
  const u = GERMAN_A1.find((x) => x.id === id); assert.ok(u, id); assert.equal(d.scenes.length, u.items.length, id);
  assert.ok(d.hook.de && /[\u0600-\u06FF]/.test(d.hook.fa), `${id} hook`);
  d.scenes.forEach((sc, i) => {
    assert.equal(norm(sc.say), norm(u.items[i].de), `${id}#${i} teaches the curriculum phrase`);
    assert.ok(sc.lines.some((l) => norm(l.de).includes(norm(sc.say))), `${id}#${i} the phrase is used in the dialogue`);
    for (const l of sc.lines) { assert.ok(["lena", "braun"].includes(l.who)); assert.match(l.fa, /[\u0600-\u06FF]/, `${id}#${i} Persian subtitle`); assert.doesNotMatch(l.de, /[\u0600-\u06FF]/); }
    assert.doesNotMatch(sc.en, /[\u0600-\u06FF]/, `${id}#${i} English explanation`); assert.match(sc.enFa, /[\u0600-\u06FF]/);
  });
}
const dfilm = buildEasyCartoonHTML({ episodeNo: 52, title: "x", hookDur: 3, outroAt: 10, total: 13, three: true, dialogue: true, outroFa: "تا فردا",
  lines: [{ who: "lena", de: "Wir brauchen das Brot.", fa: "ما نان لازم داریم.", hl: "das Brot", t: 3, dur: 1.5, item: 0 }, { who: "narrator", en: "\"Das Brot\" is bread.", fa: "یعنی نان", t: 5, dur: 3, item: 0 }, { who: "lena", de: "das Brot", fa: "نان", t: 8.5, dur: 1, pause: 1.9, item: 0, key: true }] });
assert.match(dfilm, /Wir brauchen <span class="verb">das Brot<\/span>\./, "the lesson phrase is marked");
assert.match(dfilm, /<div class="fa" dir="rtl">ما نان لازم داریم\.<\/div>/, "Persian subtitle under the German line");
assert.match(dfilm, /class="cap sub en"/, "the English explanation card");
assert.match(dfilm, /"dialogue":true/); assert.doesNotMatch(dfilm.match(/window\.__toon = (.*);/)[1], /narrator/, "the narrator is not a character on stage");
assert.match(easy, /if \(look === "cartoon3d" && dialogueFor\(unit\.id\)\) return runDialogueLesson\(args\)/);
assert.match(easy, /braun: "de-DE-ConradNeural", narrator: "en-US-AvaNeural"/);
assert.match(easy, /dialogue: true, cast: "cartoon2d"/, "dialogue lessons use the flat 2D cartoon people");
const c2d = buildEasyCartoonHTML({ episodeNo: 54, title: "x", hookDur: 3, outroAt: 5, total: 6, three: true, dialogue: true, cast: "cartoon2d", lines: [] });
assert.match(c2d, /<svg id="cartoon-stage"/); assert.match(c2d, /src="public\/2d\/cartoon-stage\.js"/); assert.match(c2d, /__cartoonDraw\(tl\.time\(\)\)/);
assert.doesNotMatch(c2d, /importmap|three-stage/, "the 2D cartoon loads no 3D code");
const stage2d = readFileSync("public/2d/cartoon-stage.js", "utf8");
assert.doesNotMatch(stage2d, /Math\.random|Date\.now|performance\.now|fetch\(/, "the 2D stage is deterministic");
assert.match(stage2d, /window\.__cartoonDraw = /); assert.match(stage2d, /"hf-seek"/);
assert.match(buildEasyCartoonHTML({ episodeNo: 1, title: "x", hookDur: 3, outroAt: 5, total: 6, three: true, cast: "human", lines: [] }), /src="public\/3d\/human-stage\.js"/);
// German words in an explanation are spoken by the German voice (owner, 2026-10-03)
const { explainParts, NARRATOR_SPEED } = await import("./lib/easydeutsch.mjs");
assert.deepEqual(explainParts("\"Das passt mir\" means ‘that works for me’."), [{ who: "lena", text: "Das passt mir" }, { who: "narrator", text: "means ‘that works for me’." }]);
assert.ok(NARRATOR_SPEED < 1, "the narrator speaks slower than the default");
for (const d of Object.values(DIALOGUES)) for (const sc of d.scenes) for (const p of explainParts(sc.en)) if (p.who === "lena") assert.doesNotMatch(p.text, /^(on|do|that|deal|excuse|I'm)\b/, `English gloss in German quotes: ${p.text}`);
assert.match(dfilm.replace(/\s+/g, " "), /class="explain"><div class="cap sub en">/, "the Persian sits apart from the English card");
console.log("easydeutsch: ok");
