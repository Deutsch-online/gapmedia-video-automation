// Owner report 2026-09-15 ("پکسیل نیز وصل است از آن استفاده کنید" — Pexels
// is connected too, use it): episode 19's real blocker was never "Pexels
// isn't tried". It ran and examined 8 candidates (news-scan run #317's own
// log: "Pexels(«person asking for directions street»): 8 candidates
// examined, none passed — notRelevant:8"), all rejected as not relevant to
// the full four-word search phrase. lib/lesson-image.mjs's Pexels/Wikimedia
// layers fired exactly ONE search each — the full phrase — unlike layer 3
// (Exa), which already broadens through shorter tiers when the full phrase
// finds nothing (a four-word compound like "person asking for directions
// street" is not how stock libraries tag photos; the two-word core subject,
// "directions street", is).
//
// This proves the fix: when the full-phrase Pexels search returns only an
// irrelevant candidate, a narrower tier (the query's last two words) is
// tried next and a real, relevant photo is accepted — not the AI-generated
// fallback, and not a give-up.
//
//   node test-lesson-image-tiered-search.mjs
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Read at module-load time in lib/auto-image.mjs, so set before anything
// importing it loads — same reason test-lesson-image-ai-fallback.mjs does.
process.env.PEXELS_API_KEY = "test-pexels-key";
process.env.GEMINI_API_KEY = "test-gemini-key";

const workDir = mkdtempSync(join(tmpdir(), "lesson-image-tier-"));
const photoFile = join(workDir, "real-photo.jpg");
// This contract test only needs a file that the project's own media guard
// identifies as a 1200×1600 PNG; asking the host's FFmpeg to manufacture a
// coloured JPEG made a deterministic unit test depend on Windows application
// policy.  The PNG signature + IHDR are exactly the bytes imageType()/
// imageSize() inspect, so this fixture tests the real admission path without
// requiring an external encoder.
const png = Buffer.alloc(25); // imageSize() deliberately rejects headers at the exact boundary
png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
png.writeUInt32BE(13, 8); // IHDR chunk length
png.write("IHDR", 12, "ascii");
png.writeUInt32BE(1200, 16);
png.writeUInt32BE(1600, 20);
writeFileSync(photoFile, png);
const photoBytes = readFileSync(photoFile);
const toArrayBuffer = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const FULL_PHRASE = "person asking for directions street";
const NARROW_TIER = "directions street"; // words.slice(-2) of the phrase above
const RELEVANT_TITLE = "a tourist asking a local for directions on a city street";

const realFetch = globalThis.fetch;
const pexelsQueries = [];
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.includes("de.wikipedia.org")) {
    // Layer 2 stays out of this test's way — empty pages, no article found.
    return { ok: true, status: 200, json: async () => ({ query: { pages: {} } }) };
  }
  if (u.includes("api.pexels.com/v1/search")) {
    const q = new URL(u).searchParams.get("query") || "";
    pexelsQueries.push(q);
    if (q === FULL_PHRASE) {
      return {
        ok: true, status: 200,
        json: async () => ({ photos: [{
          id: 1, alt: "a busy city intersection at night", photographer: "x",
          url: "https://pexels.example/wrong", src: { original: "https://img.example/wrong.jpg" },
        }] }),
      };
    }
    if (q === NARROW_TIER) {
      return {
        ok: true, status: 200,
        json: async () => ({ photos: [{
          id: 2, alt: RELEVANT_TITLE, photographer: "y",
          url: "https://pexels.example/right", src: { original: "https://img.example/right.jpg" },
        }] }),
      };
    }
    return { ok: true, status: 200, json: async () => ({ photos: [] }) };
  }
  if (u === "https://img.example/wrong.jpg" || u === "https://img.example/right.jpg") {
    return { ok: true, status: 200, arrayBuffer: async () => toArrayBuffer(photoBytes) };
  }
  if (u.includes("generativelanguage.googleapis.com")) {
    const prompt = JSON.parse(init.body).contents[0].parts[0].text;
    const relevant = prompt.includes(RELEVANT_TITLE);
    return {
      ok: true, status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ relevant, reason: "test" }) }] } }] }),
    };
  }
  throw new Error(`unexpected fetch in test: ${u}`);
};

const { findLessonImage } = await import("./lib/lesson-image.mjs");
let acceptedPhoto = "";

try {
  const result = await findLessonImage(FULL_PHRASE, "... کجاست؟", "Wo ist...?");
  acceptedPhoto = result?.photo || "";

  assert.ok(result, "a narrower tier must find a real, relevant photo instead of giving up");
  assert.equal(result.sourceType, "labelled-explainer", "must be a real sourced photo, not the AI-generated fallback");
  assert.equal(result.alt, RELEVANT_TITLE);
  assert.ok(existsSync(result.photo), "the accepted photo must actually exist on disk");
  assert.deepEqual(
    pexelsQueries, [FULL_PHRASE, NARROW_TIER],
    "the full phrase must be tried first, and a genuinely narrower tier only after it finds nothing relevant",
  );
  console.log("ok   findLessonImage() broadens Pexels/Wikimedia search tiers exactly like Exa already did, and accepts a real photo from a narrower tier");
} finally {
  globalThis.fetch = realFetch;
  rmSync(workDir, { recursive: true, force: true });
  // The candidate verifier writes downloaded assets into public/user-media
  // exactly as production does. This fixture is synthetic, so it must not
  // leak into a later render's real-media directory.
  if (acceptedPhoto) {
    rmSync(acceptedPhoto, { force: true });
    rmSync(acceptedPhoto.replace(/\.[^.]+$/, ".img"), { force: true });
  }
}
