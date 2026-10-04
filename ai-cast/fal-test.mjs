// One cheap test of fal.ai lip-sync (owner, 2026-10-04): a character portrait + one line of OUR voice
// (MiniMax, as in the series) -> a talking video, sent to the bot chat. One clip of about 3 s
// (about 0.4 USD at the published 0.115 USD/s of Kling Avatar v2 Pro; Fabric 0.08-0.15 USD/s).
// Usage: node ai-cast/fal-test.mjs [kling|fabric] [baba|madar|mina|sami]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fal } from "@fal-ai/client";
import { loadEnv, telegramConfig, sendVideo } from "../lib/telegram.mjs";

const which = process.argv[2] || "kling", who = process.argv[3] || "baba";
const MODELS = {
  kling: { id: "fal-ai/kling-video/ai-avatar/v2/pro", input: (image_url, audio_url) => ({ image_url, audio_url, prompt: "The cartoon character speaks with lively, natural expressions that match the voice, small head movements." }), usdPerSec: 0.115 },
  fabric: { id: "veed/fabric-1.0", input: (image_url, audio_url) => ({ image_url, audio_url, resolution: "720p" }), usdPerSec: 0.15 },
};
const M = MODELS[which];
if (!M) throw new Error(`unknown model "${which}" (kling | fabric)`);
if (!process.env.FAL_KEY) { console.error("FAL_KEY is not set: add the fal.ai key as the GitHub secret FAL_KEY."); process.exit(1); }
fal.config({ credentials: process.env.FAL_KEY });

const LINES = { baba: "Twenty guests means forty cups of tea!", madar: "Don't panic. I have a second pot.", mina: "Baba, I counted. Twelve pairs of shoes!", sami: "I'm hungry! I'm hungry!" };
const VOICES = { baba: "English_Jovialman", madar: "English_Upbeat_Woman", mina: "English_radiant_girl", sami: "English_AnimeCharacter" };
mkdirSync("out", { recursive: true });
const audio = "out/fal-test-line.mp3";
try {
  execFileSync(process.execPath, ["music/minimax-line.mjs", LINES[who], "-o", audio], { stdio: "inherit", env: { ...process.env, MM_VOICES: VOICES[who], MM_EMO: "surprised" } });
} catch {
  console.log("MiniMax unavailable: Edge voice for the test line");
  execFileSync(process.execPath, ["music/edge-tts.mjs", LINES[who], "-o", audio], { stdio: "inherit", env: { ...process.env, EDGE_TTS_VOICE: "en-US-GuyNeural", EDGE_TTS_SPEED: "1" } });
}
const secs = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio]).toString().trim());
if (secs > 6) throw new Error(`the test line is ${secs}s: too long for a cheap test`);
const imageUrl = await fal.storage.upload(new Blob([readFileSync(`public/family/${who}.jpg`)], { type: "image/jpeg" }));
const audioUrl = await fal.storage.upload(new Blob([readFileSync(audio)], { type: "audio/mpeg" }));
console.log(`uploaded; asking ${M.id} for about ${secs.toFixed(1)} s (about ${(secs * M.usdPerSec).toFixed(2)} USD at the published price)`);
const t0 = Date.now();
const result = await fal.subscribe(M.id, { input: M.input(imageUrl, audioUrl), logs: false });
const url = result?.data?.video?.url;
if (!url) throw new Error(`no video in the answer: ${JSON.stringify(result?.data).slice(0, 300)}`);
const out = `out/fal-${which}-${who}.mp4`;
writeFileSync(out, Buffer.from(await (await fetch(url)).arrayBuffer()));
console.log(`made in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${out}`);
const tg = telegramConfig(loadEnv());
if (tg.enabled) {
  const r = await sendVideo({ token: tg.token, chatId: tg.reviewChatId, file: out, caption: `fal.ai test: ${M.id}, ${who}, one line of our own voice` });
  console.log(`sent to Telegram (message ${r?.message_id})`);
}
