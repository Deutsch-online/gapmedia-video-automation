// EasyDeutsch — the German-only lesson film.
//
// Owner, 2026-09-28: "the base of the project has changed: no Persian any more,
// only German, no translation and no Persian explanation; the name is now
// EasyDeutsch, with this logo" — modelled on the dialogue shorts the owner
// sent (one sentence per scene, the verb in colour, the characters acting it).
//
// Per episode: the two drawn characters act each sentence in a set that fits
// the topic (lib/build-anim.mjs, `easy` mode); one approved German voice
// (de-DE-KatjaNeural at GERMAN_WORD_VOICE_SETTINGS) says the hook, each
// sentence twice (listen, then repeat), its example, and the goodbye.
import { execSync, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { buildAnimHTML, animSettingFor } from "./build-anim.mjs";
import { build3DStageHTML } from "./build-3d.mjs";
import { buildEasyCartoonHTML, actionFor } from "./easy-cartoon.mjs";
import { ensure3DAssets } from "./fetch-3d-assets.mjs";
import { assertComposition } from "./hf-check.mjs";
import { exampleGermanFor } from "./german-a1.mjs";
import { EASY_TEXT } from "./easy-titles.mjs";
import { GERMAN_WORD_VOICE_SETTINGS } from "./voice-settings.mjs";
import { findLessonImage } from "./lesson-image.mjs";
import { dialogueFor } from "./easy-dialogues.mjs";
import { EPISODES, SERIES } from "./easy-series.mjs";
import { buildEasyReelHTML } from "./easy-reel.mjs";
import { renderReelVideo } from "./reel-stage.mjs";
import { accentSpec } from "../music/mood.mjs";
import { sendVideo, sendPhoto } from "./telegram.mjs";
import { aiCastReady, renderAIStage } from "./ai-stage.mjs";
import { sfxFile } from "./sfx.mjs";
import { makeLipsync } from "./ai-lipsync.mjs";

// German titles and hooks for every unit: lib/easy-titles.mjs.
export { EASY_TEXT };

// the approved character looks, saved from tools/character-editor (head, body, height, colour light)
// Photo cards are off (owner, 2026-10-04: "the photo for each topic is not needed"). The series
// episodes never had them; this also switches them off in the older lessons.
export const PHOTO_CARDS = false;
async function itemPicture(it, out) {
  if (!PHOTO_CARDS || !it.img) return null;
  try {
    const hit = await findLessonImage(it.img, it.de);
    if (!hit?.photo || hit.sourceType === "generated-fallback" || !existsSync(hit.photo)) return null;
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", hit.photo, "-vf", "scale=640:640:force_original_aspect_ratio=increase,crop=640:640", "-frames:v", "1", "-q:v", "3", out]);
    return { src: `data:image/jpeg;base64,${readFileSync(out).toString("base64")}`, label: it.de, source: hit.sourceUrl || hit.sourceType || hit.photo };
  } catch (e) {
    console.warn(` ⚠ no picture for "${it.de}": ${e.message}`);
    return null;
  }
}

export function characterLooks(file = "public/3d/characters.json") {
  try { return JSON.parse(readFileSync(file, "utf8")).looks || null; } catch { return null; }
}
export function easyText(unit) {
  const t = EASY_TEXT[unit.id];
  if (t?.title) return t;
  const first = String(unit.items?.[0]?.de || "Deutsch").replace(/[.!?]+$/, "");
  return { title: first, hook: `${first} — hör zu und sprich nach!` };
}

const LEAD = 0.3, GAP = 0.6, PAD = 1.0;
const VOICE = "de-DE-KatjaNeural";

function ffprobeDuration(file) {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file], { encoding: "utf8" });
  return parseFloat(out.trim()) || 0;
}
function say(text, file) {
  const env = { ...process.env, EDGE_TTS_VOICE: VOICE, EDGE_TTS_SPEED: String(GERMAN_WORD_VOICE_SETTINGS.speed), EDGE_TTS_VOL: String(GERMAN_WORD_VOICE_SETTINGS.vol) };
  execFileSync(process.execPath, ["music/edge-tts.mjs", text, "-o", file], { env, stdio: "inherit" });
  if (!existsSync(file)) throw new Error(`German voice did not render: "${text}"`);
  return ffprobeDuration(file);
}

// look: "cartoon" (drawn, lib/easy-cartoon.mjs — the default), "cartoon3d" (the same film with
// 3D toon characters, public/3d/toon-stage.js) or "3d" (the realistic human 3D characters)
export async function runEasyDeutsch(args) {
  const { unit, look = "cartoon" } = args;
  // a written two-person dialogue exists for this unit: build the dialogue lesson
  // a series episode is written for this unit: build it (drama-comedy, full-screen AI shots)
  // No fallback to the older English lesson (owner, 2026-10-04: it must not be delivered again):
  // an episode that cannot be completed fails, nothing is delivered, and the finished shots are
  // kept for the next run.
  if (look === "cartoon3d" && EPISODES[unit.id]) return runSeriesLesson(args);
  if (process.env.SERIES_ONLY === "on") throw new Error(`No series episode is written for "${unit.id}" (lib/easy-series.mjs). Nothing was delivered.`);
  if (look === "cartoon3d" && dialogueFor(unit.id)) return runDialogueLesson(args);
  return runDrillLesson(args);
}

