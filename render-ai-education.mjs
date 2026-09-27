// One-off build + render for the standalone "What is AI?" educational video.
//   node render-ai-education.mjs              # 1080x1920, music muxed in
//   node render-ai-education.mjs --4k         # 2160x3840
//   node render-ai-education.mjs --no-music   # skip the music mux step
// This self-locates the project dir so it can be run from anywhere.
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildHTML } from "./lib/build.mjs";
import { aiEducationPack } from "./lib/content.mjs";

const projectDir = dirname(fileURLToPath(import.meta.url));
process.chdir(projectDir);

const args = process.argv.slice(2);
const is4k = args.includes("--4k");
const noMusic = args.includes("--no-music");
const HF = "npx --yes hyperframes@0.8.79";
const resFlag = is4k ? "--resolution portrait-4k" : "";

const pack = aiEducationPack();
const compDir = "compositions/ai-education";
const outDir = "renders/ai-education";
mkdirSync(compDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const comp = `${compDir}/index.html`;
writeFileSync(comp, buildHTML(pack));

const silent = `${outDir}/ai-education-silent.mp4`;
const final = `${outDir}/ai-education.mp4`;
console.log(`\n=== ${pack.title} — ${is4k ? "4K" : "1080p"} ===`);
execSync(`${HF} render -c "${comp}" --quality high --fps 30 ${resFlag} --skill=faceless-explainer -o "${silent}"`, { stdio: "inherit" });

if (!noMusic) {
  const music = existsSync(pack.music) ? pack.music : "music/bed-60s.m4a";
  console.log(`\n== muxing music: ${music} ==`);
  execSync(`ffmpeg -y -i "${silent}" -i "${music}" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${final}"`, { stdio: "inherit" });
} else {
  console.log("\n(no-music: keeping silent render)");
}

console.log(`\n✅ ${resolve(final)}\n`);
