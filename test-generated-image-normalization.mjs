import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeGeneratedImage } from "./lib/auto-image.mjs";
import { imageSize, imageType } from "./lib/media-guard.mjs";

// Reproduce the exact free-provider response that stopped daily run #288:
// a valid 9:16 PNG at 576x1024.  It must be normalized, never accepted at a
// weaker floor and never cause an immediate second provider request.
const dir = mkdtempSync(join(tmpdir(), "gapmedia-generated-"));
const source = join(dir, "pollinations-576x1024.png");
try {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=steelblue:s=576x1024", "-frames:v", "1", source]);
  assert.deepEqual(imageSize(source), { width: 576, height: 1024 });

  const result = normalizeGeneratedImage(source);
  assert.equal(result.normalized, true, "an undersized but valid generation must be normalized, not rejected");
  assert.ok(result.named && existsSync(result.named), "normalization must write a real delivery file");
  assert.equal(imageType(result.named), "png");
  assert.deepEqual(imageSize(result.named), { width: 1080, height: 1920 }, "the normalized file must clear the unchanged 1080x1920 delivery target");
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log("ok   an undersized generated portrait is normalized before Visual QC");