// ---------------------------------------------------------------- the dialogue lesson
// Owner, 2026-10-03: a colloquial two-person conversation in German with a joke in
// each scene, a spoken English explanation, and Persian subtitles under everything.
// Per scene: the dialogue → the English explanation → the key phrase once more,
// then a pause for the learner to say it ("Sprich nach!").
// Voices: Lena = de-DE-KatjaNeural (the approved German voice and its settings);
// Herr Braun = de-DE-ConradNeural, the narrator = en-US-AvaNeural (new, logged in
// VOICE-LOG.md, awaiting the owner's ear).
export const DIALOGUE_VOICES = { lena: "de-DE-KatjaNeural", braun: "de-DE-ConradNeural", krause: "de-DE-AmalaNeural", pfeiffer: "de-DE-KillianNeural", narrator: "en-US-AvaNeural" };
// owner, 2026-10-03: the narrator spoke too fast (1.0 → 0.88; VOICE-LOG.md)
export const NARRATOR_SPEED = 0.88;
function sayAs(who, text, file) {
  const german = who !== "narrator";
  const env = { ...process.env, EDGE_TTS_VOICE: DIALOGUE_VOICES[who], EDGE_TTS_SPEED: String(german ? GERMAN_WORD_VOICE_SETTINGS.speed : NARRATOR_SPEED), EDGE_TTS_VOL: String(GERMAN_WORD_VOICE_SETTINGS.vol) };
  execFileSync(process.execPath, ["music/edge-tts.mjs", text, "-o", file], { env, stdio: "inherit" });
  if (!existsSync(file)) throw new Error(`voice did not render (${who}): "${text}"`);
  return ffprobeDuration(file);
}
// owner, 2026-10-03: the English narrator mispronounced the German words. An explanation is
// split into parts: German in "double quotes" is spoken by Lena's German voice, the rest by
// the English narrator; the parts are joined into one clip.
export function explainParts(en) {
  const parts = []; let last = 0;
  for (const m of String(en).matchAll(/"([^"]+)"/g)) {
    const before = en.slice(last, m.index).trim(); if (/[A-Za-z0-9]/.test(before)) parts.push({ who: "narrator", text: before });
    parts.push({ who: "lena", text: m[1] }); last = m.index + m[0].length;
  }
  const rest = en.slice(last).trim(); if (/[A-Za-z0-9]/.test(rest)) parts.push({ who: "narrator", text: rest });
  return parts;
}
function sayExplain(en, file) {
  const segs = explainParts(en).map((p, i) => { const f = file.replace(/\.mp3$/, `-p${i}.mp3`); sayAs(p.who, p.text, f); return f; });
  // a short breath between the parts, then one clip
  const inputs = segs.flatMap((f) => ["-i", f]);
  const chain = segs.map((_, i) => `[${i}:a]aresample=44100,apad=pad_dur=0.12[s${i}]`).join(";") + ";" + segs.map((_, i) => `[s${i}]`).join("") + `concat=n=${segs.length}:v=0:a=1[out]`;
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", chain, "-map", "[out]", "-c:a", "libmp3lame", "-q:a", "3", file], { stdio: "inherit" });
  for (const f of segs) try { unlinkSync(f); } catch {}
  return ffprobeDuration(file);
}
async function runDialogueLesson({ unit, nextUnit, episodeNo, isCorrection, tg, noTelegram, HF, iso, saveProgress, idx }) {
  const text = easyText(unit), next = easyText(nextUnit), D = dialogueFor(unit.id), id = unit.id;
  const compDir = `compositions/german/${iso}`, outDir = `renders/german/${iso}`, vDir = "music/voice";
  for (const d of [compDir, outDir, vDir]) mkdirSync(d, { recursive: true });
  const parts = [], lines = [], pics = [];
  let n = 0;
  const clip = (who, words) => { const f = `${vDir}/dlg-${id}-${n++}.mp3`; return { file: f, dur: sayAs(who, words, f) }; };
  // hook: a hello wave, then the first joke line
  let t = 1.4;
  const h = clip(D.hook.who, D.hook.de);
  parts.push({ file: h.file, at: t }); lines.push({ who: D.hook.who, de: D.hook.de, fa: D.hook.fa, action: actionFor(D.hook.de), t, dur: h.dur, item: -1, file: h.file });
  t += h.dur + 0.7;
  const hookDur = t;
  // the narrator opens in English (owner, 2026-10-04): English and German lead, Persian is the subtitle
  const introEn = `Learn German with Lena and Herr Braun! Today: ${D.topicEn || text.title}.`;
  const intro = clip("narrator", introEn);
  parts.push({ file: intro.file, at: t }); lines.push({ who: "narrator", en: introEn, fa: `امروز: ${unit.topic}`, t, dur: intro.dur, item: -1 });
  t += intro.dur + 0.5;
  const pictures = await Promise.all(unit.items.map((it, i) => itemPicture({ de: it.de, img: it.img }, `${compDir}/${id}-pic${i}.jpg`)));
  console.log(` pictures: ${pictures.map((p, i) => `${unit.items[i].de} → ${p ? p.source : "none"}`).join(" | ")}`);
  const cuts = [hookDur];
  // fun (owner, 2026-10-04): comedy and game sounds, a beat for the joke, a quiz at the end
  const sfx = (kind, at, gain = 0.45) => parts.push({ file: sfxFile(kind), at: +Math.max(0, at).toFixed(3), gain, keep: true });
  const jokes = [];
  // the story (owner, 2026-10-04: "the narration and content are not exciting"): the whole
  // dialogue plays through as one running story, no narrator between the scenes; each scene
  // ends on its joke with a "ba-dum-tss" and a beat for the laugh
  D.scenes.forEach((sc, i) => {
    const start = t;
    if (pictures[i]) sfx("pop", start - 0.05, 0.4);
    sc.lines.forEach((l, j) => {
      const c = clip(l.who, l.de);
      parts.push({ file: c.file, at: t }); lines.push({ who: l.who, de: l.de, fa: l.fa, hl: sc.say, action: actionFor(l.de), t, dur: c.dur, item: i, file: c.file });
      t += c.dur + 0.35;
      if (j === sc.lines.length - 1) { jokes.push(+(t - 0.3).toFixed(3)); sfx("rimshot", t - 0.3, 0.5); t += 1.1; }
    });
    if (pictures[i]) pics.push({ ...pictures[i], t0: start - 0.1, t1: t - 0.3 });
    cuts.push(+t.toFixed(3));
  });
  // then a quick recap of the lesson's phrases: a bell, the short English meaning, the phrase
  // said by the character who used it in the story, and the learner's turn to say it
  D.scenes.forEach((sc, i) => {
    const owner = (sc.lines.find((l) => l.de.toLowerCase().includes(sc.say.toLowerCase().replace(/[.!?]$/, ""))) || sc.lines[0]);
    sfx("ding", t, 0.35); t += 0.35;
    const ef = `${vDir}/dlg-${id}-${n++}.mp3`, e = { file: ef, dur: sayExplain(sc.gloss || sc.en, ef) };
    parts.push({ file: e.file, at: t }); lines.push({ who: "narrator", en: sc.gloss || sc.en, fa: sc.gloss ? unit.items[i].fa || owner.fa : sc.enFa, t, dur: e.dur, item: i });
    t += e.dur + 0.3;
    const k = clip(owner.who, sc.say);
    parts.push({ file: k.file, at: t }); lines.push({ who: owner.who, de: sc.say, fa: unit.items[i].fa || owner.fa, action: "none", t, dur: k.dur, pause: k.dur + 0.8, item: i, key: true, file: k.file });
    t += k.dur + k.dur + 0.8 + 0.4;
  });
  cuts.push(+t.toFixed(3));
  // the quiz in English: "how do you say <English> in German?", a 3-2-1 countdown, the German
  // answer from the character, then the English once more (owner, 2026-10-04)
  const qi = Number(episodeNo) % D.scenes.length, qs = D.scenes[qi];
  const qOwner = qs.lines.find((l) => l.de.toLowerCase().includes(qs.say.toLowerCase().replace(/[.!?]$/, ""))) || qs.lines[0];
  const qEn = qs.gloss || qs.say;
  const quiz = { t0: +t.toFixed(3), ask: "How do you say it in German?", en: qEn, fa: unit.items[qi].fa || qOwner.fa, de: qs.say };
  const qn = clip("narrator", `Quick quiz! How do you say: ${qEn.replace(/[.!?]+$/, "")}, in German?`);
  parts.push({ file: qn.file, at: t + 0.3 });
  quiz.tc = +(t + 0.3 + qn.dur + 0.3).toFixed(3);
  [0, 1, 2].forEach((k) => sfx("tick", quiz.tc + k, 0.5));
  quiz.ta = +(quiz.tc + 3).toFixed(3);
  sfx("tada", quiz.ta, 0.45);
  const qa = clip(qOwner.who, qs.say);
  parts.push({ file: qa.file, at: quiz.ta + 0.25 });
  const speech = [{ who: qOwner.who, t: +(quiz.ta + 0.25).toFixed(3), dur: qa.dur, file: qa.file, key: true, item: 90 }];
  t = quiz.ta + 0.25 + qa.dur + 0.35;
  const qe = clip("narrator", qEn);
  parts.push({ file: qe.file, at: t });
  t += qe.dur + 0.8;
  quiz.t1 = +t.toFixed(3);
  cuts.push(quiz.t1);
  const outroAt = t;
  const outroLine = "Bis morgen – tschüss!";
  const o = clip("lena", `${outroLine} Nächstes Mal: ${next.title}.`);
  parts.push({ file: o.file, at: outroAt + 0.4 });
  speech.push({ who: "lena", t: +(outroAt + 0.4).toFixed(3), dur: o.dur, file: o.file, key: true, item: 91 });
  const duration = +(outroAt + Math.max(3.6, o.dur + 1.4)).toFixed(3);
  console.log(` EasyDeutsch dialogue ${id}: ${duration}s, ${lines.length} lines`);

  const voice = `${vDir}/dlg-${id}.m4a`;
  const delays = parts.map((p, i) => `[${i + 1}:a]${p.gain ? `volume=${p.gain},` : ""}${p.fx ? `${p.fx},` : ""}adelay=${Math.round(p.at * 1000)}|${Math.round(p.at * 1000)}[v${i}]`).join(";");
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-t", String(duration), "-i", "anullsrc=r=44100:cl=stereo",
    ...parts.flatMap((p) => ["-i", p.file]),
    "-filter_complex", `${delays};[0:a]${parts.map((_, i) => `[v${i}]`).join("")}amix=inputs=${parts.length + 1}:duration=first:normalize=0[m];[m]loudnorm=I=-16:TP=-2:LRA=11[out]`,
    "-map", "[out]", "-c:a", "aac", "-b:a", "192k", voice], { stdio: "inherit" });

  const comp = `${compDir}/${id}-easy-dialogue.html`;
  // The people: AI-animated clips of Lena and Herr Braun (lib/ai-stage.mjs, library made by
  // ai-cast/build.py) when the library is complete; else the flat 2D cartoon
  // (public/2d/cartoon-stage.js). The owner rejected both 3D casts (2026-10-04).
  let cast = "cartoon2d", stageVideo = null;
  if (aiCastReady()) {
    mkdirSync("public/ai-cast/stage", { recursive: true });
    stageVideo = `public/ai-cast/stage/${id}-${iso}.mp4`;
    // real lip-sync for every line that fits the model's clip (owner, 2026-10-04)
    const stageLines = [...lines, ...speech];
    makeLipsync({ lines: stageLines, work: `${outDir}/${id}-lipsync` });
    renderAIStage({ lines: stageLines, outroAt, total: duration, out: stageVideo, work: `${outDir}/${id}-ai-stage` });
    cast = "aiclips";
  }
  console.log(` stage: ${cast}`);
  // two looks of the same film: the EasyDeutsch look for Instagram, TikTok's own colours
  // for TikTok (owner, 2026-10-04)
  const silentFor = {};
  for (const theme of ["easy", "tiktok"]) {
    const c = theme === "tiktok" ? comp.replace(/\.html$/, "-tiktok.html") : comp;
    writeFileSync(c, buildEasyCartoonHTML({ episodeNo, title: text.title, lines, hookDur, outroAt, total: duration, three: true, dialogue: true, cast, stageVideo, theme,
      jokes, quiz, teaser: { en: "Stay for the quiz at the end!", fa: "آخر ویدیو یک کوییز داری!" }, outroEn: "See you tomorrow – bye!",
      setting: animSettingFor(id), hook: D.hook.de, hookFa: D.hook.fa, outroText: outroLine, outroFa: "تا فردا، خدا حافظ!", nextTitle: next.title, looks: characterLooks(), pics }));
    assertComposition(c, { cli: HF });
    const silent = `${outDir}/${id}-easy-dialogue-${theme}-silent.mp4`;
    execSync(`${HF} render -c "${c}" --quality high --fps 30 -o "${silent}"`, { stdio: "inherit" });
    silentFor[theme] = silent;
  }
  await deliver({ id, iso, episodeNo, text, duration, cuts, voice, silentIn: silentFor.easy, silentFor, parts, tg, noTelegram, isCorrection, saveProgress, idx, outDir });
}

