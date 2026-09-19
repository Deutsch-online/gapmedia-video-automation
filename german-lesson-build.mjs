// Builds and sends the next episode of the A1 German-lesson series —
import { execSync, execFileSync } from "node:child_process";
import { writeFileSync, existsSync, readFileSync, mkdirSync, unlinkSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildInkHTML } from "./lib/build-ink.mjs";
import { assertVisualProof } from "./lib/visual-proof.mjs";
import { findLessonImage } from "./lib/lesson-image.mjs";
import { GERMAN_A1, germanUnitAt } from "./lib/german-a1.mjs";
import { accentSpec } from "./music/mood.mjs";
import { loadEnv, telegramConfig, sendVideo, sendMessage } from "./lib/telegram.mjs";
import { fingerprint, check, register } from "./lib/dedupe.mjs";
import { narrationFor } from "./lib/narration.mjs";
import { lessonSpeakable } from "./lib/pronounce.mjs";
import { GERMAN_WORD_VOICE_ID, GERMAN_LESSON_NARRATION_OVERRIDE, GERMAN_WORD_VOICE_SETTINGS, narrationLineCheck } from "./lib/voice-settings.mjs";
import { runWithRecovery, RecoveryExhausted } from "./lib/recovery-engine.mjs";
import { evidenceIsStale } from "./lib/recovery-chain.mjs";
import { rewordPersistentWord, patchSourceText, proposePronunciationFix, patchPronunciationTable, persistentFaultWords, containsWord } from "./lib/narration-recovery.mjs";

const projectDir = dirname(fileURLToPath(import.meta.url));
process.chdir(projectDir);

const localEnv = loadEnv();
Object.assign(process.env, localEnv);
const tg = telegramConfig(localEnv);
const noTelegram = process.argv.includes("--no-telegram");
// FIX 2026-09-19: allow minimax / edge — only block true silent mode
if (!process.env.VOICE || process.env.VOICE === "off") {
  throw new Error("German lessons require approved narration: set VOICE=minimax or VOICE=edge. Silent German lessons are not publishable.");
}
const inCycle = process.env.GERMAN_CYCLE === "on";
const unitArgIdx = process.argv.indexOf("--unit");
const correctionUnitId = unitArgIdx >= 0 ? process.argv[unitArgIdx + 1] : null;
const isCorrection =!!correctionUnitId;

const HF = "npx --yes hyperframes@0.8.16";
const iso = new Date().toISOString().slice(0, 10);

const PROGRESS = ".german-lesson-progress.json";
function nextIndex() {
  try { return Math.max(0, Number(JSON.parse(readFileSync(PROGRESS, "utf8")).nextIndex) || 0); } catch { return 0; }
}
function saveProgress(i) {
  writeFileSync(PROGRESS, JSON.stringify({ nextIndex: i, lastBuiltAt: new Date().toISOString() }, null, 2));
}

let idx;
if (isCorrection) {
  idx = GERMAN_A1.findIndex((u) => u.id === correctionUnitId);
  if (idx < 0) {
    console.error(` ✗ --unit "${correctionUnitId}" is not a known unit id in lib/german-a1.mjs.`);
    process.exit(1);
  }
} else {
  idx = nextIndex();
}
if (!isCorrection && idx >= GERMAN_A1.length) {
  console.error(` ✗ curriculum exhausted: GERMAN_A1 has ${GERMAN_A1.length} units, next index is ${idx}.`);
  if (telegramConfig(localEnv).enabled && !inCycle) {
    try {
      await sendMessage({
        token: telegramConfig(localEnv).token, chatId: telegramConfig(localEnv).chatId,
        text: `⚠ دورهٔ آلمانی به آخر بانک محتوای فعلی رسید (${GERMAN_A1.length} قسمت). قسمت تازه ساخته نشد تا از تکرار جلوگیری شود — به lib/german-a1.mjs واحدهای بیشتر اضافه کن.`,
      });
    } catch {}
  }
  process.exit(1);
}
const unit = germanUnitAt(idx);
const episodeNo = idx + 1;
const nextUnit = germanUnitAt(idx + 1);

