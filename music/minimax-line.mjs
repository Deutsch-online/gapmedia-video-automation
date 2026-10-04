// One line of series dialogue in MiniMax, with an emotion (owner, 2026-10-04: the family series
// "does not have the feelings the videos need"). Separate from music/minimax-tts.mjs on purpose: that
// one carries the approved Persian narration reading and must not change.
// Env: MM_VOICES (comma list of voice ids: the first one the account offers is used),
//      MM_EMO (happy|sad|angry|fearful|disgusted|surprised|neutral), MM_SPEED, MM_PITCH, MM_LANG, MM_MODEL.
// Exit code 1 on any failure; the caller then falls back to the Edge voice and logs it.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { trimDeadAir } from "../lib/voice-settings.mjs";

const argv = process.argv.slice(2);
const outAt = argv.indexOf("-o");
const text = argv.slice(0, outAt < 0 ? argv.length : outAt).join(" ").trim();
const output = outAt >= 0 ? argv[outAt + 1] : "";
const key = process.env.MINIMAX_API_KEY || "";
if (!text || !output || !key) { console.error("usage: MINIMAX_API_KEY=… minimax-line.mjs <text> -o <out.mp3>"); process.exit(1); }

const base = (process.env.MINIMAX_API_HOST || "https://api.minimax.io") + "/v1";
const headers = { authorization: `Bearer ${key}`, "content-type": "application/json" };
const candidates = String(process.env.MM_VOICES || "").split(",").map((x) => x.trim()).filter(Boolean);
let voice = candidates[0];
try {
  const r = await fetch(`${base}/get_voice`, { method: "POST", headers, body: JSON.stringify({ voice_type: "system" }) });
  const d = await r.json();
  const have = new Set((d.system_voice || []).map((v) => v.voice_id));
  if (process.env.MM_LIST) console.log(`  English voices offered: ${[...have].filter((v) => /^English_/.test(v)).join(", ")}`);
  if (have.size) {
    const hit = candidates.find((c) => have.has(c));
    if (!hit) { console.error(`none of ${candidates.join(", ")} is offered by this account`); process.exit(1); }
    voice = hit;
  }
} catch { /* the list is only a check: the first candidate is tried */ }
const emo = process.env.MM_EMO || "neutral";
// speech-2.8 chooses the feeling from the text and does not take `emotion`: models that take it come first
// (owner, 2026-10-04: every line of a character sounded the same). If one fails the next is tried.
const models = String(process.env.MM_MODELS || "speech-2.6-hd,speech-02-hd,speech-2.8-hd").split(",").map((x) => x.trim()).filter(Boolean);
let mod = {}; try { mod = JSON.parse(process.env.MM_MOD || "{}"); } catch { /* none */ }
const make = (model, withMod) => ({
  model, text, stream: false, language_boost: process.env.MM_LANG || "English", output_format: "hex",
  voice_setting: { voice_id: voice, speed: Number(process.env.MM_SPEED || 1), vol: Number(process.env.MM_VOL || 1), pitch: Math.round(Number(process.env.MM_PITCH || 0)), ...(emo !== "neutral" ? { emotion: emo } : {}) },
  ...(withMod && Object.keys(mod).length ? { voice_modify: mod } : {}),
  audio_setting: { sample_rate: 44100, bitrate: 128000, format: "mp3", channel: 1 },
});
let data = {}, used = "";
for (const model of models) {
  for (const withMod of [true, false]) {
    if (!withMod && !Object.keys(mod).length) continue;
    const res = await fetch(`${base}/t2a_v2`, { method: "POST", headers, body: JSON.stringify(make(model, withMod)) });
    data = await res.json().catch(() => ({}));
    if (res.ok && data?.base_resp?.status_code === 0 && data?.data?.audio) { used = `${model}${withMod && Object.keys(mod).length ? "+modify" : ""}`; break; }
    console.error(`  ${model}${withMod ? "+modify" : ""}: ${data?.base_resp?.status_msg || res.status}`);
  }
  if (used) break;
}
if (!used) { console.error("MiniMax line failed on every model"); process.exit(1); }
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, Buffer.from(data.data.audio, "hex"));
trimDeadAir(output);
console.log(`  MiniMax ${voice} ${used} (${emo}) -> ${output}`);
