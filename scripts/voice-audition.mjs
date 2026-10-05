// Voice audition (owner, 2026-10-05: "the voice is harsh and not attractive"). The same two sentences in several German
// Edge voices, sent to the owner's bot chat as audio so the ear decides (VOICE-LOG.md: a voice is never changed by guess).
// Usage: node scripts/voice-audition.mjs male|female
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { loadEnv, telegramConfig, sendAudio } from "../lib/telegram.mjs";
const which = process.argv[2] || "male";
const VOICES = {
  male: ["de-DE-ConradNeural", "de-DE-FlorianMultilingualNeural", "de-DE-KillianNeural", "de-AT-JonasNeural"],
  female: ["de-DE-KatjaNeural", "de-DE-SeraphinaMultilingualNeural", "de-DE-AmalaNeural", "de-AT-IngridNeural"],
}[which];
const TEXT = "Ich wasche das Gemüse. Ich schneide die Tomate. Ich koche die Suppe.";
const tg = telegramConfig(loadEnv());
mkdirSync("out", { recursive: true });
for (const v of VOICES) {
  const f = `out/audition-${v}.mp3`;
  try {
    execFileSync(process.execPath, ["music/edge-tts.mjs", TEXT, "-o", f], { stdio: "inherit", env: { ...process.env, EDGE_TTS_VOICE: v, EDGE_TTS_SPEED: "0.95", EDGE_TTS_VOL: "1.0" } });
  } catch (e) { console.log(`${v}: not available (${String(e.message).split("\n")[0]})`); continue; }
  if (tg.enabled) { await sendAudio({ token: tg.token, chatId: tg.reviewChatId, file: f, caption: `Voice audition (${which}): ${v}`, title: v }); console.log(`sent ${v}`); }
}