// The comedy series (owner, 2026-10-04, after four reference shorts): not a lesson. Each episode
// is a funny everyday situation told in full-screen AI shots; the characters speak; the line is on
// the picture in a caption card. It ends on a cliffhanger and "to be continued". One engine, two
// series: «Die Nachbarn» (German, Persian subtitle: GERMAN_SERIES) and the Afghan family abroad
// (Persian: lib/family-series.mjs, built by family-build.mjs). Nothing is lessons, English or photo cards.
export function sayEdge(spec, text, file) {
  const env = { ...process.env, EDGE_TTS_VOICE: spec.voice, EDGE_TTS_SPEED: String(spec.speed ?? GERMAN_WORD_VOICE_SETTINGS.speed), EDGE_TTS_VOL: String(GERMAN_WORD_VOICE_SETTINGS.vol) };
  if (spec.pitch) env.EDGE_TTS_PITCH = spec.pitch; else delete env.EDGE_TTS_PITCH;
  execFileSync(process.execPath, ["music/edge-tts.mjs", text, "-o", file], { env, stdio: "inherit" });
  if (!existsSync(file)) throw new Error(`voice did not render: "${text}"`);
  return ffprobeDuration(file);
}

// Shot folders of episodes that are no longer queued are deleted, oldest first, so the CI cache
// (10 GB per repository) never fills up with finished episodes.
export function pruneShotFolders(root, keep, max = 6) {
  if (!existsSync(root)) return;
  const dirs = readdirSync(root).filter((d) => !keep.includes(d)).map((d) => ({ d, t: statSync(`${root}/${d}`).mtimeMs })).sort((x, y) => y.t - x.t);
  for (const { d } of dirs.slice(Math.max(0, max - keep.length))) rmSync(`${root}/${d}`, { recursive: true, force: true });
}

