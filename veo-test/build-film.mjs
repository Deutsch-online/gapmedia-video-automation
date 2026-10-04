// The owner's Veo clips -> one portrait film -> (1) a transcript with word times (Whisper) and, once
// veo-test/captions.json exists, (2) the captioned film in the TikTok, Instagram and YouTube looks.
// captions.json: { title, challenge, caps: [{ t0, t1, de, fa, hl, who, whoName }], end?: {...} }
import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { buildEasyReelHTML } from "../lib/easy-reel.mjs";
import { assertComposition } from "../lib/hf-check.mjs";
import { loadEnv, telegramConfig, sendVideo, sendMessage } from "../lib/telegram.mjs";

process.chdir(new URL("..", import.meta.url).pathname);
const tg = telegramConfig(loadEnv());
const HF = "npx --yes hyperframes@0.8.79";
execFileSync("bash", ["veo-test/assemble.sh"], { stdio: "inherit" });
const film = "veo-test/film.mp4";
const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", film]).toString().trim());
console.log(`film ${dur.toFixed(2)} s`);

if (process.env.MODE === "transcribe" || !existsSync("veo-test/captions.json")) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", film, "-vn", "-ac", "1", "-ar", "16000", "veo-test/film.wav"]);
  const py = `import whisper, json\nm = whisper.load_model("medium")\nr = m.transcribe("veo-test/film.wav", language="de", word_timestamps=True, condition_on_previous_text=False)\nout = [{"start": s["start"], "end": s["end"], "text": s["text"].strip(), "words": [{"w": w["word"].strip(), "t0": w["start"], "t1": w["end"]} for w in s.get("words", [])]} for s in r["segments"]]\njson.dump(out, open("veo-test/transcript.json", "w"), ensure_ascii=False, indent=1)\nprint("\\n".join(f'{s["start"]:.1f}-{s["end"]:.1f} {s["text"]}' for s in out))\n`;
  execFileSync("python3", ["-c", py], { stdio: "inherit" });
  if (tg.enabled) {
    await sendVideo({ token: tg.token, chatId: tg.reviewChatId, file: film, caption: "Veo film (no captions yet)" });
    const lines = JSON.parse(readFileSync("veo-test/transcript.json", "utf8")).map((s) => `${s.start.toFixed(1)}–${s.end.toFixed(1)}  ${s.text}`).join("\n");
    await sendMessage({ token: tg.token, chatId: tg.reviewChatId, text: `Transcript (Whisper):\n${lines}`.slice(0, 3900) });
  }
  process.exit(0);
}

const C = JSON.parse(readFileSync("veo-test/captions.json", "utf8"));
mkdirSync("public/ai-cast/stage", { recursive: true }); mkdirSync("compositions/veo", { recursive: true }); mkdirSync("renders/veo", { recursive: true });
copyFileSync(film, "public/ai-cast/stage/veo-film.mp4");
const caption = `😂 ${C.title}\n${C.challenge ? `Challenge: ${C.challenge}\n` : ""}\n#DieNachbarn #Comedy #Alltag #Deutschland #Deutschlernen #LearnGerman #fyp`;
for (const [theme, label] of [["tiktok", "TikTok"], ["easy", "Instagram"], ["youtube", "YouTube Shorts"]]) {
  const comp = `compositions/veo/film-${theme}.html`;
  // the picture and the audio of the film are used as they are: the composition only adds the captions on top
  writeFileSync(comp, buildEasyReelHTML({ episodeNo: C.episodeNo || 55, seriesTitle: "Die Nachbarn", title: C.title, total: dur, video: "public/ai-cast/stage/veo-film.mp4", theme, caps: C.caps, end: C.end,
    brand: { title: "Die Nachbarn", sub: C.challenge ? `Challenge: ${C.challenge}` : "EasyDeutsch" } }));
  assertComposition(comp, { cli: HF });
  const silent = `renders/veo/film-${theme}-silent.mp4`, final = `renders/veo/film-${theme}.mp4`;
  execSync(`${HF} render -c "${comp}" --quality high --fps 30 -o "${silent}"`, { stdio: "inherit" });
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", silent, "-i", film, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final]);
  if (tg.enabled) { const r = await sendVideo({ token: tg.token, chatId: tg.reviewChatId, file: final, caption: theme === "youtube" ? `${caption} #Shorts` : caption }); console.log(`sent ${label} (message ${r?.message_id})`); }
}
