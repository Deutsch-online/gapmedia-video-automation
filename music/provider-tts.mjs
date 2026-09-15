// Voice provider router: continue to the next real voice service if the
// preferred one cannot create the MP3.  Bounded fallbacks prevent an outage
// from blocking the workflow forever while avoiding unbounded paid retries.
import { execFileSync } from "node:child_process";
import { recordProviderFile, runWithProviderFallback } from "../lib/providers.mjs";

const args = process.argv.slice(2);
const outAt = args.indexOf("-o");
const output = outAt < 0 ? "" : args[outAt + 1];
if (!output) throw new Error("provider-tts needs -o <output.mp3>");

const call = (script, env = process.env) => () => execFileSync("node", [script, ...args], {
  stdio: ["ignore", "ignore", "inherit"], env,
});
const result = await runWithProviderFallback({
  capability: "voice",
  runners: {
    minimax: call("music/minimax-tts.mjs"),
    // The shared Edge adapter defaults to German for A1 lessons.  Persian
    // tutorial narration must choose the Persian neural voice explicitly.
    edge: call("music/edge-tts.mjs", { ...process.env, EDGE_TTS_VOICE: process.env.EDGE_PERSIAN_VOICE || "fa-IR-FaridNeural" }),
  },
  onAttempt: (event) => {
    if (event.status === "failed") console.error(`${event.name} voice failed (${event.error}); trying the next provider`);
  },
});
recordProviderFile({ capability: "voice", provider: result.provider.id, file: output, attempts: result.attempts });
console.log(`  provider voice complete: ${result.provider.name}`);