const ARTICLE_COLOR = { der: "#3B82F6", die: "#EF4444", das: "#22C55E" };
function colorArticle(de) {
  const m = /^(der|die|das)\s+(.*)$/.exec(de);
  if (!m) return de;
  const [, art, rest] = m;
  return `<span style="color:${ARTICLE_COLOR[art]}">${art}</span> ${rest}`;
}

const COURSE_TOTAL = 100;
const lessonCode = `A1-${String(episodeNo).padStart(3, "0")}`;
const lessonCounter = `A1 • ${String(episodeNo).padStart(3, "0")}/${COURSE_TOTAL}`;const MIN_EPISODE_SECONDS = 60;
// AAC/MP4 timestamps are quantised. A timeline calculated at exactly 60.000s
// can be reported as 59.998s after its per-scene values are rounded, which
// caused a valid lesson to be rejected before rendering. Keep the published
// requirement at one minute, but build a small, readable hold beyond it.
const LESSON_DURATION_HEADROOM_SECONDS = 0.5;
const TARGET_EPISODE_SECONDS = MIN_EPISODE_SECONDS + LESSON_DURATION_HEADROOM_SECONDS;

const HOOK_DUR = 7, TIP_DUR = 11, OUTRO_DUR = 9;
const pack = {
  id: unit.id,
  kind: "german-lesson",
  platform: "german-lesson",
  feature: `آموزش آلمانی A1 — قسمت ${episodeNo}`,
  title: `آموزش آلمانی هوشمند — قسمت ${episodeNo}: ${unit.topic}`,
  hook: { ask: unit.hook, l1: "آموزش آلمانی هوشمند" },
  kicker: lessonCounter,
  tips: unit.items.map((it, i) => ({
    head: `${colorArticle(it.de)} — ${it.fa}`,
    sub: it.example,
    step: i + 1,
  })),
  outroAsk: `قسمت بعد: ${nextUnit.topic}`,
  payoff: "واژه، مکالمه و نکتهٔ گرامری تازه یاد گرفتی — سطح A1.",
  tgTitle: `🇩🇪 آموزش آلمانی هوشمند | ${lessonCode} — ${unit.topic}${isCorrection ? " (اصلاح‌شده)" : ""}\n\n#German #A1 #LearnGerman #GermanLessons #Vocabulary #Grammar`,
  noCharacters: true,
  ink: { pair: ["#E53935", "#111111"], paper: "#F7F6F2", tint: "rgba(229,57,53,.08)" },
  outro: { tag: "هر روز یک قدم به آلمانی بهتر —<br/>ما را دنبال کن.", follow: "دنبال کنید +" },
  mood: "calm",
  bpm: 92,
  musicVariant: "v1",
  music: "music/bed-60s-v1.m4a",
  musicOutroBars: 4,
  hookDuration: HOOK_DUR,
  tipDurations: unit.items.map(() => TIP_DUR),
  outroDuration: OUTRO_DUR,
  duration: HOOK_DUR + TIP_DUR * unit.items.length + OUTRO_DUR,
};

const FORMAT_VARIANTS = [
  {
    slug: "tiktok", label: "TikTok", platform: "tiktok",
    design: "german-tiktok-learning", mood: "lift", bpm: 108, musicVariant: 2,
    ink: { pair: ["#00F2EA", "#FE2C55"], paper: "#0B0E14", tint: "rgba(0,242,234,.12)" },
    hashtags: "#LearnGerman #GermanA1 #DeutschLernen #TikTokLearn",
  },
  {
    slug: "instagram", label: "Instagram", platform: "instagram",
    design: "german-instagram-learning", mood: "warm", bpm: 96, musicVariant: 3,
    ink: { pair: ["#833AB4", "#FD1D1D"], paper: "#FFF8FC", tint: "rgba(131,58,180,.10)" },
    hashtags: "#LearnGerman #GermanA1 #DeutschLernen #InstagramLearning",
  },
];

