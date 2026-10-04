// The background film of an EasyDeutsch reel (lib/easy-reel.mjs): each segment shows its
// AI shot full-screen at 1080x1920. The motion clip of a shot plays ONCE, forward, stretched in
// time to fill its segment (owner, 2026-10-04: motion and sound were not in order — the old
// forward-and-back loop played the speaking mouth backwards). If the segment is much longer than
// the clip, the last frame is held. On top of every shot a slow push-in or pull-out (alternating
// from shot to shot) keeps the picture moving in time with the cuts. A shot whose clip could not
// be made shows its still with the same camera move. Every segment is cut on whole frames from
// absolute times, so the film never drifts from the voice.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const COVER = "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920";

const clipSeconds = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim()) || 0;
const MAX_STRETCH = 1.45, MIN_STRETCH = 0.8;   // slower than 1.45x or faster than 0.8x looks wrong: hold the last frame / cut instead
const ZOOM = 0.06;                             // the camera move: 6 % over a shot

// segments: [{ t0, t1, png, mp4 }] covering 0..total
export function renderReelVideo({ segments, out, work }) {
  mkdirSync(work, { recursive: true });
  const ff = (args) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
  const list = [];
  segments.forEach((s, i) => {
    const frames = Math.round(s.t1 * 30) - Math.round(s.t0 * 30);
    if (frames <= 0) return;
    const seg = `${work}/seg${String(i).padStart(3, "0")}.mp4`;
    const D = frames / 30;
    // the camera move: in on even shots, out on odd ones (a steady rhythm)
    const z = i % 2 === 0 ? `(1+${ZOOM}*t/${D.toFixed(3)})` : `(1+${ZOOM}-${ZOOM}*t/${D.toFixed(3)})`;
    const cam = `scale=w='trunc(1080*${z}/2)*2':h='trunc(1920*${z}/2)*2':eval=frame:flags=bicubic,crop=1080:1920`;
    const enc = ["-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", seg];
    if (s.mp4 && existsSync(s.mp4)) {
      const C = clipSeconds(s.mp4) || D;
      const r = s.native ? 1 : Math.min(MAX_STRETCH, Math.max(MIN_STRETCH, D / C));   // the clip plays once, stretched to the segment (a lip-synced clip at its own speed: the lips follow the voice)
      const held = Math.max(0, D - C * r);                                  // what is left over: the last frame
      ff(["-i", s.mp4, "-vf", `${COVER},fps=30,setsar=1,setpts=${r.toFixed(4)}*PTS,fps=30,tpad=stop_mode=clone:stop_duration=${held.toFixed(3)},${cam},setsar=1`,
        "-frames:v", String(frames), ...enc]);
    } else {
      ff(["-loop", "1", "-framerate", "30", "-i", s.png, "-frames:v", String(frames), "-vf", `${COVER},${cam},setsar=1`, ...enc]);
    }
    list.push(`file '${seg.split("/").pop()}'`);
  });
  writeFileSync(`${work}/list.txt`, list.join("\n") + "\n");
  ff(["-f", "concat", "-safe", "0", "-i", `${work}/list.txt`, "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-an", out]);
  return out;
}
