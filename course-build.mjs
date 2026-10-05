// «Deutsch in 60 Sekunden»: builds one lesson (video in three formats, calm music, flashcards) and sends
// everything to the owner's bot chat only. Design: CURRICULUM_DESIGN.md; the lesson data: lib/course-lesson.mjs.
//   node course-build.mjs [--lesson c01-hello] [--no-telegram] [--dry]
// --dry: no voices, no render; the lesson is placed with estimated lengths, the compositions are written and checked.
import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DIALOGUE_VOICES, NARRATOR_SPEED, explainParts, levelLine, sayEdge, deliver } from "./lib/easydeutsch.mjs";
import { GERMAN_WORD_VOICE_SETTINGS } from "./lib/voice-settings.mjs";
import { assertComposition } from "./lib/hf-check.mjs";
import { sfxFile } from "./lib/sfx.mjs";
import { loadEnv, telegramConfig, sendPhoto, sendDocument } from "./lib/telegram.mjs";
import { COURSE, LESSONS, buildTimeline, buildCourseHTML, buildCardHTML, flashcardsTSV, estimateDur, validateLesson } from "./lib/course-lesson.mjs";
import { LESSONS_V2, SEGMENTS_V2, buildCourseHTMLv2 } from "./lib/course-v2.mjs";

process.chdir(dirname(fileURLToPath(import.meta.url)));
const localEnv = loadEnv();
Object.assign(process.env, localEnv);
const tg = telegramConfig(localEnv);
const arg = (name, d = "") => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : d; };
const dry = process.argv.includes("--dry"), noTelegram = process.argv.includes("--no-telegram");
const id = arg("--lesson", Object.keys(LESSONS_V2)[0]);
const lesson = LESSONS[id] || LESSONS_V2[id];
const v2 = lesson?.method === 2;   // method 2 (from lesson 55): research/teaching-methods-2026-10-05.md
if (!lesson) { console.error(` ✗ unknown lesson "${id}"`); process.exit(1); }
const problems = validateLesson(lesson, v2 ? SEGMENTS_V2 : undefined);
if (problems.length) { console.error(` ✗ lesson ${id}:\n   ${problems.join("\n   ")}`); process.exit(1); }

const HF = "npx --yes hyperframes@0.8.79";
const iso = new Date().toISOString().slice(0, 10);
const compDir = `compositions/course/${iso}`, outDir = `renders/course/${iso}`, vDir = "music/voice";
for (const d of [compDir, outDir, vDir]) mkdirSync(d, { recursive: true });
const probe = (f) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", f], { encoding: "utf8" })) || 0;

// ---- the voices: the approved lesson settings (German 0.85 and the narrator 0.88, VOICE-LOG.md), one voice per speaker
const speak = (who, text, file) => sayEdge(who === "narrator" ? { voice: "en-US-AvaNeural", speed: NARRATOR_SPEED } : { voice: DIALOGUE_VOICES[who], speed: GERMAN_WORD_VOICE_SETTINGS.speed }, text, file);
function speakMixed(en, file) {   // German in "double quotes" is read by Lena's German voice, the rest by the narrator
  const segs = explainParts(en).map((p, i) => { const f = file.replace(/\.mp3$/, `-p${i}.mp3`); speak(p.who, p.text, f); return f; });
  if (segs.length === 1) { execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", segs[0], "-c:a", "libmp3lame", "-q:a", "3", file]); }
  else {
    const chain = segs.map((_, i) => `[${i}:a]aresample=44100,apad=pad_dur=0.12[s${i}]`).join(";") + ";" + segs.map((_, i) => `[s${i}]`).join("") + `concat=n=${segs.length}:v=0:a=1[out]`;
    execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...segs.flatMap((f) => ["-i", f]), "-filter_complex", chain, "-map", "[out]", "-c:a", "libmp3lame", "-q:a", "3", file]);
  }
  for (const f of segs) try { unlinkSync(f); } catch { /* gone */ }
}
let n = 0;
const files = new Map();   // spoken item -> its voice file (buildTimeline hands durOf the very object it keeps)
const spokenDur = (it) => {
  const f = `${vDir}/course-${id}-${n++}.mp3`;
  if (it.k === "n") speakMixed(it.en, f); else speak(it.who, it.de, f);
  levelLine(f);
  files.set(it, f);
  return probe(f);
};
const tl = buildTimeline(lesson, dry ? estimateDur : spokenDur, v2 ? SEGMENTS_V2 : undefined);
console.log(` course ${id}: ${tl.total}s, ${tl.items.length} items, ${tl.segs.map((s) => `${s.id} ${s.t0.toFixed(1)}-${s.t1.toFixed(1)}`).join(" | ")}`);
if (tl.total > 65) throw new Error(`lesson ${id} is ${tl.total}s; the limit is 65s`);

