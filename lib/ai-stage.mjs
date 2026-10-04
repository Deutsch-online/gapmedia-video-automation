// The AI-cast stage (owner, 2026-10-04: "I want a real animation"). The library in
// public/ai-cast/ holds 3.5-second animated clips of Lena and Herr Braun made by
// ai-cast/build.py (FLUX.1-schnell stills, Wan 2.2 motion). This module cuts them to a
// lesson's dialogue timing: the speaker's talk clip on every line, the listener's laugh
// after the joke that closes a scene, quiet listen clips under the English explanations,
// the two-shot for the opening and the goodbye. The result is one silent 1080x1080 film
// that the lesson composition plays in its stage box.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

export const AI_CAST_DIR = "public/ai-cast";
export const AI_CLIPS = ["lena-talk", "braun-talk", "two-talk", "lena-laugh", "braun-laugh", "lena-listen", "braun-listen"];

export function aiCastReady(dir = AI_CAST_DIR) {
  return AI_CLIPS.every((c) => existsSync(`${dir}/${c}.mp4`));
}

const other = (who) => (who === "lena" ? "braun" : "lena");

// The shot list: [{ t0, t1, clip }] covering 0..total with no gaps.
export function planAIShots({ lines, outroAt, total }) {
  const L = lines.filter((l) => l.who === "lena" || l.who === "braun").sort((a, b) => a.t - b.t);
  const shots = [];
  const push = (t0, t1, clip, src) => { if (t1 - t0 > 0.04) shots.push({ t0: +t0.toFixed(3), t1: +t1.toFixed(3), clip, ...(src ? { src } : {}) }); };
  let quiet = 0;
  const quietClip = () => [`lena-listen`, `braun-listen`][quiet++ % 2];
  push(0, L.length ? Math.max(0, L[0].t - 0.15) : outroAt, "two-talk");
  L.forEach((l, i) => {
    const n = L[i + 1];
    const start = Math.max(0, l.t - 0.15), end = n ? Math.max(start, n.t - 0.15) : outroAt;
    const spoke = Math.min(end, l.t + l.dur + 0.2);
    // a line with its own lip-synced video (lib/ai-lipsync.mjs) plays that video from the
    // moment that matches the shot's start; otherwise the generic talk clip
    push(start, spoke, `${l.who}-talk`, l.lipsync ? { file: l.lipsync.file, at: +(l.lipsync.off - (l.t - start)).toFixed(3) } : null);
    const joke = !l.key && (!n || n.item !== l.item || n.key);
    let at = spoke;
    if (joke) { const laughEnd = Math.min(end, spoke + 2.4); push(at, laughEnd, `${other(l.who)}-laugh`); at = laughEnd; }
    if (end - at < 0.6 && shots.length) shots[shots.length - 1].t1 = +end.toFixed(3);   // no flash cut
    else if (end - at > 2.2) push(at, end, quietClip());        // an English explanation: nobody on stage talks
    else push(at, end, `${other(l.who)}-listen`);
  });
  push(outroAt, total, "lena-talk");
  return shots;
}

// Renders the shot list into one silent film. Each clip is first made into a
// 1080x1080, 30 fps forward-and-back loop, so a shot of any length plays smoothly;
// shots start at different points of their loop so a repeated clip does not look repeated.
export function renderAIStage({ lines, outroAt, total, out, dir = AI_CAST_DIR, work }) {
  const tmp = work || `${out}.parts`;
  mkdirSync(tmp, { recursive: true });
  const shots = planAIShots({ lines, outroAt, total });
  const loops = {};
  const ff = (args) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
  for (const c of new Set(shots.filter((s) => !s.src).map((s) => s.clip))) {
    loops[c] = `${tmp}/${c}-loop.mp4`;
    ff(["-i", `${dir}/${c}.mp4`, "-filter_complex", "[0:v]scale=1080:1080:flags=lanczos,fps=30,setsar=1,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[o]",
      "-map", "[o]", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", loops[c]]);
  }
  const list = [];
  shots.forEach((s, i) => {
    const seg = `${tmp}/seg${String(i).padStart(3, "0")}.mp4`;
    const offset = ((i * 1.37) % 6).toFixed(2);
    // whole frames from the absolute shot times, so rounding never adds up along the film
    const frames = Math.round(s.t1 * 30) - Math.round(s.t0 * 30);
    if (frames <= 0) return;
    if (s.src) {
      // the lip-synced clip: square crop, 1080, 30 fps; its last frame holds if the shot runs longer
      ff(["-ss", Math.max(0, s.src.at).toFixed(3), "-i", s.src.file, "-frames:v", String(frames), "-an",
        "-vf", "crop='min(iw,ih)':'min(iw,ih)',scale=1080:1080:flags=lanczos,fps=30,setsar=1,tpad=stop_mode=clone:stop=-1",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", seg]);
    } else {
      ff(["-stream_loop", "-1", "-ss", offset, "-i", loops[s.clip], "-frames:v", String(frames), "-an",
        "-vf", "fps=30,setsar=1", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", seg]);
    }
    list.push(`file '${seg.split("/").pop()}'`);
  });
  writeFileSync(`${tmp}/list.txt`, list.join("\n") + "\n");
  ff(["-f", "concat", "-safe", "0", "-i", `${tmp}/list.txt`, "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", "30", "-an", out]);
  return { out, shots };
}
