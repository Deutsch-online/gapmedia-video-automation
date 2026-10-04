// The background film of an EasyDeutsch reel (lib/easy-reel.mjs): each segment shows its
// AI shot full-screen at 1080x1920. A 3.5-second motion clip loops forward and back for as
// long as its segment lasts; a shot whose clip could not be made shows its still with a
// slow push-in. Every segment is cut on whole frames from absolute times, so the film never
// drifts from the voice.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const COVER = "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920";

// segments: [{ t0, t1, png, mp4 }] covering 0..total
export function renderReelVideo({ segments, out, work }) {
  mkdirSync(work, { recursive: true });
  const ff = (args) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
  const loops = {};
  const list = [];
  segments.forEach((s, i) => {
    const frames = Math.round(s.t1 * 30) - Math.round(s.t0 * 30);
    if (frames <= 0) return;
    const seg = `${work}/seg${String(i).padStart(3, "0")}.mp4`;
    if (s.mp4 && existsSync(s.mp4)) {
      if (!loops[s.mp4]) {
        loops[s.mp4] = `${work}/loop${Object.keys(loops).length}.mp4`;
        ff(["-i", s.mp4, "-filter_complex", `[0:v]${COVER},fps=30,setsar=1,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[o]`,
          "-map", "[o]", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", loops[s.mp4]]);
      }
      ff(["-stream_loop", "-1", "-i", loops[s.mp4], "-frames:v", String(frames), "-an", "-vf", "fps=30,setsar=1",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", seg]);
    } else {
      ff(["-loop", "1", "-framerate", "30", "-i", s.png, "-frames:v", String(frames), "-an",
        "-vf", `${COVER},zoompan=z='1+0.00025*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,setsar=1`,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", seg]);
    }
    list.push(`file '${seg.split("/").pop()}'`);
  });
  writeFileSync(`${work}/list.txt`, list.join("\n") + "\n");
  ff(["-f", "concat", "-safe", "0", "-i", `${work}/list.txt`, "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-an", out]);
  return out;
}