// ---- the compositions: the same lesson in the three looks (Instagram, TikTok, YouTube)
const silentFor = {};
for (const theme of ["easy", "tiktok", "youtube"]) {
  const comp = `${compDir}/${id}-${theme}.html`;
  writeFileSync(comp, (v2 ? buildCourseHTMLv2 : buildCourseHTML)({ lesson, tl, theme }));
  assertComposition(comp, { cli: HF });
  if (dry) continue;
  const silent = `${outDir}/${id}-${theme}-silent.mp4`;
  execSync(`${HF} render -c "${comp}" --quality high --fps 30 -o "${silent}"`, { stdio: "inherit" });
  silentFor[theme] = silent;
}

// ---- the flashcards: a text deck for Anki and one picture with every card
const tsv = `${outDir}/${id}-flashcards.tsv`;
writeFileSync(tsv, flashcardsTSV(lesson));
const cardComp = `${compDir}/${id}-cards.html`;
writeFileSync(cardComp, buildCardHTML({ lesson }));
assertComposition(cardComp, { cli: HF });
if (dry) { console.log(" dry run: compositions written and checked, nothing rendered or sent."); process.exit(0); }
const cardMp4 = `${outDir}/${id}-cards.mp4`, cardPng = `${outDir}/${id}-cards.png`;
execSync(`${HF} render -c "${cardComp}" --quality draft --fps 30 -o "${cardMp4}"`, { stdio: "inherit" });
execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", cardMp4, "-frames:v", "1", cardPng]);

// ---- the sound of the lesson: every voice at its time, soft pops at the parts, ticks of the countdown, a chime on the answers
const parts = [];
const spokenFiles = [...files.values()];
let fi = 0;
const sfx = (kind, at, gain) => parts.push({ file: sfxFile(kind), at: +Math.max(0, at).toFixed(3), gain, keep: true });
for (const it of tl.items) {
  if (it.k === "cd") for (let k = 0; k < it.secs; k++) sfx("tick", it.t0 + k, 0.45);
  else { parts.push({ file: spokenFiles[fi++], at: it.t0 }); if (it.answer) sfx("tada", it.t0 - 0.05, 0.3); if (it.slot !== undefined) sfx("ding", it.t0 - 0.05, 0.25); }
}
for (const s of tl.segs) sfx("pop", s.t0, 0.3);
const voice = `${vDir}/course-${id}.m4a`;
const delays = parts.map((p, i) => `[${i + 1}:a]${p.gain ? `volume=${p.gain},` : ""}adelay=${Math.round(p.at * 1000)}|${Math.round(p.at * 1000)}[v${i}]`).join(";");
execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-t", String(tl.total), "-i", "anullsrc=r=44100:cl=stereo",
  ...parts.flatMap((p) => ["-i", p.file]),
  "-filter_complex", `${delays};[0:a]${parts.map((_, i) => `[v${i}]`).join("")}amix=inputs=${parts.length + 1}:duration=first:normalize=0[m];[m]loudnorm=I=-16:TP=-2:LRA=11[out]`,
  "-map", "[out]", "-c:a", "aac", "-b:a", "192k", voice], { stdio: "inherit" });

const caption = `📚 ${COURSE.title} · Mission ${lesson.mission} · Lesson ${lesson.no}\n${lesson.title}\n${lesson.titleFa}\n\n#LearnGerman #Deutsch #GermanA1 #Deutschlernen #fyp`;
await deliver({
  id, iso, episodeNo: lesson.no, text: { title: lesson.title }, duration: tl.total, caption, cuts: tl.segs.map((s) => +s.t0.toFixed(3)).concat(tl.total),
  voice, silentIn: silentFor.easy, silentFor, parts, tg, noTelegram, isCorrection: true, saveProgress: () => {}, idx: 0, outDir,
  brand: { label: COURSE.title, file: "course" }, musicStyle: "", musicMood: "calm", musicBpm: 88, musicGain: 0.3,
});
if (tg.enabled) {
  await sendPhoto({ token: tg.token, chatId: tg.reviewChatId, file: cardPng, caption: `🗂 Flashcards · Lesson ${lesson.no}: ${lesson.title}` });
  await sendDocument({ token: tg.token, chatId: tg.reviewChatId, file: tsv, caption: `Anki / Quizlet import (tab separated) · Lesson ${lesson.no}` });
  console.log(" ✈ flashcards sent to Telegram");
}
