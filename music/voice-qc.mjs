// Word-level release gate for the exact TTS clips that the video will use.
// A level meter can prove that audio exists; it cannot prove that «صِفر» or a
// bound suffix was pronounced correctly. Whisper is imperfect, so comparison
// is deliberately phonetic (lib/hear.mjs), but an added syllable, missing word
// or changed word blocks the release.
//
// Usage: node music/voice-qc.mjs --manifest path/to/voice-qc.json
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { faults } from "../lib/hear.mjs";

const diagnosticFile = process.env.RENDER_DIAGNOSTIC_FILE || "";
function diagnostic(reason, line = null, fault = null) {
  if (!diagnosticFile) return;
  try {
    writeFileSync(diagnosticFile, JSON.stringify({
      stage: "narration-planning", reason, line,
      faultKind: fault?.kind || null,
      wordIndex: Number.isInteger(fault?.wantIndex) ? fault.wantIndex + 1 : null,
      at: new Date().toISOString(),
    }, null, 2));
  } catch {}
}

const at = process.argv.indexOf("--manifest");
const manifestFile = at >= 0 ? process.argv[at + 1] : "";
if (!manifestFile || !existsSync(manifestFile)) {
  diagnostic("voice-qc-manifest");
  console.error("voice QC needs --manifest <existing-json-file>");
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
if (!entries.length || entries.some((e) => !e?.spoken || !e?.file || !existsSync(e.file))) {
  diagnostic("voice-qc-input");
  console.error("voice QC manifest has no complete spoken/file entries");
  process.exit(2);
}

const model = process.env.ASR_MODEL || "medium";
let results;
try {
  const raw = execFileSync("python", ["lib/asr.py"], {
    input: JSON.stringify({ model, files: entries.map((e) => e.file) }),
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
  });
  results = JSON.parse(raw.toString()).results || [];
} catch (err) {
  diagnostic("voice-asr-unavailable");
  console.error(`Narration ASR QC could not run: ${String(err.message).split("\n")[0]}`);
  process.exit(2);
}

const report = entries.map((entry, index) => {
  const heard = results[index] || { text: "", words: [] };
  // The spoken copy may contain phonetic markers used only by TTS. ASR
  // naturally returns the authored Persian spelling, so the release gate
  // compares audio with written text and avoids false retry loops.
  const found = faults({ expected: entry.written, heard: heard.text, words: heard.words });
  const blocking = found.filter((f) => f.kind !== "extra" || String(f.got || "").length > 1);
  return { line: index + 1, written: entry.written, spoken: entry.spoken, heard: heard.text, faults: blocking };
});

const out = { checkedAt: new Date().toISOString(), model, report };
writeFileSync(resolve(dirname(manifestFile), "voice-qc-report.json"), JSON.stringify(out, null, 2));
const errors = report.flatMap((line) => line.faults.map((fault) => ({ line: line.line, ...fault })));
if (errors.length) {
  diagnostic("voice-asr-mismatch", errors[0].line, errors[0]);
  for (const fault of errors) console.error(`Narration QC line ${fault.line}: ${fault.kind} «${fault.want || "—"}» → «${fault.got || "—"}»`);
  process.exit(1);
}
console.log(`Narration ASR QC passed: ${entries.length} exact render clips (${model}).`);
 