function applyMinimumLessonDuration() {
  const current = pack.hookDuration + pack.tipDurations.reduce((sum, value) => sum + value, 0) + pack.outroDuration;
  const extra = Math.max(0, TARGET_EPISODE_SECONDS - current);
  if (extra > 0) {
    const share = extra / (pack.tipDurations.length + 2);
    pack.hookDuration = +(pack.hookDuration + share).toFixed(3);
    pack.tipDurations = pack.tipDurations.map((value) => +(value + share).toFixed(3));
    pack.outroDuration = +(pack.outroDuration + share).toFixed(3);
  }
  pack.duration = +(pack.hookDuration + pack.tipDurations.reduce((sum, value) => sum + value, 0) + pack.outroDuration).toFixed(3);
  // Per-scene rounding can lose milliseconds. Add the remainder only to the final reading hold.
  if (pack.duration < TARGET_EPISODE_SECONDS) {
    pack.outroDuration = +(pack.outroDuration + (TARGET_EPISODE_SECONDS - pack.duration)).toFixed(3);
    pack.duration = +(pack.hookDuration + pack.tipDurations.reduce((sum, value) => sum + value, 0) + pack.outroDuration).toFixed(3);
  }
  if (pack.duration < MIN_EPISODE_SECONDS) {
    throw new Error(`German lesson duration ${pack.duration}s is below the ${MIN_EPISODE_SECONDS}s minimum.`);
  }
}

const compDir = `compositions/german/${iso}`;
const outDir = `renders/german/${iso}`;
mkdirSync(compDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

console.log(`\n=== german-lesson episode ${episodeNo}: ${unit.topic} (${unit.id}) ===`);

const TTS_ENGINE = ["pocket", "minimax"].includes(process.env.TTS_ENGINE) ? process.env.TTS_ENGINE : "edge";
const EDGE_PERSIAN_VOICE = process.env.EDGE_PERSIAN_VOICE || "fa-IR-FaridNeural";
const GERMAN_WORD_ENGINE = process.env.GERMAN_WORD_ENGINE === "minimax" ? "minimax" : "edge";
const speakableFor = (engine) => (text) => lessonSpeakable(text, engine);

function ttsSynthesize(text, languageBoost, outFile, voiceId) {
  const engine = languageBoost ? GERMAN_WORD_ENGINE : TTS_ENGINE;
  if (languageBoost) {
    console.error(
      engine === "edge"
       ? " ℹ German word clip on Edge's native German voice — free, keyless"
        : " ℹ German word clip on MiniMax, by explicit GERMAN_WORD_ENGINE.",
    );
  }
  if (!languageBoost) {
    const issues = narrationLineCheck(text);
    if (issues.length) throw new Error(`Persian narration preflight: ${issues.join(", ")}`);
  }
  const env = {...process.env };
  if (languageBoost) env.MINIMAX_LANGUAGE_BOOST = languageBoost;
  if (voiceId) env.MINIMAX_VOICE_ID = voiceId;
  if (!voiceId) {
    env.MINIMAX_VOICE_PITCH = String(GERMAN_LESSON_NARRATION_OVERRIDE.pitch);
    env.VOICE_SPEED = String(GERMAN_LESSON_NARRATION_OVERRIDE.speed);
  }
  if (engine === "edge" && !languageBoost) env.EDGE_TTS_VOICE = EDGE_PERSIAN_VOICE;
  if (voiceId === GERMAN_WORD_VOICE_ID && engine === "edge") {
    env.EDGE_TTS_SPEED = String(GERMAN_WORD_VOICE_SETTINGS.speed);
    env.EDGE_TTS_VOL = String(GERMAN_WORD_VOICE_SETTINGS.vol);
  } else if (voiceId === GERMAN_WORD_VOICE_ID) {
    env.VOICE_SPEED = String(GERMAN_WORD_VOICE_SETTINGS.speed);
    env.MINIMAX_VOICE_VOL = String(GERMAN_WORD_VOICE_SETTINGS.vol);
  }
  const script = engine === "pocket"
   ? "music/pocket-tts.mjs"
    : engine === "edge"
     ? "music/edge-tts.mjs"
      : "music/minimax-tts.mjs";
  execFileSync(process.execPath, [script, text, "-o", outFile], { env, stdio: "inherit" });
}
function ffprobeDuration(file) {
  const out = execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", file,
  ], { encoding: "utf8" });
  return parseFloat(out.trim()) || 0;
}

