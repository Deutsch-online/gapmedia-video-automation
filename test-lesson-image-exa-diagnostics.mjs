// Owner directive 2026-09-15 ("این بار هر طور شده خطا را درست کن" — fix it no
// matter what): episode 20's real build log (news-scan run #335) jumped
// straight from Wikipedia's own "⚠ Wikipedia(...)" warnings to
// generateAIImage() with no trace of Exa (LAW 7 layer 3) at all, even though
// EXA_API_KEY and a judge key were both configured. lib/lesson-image.mjs's
// attempt() caught every exaSearch() failure with a bare `catch { return
// null; }` — no message, no status, nothing — unlike findPexelsImage() and
// findWikimediaImage(), which both log the real HTTP status
// (`⚠ Pexels(«query»): Pexels 402`, etc.). A real Exa failure (quota, rate
// limit, a bad key) was therefore indistinguishable from Exa never being
// attempted at all.
//
// This proves the real findLessonImage() (not a reimplementation) now logs
// Exa's real failure reason the same way the other two layers already do.
//
//   node test-lesson-image-exa-diagnostics.mjs
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Read at module-load time in lib/auto-image.mjs, so set before anything
// importing it loads — same reason the sibling lesson-image tests do this.
process.env.EXA_API_KEY = "test-exa-key";
process.env.GEMINI_API_KEY = "test-gemini-key";
// Deliberately NOT set: PEXELS_API_KEY — so layer 1 short-circuits to null
// and this test exercises only the real gap: layer 2 (Wikimedia, always
// tried, always empty here) and layer 3 (Exa).

const workDir = mkdtempSync(join(tmpdir(), "lesson-image-exa-diag-"));

const realFetch = globalThis.fetch;
const realError = console.error;
const errors = [];
console.error = (...args) => { errors.push(args.join(" ")); };
globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.includes("de.wikipedia.org")) {
    return { ok: true, status: 200, json: async () => ({ query: { pages: {} } }) };
  }
  if (u.includes("api.exa.ai")) {
    // A real "out of credits" shape, exactly as episode 20's own Exa 402
    // history (documented in PROJECT_RULES.md) already looks like.
    return { ok: false, status: 402, json: async () => ({}) };
  }
  throw new Error(`unexpected fetch in test: ${u}`);
};

const { findLessonImage } = await import("./lib/lesson-image.mjs");

try {
  const result = await findLessonImage("two friends meeting greeting outdoors", "اهل کجایی؟ (غیررسمی)", "Woher kommst du?");

  // Real search is exhausted (Wikimedia empty, Exa 402) and AI generation
  // has nothing to reach (Pollinations unmocked here, so it fails closed),
  // so LAW 7 layer 6's labelled local graphic stands in — this test is
  // about the DIAGNOSTIC TRACE Exa leaves behind, not about forcing a hit.
  assert.ok(result, "with every real/AI layer genuinely exhausted, a labelled local fallback must stand in, never a hard stop");
  assert.equal(result.sourceType, "generated-fallback");

  const exaLine = errors.find((line) => line.includes("Exa("));
  assert.ok(exaLine, `Exa's failure must be logged with the same shape Pexels/Wikimedia already use — got: ${JSON.stringify(errors)}`);
  assert.ok(exaLine.includes("402"), `the real HTTP status must be in the message, not swallowed — got: ${exaLine}`);
  console.log("ok   findLessonImage() now logs Exa's real failure reason instead of silently skipping the layer");
} finally {
  globalThis.fetch = realFetch;
  console.error = realError;
  rmSync(workDir, { recursive: true, force: true });
}
