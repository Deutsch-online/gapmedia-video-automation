import assert from "node:assert/strict";

// Owner directive 2026-09-13 ("Recovery Loop", explicitly scoped to never
// touch lib/visual-proof.mjs or ship a guessed/icon/typography stand-in for
// missing real evidence): a single failed search query is one METHOD, not
// proof no real photo exists. findRealImage() must try genuinely different
// search angles before giving up, and generateAIImage() (the already-
// sanctioned last resort, PROJECT_RULES rule 39/41) must retry once with a
// genuinely different prompt when blocked by a safety filter specifically —
// never a second identical attempt, and never a fallback beyond the two
// already-sanctioned tiers (real photo, then ai-generated).
const { REAL_IMAGE_SEARCH_STRATEGIES, findRealImage, generateAIImage } = await import("./lib/auto-image.mjs");

assert.ok(
  REAL_IMAGE_SEARCH_STRATEGIES.length >= 3,
  "at least 3 distinct real-image search strategies must be tried before giving up",
);
const queries = REAL_IMAGE_SEARCH_STRATEGIES.map((build) => build("SomeApp"));
assert.equal(
  new Set(queries).size, queries.length,
  "every search strategy must produce a genuinely distinct query, not a reworded duplicate",
);
console.log("ok   findRealImage() tries", REAL_IMAGE_SEARCH_STRATEGIES.length, "genuinely distinct search strategies before giving up");

// The real-photo search needs a relevance judge and therefore short-circuits
// with no text-model credentials. Pollinations generation is intentionally
// keyless, so test its failure path by making the provider unreachable rather
// than incorrectly treating a successful free provider response as a bug.
delete process.env.EXA_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.GOOGLE_API_KEY;
delete process.env.GROQ_API_KEY;
assert.equal(await findRealImage("test topic", []), null, "findRealImage() must return null, not fabricate anything, with no API keys configured");
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error("provider offline in regression test"); };
try {
  assert.equal(await generateAIImage("test topic", "test slide"), null, "generateAIImage() must return null when its free provider cannot be reached");
} finally {
  globalThis.fetch = originalFetch;
}
console.log("ok   both functions fail closed (return null) when their required provider is unavailable");
