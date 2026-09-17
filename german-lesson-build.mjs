// Builds and sends the next episode of the A1 German-lesson series —
// replaces the "German Insider" news channel (owner request 2026-09-08).
//
// One command:
//   node german-lesson-build.mjs
//
// Continuing/serialized: reads the next episode index from
// .german-lesson-progress.json (Actions-cache-persisted, same convention as
// the rest of this project's rolling state), builds that curriculum unit,
// and — only once the send actually confirms — advances the index so the
// next run picks up where this one left off, never repeating or skipping.
//
// --unit <id> rebuilds and resends ONE already-taught unit by id (a real
// defect fix on a past episode, e.g. `node german-lesson-build.mjs --unit
// a1-12-haben`) — never advances the progress pointer and never runs the
// duplicate check, since a correction is meant to match its own original
// content. Everything else about the build (visual gate, voice, render) is
// identical to a normal run.
//
// Real, topic-matched photos (build-ink.mjs, the same real-photo renderer
// the rest of this project's tutorials use) — owner correction 2026-09-08:
// no mascot/cartoon animation. Each vocabulary item gets its own photo via
// lib/lesson-image.mjs (a live search, not a fixed set), and the same
// Visual Truth Gate (assertVisualProof) every other tutorial must pass
// applies here too — no photo found for a word means that episode does not
// ship, same as any other feature with no real evidence.
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
import { minimaxSpeakable, pocketSpeakable } from "./lib/pronounce.mjs";
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
// Set by german-cycle.mjs, which runs this script as one attempt inside a
// build → diagnose → build cycle. Owner directive 2026-09-15 («نباید تا اجرا
// موفق نشود به تلگرام برود»): a failed ATTEMPT is not a failed job, so it must
// not alert the channel — the cycle diagnoses it and either tries again or
// sends one report naming the real cause. Only the success path below (the
// finished video) still reaches Telegram from here, exactly as before, and
// only after every gate has passed. Running this script directly is unchanged.
const inCycle = process.env.GERMAN_CYCLE === "on";
// --unit <id>: rebuild ONE already-taught unit by id and resend it, instead
// of building whatever the sequential progress pointer says is next. For a
// real defect report on an episode already sent (owner report 2026-09-11:
// A1-012/"haben" had a broken German-pronunciation clip) — the normal path
// has no way to redo a specific past episode; it only ever moves forward.
// Never advances .german-lesson-progress.json and never runs the duplicate
// check below (a correction is EXPECTED to match its own original content;
// that is not the "same content shipped twice by accident" this project's
// dedupe check exists to catch).
const unitArgIdx = process.argv.indexOf("--unit");
const correctionUnitId = unitArgIdx >= 0 ? process.argv[unitArgIdx + 1] : null;
const isCorrection = !!correctionUnitId;

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
    console.error(`   ✗ --unit "${correctionUnitId}" is not a known unit id in lib/german-a1.mjs.`);
    process.exit(1);
  }
} else {
  idx = nextIndex();
}
// germanUnitAt() wraps with a modulo once idx reaches the end of GERMAN_A1 —
// needed so a bad/stale progress index never crashes, but it means the
// curriculum silently re-teaches a1-01 onward under a NEW episode number
// once exhausted. Owner report 2026-09-11: exactly this happened (episode
// A1-011 re-taught a1-03's content word-for-word). GERMAN_A1 was expanded
// the same day to push this much further out, but the real fix is this
// guard: refuse outright, the same way any other content gate in this
// project fails loud, instead of silently sending recycled material.
if (!isCorrection && idx >= GERMAN_A1.length) {
  console.error(`   ✗ curriculum exhausted: GERMAN_A1 has ${GERMAN_A1.length} units, next index is ${idx}.`);
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

// Article colour-coding (owner's MASTER SYSTEM spec, 2026-09-10, sec. 2 & 11):
// der = blue, die = red, das = green, fixed for the whole course. A noun is
// never taught without its Artikel (lib/german-a1.mjs already only attaches
// der/die/das to real nouns, e.g. a1-06-family — verbs, phrases and question
// words correctly carry none), so this only ever colours the leading
// der/die/das token when one is actually present.
const ARTICLE_COLOR = { der: "#3B82F6", die: "#EF4444", das: "#22C55E" };
function colorArticle(de) {
  const m = /^(der|die|das)\s+(.*)$/.exec(de);
  if (!m) return de;
  const [, art, rest] = m;
  return `<span style="color:${ARTICLE_COLOR[art]}">${art}</span> ${rest}`;
}

// Total course length for the "A1 • 0XX/100" on-screen counter (sec. 17).
// GERMAN_A1 currently holds fewer than 100 real lessons; the denominator
// names the target course length the roadmap (sec. 16, 30 modules) is
// building toward, not a claim that 100 already exist.
const COURSE_TOTAL = 100;
const lessonCode = `A1-${String(episodeNo).padStart(3, "0")}`;
const lessonCounter = `A1 • ${String(episodeNo).padStart(3, "0")}/${COURSE_TOTAL}`;

// A complete lesson must have enough room for: the German vocabulary, a
// native-German example sentence, a natural Persian explanation, and a short
// visual pause to read the translation.  These are the silent-mode fallbacks;
// narrated builds below measure the actual clips and then preserve 60 seconds
// as a minimum instead of cutting off a real explanation to fit a short reel.
const MIN_EPISODE_SECONDS = 60;
const HOOK_DUR = 7, TIP_DUR = 11, OUTRO_DUR = 9;
const pack = {
  id: unit.id,
  // `kind` is this series' own discriminator — every renderer/brief/mood
  // helper that needs to treat a German-lesson pack differently checks
  // `pack.kind === "german-lesson"` directly (lib/brand.mjs, lib/build-ink.mjs,
  // lib/scene-art.mjs, lib/retention.mjs). Until 2026-09-11 this pack also set
  // `platform: "news"` to borrow the (then still-shipping) German Insider news
  // channel's unbranded layout — the news channel was retired that day (owner:
  // "News دیگر نمی‌سازیم"), and the borrowed label had already caused real
  // bugs by accident: the Visual Truth Gate was silently skipped for every
  // episode (assertVisualProof exempted platform "news"), the "A1 • 0XX/100"
  // lesson counter was suppressed on every slide but the hook, and the outro
  // CTA read "برای خبرهای بعدی" (follow for the next NEWS). `platform` now
  // names this series for what it is.
  kind: "german-lesson",
  platform: "german-lesson",
  feature: `آموزش آلمانی A1 — قسمت ${episodeNo}`,
  title: `آموزش آلمانی هوشمند — قسمت ${episodeNo}: ${unit.topic}`,
  hook: { ask: unit.hook, l1: "آموزش آلمانی هوشمند" },
  // build-ink.mjs's hook scene AND every step scene render this in the
  // `.kick` slot — it was defaulting to the generic "قابلیت" ("Feature"), a
  // leftover from the app-tutorial template this renderer was built for,
  // which read as meaningless over a language lesson (owner report
  // 2026-09-10). This is the on-screen home for the "A1 • 0XX/100" lesson
  // counter (MASTER SYSTEM spec sec. 17) on every slide, not just the hook
  // (fixed 2026-09-11 — the borrowed "news" platform label used to suppress
  // it on every slide but the hook without anyone noticing).
  kicker: lessonCounter,
  // Each on-screen card shows the German word/phrase AND its Persian
  // meaning (with register — رسمی/غیررسمی — spelled out where it matters);
  // the spoken narration (lib/narration.mjs, VO[unit.id]) stays Persian for
  // the explanation, with the German itself actually pronounced separately
  // (see the voice section below), never mispronounced by reading it as
  // part of a Persian sentence. The German half is run through
  // colorArticle() so a leading der/die/das keeps its fixed course colour.
  // step: forces build-ink.mjs's kindOf() to pick the "step" scene kind,
  // which is the ONLY kind that actually renders tip.photo — every other
  // kind (the "paper" default this pack fell into before) shows a generic
  // decorative icon and silently ignores tip.photo entirely. Without this,
  // findLessonImage()'s real photos were fetched but never displayed —
  // every episode looked identical regardless of vocabulary (owner report
  // 2026-09-10: "همان طرح قبلی است"). Confirmed via lib/build-ink.mjs: a
  // real photo's aspect ratio classifies as "panel"/"wide" (not "phone"),
  // so it renders full-frame with no iPhone chrome and no fake UI overlay —
  // exactly what MASTER SYSTEM spec sec. 3/5 requires.
  tips: unit.items.map((it, i) => ({
    head: `${colorArticle(it.de)} — ${it.fa}`,
    sub: it.example,
    step: i + 1,
  })),
  outroAsk: `قسمت بعد: ${nextUnit.topic}`,
  payoff: "واژه، مکالمه و نکتهٔ گرامری تازه یاد گرفتی — سطح A1.",
  // Hashtags in English (owner instruction, 2026-09-11) — everything else in
  // the caption stays Persian; only the tag list changed.
  tgTitle: `🇩🇪 آموزش آلمانی هوشمند | ${lessonCode} — ${unit.topic}${isCorrection ? " (اصلاح‌شده)" : ""}\n\n#German #A1 #LearnGerman #GermanLessons #Vocabulary #Grammar`,
  // No mascot/character illustration — owner correction 2026-09-08, reaffirmed
  // 2026-09-10 (MASTER SYSTEM spec sec. 5: CHARACTER_MODE=DISABLED, no AI
  // avatar; real contextual images + typography + motion graphics only).
  noCharacters: true,
  // Exact palette from the owner's MASTER SYSTEM spec (sec. 2, 2026-09-10):
  // background #F7F6F2, primary text #111111, German accent #E53935,
  // secondary #F2C94C. PAIR[0] drives most on-screen text/accents in this
  // renderer, PAIR[1] the secondary band colour — mapped so the dominant
  // colour a viewer actually sees is the spec's German accent red, with the
  // near-black spec text colour as the second ink.
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

// The same curriculum episode is delivered as two platform-native edits, not
// as the same MP4 with a renamed caption. Both preserve the real lesson photos
// and bilingual narration, while their palette, typography, motion pace and
// music identity are selected for the destination platform.
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
  const extra = Math.max(0, MIN_EPISODE_SECONDS - current);
  if (extra > 0) {
    const share = extra / (pack.tipDurations.length + 2);
    pack.hookDuration = +(pack.hookDuration + share).toFixed(3);
    pack.tipDurations = pack.tipDurations.map((value) => +(value + share).toFixed(3));
    pack.outroDuration = +(pack.outroDuration + share).toFixed(3);
  }
  pack.duration = +(pack.hookDuration + pack.tipDurations.reduce((sum, value) => sum + value, 0) + pack.outroDuration).toFixed(3);
  if (pack.duration < MIN_EPISODE_SECONDS) {
    throw new Error(`German lesson duration ${pack.duration}s is below the ${MIN_EPISODE_SECONDS}s minimum.`);
  }
}

const compDir = `compositions/german/${iso}`;
const outDir = `renders/german/${iso}`;
mkdirSync(compDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

console.log(`\n=== german-lesson episode ${episodeNo}: ${unit.topic} (${unit.id}) ===`);

// Each tip scene's audio is THREE clips back to back: the German word/phrase,
// its native-German example sentence, then the Persian line explaining it.
// The example makes this a full lesson rather than a short vocabulary card.
// Bypasses plan-voice.mjs/make-voice.mjs (built for one Persian line per
// scene) with the same technique in miniature: synthesise every clip first,
// measure it, then size the scene to fit — see make-voice.mjs's own
// adelay+amix approach, reused directly below.
//
// language_boost alone was not enough either (owner report 2026-09-10: the
// German clips still came out sounding English-accented) — every clip, the
// German word included, was still synthesised with the project's approved
// Persian narration voice ("Arabic_CalmWoman"), which was never auditioned
// for German at all. GERMAN_WORD_VOICE_ID (lib/voice-settings.mjs, next to
// the Persian APPROVED settings — every language this project's narration
// uses lives in that one file) picks a real German-native voice for the
// German-word clip specifically, leaving the approved Persian voice (used
// for every other clip, hook, and outro) untouched.
// TTS_ENGINE, honoured here at last. This function called music/minimax-tts.mjs
// by a hardcoded path, so news-scan.yml's TTS_ENGINE had no effect on this
// pipeline at all and episode 18 still died on "insufficient credit" after the
// switch (owner alert 2026-09-13). music/plan-voice.mjs:26 and
// music/make-voice.mjs:47 already read this variable; this file simply never
// did.
//
// But the German clip is NOT free to move. pocket-tts ships a Farsi model and
// an English one — it has no German. Speaking German words through either is
// precisely the failure this file's header records and the owner already
// rejected (2026-09-10: "the German clips still came out sounding
// English-accented"), which is why GERMAN_WORD_VOICE_ID exists. So the engine
// is chosen PER CLIP: the Persian hook/explanations/outro follow TTS_ENGINE,
// and the German-word clip stays on the only engine that has a German voice.
// Persian narration engine. "edge" joins pocket/minimax as of 2026-09-13:
// pocket-tts's Persian was measured against this project's own narration gate
// for the first time in news-scan #245 and FAILED every line of episode 18 —
// «جمله»→«جمعه» (sentence → Friday), «وقتی»→«اختی», «سؤال»→«سهل»: different
// words, not spellings, so music/voice-qc.mjs was right to reject them. Edge's
// neural service, already proven here for German and already used by
// render-ai-education-voice.mjs for Persian, is the free engine that has not
// been tried on this path.
// Edge is the safe local default too. Cloud workflows set it explicitly, but
// a manual correction must not silently fall back to paid MiniMax simply
// because its shell omitted TTS_ENGINE.
const TTS_ENGINE = ["pocket", "minimax"].includes(process.env.TTS_ENGINE) ? process.env.TTS_ENGINE : "edge";
// The Persian voice for that engine. Its default is GERMAN, because
// music/edge-tts.mjs exists for the German word — so a Persian line must name
// its own voice or it would be read by a German speaker.
const EDGE_PERSIAN_VOICE = process.env.EDGE_PERSIAN_VOICE || "fa-IR-FaridNeural";
// The German vocabulary clip's own engine, separate from the Persian one.
// Default "edge": Microsoft Edge's neural service has genuinely NATIVE German
// voices, needs no key and no credit, and — unlike every other free option
// here — is not an English model reading German, which is the result the owner
// rejected on 2026-09-10. Proven on a runner 2026-09-13
// (.github/workflows/tts-probe.yml run #3): «Was kostet das?» came back as a
// 1.296s/21,165-byte mp3 from de-DE-KatjaNeural with no credentials at all.
// Set GERMAN_WORD_ENGINE=minimax to go back the moment that credit returns.
const GERMAN_WORD_ENGINE = process.env.GERMAN_WORD_ENGINE === "minimax" ? "minimax" : "edge";
// Edge is an ordinary neural engine like MiniMax, so it takes the long-standing
// Persian transform with its tested pronunciation fixes, not pocket's.
const speakableFor = (engine) => (engine === "pocket" ? pocketSpeakable : minimaxSpeakable);

function ttsSynthesize(text, languageBoost, outFile, voiceId) {
  // languageBoost is set only for the German vocabulary clip.
  const engine = languageBoost ? GERMAN_WORD_ENGINE : TTS_ENGINE;
  if (languageBoost) {
    console.error(
      engine === "edge"
        ? "   ℹ German word clip on Edge's native German voice — free, keyless, "
          + "and a real German speaker rather than the English-accented reading "
          + "rejected on 2026-09-10. GERMAN_WORD_ENGINE=minimax reverts."
        : "   ℹ German word clip on MiniMax, by explicit GERMAN_WORD_ENGINE.",
    );
  }
  // Persian explanatory lines must be validated before their text ever reaches
  // the engine. German vocabulary uses a separate native-German voice.
  if (!languageBoost) {
    const issues = narrationLineCheck(text);
    if (issues.length) throw new Error(`Persian narration preflight: ${issues.join(", ")}`);
  }
  const env = { ...process.env };
  if (languageBoost) env.MINIMAX_LANGUAGE_BOOST = languageBoost;
  if (voiceId) env.MINIMAX_VOICE_ID = voiceId;
  // Regression, owner report 2026-09-11: episode A1-012 built "without
  // German pronunciation". Root cause — GERMAN_LESSON_NARRATION_OVERRIDE was
  // applied unconditionally, including to the German-word clip
  // (voiceId=GERMAN_WORD_VOICE_ID, languageBoost="German"), a combination
  // that was never tested. The only combination actually tested and
  // confirmed by ear (VOICE-LOG.md, episode 9, 2026-09-10) is
  // GERMAN_WORD_VOICE_ID at the DEFAULT pitch/speed. The owner's "کمی
  // بالاتر و آهسته‌تر" request was about the narration explaining each
  // word, not the German pronunciation itself — so the override now only
  // applies when this call is NOT the German-word voice (i.e. every other
  // clip in the series: hook, Persian explanation, outro).
  if (!voiceId) {
    env.MINIMAX_VOICE_PITCH = String(GERMAN_LESSON_NARRATION_OVERRIDE.pitch);
    env.VOICE_SPEED = String(GERMAN_LESSON_NARRATION_OVERRIDE.speed);
  }
  // A Persian line on Edge must name its voice, or music/edge-tts.mjs — whose
  // default is German, because it exists for the German word — would read
  // Persian with a German speaker.
  if (engine === "edge" && !languageBoost) env.EDGE_TTS_VOICE = EDGE_PERSIAN_VOICE;
  if (voiceId === GERMAN_WORD_VOICE_ID && engine === "edge") {
    // Same correction, this engine's units. music/edge-tts.mjs converts these
    // multipliers to Edge's percentage strings, so the owner's 2026-09-11
    // "slower and louder" fix survives the engine change instead of silently
    // reverting to a default reading.
    env.EDGE_TTS_SPEED = String(GERMAN_WORD_VOICE_SETTINGS.speed);
    env.EDGE_TTS_VOL = String(GERMAN_WORD_VOICE_SETTINGS.vol);
  } else if (voiceId === GERMAN_WORD_VOICE_ID) {
    // Owner report 2026-09-11: the German-word clip read too fast and too
    // quiet — see GERMAN_WORD_VOICE_SETTINGS's own comment
    // (lib/voice-settings.mjs) for the values and the docs-checked ranges.
    env.VOICE_SPEED = String(GERMAN_WORD_VOICE_SETTINGS.speed);
    env.MINIMAX_VOICE_VOL = String(GERMAN_WORD_VOICE_SETTINGS.vol);
  }
  const script = engine === "pocket"
    ? "music/pocket-tts.mjs"
    : engine === "edge"
      ? "music/edge-tts.mjs"
      : "music/minimax-tts.mjs";
  execFileSync("node", [script, text, "-o", outFile], { env, stdio: "inherit" });
}
function ffprobeDuration(file) {
  const out = execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", file,
  ], { encoding: "utf8" });
  return parseFloat(out.trim()) || 0;
}

