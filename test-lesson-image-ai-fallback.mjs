// LAW 7 layer 4 — owner directive 2026-09-15: a vocabulary word must go
// through a FULL real-search pass before the build stops; if that pass finds
// nothing, an AI-generated (explicitly labelled) image replaces it rather
// than failing the episode outright. This was already written into
// PROJECT_RULES.md's Appendix Six ("4. Gemini") when LAW 7 was first drafted
// 2026-09-13, but lib/lesson-image.mjs never actually called generateAIImage()
// — it jumped straight from Exa to the own-asset layer, then a hard stop.
// That gap is exactly what silently killed episode 19 (a1-19-directions) on
// 2026-09-15 after its narration bug was already fixed: Pexels and Wikimedia
// both ran and found nothing relevant for "Wo ist...?", Exa was unconfigured,
// no own asset existed, and the build stopped anyway.
//
// This proves the real findLessonImage() — not a reimplementation — reaches
// generateAIImage() when every real layer above it comes back empty, and
// that the result is correctly labelled "ai-generated".
//
//   node test-lesson-image-ai-fallback.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// GEMINI_KEY is read at module-load time in lib/auto-image.mjs, so it must be
// set before that module (or anything importing it) is loaded — same reason
// test-diagnose-board.mjs uses a dynamic import after setting its own env.
process.env.GEMINI_API_KEY = "test-gemini-key";
// Deliberately NOT set: PEXELS_API_KEY, EXA_API_KEY — so layers 1 and 3
// short-circuit to null/[] exactly as they do in production when unconfigured
// (confirmed live 2026-09-15: "Exa✗skipped (needs EXA_API_KEY...)"), and this
// test exercises only the real gap — layer 2 (Wikimedia, needs no key) and
// layer 4 (Gemini) — without a live network call to either.

// A real image file, so imageType()/imageSize() (which read genuine bytes,
// not a stub) accept it — same technique test-visual-fallback.mjs uses for
// LAW 7 layer 5's own assets.
const workDir = mkdtempSync(join(tmpdir(), "lesson-image-ai-"));
const genImage = join(workDir, "gemini-mock.png");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=slateblue:s=1200x1600", "-frames:v", "1", genImage]);
const genImageB64 = readFileSync(genImage).toString("base64");

const realFetch = globalThis.fetch;
const calls = { wikimedia: 0, gemini: 0 };
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.includes("de.wikipedia.org")) {
    calls.wikimedia++;
    // A real "no matching article" shape — an empty pages object, not an error.
    return { ok: true, status: 200, json: async () => ({ query: { pages: {} } }) };
  }
  if (u.includes("generativelanguage.googleapis.com")) {
    calls.gemini++;
    return {
      ok: true, status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { data: genImageB64 } }] } }] }),
    };
  }
  throw new Error(`unexpected fetch in test: ${u}`);
};

const { findLessonImage } = await import("./lib/lesson-image.mjs");

try {
  const result = await findLessonImage("person asking for directions street", "... کجاست؟", "Wo ist...?");

  assert.ok(result, "must return a result instead of giving up once real search is exhausted");
  assert.equal(result.sourceType, "ai-generated", "the fallback image must be labelled exactly what it is");
  assert.equal(calls.wikimedia, 3, "layer 2 (Wikimedia, no key needed) must be tried at every broadening tier, not just the full phrase");
  assert.equal(calls.gemini, 1, "layer 4 (Gemini) must be reached only after the real layers above it are exhausted");
  assert.ok(existsSync(result.photo), "the generated file must actually exist on disk");
  console.log("ok   findLessonImage() falls back to a labelled AI-generated image once Pexels/Wikimedia/Exa are exhausted");

  calls.gemini = 0;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes("de.wikipedia.org")) return { ok: true, status: 200, json: async () => ({ query: { pages: {} } }) };
    if (u.includes("generativelanguage.googleapis.com")) {
      calls.gemini++;
      // A real "prompt blocked" shape — 200 OK, no image part.
      return { ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: "SAFETY" }] }) };
    }
    throw new Error(`unexpected fetch in test: ${u}`);
  };
  const blocked = await findLessonImage("some word", "معنی‌اش", "some-word");
  assert.equal(blocked, null, "when AI generation is also exhausted, the caller must still get null (own-asset, then a real stop) — never a fabricated result");
  assert.ok(calls.gemini >= 1, "must actually attempt AI generation before giving up");
  console.log("ok   AI generation failing too still falls through honestly, instead of fabricating a result");
} finally {
  globalThis.fetch = realFetch;
  rmSync(workDir, { recursive: true, force: true });
}
