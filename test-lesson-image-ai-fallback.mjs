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
// Owner directive 2026-09-15, second round: generateAIImage() itself then
// moved from Gemini's gemini-2.5-flash-image to Pollinations — real evidence
// from news-scan run #323/#324 showed the relevance judge (a separate Gemini
// model) ran clean while the image-generation call alone 429'd with an error
// body naming "plan and billing details", i.e. a quota tied to the Google
// Cloud project behind the key, not the key itself; rotating the key could
// never have cleared it. Pollinations needs no key/billing and returns image
// bytes directly from one GET call.
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

// Deliberately NOT set: PEXELS_API_KEY, EXA_API_KEY — so layers 1 and 3
// short-circuit to null/[] exactly as they do in production when unconfigured
// (confirmed live 2026-09-15: "Exa✗skipped (needs EXA_API_KEY...)"), and this
// test exercises only the real gap — layer 2 (Wikimedia, needs no key) and
// layer 4 (Pollinations, also no key) — without a live network call to either.

// A real image file, so imageType()/imageSize() (which read genuine bytes,
// not a stub) accept it — same technique test-visual-fallback.mjs uses for
// LAW 7 layer 5's own assets.
const workDir = mkdtempSync(join(tmpdir(), "lesson-image-ai-"));
const genImage = join(workDir, "pollinations-mock.png");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=slateblue:s=1200x1600", "-frames:v", "1", genImage]);
const genImageBytes = readFileSync(genImage);
const toArrayBuffer = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const realFetch = globalThis.fetch;
const calls = { wikimedia: 0, pollinations: 0 };
globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.includes("de.wikipedia.org")) {
    calls.wikimedia++;
    // A real "no matching article" shape — an empty pages object, not an error.
    return { ok: true, status: 200, json: async () => ({ query: { pages: {} } }) };
  }
  if (u.includes("image.pollinations.ai")) {
    calls.pollinations++;
    return { ok: true, status: 200, arrayBuffer: async () => toArrayBuffer(genImageBytes) };
  }
  throw new Error(`unexpected fetch in test: ${u}`);
};

const { findLessonImage } = await import("./lib/lesson-image.mjs");

try {
  const result = await findLessonImage("person asking for directions street", "... کجاست؟", "Wo ist...?");

  assert.ok(result, "must return a result instead of giving up once real search is exhausted");
  assert.equal(result.sourceType, "ai-generated", "the fallback image must be labelled exactly what it is");
  assert.equal(calls.wikimedia, 3, "layer 2 (Wikimedia, no key needed) must be tried at every broadening tier, not just the full phrase");
  assert.equal(calls.pollinations, 1, "layer 4 (Pollinations) must be reached only after the real layers above it are exhausted");
  assert.ok(existsSync(result.photo), "the generated file must actually exist on disk");
  console.log("ok   findLessonImage() falls back to a labelled AI-generated image once Pexels/Wikimedia/Exa are exhausted");

  calls.pollinations = 0;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes("de.wikipedia.org")) return { ok: true, status: 200, json: async () => ({ query: { pages: {} } }) };
    if (u.includes("image.pollinations.ai")) {
      calls.pollinations++;
      // A real outage/exhaustion shape — a non-2xx status, no image body.
      return { ok: false, status: 500, text: async () => "internal error" };
    }
    throw new Error(`unexpected fetch in test: ${u}`);
  };
  const blocked = await findLessonImage("some word", "معنی‌اش", "some-word");
  // Owner directive 2026-09-15 ("اگر برای یک سلاید هیچ عکس پیدا نشد فقط یک
  // سلاید انیمیشنی بسازید"): a hard null here is no longer the honest final
  // answer — LAW 7 layer 6 (generateLocalFallbackImage(), already proven in
  // rescuePackPhotos()) now stands in with an explicitly labelled local SVG
  // rather than stopping the whole episode over one unfindable slide.
  assert.ok(blocked, "even with every real/AI layer exhausted, a labelled local fallback must stand in — never a hard stop, and never a fabricated real/AI result");
  assert.equal(blocked.sourceType, "generated-fallback", "must be labelled exactly what it is, distinguishable from a real or AI-generated photo");
  assert.ok(existsSync(blocked.photo), "the fallback graphic must actually exist on disk");
  assert.ok(calls.pollinations >= 1, "must actually attempt AI generation before falling back to a local graphic");
  console.log("ok   AI generation failing too still falls through honestly, to a labelled local graphic — never a hard stop, never a fabricated result");

  // Owner directive 2026-09-15, third round: episode 20's own log (run #335)
  // showed generateAIImage() dying to a thrown connection-level error
  // ("terminated") rather than a clean non-2xx status — a case withRetry()'s
  // own 429/503 branch never sees, since the fetch call itself rejected.
  // A single transient drop must not immediately burn the whole attempt.
  calls.pollinations = 0;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes("de.wikipedia.org")) return { ok: true, status: 200, json: async () => ({ query: { pages: {} } }) };
    if (u.includes("image.pollinations.ai")) {
      calls.pollinations++;
      if (calls.pollinations === 1) throw new Error("terminated");
      return { ok: true, status: 200, arrayBuffer: async () => toArrayBuffer(genImageBytes) };
    }
    throw new Error(`unexpected fetch in test: ${u}`);
  };
  const recovered = await findLessonImage("person asking for directions street", "... کجاست؟", "Wo ist...?");
  assert.ok(recovered, "a single dropped connection must not be treated the same as a real failure");
  assert.equal(recovered.sourceType, "ai-generated");
  assert.equal(calls.pollinations, 2, "exactly one retry after the dropped connection, within the same attempt");
  console.log("ok   a dropped connection (not just a bad status) gets one real retry before the attempt gives up");
} finally {
  globalThis.fetch = realFetch;
  rmSync(workDir, { recursive: true, force: true });
}