// A contact sheet of the stills of an episode, sent to the owner's bot chat and committed under
// ai-cast/contact: the CI renders cannot be looked at, so the identity of the characters can be.
export function contactSheet(jobs, out) {
  mkdirSync(dirname(out), { recursive: true });
  const code = "import sys\nfrom PIL import Image\nfs=sys.argv[2:]\nn=len(fs)\ncols=min(6,n)\nrows=(n+cols-1)//cols\nW,H=180,320\nim=Image.new('RGB',(cols*W,rows*H),'#222')\nfor i,f in enumerate(fs):\n    im.paste(Image.open(f).convert('RGB').resize((W,H)),((i%cols)*W,(i//cols)*H))\nim.save(sys.argv[1],quality=82)\n";
  execFileSync("python3", ["-c", code, out, ...jobs.map((j) => j.png)], { stdio: "inherit" });
  return out;
}

export const SERIES_TARGET = 61.5, SERIES_MIN = 60, SERIES_MAX = 65;
const norm = (x) => String(x).toLowerCase().replace(/[^a-zäöüß ]/g, "").trim();
export async function runSeries(cfg, { unit, nextUnit, episodeNo, isCorrection, tg, noTelegram, HF, iso, saveProgress, idx }) {
  const E = cfg.episodes[unit.id], id = unit.id;
  if (!E) throw new Error(`No ${cfg.key} series episode is written for "${id}".`);
  const text = { title: E.title };
  const compDir = `compositions/${cfg.key}/${iso}`, outDir = `renders/${cfg.key}/${iso}`, vDir = "music/voice";
  // the shots live in a stable folder (not under the date): CI keeps it between runs, so a
  // re-render with a new look or a new caption does not pay for the AI shots again
  const shotRoot = "renders/series-shots", shotName = cfg.shotPrefix ? `${cfg.shotPrefix}${id}` : id, shotDir = `${shotRoot}/${shotName}`;
  for (const d of [compDir, outDir, vDir, shotDir]) mkdirSync(d, { recursive: true });
  pruneShotFolders(shotRoot, [shotName], 8);

  // 1. the voice and the timing of every line
  const parts = [], caps = [], segs = [], cuts = [];
  let n = 0;
  const chars = cfg.series.characters;
  const BEAT = 0.5;                                         // all three formats run at 120 bpm: every cut lands on a beat
  const q = (x) => Math.ceil(x / BEAT - 1e-6) * BEAT;
  const REVERB = new Set(["flur", "treppe", "keller", "saal", "supermarkt", "kasse", "hof"]);   // rooms with an echo
  // 1a. every line is spoken once (the voice of its character); a shot has one or more lines: the
  // character on the picture, and replies of the others heard from off-screen (a reaction shot).
  const shots = E.shots.map((s) => ({
    ...s,
    lines: (s.lines || [{ by: s.who, say: s.say, fa: s.fa, hl: s.hl, joke: s.joke, sfx: s.sfx }]).map((l) => ({ ...l, by: l.by || s.who })),
  }));
  for (const s of shots) for (const l of s.lines) { const f = `${vDir}/${cfg.key}-${id}-${n++}.mp3`; l.file = f; l.dur = sayEdge(chars[l.by], l.say, f); }
  // 1b. the timing. Natural pace: a line follows the one before after a short breath (a longer pause
  // before a punchline, an overlap when a line cuts in); the shot is held a beat after its last line.
  // A story shorter than a minute is stretched by holding every shot a little longer (a reaction).
  const layout = (slack, tight = false) => {
    let t = 0, lastLoc = null;
    const out = [], cutAt = [];
    for (const s of shots) {
      const t0 = t; let cur = t0 + 0.1; const ls = [];
      s.lines.forEach((l, i) => {
        const gap = i === 0 ? 0 : (l.gap ?? (l.joke ? 0.5 : l.cut ? -0.2 : 0.22)) * (tight ? 0.6 : 1);
        const start = cur + gap; ls.push({ ...l, start }); cur = start + l.dur;
      });
      const lastJoke = s.lines[s.lines.length - 1].joke;
      const len = q(cur - t0 + (tight ? 0.15 : 0.35) + (lastJoke ? (tight ? 0.3 : 0.5) : 0) + slack);
      if (s.loc !== lastLoc) { if (lastLoc) cutAt.push(+t0.toFixed(3)); lastLoc = s.loc; }
      out.push({ ...s, t0, t1: t0 + len, len, lines: ls, idx: out.length });
      t += len;
    }
    return { out, cutAt, endT: t, tight };
  };
  const END_HOLD = 3.5;
  let L = layout(0);
  if (L.endT + END_HOLD > SERIES_MAX - 0.5) L = layout(0, true);   // a long story: shorter breaths, same lines
  if (L.endT + END_HOLD < SERIES_TARGET) L = layout(Math.max(0, (SERIES_TARGET - END_HOLD - L.endT) / shots.length), L.tight);
  const timed = L.out, endT = L.endT;
  cuts.push(...L.cutAt);
  const dips = [];                                          // the music steps back for a punchline
  let lastLoc = null;
  const sfx = (kind, at, gain = 0.45) => parts.push({ file: sfxFile(kind), at: +Math.max(0, at).toFixed(3), gain, keep: true });
  for (const s of timed) {
    const verb = REVERB.has(s.loc) ? "aecho=0.8:0.55:45|90:0.22|0.1" : "";
    s.lines.forEach((l, i) => {
      parts.push({ file: l.file, at: +l.start.toFixed(3), fx: verb });
      const next = s.lines[i + 1];
      caps.push({ t0: +l.start.toFixed(3), t1: +(next ? Math.max(next.start, l.start + 1) : s.t1 - 0.05).toFixed(3), de: l.say, fa: cfg.rtl ? "" : l.fa, hl: l.hl, who: l.by, whoName: l.as || chars[l.by].name, rtl: !!cfg.rtl });
      if (l.joke) { dips.push([+(l.start + l.dur - 0.4).toFixed(2), +(l.start + l.dur + 0.9).toFixed(2)]); if (l.rim) sfx("rimshot", l.start + l.dur - 0.1, 0.4); }
      if (l.sfx) sfx(l.sfx, l.sfx === "drill" ? l.start + l.dur - 0.3 : l.sfx === "stamp" ? l.start + l.dur - 0.08 : l.start - 0.05, l.sfx === "vacuum" ? 0.5 : 0.45);
    });
    if (lastLoc !== null && s.loc !== lastLoc) parts.push({ file: "music/sfx/whoosh-short.mp3", at: +Math.max(0, s.t0 - 0.12).toFixed(3), gain: 0.3, keep: true });   // a real whoosh at a scene change
    lastLoc = s.loc;
  }
  const lastShot = timed[timed.length - 1];
  sfx("sting", lastShot.t0 + 0.9, 0.5);                   // the cliffhanger: dun-dun
  const duration = +Math.max(endT + END_HOLD, SERIES_MIN).toFixed(3);   // never under 60 s (the end card holds on if the story is short)
  if (duration > SERIES_MAX) throw new Error(`${cfg.key} episode ${id} is ${duration}s long; the limit is ${SERIES_MAX}s. Shorten its lines or drop a shot (before any GPU time is spent).`);
  segs.push({ t0: endT, t1: duration, shot: lastShot.idx });
  for (const s of timed) segs.push({ t0: s.t0, t1: s.t1, shot: s.idx });
  segs.sort((a, b) => a.t0 - b.t0);
  const end = { ...cfg.endCard(E, endT), t0: +(endT + 0.2).toFixed(3) };
  cuts.push(+endT.toFixed(3));
  console.log(` ${cfg.key} series ${id}: ${duration}s, ${timed.length} shots`);

  // 2. the shots: a vertical still and a motion clip each (ai-cast/shots.py, Hugging Face)
  const jobs = timed.map((s) => ({ id: `s${s.idx}`, chars: s.chars || [s.who], prompt: s.scene, motion: s.motion, seed: 1207 + s.idx * 11, dur: +s.len.toFixed(2),
    png: `${shotDir}/s${s.idx}.png`, mp4: `${shotDir}/s${s.idx}.mp4` }));
  writeFileSync(`${shotDir}/jobs.v2.json`, JSON.stringify({ style: cfg.style, cast: cfg.cast, jobs }, null, 2));
  try { execFileSync("python3", ["ai-cast/shots.py", `${shotDir}/jobs.v2.json`], { stdio: "inherit" }); } catch (e) { console.error(`   ◇ shots: ${String(e.message).split("\n")[0]}`); }
  const missing = jobs.filter((j) => !existsSync(j.png) || !existsSync(j.mp4));
  if (missing.length) throw new Error(`${missing.length} of ${jobs.length} series shot(s) are missing (the daily Hugging Face GPU quota?). The finished shots are kept; run again after the quota resets. Nothing was delivered.`);
  console.log(` series shots: ${jobs.filter((j) => existsSync(j.mp4)).length} of ${jobs.length} with motion`);
  // the owner cannot see a CI render: the stills of the episode go to the bot chat as one sheet
  try {
    const sheet = contactSheet(jobs, `ai-cast/contact/${cfg.key}-${id}.jpg`);
    if (tg.enabled && !isCorrection && !existsSync(`${shotDir}/.sheet-sent`)) {
      await sendPhoto({ token: tg.token, chatId: tg.reviewChatId, file: sheet, caption: `${cfg.series.title} · ${E.title}: contact sheet` });
      writeFileSync(`${shotDir}/.sheet-sent`, "1");
    }
  } catch (e) { console.error(`   ◇ contact sheet: ${String(e.message).split("\n")[0]}`); }

  // 3. the voice mix
  const voice = `${vDir}/${cfg.key}-${id}.m4a`;
  const delays = parts.map((p, i) => `[${i + 1}:a]${p.gain ? `volume=${p.gain},` : ""}${p.fx ? `${p.fx},` : ""}adelay=${Math.round(p.at * 1000)}|${Math.round(p.at * 1000)}[v${i}]`).join(";");
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-t", String(duration), "-i", "anullsrc=r=44100:cl=stereo",
    ...parts.flatMap((p) => ["-i", p.file]),
    "-filter_complex", `${delays};[0:a]${parts.map((_, i) => `[v${i}]`).join("")}amix=inputs=${parts.length + 1}:duration=first:normalize=0[m];[m]loudnorm=I=-16:TP=-2:LRA=11[out]`,
    "-map", "[out]", "-c:a", "aac", "-b:a", "192k", voice], { stdio: "inherit" });

  // 4. the film: the shots under the captions, in the EasyDeutsch look and in TikTok's
  mkdirSync("public/ai-cast/stage", { recursive: true });
  const video = `public/ai-cast/stage/${cfg.key}-${id}-${iso}.mp4`;
  renderReelVideo({ segments: segs.map((s) => ({ t0: s.t0, t1: s.t1, png: jobs[s.shot].png, mp4: jobs[s.shot].mp4 })), out: video, work: `${outDir}/${id}-series-parts` });
  const silentFor = {};
  for (const theme of ["easy", "tiktok", "youtube"]) {
    const c = `${compDir}/${id}-series-${theme}.html`;
    writeFileSync(c, buildEasyReelHTML({ episodeNo, seriesTitle: cfg.series.title, title: E.title, total: duration, video, theme, caps, end, brand: cfg.brand && { ...cfg.brand, sub: typeof cfg.brand.sub === "function" ? cfg.brand.sub(E, episodeNo) : `${cfg.brand.sub}${episodeNo}` } }));
    assertComposition(c, { cli: HF });
    const silent = `${outDir}/${id}-series-${theme}-silent.mp4`;
    execSync(`${HF} render -c "${c}" --quality high --fps 30 -o "${silent}"`, { stdio: "inherit" });
    silentFor[theme] = silent;
  }
  const caption = cfg.caption(E, episodeNo);
  await deliver({ id, iso, episodeNo, text, duration, caption, cuts: [...new Set(cuts)].sort((x, y) => x - y), voice, silentIn: silentFor.easy, silentFor, parts, tg, noTelegram, isCorrection, saveProgress, idx, outDir, brand: cfg.deliverBrand, dips });
}

