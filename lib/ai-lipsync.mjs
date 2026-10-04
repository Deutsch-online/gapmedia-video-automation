// Real lip-sync for the AI cast (owner, 2026-10-04: "the lips do not match the voice at all").
// Every spoken German line of Lena or Herr Braun gets a video in which that character says
// exactly that audio: LongCat-Video-Avatar 1.5 (MIT weights) through ai-cast/lipsync.py.
// The model makes ~5-second videos, so short lines of one speaker are packed into one
// request (a lead-in, the lines with pauses between) and cut apart again afterwards; that
// keeps a lesson inside the daily GPU quota. A line whose video could not be made keeps the
// generic talk clip (lib/ai-stage.mjs).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { AI_CAST_DIR } from "./ai-stage.mjs";

export const LIPSYNC_SECONDS = 4.7;     // the model's clip is 5 s; keep a little tail
const LEAD = 0.3, GAP = 0.3;

// Packs the speaking lines into requests: [{ who, len, items: [{ line, off }] }].
export function packLipsync(lines, max = LIPSYNC_SECONDS) {
  const chunks = [];
  for (const who of ["lena", "braun"]) {
    let cur = null;
    for (const l of lines.filter((x) => x.who === who && x.file && x.dur > 0).sort((a, b) => a.t - b.t)) {
      if (LEAD + l.dur > max) continue;                     // too long for one clip: the generic talk clip stays
      if (!cur || cur.len + GAP + l.dur > max) { cur = { who, len: LEAD, items: [] }; chunks.push(cur); }
      else cur.len += GAP;
      cur.items.push({ line: l, off: +cur.len.toFixed(3) });
      cur.len += l.dur;
    }
  }
  return chunks;
}

// Makes the lip-synced videos and marks each line that has one: line.lipsync = { file, off }.
export function makeLipsync({ lines, work, dir = AI_CAST_DIR }) {
  mkdirSync(work, { recursive: true });
  const chunks = packLipsync(lines);
  const jobs = chunks.map((c, i) => {
    const audio = `${work}/chunk${i}.wav`, out = `${work}/chunk${i}.mp4`;
    const inputs = c.items.flatMap((it) => ["-i", it.line.file]);
    const chain = c.items.map((it, k) => `[${k + 1}:a]aresample=44100,aformat=channel_layouts=mono,adelay=${Math.round(it.off * 1000)}[d${k}]`).join(";") +
      `;[0:a]${c.items.map((_, k) => `[d${k}]`).join("")}amix=inputs=${c.items.length + 1}:duration=first:normalize=0[out]`;
    execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-t", "5", "-i", "anullsrc=r=44100:cl=mono", ...inputs,
      "-filter_complex", chain, "-map", "[out]", audio], { stdio: "inherit" });
    return { who: c.who, image: `${dir}/${c.who}-cu.png`, audio, out };
  });
  if (!jobs.length) return { requested: 0, made: 0 };
  writeFileSync(`${work}/jobs.json`, JSON.stringify(jobs, null, 2));
  try { execFileSync("python3", ["ai-cast/lipsync.py", `${work}/jobs.json`], { stdio: "inherit" }); }
  catch (e) { console.error(`   ◇ lip-sync could not run: ${String(e.message).split("\n")[0]}`); }
  let made = 0;
  chunks.forEach((c, i) => {
    if (!existsSync(jobs[i].out)) return;
    made++;
    for (const it of c.items) it.line.lipsync = { file: jobs[i].out, off: it.off };
  });
  console.log(` lip-sync: ${made} of ${chunks.length} clips made`);
  return { requested: chunks.length, made };
}
