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
import { accentSpec } from "../music/mood.mjs";
import { sendVideo } from "./telegram.mjs";

// German titles and hooks for every unit: lib/easy-titles.mjs.
export { EASY_TEXT };

// the approved character looks, saved from tools/character-editor (head, body, height, colour light)
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
export async function runEasyDeutsch({ unit, nextUnit, episodeNo, isCorrection, tg, noTelegram, HF, iso, saveProgress, idx, look = "cartoon" }) {
  const text = easyText(unit), next = easyText(nextUnit);
  const items = unit.items.map((it) => {
    const exDe = exampleGermanFor(it) ? String(it.example).split(" — ")[0].trim() : "";
    return { de: it.de, fa: "", exDe, exFa: "" };
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
  const renderCartoon = () => {
    if (cartoonSilent) return cartoonSilent;
    const lines = []; let start = hookDuration;
    items.forEach((it, i) => {
      const b = beats[i], a = i % 2 === 0 ? "lena" : "braun", o = a === "lena" ? "braun" : "lena";
      lines.push({ who: a, de: it.de, action: actionFor(it.de), t: start + b.de, dur: tips[i].deDur, again: { dur: tips[i].deDur, gap: b.again - b.de - tips[i].deDur }, item: i });
      if (it.exDe) lines.push({ who: o, de: it.exDe, action: actionFor(it.exDe), t: start + b.ex, dur: tips[i].exDur, item: i });
      start += tipDurations[i];
    });
    const comp = `${compDir}/${id}-easy-cartoon.html`;
    writeFileSync(comp, buildEasyCartoonHTML({ episodeNo, title: text.title, lines, hookDur: hookDuration, outroAt: hookDuration + tipDurations.reduce((x, d) => x + d, 0), total: duration, three: look === "cartoon3d",
      setting: animSettingFor(id), hook: text.hook, outroText: outroLine, nextTitle: next.title, looks: characterLooks() }));
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