export const GERMAN_SERIES = {
  key: "german", series: SERIES, episodes: EPISODES, shotPrefix: "", rtl: false,
  style: undefined, cast: undefined, deliverBrand: undefined,
  brand: { title: SERIES.title, sub: (E) => (E.challenge ? `Challenge: ${E.challenge}` : "EasyDeutsch") },
  endCard: (E) => ({ t0: 0, de: "Fortsetzung folgt …", fa: "ادامه دارد …", small: `Nächste Folge: ${E.next.de}`, smallFa: `قسمت بعد: ${E.next.fa}` }),
  caption: (E, no) => `😂 ${SERIES.title} · Folge ${no} — ${E.title}\n${E.titleFa ? `${E.titleFa}\n` : ""}\n#DieNachbarn #Comedy #Alltag #Deutschland #Deutschlernen #LearnGerman #fyp`,
};
function runSeriesLesson(args) { return runSeries(GERMAN_SERIES, args); }

// both formats (TikTok, Instagram): the same film, each with its own music, mixed under the voice
export async function deliver({ id, iso, episodeNo, text, duration, caption: customCaption, cuts, voice, silentIn, silentFor = {}, parts, tg, noTelegram, isCorrection, saveProgress, idx, outDir, brand = { label: "EasyDeutsch", file: "easydeutsch" }, dips = [] }) {
  const formats = [
    { slug: "tiktok-easy", label: `TikTok (${brand.label})`, mood: "play", bpm: 120, musicVariant: 1 },
    { slug: "instagram-easy", label: `Instagram (${brand.label})`, mood: "craft", bpm: 120, musicVariant: 3 },
    // YouTube Shorts: the same film in YouTube's white and red (only the series episodes make one)
    ...(silentFor.youtube ? [{ slug: "youtube-easy", label: `YouTube Shorts (${brand.label})`, mood: "play", bpm: 120, musicVariant: 2 }] : []),
  ];
  const caption = customCaption || `🇩🇪 EasyDeutsch | A1 · ${episodeNo} — ${text.title}\n\n#DeutschLernen #LearnGerman #EasyDeutsch #GermanA1 #Deutschkurs`;
  const videos = [];
  for (const f of formats) {
    const music = `music/auto/${brand.file === "easydeutsch" ? "easy" : brand.file}-${id}-${f.slug}.m4a`;
    execSync(`node music/make-one.mjs ${duration} ${f.musicVariant} "${music}" 4`, {
      stdio: "inherit", env: { ...process.env, MUSIC_CUTS: cuts.join(","), MUSIC_MOOD: f.mood, MUSIC_BPM: String(f.bpm), MUSIC_ACCENTS: accentSpec(cuts, cuts.map(() => "")) },
    });
    const bed = existsSync(music) ? music : "music/bed-60s-v1.m4a";
    const final = `${outDir}/${brand.file}-${id}-${iso}-${f.slug}.mp4`;
    execSync(
      `ffmpeg -y -hide_banner -loglevel error -i "${(f.slug.startsWith("tiktok") && silentFor.tiktok) || (f.slug.startsWith("youtube") && silentFor.youtube) || silentIn}" -i "${bed}" -i "${voice}" ` +
      `-filter_complex "[1:a]volume=${dips.length ? 0.42 : 0.6}${dips.map(([a, b]) => `,volume=0.25:enable='between(t,${a},${b})'`).join("")}[m];[m][2:a]sidechaincompress=threshold=0.02:ratio=20:attack=8:release=260:makeup=1[duck];[duck][2:a]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5[a]" ` +
      `-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${final}"`, { stdio: "inherit" });
    videos.push({ ...f, final });
  }
  for (const p of parts) if (!p.keep && existsSync(p.file)) try { unlinkSync(p.file); } catch {}
  if (tg.enabled) {
    for (const v of videos) {
      const res = await sendVideo({ token: tg.token, chatId: tg.reviewChatId, file: v.final, caption: v.slug.startsWith("youtube") ? `${caption} #Shorts` : caption });
      if (!res?.message_id) throw new Error(`${v.label} was not confirmed by Telegram.`);
      console.log(` ✈ ${v.label} sent to Telegram (message ${res.message_id})`);
    }
  } else if (!noTelegram) {
    throw new Error("Telegram is not configured; refusing to mark a local-only render as delivered.");
  }
  if (!isCorrection) saveProgress(idx + 1);
  console.log(`\n✅ EasyDeutsch episode ${episodeNo} ready: ${videos.map((v) => v.final).join(" | ")}`);
}