const GAP = 0.45; // pause between the German word and its Persian explanation
const LEAD = 0.2; // pause before a clip starts within its scene
const SCENE_PAD = 0.7; // breathing room after the explanation, before the next scene

let voiceParts = null; // { hookFile, tips: [{deFile, exampleFile, faFile, deDur, exampleDur, faDur}], outroFile } once synthesised

try {
  if (process.env.VOICE === "on") {
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

      // These are the exact Persian clips that will be mixed into the final
      // bilingual episode. A manifest here has many independent TTS lines
      // (hook + one per vocabulary item + outro — up to 10 for a 4-item
      // unit), each with its own small chance of an ASR-flagged take, so a
      // single retry (2 total attempts) failed repeatedly in production
      // 2026-09-13 on a1-17-adjectives — four attempts across two runs each
      // rejected a DIFFERENT word ("بزرگ", "توصیف"+"کلمه", "جفت"+"آسان",
      // "کوچک"+"جفت"), the signature of per-line synthesis noise across many
      // lines, not one persistently mispronounced word — resynthesizing is
      // the right response to THAT. But a1-17's «بد» later failed on EVERY
      // single attempt across two full builds: a genuine TTS/ASR mismatch
      // for that exact word, which no amount of identical resynthesis fixes.
      //
      // Owner directive 2026-09-13 ("Recovery Loop", explicit, after the
      // manual «بد»→«بدیِ» fix): MAX_RETRY_REACHED must not mean
      // JOB_FAILED. Local retries (resynthesizing the same text — this
      // pipeline's per-cycle budget below) only absorb synthesis noise; once
      // that budget for one cycle is spent, control must escalate to a
      // recovery step that inspects the actual failure history, proposes a
      // genuinely different strategy (reword the one line whose word failed
      // every time), and tries again — never a blind Nth identical repeat,
      // and never silently handed back to a human to debug. The Visual
      // Truth Gate / Narration QC gate itself is never bypassed or weakened
      // here — runQC() below is unchanged; only the WORDING fed into it may
      // change, and only when the evidence (the same word failing on every
      // attempt of a cycle) justifies it. If no such word is found, or no
      // valid reword exists, recovery honestly admits defeat (returns null)
      // and lib/recovery-engine.mjs throws RecoveryExhausted — a real stop,
      // not a fabricated extra tier.
      if (process.env.NARRATION_QC !== "off") {
        const manifest = `${voiceDir}/german-${pack.id}-persian-qc.json`;
        const reportFile = resolve(dirname(manifest), "voice-qc-report.json");
        const exhaustedMarker = ".german-recovery-exhausted.json";
        const runQC = () => {
          writeFileSync(manifest, JSON.stringify({ featureId: pack.id, entries: persianEntries }, null, 2));
          execFileSync("node", ["music/voice-qc.mjs", "--manifest", manifest], { stdio: "inherit" });
        };
        const resynthAll = () => {
          for (const entry of persianEntries) {
            rmSync(entry.file, { force: true });
            ttsSynthesize(entry.spoken, null, entry.file);
          }
        };
        // Tier-1 pronunciation fixes are only PROVEN correct once the whole
        // build actually passes QC afterward — a wrong guess (a genuine
        // ت-final word that only looks like an unmarked possessive) must
        // never be written into the shared lib/pronounce.mjs table just for
        // having been tried, or it silently mispronounces that word for
        // every future narration line project-wide. Collected here, applied
        // for real only after runWithRecovery() resolves successfully.
        const pendingPronunciationFixes = [];
        try {
          await runWithRecovery({
            maxLocalRetries: 3,
            maxRecoveryCycles: 2,
            attempt: async (ctx, meta) => {
              // The very first attempt uses the takes already synthesized
              // above; every attempt after that (same-cycle retry, or the
              // first try of a newly recovered wording) needs a fresh take.
              if (!(meta.cycle === 0 && meta.localAttempt === 1)) resynthAll();
              try {
                runQC();
                return { ok: true, value: true };
              } catch (e) {
                let faultWords = [];
                try {
                  const report = JSON.parse(readFileSync(reportFile, "utf8"));
                  faultWords = report.report.flatMap((line) => line.faults.map((f) => f.want)).filter(Boolean);
                } catch { /* diagnostic-only; a missing/unreadable report must not hide the real QC error */ }
                return { ok: false, reason: { faultWords, error: e } };
              }
            },
            recover: async (history) => {
              const lastCycle = history[history.length - 1].cycle;
              const cycleFailures = history.filter((h) => h.cycle === lastCycle && !h.ok);
              const persistent = persistentFaultWords(cycleFailures);
              if (!persistent.length) {
                console.error("   German lesson narration recovery: no single word failed on every attempt this cycle — looks like synthesis noise, not a fixable wording issue. No further recovery strategy available.");
                return null;
              }

              // Tier 1: a known TTS pronunciation pattern (owner directive
              // 2026-09-13 — check pronunciation before touching wording).
              // Applied to EVERY entry carrying the word, not just one: it's
              // the same sound fix wherever the word occurs.
              for (const word of persistent) {
                const fix = proposePronunciationFix(word);
                if (!fix) continue;
                const already = pendingPronunciationFixes.some((p) => p.pattern === fix.pattern);
                if (already) continue; // already tried this exact fix in an earlier cycle — it didn't resolve things alone, don't loop on it
                const matches = persianEntries.filter((e) => e.spoken.includes(fix.pattern));
                if (!matches.length) continue;
                console.error(`   German lesson narration recovery (pronunciation): «${fix.pattern}» → «${fix.fixed}» — same unmarked-possessive-ـت pattern as lib/pronounce.mjs's existing fixes.`);
                for (const entry of matches) entry.spoken = entry.spoken.split(fix.pattern).join(fix.fixed);
                pendingPronunciationFixes.push(fix);
                return { context: {} };
              }

              // Tier 2: reword — for when no known pronunciation pattern
              // applies, or Tier 1 already ran and the word still failed.
              // Diacritic-insensitive: Narration QC names the fault word from
              // the SPOKEN copy, which lib/pronounce.mjs may already have
              // marked up («خریدِت»), while the line itself is unmarked
              // («خریدت»). Matching them literally silently found nothing and
              // stopped recovery — a1-18-shopping chained attempt 2, 2026-09-13.
              const target = persianEntries.find((entry) =>
                persistent.some((w) => containsWord(entry.written, w)));
              if (!target) {
                console.error(`   German lesson narration recovery: persistent fault «${persistent.join("، ")}» not found verbatim in any tracked line — cannot target a reword.`);
                return null;
              }
              const reworded = await rewordPersistentWord({
                sentence: target.written,
                persistentWords: persistent,
                topic: pack.title || pack.id,
              });
              if (!reworded) {
                console.error(`   German lesson narration recovery: no valid reword found for «${persistent.join("، ")}» in "${target.written}" — recovery strategy space exhausted.`);
                return null;
              }
              console.error(`   German lesson narration recovery: rewording persistent fault «${persistent.join("، ")}»\n     before: ${target.written}\n     after:  ${reworded}`);
              const patchedNarration = patchSourceText("lib/narration.mjs", target.written, reworded);
              const patchedCaption = patchSourceText("lib/german-a1.mjs", target.written, reworded);
              if (!patchedNarration && !patchedCaption) {
                console.error("   ⚠ German lesson narration recovery: reworded text did not patch lib/narration.mjs or lib/german-a1.mjs (no unique match) — fix applies to this render only, will not persist to the next build.");
              }
              target.written = reworded;
              target.spoken = speakableFor(TTS_ENGINE)(reworded);
              return { context: {} };
            },
          });
          // Recovery succeeded (or was never needed) — now, and only now,
          // any Tier-1 pronunciation guesses are proven correct: persist
          // them so the next build of ANY narration line never re-fails on
          // the same word. Also clears a stale cross-run exhaustion marker
          // (see the catch block below) for this exact unit, so a Recovery
          // Loop that failed on an earlier attempt but succeeded on this
          // chained retry doesn't leave a false "still broken" record.
          for (const fix of pendingPronunciationFixes) patchPronunciationTable(fix.pattern, fix.fixed);
          try {
            const prior = JSON.parse(readFileSync(exhaustedMarker, "utf8"));
            if (prior.unit === pack.id) unlinkSync(exhaustedMarker);
          } catch { /* no marker, or not for this unit — nothing to clear */ }
        } catch (e) {
          if (e instanceof RecoveryExhausted) {
            // Owner directive 2026-09-13: FAILED_ATTEMPT != FAILED_JOB. A
            // GitHub Actions job that has already exited cannot resume
            // mid-flight — the only way to keep trying IS a new job run —
            // so the failure evidence is written here for
            // .github/workflows/news-scan.yml's "Chain an automatic
            // Recovery Loop retry" step (if: failure()) to read and decide
            // whether to push another attempt automatically, with no human
            // or agent needing to notice first. attempts increments across
            // chained runs so the chain is bounded (lib/recovery-chain.mjs
            // enforces the cap), not infinite.
            //
            // The count belongs to ONE failing subject, not to the unit.
            // Measured 2026-09-14 on a1-19-directions: the episode had spent
            // 2 chained attempts on «عبارت/یعنی/مستقیم./دیگر/نمیشوی.», those
            // lines were then reworded and every one of those words passed —
            // but the NEXT exhaustion, on a completely different set
            // («رفتن», «مسیری»), read attempts=2 for the same unit id, wrote
            // 3, and the chain stood down on that new subject's very first
            // failure, demanding a human for words the Recovery Loop had
            // never once tried to fix. recovery-chain.mjs already carries the
            // rule ("a retry budget is for 'we tried the same thing and it
            // kept failing'"), but it can only apply it when READING the
            // marker, and by then this line has already overwritten the old
            // evidence. So the same check runs here, at write time, against
            // the same helper: if the previously-recorded words are gone from
            // the narration as it now stands, this is a new subject and it
            // starts with its own full budget.
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
            } catch { /* first exhaustion for this unit, or unreadable — start the chain at 1 */ }
            writeFileSync(exhaustedMarker, JSON.stringify({
              unit: pack.id, attempts, history: e.history, lastReason: e.lastReason,
            }, null, 2));
            console.error(`   ✗ German lesson narration: local retries and every proposed recovery strategy failed (chain attempt ${attempts}). ${e.lastReason?.faultWords?.length ? `Last rejected word(s): «${e.lastReason.faultWords.join("، ")}».` : ""}`);
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
      console.log(`   timing follows speech (incl. German pronunciation): ${pack.duration}s`);
    } catch (e) {
      console.error("   ✗ voice planning failed, using the beat grid:", String(e.message).split(String.fromCharCode(10))[0]);
      voiceParts = null;
      if (process.env.REQUIRE_VOICE === "on") throw e;
    }
  }

  // The measured narration is authoritative for speech safety. If it is
  // shorter than one minute, extend only the readable visual holds — never
  // stretch audio, overlap sentences, or add filler narration.
  applyMinimumLessonDuration();
  console.log(`   lesson duration: ${pack.duration}s (minimum ${MIN_EPISODE_SECONDS}s)`);

  // One real photo per vocabulary item — not one shared photo for the whole
  // episode (rescuePackPhotos() reuses a single search for a whole pack,
  // which fits an app-feature video but not four different words).
  for (let i = 0; i < unit.items.length; i++) {
    const item = unit.items[i];
    // item.de is the manifest key for LAW 7 layer 5 (our own licensed
    // photos) — the vocabulary text itself is stable, unlike item.img which
    // is only a search hint and is reworded whenever a search underperforms.
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
    // A real vocabulary photo is never device-shaped, so lib/build-ink.mjs's
    // usual native-aspect-ratio "panel" (sized to whatever the source photo
    // happens to be — often a wide 4:3/16:9 web photo) rendered small,
    // horizontal and high up on the vertical canvas (owner report
    // 2026-09-10). photoAspect forces a fixed portrait ratio instead; the
    // frame's own object-fit:cover crops the source photo into it cleanly.
    pack.tips[i].photoAspect = 0.75;
  }
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
      // Place each already-synthesised clip at its measured offset in the
      // final track — same adelay+amix technique make-voice.mjs uses for a
      // single line per scene, extended to two clips (German, then Persian)
      // per tip scene.
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
      console.error("   ✗ voice assembly failed, continuing music-only:", String(e.message).split(String.fromCharCode(10))[0]);
      if (process.env.REQUIRE_VOICE === "on") throw e;
    }
  }

  // Same 30-day duplicate control every other daily video goes through —
  // a fixed curriculum should never actually collide, but the check is
  // cheap insurance against a progress-counter bug repeating an episode.
  // Skipped for a correction resend (--unit): it is SUPPOSED to match its
  // own original content, unlike an accidental repeat.
  const print = fingerprint(pack);
  if (!isCorrection) {
    const dup = check(print);
    if (dup.verdict === "DUPLICATE") {
      throw Object.assign(new Error(`تکراری (${dup.score}) — قسمت «${dup.closest?.id}» قبلاً رفته است`), { kind: "duplicate" });
    }
  }

  // Render the two platform-native formats from the same measured narration.
  // Audio is built once above, so both variants have identical German and
  // Persian timing; layout, typography, animation pace, colour and music are
  // intentionally different rather than a filename-only conversion.
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
    deliveredVideos.push({ ...format, final, caption: variantPack.tgTitle });
  }

  if (tg.enabled) {
    const sent = [];
    for (const video of deliveredVideos) {
      const res = await sendVideo({ token: tg.token, chatId: tg.chatId, file: video.final, caption: video.caption });
      if (!res?.message_id) throw new Error(`${video.label} lesson video was not confirmed by Telegram.`);
      sent.push({ ...video, messageId: res.message_id });
      console.log(`   ✈ ${video.label} sent to Telegram`);
    }
    if (!isCorrection) {
      for (const video of sent) {
        register({ ...fingerprint({ ...pack, platform: video.platform }), messageId: video.messageId, kind: "german-lesson", sentAt: new Date().toISOString() });
      }
      saveProgress(idx + 1);
      console.log(`   → next episode: ${idx + 2} (${germanUnitAt(idx + 1).topic})`);
    }
  } else if (!noTelegram) {
    throw new Error("Telegram is not configured; refusing to mark a local-only render as delivered.");
  } else if (!isCorrection) {
    saveProgress(idx + 1);
  }

  console.log(`\n✅ episode ${episodeNo} ready: ${deliveredVideos.map((video) => resolve(video.final)).join(" | ")}`);
} catch (err) {
  console.error(`   ✗ episode ${episodeNo} (${unit.id}) failed: ${err.message}`);
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
