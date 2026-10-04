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
assert.match(easy, /braun: "de-DE-ConradNeural", krause: "de-DE-AmalaNeural", narrator: "en-US-AvaNeural"/);
assert.match(easy, /dialogue: true, cast, stageVideo/, "dialogue lessons pick their cast");
assert.match(easy, /let cast = "cartoon2d"/, "the flat 2D cartoon is the fallback cast");
assert.match(easy, /if \(aiCastReady\(\)\)/, "the AI-animated cast is used when its clip library is complete");
// the AI-cast stage: every moment of the lesson has a shot, the speaker talks on their line,
// the listener laughs at the joke that closes a scene, nobody talks under an explanation
const { planAIShots } = await import("./lib/ai-stage.mjs");
const shots = planAIShots({ outroAt: 20, total: 23, lines: [
  { who: "lena", t: 3, dur: 1.5, item: 0 }, { who: "braun", t: 5, dur: 1.5, item: 0 },
  { who: "narrator", t: 7, dur: 4, item: 0 }, { who: "lena", t: 12, dur: 1, item: 0, key: true, pause: 2 } ] });
assert.equal(shots[0].t0, 0); assert.equal(shots.at(-1).t1, 23);
for (let i = 1; i < shots.length; i++) assert.ok(Math.abs(shots[i].t0 - shots[i - 1].t1) < 0.01, "no gap between shots");
assert.ok(shots.some((s) => s.clip === "lena-talk" && s.t0 <= 3 && s.t1 >= 4.5));
assert.ok(shots.some((s) => s.clip === "lena-laugh" && s.t0 >= 6.4 && s.t0 < 7), "Lena laughs at Braun's joke");
assert.ok(shots.some((s) => s.clip === "still-two" && s.t0 < 10 && s.t1 > 11), "a still picture under the explanation: nothing moves when nobody speaks");
assert.equal(shots[0].clip, "still-two", "the opening before the first line is still");
assert.ok(shots.every((s) => /-(talk|laugh)$|^still-/.test(s.clip)), "only talking, the joke's laugh and stills");
assert.ok(shots.every((s) => s.t1 - s.t0 >= 0.5 || s === shots.at(-1)), "no flash cuts");
const aiv = buildEasyCartoonHTML({ episodeNo: 54, title: "x", hookDur: 3, outroAt: 5, total: 6, three: true, dialogue: true, cast: "aiclips", stageVideo: "public/ai-cast/stage/x.mp4", lines: [] });
assert.match(aiv, /<video id="ai-stage" class="clip" src="public\/ai-cast\/stage\/x\.mp4" muted playsinline data-start="0"/);
assert.doesNotMatch(aiv, /cartoon-stage\.js|three-stage|importmap/, "the AI-cast film loads no drawn stage");
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
// fun (owner, 2026-10-04): comedy sounds, a "HA HA!" burst after each joke, a teaser, a quiz
const { SFX_KINDS } = await import("./lib/sfx.mjs");
assert.deepEqual(SFX_KINDS, ["ding", "pop", "rimshot", "tick", "sting", "tada"]);
assert.match(easy, /sfx\("rimshot"/, "a ba-dum-tss after the joke"); assert.match(easy, /sfx\("tick"/); 
assert.match(easy, /jokes, quiz, teaser:/, "the film gets the jokes, the quiz and the teaser");
const fun = buildEasyCartoonHTML({ episodeNo: 54, title: "x", hookDur: 3, outroAt: 15, total: 18, three: true, dialogue: true, cast: "aiclips", stageVideo: "s.mp4", lines: [], jokes: [5, 9],
  teaser: "آخر ویدیو یک کوییز داری!", quiz: { t0: 9, tc: 11, ta: 14, t1: 15, ask: "به آلمانی چه می‌شود؟", fa: "به گشت می‌رویم", de: "Wir machen einen Ausflug." } });
assert.match(fun, /id="fun1" class="haha">HA HA!/); assert.match(fun, /id="qn3" class="qn">3/); assert.match(fun, /id="qa" class="qa">Wir machen einen Ausflug\./);
assert.match(fun, /tl\.[a-zA-Z]+\("#fun0"/, "the burst is animated on the timeline"); assert.match(fun, /scale:1\.12/, "a camera punch-in on the joke");
// story first, then a recap (owner, 2026-10-04): no narrator between the story's scenes
assert.match(easy, /sayExplain\(sc\.gloss \|\| sc\.en, ef\)/, "the recap uses the short English gloss when a unit has one");
assert.ok(easy.indexOf('sfx("rimshot"') < easy.indexOf("sayExplain(sc.gloss"), "the story plays before the recap");
for (const d of Object.values(DIALOGUES)) for (const sc of d.scenes) if (sc.gloss) { assert.doesNotMatch(sc.gloss, /[؀-ۿ"]/); assert.ok(sc.gloss.split(/\s+/).length <= 8, "a gloss is short"); }
assert.ok(DIALOGUES["a1-54-day-trip"].scenes.every((sc) => sc.gloss), "unit 54 has the new recap glosses");
// real lip-sync (owner, 2026-10-04): lines are packed per speaker into ~5-second requests
const { packLipsync } = await import("./lib/ai-lipsync.mjs");
const packed = packLipsync([
  { who: "lena", t: 1, dur: 1.5, file: "a" }, { who: "braun", t: 3, dur: 2, file: "b" }, { who: "lena", t: 5, dur: 1.8, file: "c" },
  { who: "lena", t: 8, dur: 2.2, file: "d" }, { who: "lena", t: 11, dur: 6, file: "long" }, { who: "narrator", t: 13, dur: 2, file: "n" } ]);
assert.deepEqual(packed.map((c) => [c.who, c.items.map((x) => x.line.file)]), [["lena", ["a", "c"]], ["lena", ["d"]], ["braun", ["b"]]], "packed per speaker, a too-long line is left out");
assert.ok(packed.every((c) => c.len <= 4.7));
assert.equal(packed[0].items[1].off, 0.3 + 1.5 + 0.3, "each line's place inside its clip");
assert.match(easy, /makeLipsync\(\{ lines/, "lessons with the AI cast get real lip-sync");
const { planAIShots: plan2 } = await import("./lib/ai-stage.mjs");
const ls = plan2({ outroAt: 6, total: 7, lines: [{ who: "lena", t: 1, dur: 1, item: 0, lipsync: { file: "x.mp4", off: 0.3 } }] });
assert.deepEqual(ls.find((s) => s.src).src, { file: "x.mp4", at: 0.15 }, "the shot plays the lip-synced clip from the right moment");
// the TikTok cut has TikTok's colours and keeps clear of the player's buttons (owner, 2026-10-04)
const tt = buildEasyCartoonHTML({ episodeNo: 54, title: "x", hookDur: 3, outroAt: 5, total: 6, three: true, dialogue: true, theme: "tiktok", lines: [] });
assert.match(tt, /#25F4EE/); assert.match(tt, /#FE2C55/); assert.match(tt, /\.cap\{left:40px;right:150px/);
assert.doesNotMatch(buildEasyCartoonHTML({ episodeNo: 54, title: "x", hookDur: 3, outroAt: 5, total: 6, three: true, dialogue: true, lines: [] }), /#25F4EE/, "Instagram keeps the EasyDeutsch look");
assert.match(easy, /for \(const theme of \["easy", "tiktok"\]\)/); assert.match(easy, /f\.slug\.startsWith\("tiktok"\) && silentFor\.tiktok/, "the TikTok file is cut from the TikTok-coloured film");
// English and German lead, Persian is the subtitle (owner, 2026-10-04)
assert.match(easy, /Learn German with Lena and Herr Braun! Today: /, "the narrator opens in English");
assert.match(easy, /Quick quiz! How do you say: /, "the quiz question is spoken in English");
assert.match(easy, /const qe = clip\("narrator", qEn\)/, "the English meaning follows the quiz answer");
assert.match(easy, /teaser: \{ en: "Stay for the quiz at the end!", fa:/);
const enq = buildEasyCartoonHTML({ episodeNo: 54, title: "x", hookDur: 3, outroAt: 15, total: 18, three: true, dialogue: true, lines: [], outroText: "Bis morgen – tschüss!", outroEn: "See you tomorrow – bye!", outroFa: "تا فردا",
  teaser: { en: "Stay for the quiz at the end!", fa: "آخر ویدیو یک کوییز داری!" }, quiz: { t0: 9, tc: 11, ta: 14, t1: 15, ask: "How do you say it in German?", en: "We're going on a trip!", fa: "به گشت می‌رویم", de: "Wir machen einen Ausflug." } });
assert.match(enq, /class="qq">How do you say it in German\?<\/div><div class="qen">“We&#39;re going on a trip!”|class="qq">How do you say it in German\?<\/div><div class="qen">“We're going on a trip!”/);
assert.match(enq, /<div class="ten">Stay for the quiz at the end!<\/div><div class="tfa" dir="rtl">/);
assert.match(enq, /<div class="en2">See you tomorrow – bye!<\/div>/);
const { DIALOGUES: DD } = await import("./lib/easy-dialogues.mjs");
for (const [uid, d] of Object.entries(DD)) { assert.ok(d.topicEn, `${uid} has an English topic`); for (const sc of d.scenes) assert.ok(sc.gloss, `${uid}: ${sc.say} has an English gloss`); }
// the series (owner, 2026-10-04, after four reference shorts): a drama-comedy that continues,
// German on the picture, Persian only as a small subtitle, no English
const { EPISODES, SERIES } = await import("./lib/easy-series.mjs");
const { buildEasyReelHTML, lineHTML } = await import("./lib/easy-reel.mjs");
const { A1_UNITS } = await import("./lib/german-a1.mjs").then((m) => ({ A1_UNITS: Object.values(m).find((v) => Array.isArray(v) && v[0]?.items) }));
const nz = (x) => String(x).toLowerCase().replace(/[^a-zäöüß ]/g, "").trim();
for (const [uid, ep] of Object.entries(EPISODES)) {
  const u = A1_UNITS.find((x) => x.id === uid); assert.ok(u, `${uid} is a curriculum unit`);
  assert.ok(ep.shots.length >= 12 && ep.shots.length <= 20, `${uid}: a story of 12–20 shots`);
  assert.ok(ep.shots.some((x) => x.finale) && ep.shots.some((x) => !x.finale), `${uid}: a story and a cliffhanger after the recap`);
  assert.ok(new Set(ep.shots.map((x) => x.loc)).size >= 4, `${uid}: the scene changes`);
  assert.ok(ep.shots.some((x) => x.joke), `${uid}: it has jokes`); assert.ok(ep.next.de && ep.next.fa, `${uid}: it points to the next episode`);
  for (const sh of ep.shots) {
    assert.ok(SERIES.characters[sh.who] && sh.chars.every((c) => SERIES.characters[c]), `${uid}: known characters`);
    assert.ok(sh.scene && sh.motion && sh.say && sh.fa && sh.loc);
    assert.match(sh.fa, /[\u0600-\u06FF]/); assert.doesNotMatch(sh.say, /[\u0600-\u06FF]/);
    assert.ok(sh.say.split(/\s+/).length <= 9, `${uid}: a line is short enough for one shot: ${sh.say}`);
    if (sh.hl) assert.ok(nz(sh.say).includes(nz(sh.hl)), `${uid}: the lit-up phrase is in its line`);
  }
  for (const it of u.items) assert.ok(ep.shots.some((x) => !x.finale && nz(x.say).includes(nz(it.de))), `${uid}: the story says "${it.de}"`);
}
const ser = buildEasyReelHTML({ episodeNo: 54, seriesTitle: "Die Nachbarn", title: "x", total: 20, video: "public/ai-cast/stage/r.mp4", theme: "tiktok",
  caps: [{ t0: 0.2, t1: 3, de: "Wir machen einen Ausflug. Überraschung!", fa: "ما به گشت می‌رویم. سورپرایز!", hl: "Wir machen einen Ausflug" }],
  recap: { t0: 5, t1: 12, title: "Heute gelernt", titleFa: "امروز یاد گرفتیم", items: [{ t0: 6, de: "Wann fahren wir los?", fa: "کی حرکت می‌کنیم؟" }] },
  end: { t0: 16, de: "Fortsetzung folgt …", fa: "ادامه دارد …", small: "Nächste Folge: Wer ist die Frau?", smallFa: "قسمت بعد: آن خانم کیست؟" } });
assert.match(ser, /<video id="bg" class="clip" src="public\/ai-cast\/stage\/r\.mp4" muted playsinline data-start="0"/, "the shots fill the frame");
assert.match(ser, /<span class="hl">Wir machen einen Ausflug<\/span>\. Überraschung!/, "the lesson phrase is lit up");
assert.match(ser, /<div class="fa" dir="rtl">ما به گشت می‌رویم\. سورپرایز!<\/div>/, "Persian is the subtitle under the German");
assert.match(ser, /Heute gelernt/); assert.match(ser, /Fortsetzung folgt/); assert.match(ser, /#25F4EE/);
assert.doesNotMatch(ser.replace(/<script>[\s\S]*?<\/script>/g, "").replace(/<style>[\s\S]*?<\/style>/g, ""), /\b(the|and|you|quiz|today|how)\b/i, "no English on the film");
assert.equal(lineHTML("Wann fahren wir los?", "wann fahren wir los?"), '<span class="hl">Wann fahren wir los</span>?', "the match ignores case and final punctuation");
assert.match(easy, /if \(look === "cartoon3d" && EPISODES\[unit\.id\]\)/, "a unit with a series episode is built as an episode");
assert.match(easy, /krause: "de-DE-AmalaNeural"/, "Frau Krause has her own voice");
assert.match(easy, /sfx\("sting"/, "the cliffhanger has its sting");
assert.match(easy, /Heute gelernt/, "the learned-today card");
assert.doesNotMatch(readFileSync("lib/easy-series.mjs", "utf8").replace(/\/\/.*$/gm, "").replace(/scene: "[^"]*"|motion: "[^"]*"/g, ""), /\b(Quick quiz|Learn German)\b/, "no English lesson text in the series");
