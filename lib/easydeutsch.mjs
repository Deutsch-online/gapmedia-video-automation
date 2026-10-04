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
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
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
import { accentSpec } from "../music/mood.mjs";
import { sendVideo } from "./telegram.mjs";

// German titles and hooks for every unit: lib/easy-titles.mjs.
export { EASY_TEXT };

// the approved character looks, saved from tools/character-editor (head, body, height, colour light)
async function itemPicture(it, out) {
  if (!it.img) return null;
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
export const DIALOGUE_VOICES = { lena: "de-DE-KatjaNeural", braun: "de-DE-ConradNeural", narrator: "en-US-AvaNeural" };
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
  parts.push({ file: h.file, at: t }); lines.push({ who: D.hook.who, de: D.hook.de, fa: D.hook.fa, action: actionFor(D.hook.de), t, dur: h.dur, item: -1 });
  t += h.dur + 0.7;
  const hookDur = t;
  const pictures = await Promise.all(unit.items.map((it, i) => itemPicture({ de: it.de, img: it.img }, `${compDir}/${id}-pic${i}.jpg`)));
  console.log(` pictures: ${pictures.map((p, i) => `${unit.items[i].de} → ${p ? p.source : "none"}`).join(" | ")}`);
  const cuts = [hookDur];
  D.scenes.forEach((sc, i) => {
    const start = t;
    for (const l of sc.lines) {
      const c = clip(l.who, l.de);
      parts.push({ file: c.file, at: t }); lines.push({ who: l.who, de: l.de, fa: l.fa, hl: sc.say, action: actionFor(l.de), t, dur: c.dur, item: i });
      t += c.dur + 0.35;
    }
    t += 0.3;
    const ef = `${vDir}/dlg-${id}-${n++}.mp3`, e = { file: ef, dur: sayExplain(sc.en, ef) };
    parts.push({ file: e.file, at: t }); lines.push({ who: "narrator", en: sc.en, fa: sc.enFa, t, dur: e.dur, item: i });
    t += e.dur + 0.45;
    // the key phrase once more, said by whoever said it in the dialogue, then the learner's turn
    const owner = (sc.lines.find((l) => l.de.toLowerCase().includes(sc.say.toLowerCase().replace(/[.!?]$/, ""))) || sc.lines[0]);
    const k = clip(owner.who, sc.say);
    parts.push({ file: k.file, at: t }); lines.push({ who: owner.who, de: sc.say, fa: unit.items[i].fa || owner.fa, action: "none", t, dur: k.dur, pause: k.dur + 0.9, item: i, key: true });
    t += k.dur + k.dur + 0.9 + 0.6;
    if (pictures[i]) pics.push({ ...pictures[i], t0: start - 0.1, t1: t - 0.2 });
    cuts.push(+t.toFixed(3));
  });
  const outroAt = t;
  const outroLine = "Bis morgen – tschüss!";
  const o = clip("lena", `${outroLine} Nächstes Mal: ${next.title}.`);
  parts.push({ file: o.file, at: outroAt + 0.4 });
  const duration = +(outroAt + Math.max(3.6, o.dur + 1.4)).toFixed(3);
  console.log(` EasyDeutsch dialogue ${id}: ${duration}s, ${lines.length} lines`);

  const voice = `${vDir}/dlg-${id}.m4a`;
  const delays = parts.map((p, i) => `[${i + 1}:a]adelay=${Math.round(p.at * 1000)}|${Math.round(p.at * 1000)}[v${i}]`).join(";");
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-t", String(duration), "-i", "anullsrc=r=44100:cl=stereo",
    ...parts.flatMap((p) => ["-i", p.file]),
    "-filter_complex", `${delays};[0:a]${parts.map((_, i) => `[v${i}]`).join("")}amix=inputs=${parts.length + 1}:duration=first:normalize=0[m];[m]loudnorm=I=-16:TP=-2:LRA=11[out]`,
    "-map", "[out]", "-c:a", "aac", "-b:a", "192k", voice], { stdio: "inherit" });

  const comp = `${compDir}/${id}-easy-dialogue.html`;
  // flat 2D cartoon people (public/2d/cartoon-stage.js); the owner rejected both 3D casts (2026-10-04)
  writeFileSync(comp, buildEasyCartoonHTML({ episodeNo, title: text.title, lines, hookDur, outroAt, total: duration, three: true, dialogue: true, cast: "cartoon2d",
    setting: animSettingFor(id), hook: D.hook.de, hookFa: D.hook.fa, outroText: outroLine, outroFa: "تا فردا، خدا حافظ!", nextTitle: next.title, looks: characterLooks(), pics }));
  assertComposition(comp, { cli: HF });
  const silent = `${outDir}/${id}-easy-dialogue-silent.mp4`;
  execSync(`${HF} render -c "${comp}" --quality high --fps 30 -o "${silent}"`, { stdio: "inherit" });
  await deliver({ id, iso, episodeNo, text, duration, cuts, voice, silentIn: silent, parts, tg, noTelegram, isCorrection, saveProgress, idx, outDir });
}

// both formats (TikTok, Instagram): the same film, each with its own music, mixed under the voice
async function deliver({ id, iso, episodeNo, text, duration, cuts, voice, silentIn, parts, tg, noTelegram, isCorrection, saveProgress, idx, outDir }) {
  const formats = [
    { slug: "tiktok-easy", label: "TikTok (EasyDeutsch)", mood: "play", bpm: 124, musicVariant: 1 },
    { slug: "instagram-easy", label: "Instagram (EasyDeutsch)", mood: "craft", bpm: 118, musicVariant: 3 },
  ];
  const caption = `🇩🇪 EasyDeutsch | A1 · ${episodeNo} — ${text.title}\n\n#DeutschLernen #LearnGerman #EasyDeutsch #GermanA1 #Deutschkurs`;
  const videos = [];
  for (const f of formats) {
    const music = `music/auto/easy-${id}-${f.slug}.m4a`;
    execSync(`node music/make-one.mjs ${duration} ${f.musicVariant} "${music}" 4`, {
      stdio: "inherit", env: { ...process.env, MUSIC_CUTS: cuts.join(","), MUSIC_MOOD: f.mood, MUSIC_BPM: String(f.bpm), MUSIC_ACCENTS: accentSpec(cuts, cuts.map(() => "")) },
    });
    const bed = existsSync(music) ? music : "music/bed-60s-v1.m4a";
    const final = `${outDir}/easydeutsch-${id}-${iso}-${f.slug}.mp4`;
    execSync(
      `ffmpeg -y -hide_banner -loglevel error -i "${silentIn}" -i "${bed}" -i "${voice}" ` +
      `-filter_complex "[1:a]volume=0.6[m];[m][2:a]sidechaincompress=threshold=0.02:ratio=20:attack=8:release=260:makeup=1[duck];[duck][2:a]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5[a]" ` +
      `-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${final}"`, { stdio: "inherit" });
    videos.push({ ...f, final });
  }
  for (const p of parts) if (existsSync(p.file)) try { unlinkSync(p.file); } catch {}
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
  for (const p of parts) if (existsSync(p.file)) try { unlinkSync(p.file); } catch {}

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