// ---------------------------------------------------------------- the drill lesson (units without a dialogue)
async function runDrillLesson({ unit, nextUnit, episodeNo, isCorrection, tg, noTelegram, HF, iso, saveProgress, idx, look = "cartoon" }) {
  const text = easyText(unit), next = easyText(nextUnit);
  const items = unit.items.map((it) => {
    const exDe = exampleGermanFor(it) ? String(it.example).split(" — ")[0].trim() : "";
    return { de: it.de, fa: "", exDe, exFa: "", img: it.img || "" };
  });
  const outroLine = "Bis morgen – tschüss!";
  const loopLine = "Hör zu und sprich nach.";
  const compDir = `compositions/german/${iso}`, outDir = `renders/german/${iso}`, vDir = "music/voice";
  for (const d of [compDir, outDir, vDir]) mkdirSync(d, { recursive: true });

  // ---- voice: every clip measured, the scenes timed to it
  const id = unit.id;
  const hookFile = `${vDir}/easy-${id}-hook.mp3`, outroFile = `${vDir}/easy-${id}-outro.mp3`;
  const hookDur = say(`${text.hook} ${loopLine}`, hookFile);
  const tips = items.map((it, i) => {
    const deFile = `${vDir}/easy-${id}-de${i}.mp3`, exFile = `${vDir}/easy-${id}-ex${i}.mp3`;
    const deDur = say(it.de, deFile);
    const exDur = it.exDe ? say(it.exDe, exFile) : 0;
    return { deFile, deDur, exFile: it.exDe ? exFile : null, exDur };
  });
  const outroDur = say(`${outroLine} Nächstes Mal: ${next.title}.`, outroFile);
  const hookDuration = +Math.max(3.5, LEAD + hookDur + 0.8).toFixed(3);
  // said, said again for the learner to repeat, then the example
  const beats = tips.map((t) => {
    const again = LEAD + t.deDur + GAP;
    const ex = again + t.deDur + GAP;
    return { de: LEAD, deDur: t.deDur, again, ex, exDur: t.exDur, fa: ex + t.exDur + 0.2 };
  });
  const tipDurations = tips.map((t, i) => +(beats[i].ex + t.exDur + PAD).toFixed(3));
  const outroDuration = +Math.max(3.6, outroDur + 1.2).toFixed(3);
  const duration = +(hookDuration + tipDurations.reduce((a, d) => a + d, 0) + outroDuration).toFixed(3);
  console.log(` EasyDeutsch ${id}: ${duration}s, ${items.length} sentences`);

  const parts = [{ file: hookFile, at: LEAD }];
  let t0 = hookDuration;
  tips.forEach((t, i) => {
    parts.push({ file: t.deFile, at: t0 + beats[i].de }, { file: t.deFile, at: t0 + beats[i].again });
    if (t.exFile) parts.push({ file: t.exFile, at: t0 + beats[i].ex });
    t0 += tipDurations[i];
  });
  parts.push({ file: outroFile, at: t0 + LEAD });
  const voice = `${vDir}/easy-${id}.m4a`;
  const delays = parts.map((p, i) => `[${i + 1}:a]adelay=${Math.round(p.at * 1000)}|${Math.round(p.at * 1000)}[v${i}]`).join(";");
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-t", String(duration), "-i", "anullsrc=r=44100:cl=stereo",
    ...parts.flatMap((p) => ["-i", p.file]),
    "-filter_complex", `${delays};[0:a]${parts.map((_, i) => `[v${i}]`).join("")}amix=inputs=${parts.length + 1}:duration=first:normalize=0[m];[m]loudnorm=I=-16:TP=-2:LRA=11[out]`,
    "-map", "[out]", "-c:a", "aac", "-b:a", "192k", voice], { stdio: "inherit" });

  const cuts = [hookDuration]; { let acc = hookDuration; for (const d of tipDurations) { acc += d; cuts.push(+acc.toFixed(3)); } }
  const formats = [
    { slug: "tiktok-easy", label: "TikTok (EasyDeutsch)", variant: "tiktok", mood: "play", bpm: 124, musicVariant: 1 },
    { slug: "instagram-easy", label: "Instagram (EasyDeutsch)", variant: "instagram", mood: "craft", bpm: 118, musicVariant: 3 },
  ];
  const caption = `🇩🇪 EasyDeutsch | A1 · ${episodeNo} — ${text.title}\n\n#DeutschLernen #LearnGerman #EasyDeutsch #GermanA1 #Deutschkurs`;
  // The stage. "3d": the two human characters on motion capture (lib/build-3d.mjs).
  // "cartoon": hand-drawn vector characters with lip-sync and gestures
  // (lib/easy-cartoon.mjs) — the look of the dialogue shorts the owner sent.
  const cartoon = look !== "3d";
  let stageVideo = null;
  if (!cartoon) {
    ensure3DAssets();
    mkdirSync("public/3d/stage", { recursive: true });
    const stageComp = `${compDir}/${id}-easy-stage3d.html`;
    stageVideo = `public/3d/stage/easy-${id}-${iso}.mp4`;
    writeFileSync(stageComp, build3DStageHTML({ setting: animSettingFor(id), items, beats, hookDuration, tipDurations, outroDuration }));
    assertComposition(stageComp, { cli: HF });
    execSync(`${HF} render -c "${stageComp}" --quality high --fps 30 -o "${stageVideo}"`, { stdio: "inherit" });
    if (!existsSync(stageVideo)) throw new Error(`3D stage did not render for "${id}"`);
  }
  let cartoonSilent = null;
  // a real photo of each word, shown on a card while it is taught (owner, 2026-09-29).
  // Same search and relevance gate as the older lessons (lib/lesson-image.mjs); a word
  // with no real or labelled-AI photo gets no card: never a placeholder graphic.
  const pictures = await Promise.all(items.map((it, i) => itemPicture(it, `${compDir}/${id}-pic${i}.jpg`)));
  console.log(` pictures: ${pictures.map((p, i) => `${items[i].de} → ${p ? p.source : "none"}`).join(" | ")}`);
  const renderCartoon = () => {
    if (cartoonSilent) return cartoonSilent;
    const lines = [], pics = []; let start = hookDuration;
    items.forEach((it, i) => {
      const b = beats[i], a = i % 2 === 0 ? "lena" : "braun", o = a === "lena" ? "braun" : "lena";
      lines.push({ who: a, de: it.de, action: actionFor(it.de), t: start + b.de, dur: tips[i].deDur, again: { dur: tips[i].deDur, gap: b.again - b.de - tips[i].deDur }, item: i });
      if (it.exDe) lines.push({ who: o, de: it.exDe, action: actionFor(it.exDe), t: start + b.ex, dur: tips[i].exDur, item: i });
      if (pictures[i]) pics.push({ ...pictures[i], t0: start + b.de - 0.1, t1: start + tipDurations[i] - 0.1 });
      start += tipDurations[i];
    });
    const comp = `${compDir}/${id}-easy-cartoon.html`;
    writeFileSync(comp, buildEasyCartoonHTML({ episodeNo, title: text.title, lines, hookDur: hookDuration, outroAt: hookDuration + tipDurations.reduce((x, d) => x + d, 0), total: duration, three: look === "cartoon3d",
      setting: animSettingFor(id), hook: text.hook, outroText: outroLine, nextTitle: next.title, looks: characterLooks(), pics }));
    assertComposition(comp, { cli: HF });
    cartoonSilent = `${outDir}/${id}-easy-cartoon-silent.mp4`;
    execSync(`${HF} render -c "${comp}" --quality high --fps 30 -o "${cartoonSilent}"`, { stdio: "inherit" });
    return cartoonSilent;
  };

  const videos = [];
  for (const f of formats) {
    const comp = `${compDir}/${id}-${f.slug}.html`;
    if (!cartoon) writeFileSync(comp, buildAnimHTML({
      easy: true, variant: f.variant, setting: animSettingFor(id), episodeNo, total: 100,
      topic: text.title, hook: text.hook, loopLine, nextTopic: next.title, outroLine,
      items, beats, hookDuration, tipDurations, outroDuration, duration, stageVideo,
    }));
    if (!cartoon) assertComposition(comp, { cli: HF });
    const music = `music/auto/easy-${id}-${f.slug}.m4a`;
    execSync(`node music/make-one.mjs ${duration} ${f.musicVariant} "${music}" 4`, {
      stdio: "inherit",
      env: { ...process.env, MUSIC_CUTS: cuts.join(","), MUSIC_MOOD: f.mood, MUSIC_BPM: String(f.bpm), MUSIC_ACCENTS: accentSpec(cuts, ["", "", "", "", ""]) },
    });
    const bed = existsSync(music) ? music : "music/bed-60s-v1.m4a";
    const silent = `${outDir}/${id}-${f.slug}-silent.mp4`, final = `${outDir}/easydeutsch-${id}-${iso}-${f.slug}.mp4`;
    if (!cartoon) execSync(`${HF} render -c "${comp}" --quality high --fps 30 -o "${silent}"`, { stdio: "inherit" });
    const silentIn = cartoon ? renderCartoon() : silent;
    execSync(
      `ffmpeg -y -hide_banner -loglevel error -i "${silentIn}" -i "${bed}" -i "${voice}" ` +
      `-filter_complex "[1:a]volume=0.7[m];[m][2:a]sidechaincompress=threshold=0.02:ratio=20:attack=8:release=260:makeup=1[duck];[duck][2:a]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5[a]" ` +
      `-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${final}"`,
      { stdio: "inherit" },
    );
    videos.push({ ...f, final });
  }
  for (const p of parts) if (!p.keep && existsSync(p.file)) try { unlinkSync(p.file); } catch {}

  if (tg.enabled) {
    for (const v of videos) {
      const res = await sendVideo({ token: tg.token, chatId: tg.reviewChatId, file: v.final, caption });
      if (!res?.message_id) throw new Error(`${v.label} was not confirmed by Telegram.`);
      console.log(` ✈ ${v.label} sent to Telegram (message ${res.message_id})`);
    }
  } else if (!noTelegram) {
    throw new Error("Telegram is not configured; refusing to mark a local-only render as delivered.");
  }
  if (!isCorrection) saveProgress(idx + 1);
  console.log(`\n✅ EasyDeutsch episode ${episodeNo} ready: ${videos.map((v) => v.final).join(" | ")}`);
}
