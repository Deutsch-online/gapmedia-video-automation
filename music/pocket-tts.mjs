// Local, free, offline hybrid Persian+English TTS via pocket-tts (Kyutai).
// Drop-in alternative to music/minimax-tts.mjs — same CLI contract:
// <text> -o <output>.
//
// pocket-tts-farsi cannot say English at all: it silently drops every
// Latin-script word (confirmed 2026-09-07, see memory
// voice_pocket_tts_farsi.md). The fix is not transliterating those words to
// Persian — it is splitting them out and speaking them with the separate
// English model, cloned onto the SAME reference voice so the two halves
// sound like one speaker. Confirmed by ear 2026-09-07 on a real three-part
// line ("با اپلیکیشن [Second Space] دو حساب...") — the voice held up across
// the model switch, and the transcript of the English segment came back
// exactly "second space." (previously dropped entirely on the Farsi-only
// model).
//
// Requires HF_TOKEN (a free HuggingFace access token) once, to pull the
// gated kyutai/pocket-tts voice-cloning weights that the English half needs.
import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import os from "node:os";
import { pocketSpeakable } from "../lib/pronounce.mjs";
import { segment, needsEnglishModel } from "../lib/tts-segments.mjs";
import { trimDeadAir } from "../lib/voice-settings.mjs";

const argv = process.argv.slice(2);
const outAt = argv.indexOf("-o");
const text = argv.slice(0, outAt < 0 ? argv.length : outAt).join(" ").trim();
const output = outAt >= 0 ? argv[outAt + 1] : "";
if (!text || !output) {
  console.error("usage: pocket-tts.mjs <text> -o <output.mp3>");
  process.exit(1);
}

// The Farsi model + its bundled voice-cloning reference. Both are cached
// locally by HuggingFace the first time the model runs. Override either path
// for a different voice audition without touching this file.
const FARSI_CONFIG = process.env.POCKET_TTS_FARSI_CONFIG
  || String.raw`C:\Users\mohse\.cache\huggingface\hub\models--mehdi-hf--pocket-tts-farsi\snapshots\3c59d06b3177b21c5cd0df9e9e3e899f4d361c1c\farsi.yaml`;
const VOICE = process.env.POCKET_TTS_VOICE
  || String.raw`C:\Users\mohse\.cache\huggingface\hub\models--mehdi-hf--pocket-tts-farsi\snapshots\3c59d06b3177b21c5cd0df9e9e3e899f4d361c1c\example_voice.wav`;

if (!existsSync(FARSI_CONFIG) || !existsSync(VOICE)) {
  console.error(
    `pocket-tts: model files not found (config: ${FARSI_CONFIG}, voice: ${VOICE}). ` +
    "Run the Farsi model once to let HuggingFace cache it, or set POCKET_TTS_FARSI_CONFIG / POCKET_TTS_VOICE.",
  );
  process.exit(1);
}

const segs = segment(pocketSpeakable(text));
if (!segs.length) {
  console.error("pocket-tts: nothing to synthesise after cleanup.");
  process.exit(1);
}

// Only the ENGLISH half needs the gated kyutai weights, so only a line that
// actually contains a Latin span needs a token. This check used to run before
// segmentation and refuse EVERY line, including pure-Persian ones that need
// nothing gated — proven on a real runner 2026-09-13, where the Farsi model
// downloaded unauthenticated and spoke a real narration line (see
// lib/tts-segments.mjs and .github/workflows/tts-probe.yml).
if (needsEnglishModel(segs) && !process.env.HF_TOKEN) {
  console.error(
    "HF_TOKEN is not set, and this line contains English: "
    + segs.filter((p) => p.lang === "en").map((p) => `«${p.text}»`).join(", ")
    + ". The English half needs the token once, to fetch the gated "
    + "kyutai/pocket-tts voice-cloning weights. A line with no Latin text "
    + "needs no token at all.",
  );
  process.exit(1);
}

const workDir = join(os.tmpdir(), `pocket-tts-${process.pid}-${Date.now()}`);
mkdirSync(workDir, { recursive: true });

try {
  const silence = join(workDir, "silence.wav");
  execFileSync("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error",
    "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
    "-t", "0.06", "-c:a", "pcm_s16le", silence,
  ]);

  const durationOf = (f) => Number(execFileSync("ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim()) || 0;

  // Only one segment needs a real generation call when the line is entirely
  // one language — no wasted silence-splice for the common all-Persian case.
  const pieces = [];
  segs.forEach((seg, i) => {
    const wav = join(workDir, `seg${i}.wav`);
    const genOnce = (temp) => {
      const args = seg.lang === "en"
        ? ["-m", "pocket_tts", "generate", "--voice", VOICE, "--language", "english",
          "--text", seg.text, "--temperature", String(temp), "--eos-threshold", "-2",
          "--frames-after-eos", "0", "--output-path", wav]
        : ["-m", "pocket_tts", "generate", "--config", FARSI_CONFIG, "--voice", VOICE,
          "--text", seg.text, "--temperature", String(temp), "--eos-threshold", "-2",
          "--frames-after-eos", "0", "--output-path", wav];
      execFileSync("python", args, { stdio: ["ignore", "ignore", "inherit"] });
    };
    genOnce(0.3);
    // A short, isolated Farsi fragment — a connector word like "است" or "را
    // کنار بگذار،" left standing alone between two English spans — sometimes
    // makes this Farsi model overrun past the real word and drift into
    // echoing its own voice-cloning reference clip ("یک فرد با دوربین...",
    // confirmed 2026-09-07 by transcribing the reference wav itself and
    // matching it word-for-word against the garbled tail reported live).
    // Real short Persian phrases run well under 0.55s/word.
    if (seg.lang === "fa") {
      const words = seg.text.trim().split(/\s+/).filter(Boolean).length;
      const expected = 0.9 + 0.55 * words;
      if (durationOf(wav) > expected) {
        // A retry at the SAME temperature reproduced the identical overrun
        // duration to the millisecond (verified 2026-09-07) — 0.3 is too
        // close to deterministic here to escape the failure by chance. A
        // higher temperature actually samples a different path.
        genOnce(0.75);
        // Still overran: cut losses. A word or two trimmed abruptly is a
        // small, local rough edge; several seconds of the reference clip's
        // own sentence spliced in is a much louder, more confusing defect.
        if (durationOf(wav) > expected) {
          const capped = join(workDir, `seg${i}-cap.wav`);
          execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error",
            "-i", wav, "-t", expected.toFixed(2), capped]);
          execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", capped, wav]);
        }
      }
    }
    if (i > 0) pieces.push(silence);
    pieces.push(wav);
  });

  const merged = join(workDir, "merged.wav");
  if (pieces.length === 1) {
    execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", pieces[0], merged]);
  } else {
    const inputs = pieces.flatMap((p) => ["-i", p]);
    const filter = `${pieces.map((_, i) => `[${i}:a]`).join("")}concat=n=${pieces.length}:v=0:a=1[out]`;
    execFileSync("ffmpeg", [
      "-y", "-hide_banner", "-loglevel", "error", ...inputs,
      "-filter_complex", filter, "-map", "[out]", merged,
    ]);
  }

  mkdirSync(dirname(output), { recursive: true });
  const isMp3 = /\.mp3$/i.test(output);
  execFileSync("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error", "-i", merged,
    ...(isMp3 ? ["-c:a", "libmp3lame", "-b:a", "192k"] : []),
    output,
  ]);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

trimDeadAir(output);
console.log(`  pocket-tts voice -> ${output} (${segs.length} segment${segs.length > 1 ? "s" : ""})`);
