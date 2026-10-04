// Generates ONE music bed at an exact duration, loudness-normalised.
// Usage: node music/make-one.mjs <seconds> <variant 1..3> <out.m4a> [outroBars]
import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

process.chdir(dirname(dirname(fileURLToPath(import.meta.url))));

const dur = Number(process.argv[2]);
const variant = Number(process.argv[3]) || 1;
const outM4a = process.argv[4];
const outroBars = process.argv[5] || "4";
if (!dur || !outM4a) {
  console.error("usage: node music/make-one.mjs <seconds> <variant> <out.m4a> [outroBars]");
  process.exit(1);
}

mkdirSync("music/auto", { recursive: true });
const wav = outM4a.replace(/\.m4a$/, ".wav");

execFileSync("node", [process.env.MUSIC_STYLE === "comedy" ? "music/synth-comedy.mjs" : "music/synth.mjs", String(dur), String(variant), wav], {
  stdio: "inherit",
  env: { ...process.env, MUSIC_OUTRO_BARS: String(outroBars) },  // MUSIC_MOOD/BPM/ACCENTS pass through
});
execFileSync("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "error", "-i", wav,
  "-af", "loudnorm=I=-9.5:TP=-2:LRA=11,alimiter=limit=0.72:attack=1:release=60:level=false",
  "-c:a", "aac", "-b:a", "192k", outM4a,
], { stdio: "inherit" });
if (existsSync(wav)) unlinkSync(wav);
console.log(`  music -> ${outM4a}`);