const GAP = 0.45;
const LEAD = 0.2;
const SCENE_PAD = 0.7;

let voiceParts = null;

try {
  // FIXED: accept minimax / edge / on
  if (process.env.VOICE === "on" || process.env.VOICE === "minimax" || process.env.VOICE === "edge") {
    const vo = narrationFor(pack.id);
    if (!vo) throw new Error(`no narration for "${pack.id}"`);
    const voiceDir = "music/voice";
    mkdirSync(voiceDir, { recursive: true });
    try {
      const persianEntries = [];
      const makePersian = (written, file) => {
        const spoken = speakableFor(TTS_ENGINE)(written);
        ttsSynthesize(spoken, null, file);
        persianEntries.push({ written, spoken, file });
      };
      const hookFile = `${voiceDir}/german-${pack.id}-hook.mp3`;
      makePersian(vo.hook, hookFile);

      const tips = [];
      for (let i = 0; i < unit.items.length; i++) {
        const deFile = `${voiceDir}/german-${pack.id}-de${i}.mp3`;
        const exampleFile = `${voiceDir}/german-${pack.id}-example${i}.mp3`;
        const faFile = `${voiceDir}/german-${pack.id}-fa${i}.mp3`;
        const exampleGerman = String(unit.items[i].example || "").split(" — ")[0].trim();
        ttsSynthesize(unit.items[i].de, "German", deFile, GERMAN_WORD_VOICE_ID);
        if (!exampleGerman) throw new Error(`missing German example for "${unit.items[i].de}"`);
        ttsSynthesize(exampleGerman, "German", exampleFile, GERMAN_WORD_VOICE_ID);
        makePersian(vo.steps[i], faFile);
        tips.push({ deFile, exampleFile, faFile });
      }

      const outroFile = `${voiceDir}/german-${pack.id}-outro.mp3`;
      makePersian(vo.outro, outroFile);

      if (process.env.NARRATION_QC !== "off") {
        const manifest = `${voiceDir}/german-${pack.id}-persian-qc.json`;
        const reportFile = resolve(dirname(manifest), "voice-qc-report.json");
        const exhaustedMarker = ".german-recovery-exhausted.json";
        const runQC = () => {
          writeFileSync(manifest, JSON.stringify({ featureId: pack.id, entries: persianEntries }, null, 2));
          execFileSync(process.execPath, ["music/voice-qc.mjs", "--manifest", manifest], { stdio: "inherit" });
        };
        const resynthAll = () => {
          for (const entry of persianEntries) {
            rmSync(entry.file, { force: true });
            ttsSynthesize(entry.spoken, null, entry.file);
          }
        };
        const pendingPronunciationFixes = [];
        try {
          await runWithRecovery({
            maxLocalRetries: 3,
            maxRecoveryCycles: 2,
            attempt: async (ctx, meta) => {
              if (!(meta.cycle === 0 && meta.localAttempt === 1)) resynthAll();
              try {
                runQC();
                return { ok: true, value: true };
              } catch (e) {
                let faultWords = [];
                try {
                  const report = JSON.parse(readFileSync(reportFile, "utf8"));
                  faultWords = report.report.flatMap((line) => line.faults.map((f) => f.want)).filter(Boolean);
                } catch {}
                return { ok: false, reason: { faultWords, error: e } };
              }
            },
            recover: async (history) => {
              const lastCycle = history[history.length - 1].cycle;
              const cycleFailures = history.filter((h) => h.cycle === lastCycle && !h.ok);
              const persistent = persistentFaultWords(cycleFailures);
              if (!persistent.length) return null;
              for (const word of persistent) {
                const fix = proposePronunciationFix(word);
                if (!fix) continue;
                const already = pendingPronunciationFixes.some((p) => p.pattern === fix.pattern);
                if (already) continue;
                const matches = persianEntries.filter((e) => e.spoken.includes(fix.pattern));
                if (!matches.length) continue;
                for (const entry of matches) entry.spoken = entry.spoken.split(fix.pattern).join(fix.fixed);
                pendingPronunciationFixes.push(fix);
                return { context: {} };
              }
              const target = persianEntries.find((entry) =>
                persistent.some((w) => containsWord(entry.written, w)));
              if (!target) return null;
              const reworded = await rewordPersistentWord({
                sentence: target.written,
                persistentWords: persistent,
                topic: pack.title || pack.id,
              });
              if (!reworded) return null;
              target.written = reworded;
              target.spoken = speakableFor(TTS_ENGINE)(reworded);
              return { context: {} };
            },
          });
          for (const fix of pendingPronunciationFixes) patchPronunciationTable(fix.pattern, fix.fixed);
          try {
            const prior = JSON.parse(readFileSync(exhaustedMarker, "utf8"));
            if (prior.unit === pack.id) unlinkSync(exhaustedMarker);
          } catch {}
        } catch (e) {
          if (e instanceof RecoveryExhausted) {
            let attempts = 1;
            try {
              const prior = JSON.parse(readFileSync(exhaustedMarker, "utf8"));
              const readNarration = (unit) => {
                const spoken = narrationFor(unit);
                return spoken ? [spoken.hook, ...(spoken.steps || []), spoken.outro].filter(Boolean).join(" ") : "";
              };
              if (prior.unit === pack.id && !evidenceIsStale(prior, readNarration)) {
                attempts = (prior.attempts || 0) + 1;
              }
            } catch {}
            writeFileSync(exhaustedMarker, JSON.stringify({
              unit: pack.id, attempts, history: e.history, lastReason: e.lastReason,
            }, null, 2));
          }
          throw e;
        }
      }

      const hookDur = ffprobeDuration(hookFile);
      for (const tip of tips) {
        tip.deDur = ffprobeDuration(tip.deFile);
        tip.exampleDur = ffprobeDuration(tip.exampleFile);
        tip.faDur = ffprobeDuration(tip.faFile);
      }
      const outroDur = ffprobeDuration(outroFile);

      voiceParts = { hookFile, hookDur, tips, outroFile, outroDur };

      const MIN_TIP = 2.5;
      pack.hookDuration = +Math.max(3.0, hookDur + LEAD + 0.8).toFixed(3);
      pack.tipDurations = tips.map((t) => +Math.max(MIN_TIP, LEAD + t.deDur + GAP + t.exampleDur + GAP + t.faDur + SCENE_PAD).toFixed(3));
      pack.outroDuration = +Math.max(3.6, outroDur + 1.0).toFixed(3);
      pack.duration = +(pack.hookDuration + pack.tipDurations.reduce((a, d) => a + d, 0) + pack.outroDuration).toFixed(3);
      pack.music = pack.music.replace(/.m4a$/, "-vo.m4a");
      console.log(` timing follows speech (incl. German pronunciation): ${pack.duration}s`);
    } catch (e) {
      console.error(" ✗ voice planning failed, using the beat grid:", String(e.message).split(String.fromCharCode(10))[0]);
      voiceParts = null;
      if (process.env.REQUIRE_VOICE === "on") throw e;
    }
  }

  applyMinimumLessonDuration();
  console.log(` lesson duration: ${pack.duration}s (minimum ${MIN_EPISODE_SECONDS}s)`);

  for (let i = 0; i < unit.items.length; i++) {
    const item = unit.items[i];
    const found = await findLessonImage(item.img, item.fa, item.de);
    if (!found) {
      throw Object.assign(
        new Error(`هیچ عکس واقعی و مرتبطی برای «${item.de} — ${item.fa}» پیدا نشد`),
        { kind: "visualQc" },
      );
    }
    pack.tips[i].photo = found.photo;
    pack.tips[i].photoAlt = found.alt;
    pack.tips[i].photoFocus = "subject-wide";
    pack.tips[i].photoAspect = 0.75;
  }

  const hookItem = unit.items[0];
  const usedSlidePhotos = new Set(pack.tips.map((tip) => tip.photo));
  const hookQueries = [
    `${hookItem.img} German language learning`,
    `German language learner ${unit.items.at(-1).img}`,
  ];
  let hookPhoto = null;
  for (const query of hookQueries) {
    const candidate = await findLessonImage(query, unit.hook, `hook-${unit.id}`);
    if (candidate && !usedSlidePhotos.has(candidate.photo)) { hookPhoto = candidate; break; }
  }
  if (!hookPhoto) throw Object.assign(new Error(`هیچ تصویر واقعی، باکیفیت و غیرتکراری برای قلاب «${unit.topic}» پیدا نشد`), { kind: "visualQc" });
  pack.hookPhoto = hookPhoto.photo;
  pack.hookPhotoAlt = hookPhoto.alt;
  pack.hookPhotoAspect = 0.75;
  assertVisualProof(pack);

  const cutTimes = (() => {
    const lens = pack.tipDurations;
    const out = [pack.hookDuration];
    let acc = pack.hookDuration;
    for (const L of lens) { acc += L; out.push(+acc.toFixed(3)); }
    return out;
  })();

  let voice = null;
  if (voiceParts) {
    const vFile = `music/voice/german-${pack.id}.m4a`;
    try {
      const parts = [{ file: voiceParts.hookFile, at: LEAD }];
      let sceneStart = pack.hookDuration;
      for (let i = 0; i < voiceParts.tips.length; i++) {
        const t = voiceParts.tips[i];
        parts.push({ file: t.deFile, at: sceneStart + LEAD });
        parts.push({ file: t.exampleFile, at: sceneStart + LEAD + t.deDur + GAP });
        parts.push({ file: t.faFile, at: sceneStart + LEAD + t.deDur + GAP + t.exampleDur + GAP });
        sceneStart += pack.tipDurations[i];
      }
      parts.push({ file: voiceParts.outroFile, at: sceneStart + LEAD });

      const inputs = parts.flatMap((p) => ["-i", p.file]);
      const delays = parts
       .map((p, i) => `[${i + 1}:a]adelay=${Math.round(p.at * 1000)}|${Math.round(p.at * 1000)}[v${i}]`)
       .join(";");
      const mixIns = parts.map((_, i) => `[v${i}]`).join("");
      const filter =
        `${delays};[0:a]${mixIns}amix=inputs=${parts.length + 1}:duration=first:normalize=0[m];` +
        `[m]loudnorm=I=-16:TP=-2:LRA=11[out]`;
      execFileSync("ffmpeg", [
        "-y", "-hide_banner", "-loglevel", "error",
        "-f", "lavfi", "-t", String(pack.duration), "-i", "anullsrc=r=44100:cl=stereo",
       ...inputs,
        "-filter_complex", filter, "-map", "[out]",
        "-c:a", "aac", "-b:a", "192k", vFile,
      ], { stdio: "inherit" });

      for (const p of parts) if (existsSync(p.file)) unlinkSync(p.file);
      if (existsSync(vFile)) voice = vFile;
      if (!voice && process.env.REQUIRE_VOICE === "on") {
        throw new Error(`Narration did not render for "${pack.id}"`);
      }
    } catch (e) {
      console.error(" ✗ voice assembly failed, continuing music-only:", String(e.message).split(String.fromCharCode(10))[0]);
      if (process.env.REQUIRE_VOICE === "on") throw e;
    }
  }

  const print = fingerprint(pack);
  if (!isCorrection) {
    const dup = check(print);
    if (dup.verdict === "DUPLICATE") {
      throw Object.assign(new Error(`تکراری (${dup.score}) — قسمت «${dup.closest?.id}» قبلاً رفته است`), { kind: "duplicate" });
    }
  }

  const deliveredVideos = [];
  for (const format of FORMAT_VARIANTS) {
    const variantPack = {
     ...pack,
      platform: format.platform,
      design: { family: format.design },
      ink: format.ink,
      mood: format.mood,
      bpm: format.bpm,
      musicVariant: format.musicVariant,
      music: `music/auto/german-${pack.id}-${format.slug}${voice ? "-vo" : ""}.m4a`,
      tgTitle: `🇩🇪 آموزش آلمانی هوشمند | ${lessonCode} — ${unit.topic}\n${format.label} · حداقل ۶۰ ثانیه\n\n${format.hashtags}`,
    };
    const comp = `${compDir}/${pack.id}-${format.slug}.html`;
    const silent = `${outDir}/${pack.id}-${format.slug}-silent.mp4`;
    const final = `${outDir}/german-a1-${pack.id}-${iso}-${format.slug}.mp4`;
    writeFileSync(comp, buildInkHTML(variantPack));

    execSync(
      `node music/make-one.mjs ${variantPack.duration} ${variantPack.musicVariant} "${variantPack.music}" ${variantPack.musicOutroBars || 4}`,
      {
        stdio: "inherit",
        env: {
         ...process.env,
          MUSIC_CUTS: cutTimes.join(","),
          MUSIC_MOOD: variantPack.mood,
          MUSIC_BPM: String(variantPack.bpm),
          MUSIC_ACCENTS: accentSpec(cutTimes, ["", "", "", "", ""]),
        },
      },
    );
    const music = existsSync(variantPack.music) ? variantPack.music : "music/bed-60s-v1.m4a";
    execSync(`${HF} render -c "${comp}" --quality high --fps 30 --skill=faceless-explainer -o "${silent}"`, { stdio: "inherit" });
    if (voice) {
      execSync(
        `ffmpeg -y -hide_banner -loglevel error -i "${silent}" -i "${music}" -i "${voice}" ` +
        `-filter_complex "[1:a]volume=0.85[m];[m][2:a]sidechaincompress=threshold=0.02:ratio=20:attack=8:release=260:makeup=1[duck];[duck][2:a]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5[a]" ` +
        `-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${final}"`,
        { stdio: "inherit" },
      );
    } else {
      execSync(`ffmpeg -y -i "${silent}" -i "${music}" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${final}"`, { stdio: "inherit" });
    }
    deliveredVideos.push({...format, final, caption: variantPack.tgTitle });
  }

  if (tg.enabled) {
    const sent = [];
    for (const video of deliveredVideos) {
      const res = await sendVideo({ token: tg.token, chatId: tg.chatId, file: video.final, caption: video.caption });
      if (!res?.message_id) throw new Error(`${video.label} lesson video was not confirmed by Telegram.`);
      sent.push({...video, messageId: res.message_id });
      console.log(` ✈ ${video.label} sent to Telegram`);
    }
    if (!isCorrection) {
      for (const video of sent) {
        register({...fingerprint({...pack, platform: video.platform }), messageId: video.messageId, kind: "german-lesson", sentAt: new Date().toISOString() });
      }
      saveProgress(idx + 1);
      console.log(` → next episode: ${idx + 2} (${germanUnitAt(idx + 1).topic})`);
    }
  } else if (!noTelegram) {
    throw new Error("Telegram is not configured; refusing to mark a local-only render as delivered.");
  } else if (!isCorrection) {
    saveProgress(idx + 1);
  }

  console.log(`\n✅ episode ${episodeNo} ready: ${deliveredVideos.map((video) => resolve(video.final)).join(" | ")}`);
} catch (err) {
  console.error(` ✗ episode ${episodeNo} (${unit.id}) failed: ${err.message}`);
  if (tg.enabled && !inCycle) {
    try {
      await sendMessage({
        token: tg.token, chatId: tg.chatId,
        text: `⚠ قسمت ${episodeNo} آموزش آلمانی ساخته نشد.\n\nعلت: ${err.message}`,
      });
    } catch {}
  }
  process.exit(1);
}
