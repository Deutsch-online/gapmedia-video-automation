import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import {
  generateLocalFallbackImage, FREE_CATALOGUE_IMAGE_SOURCES,
  wikimediaCommonsImageHits, openverseImageHits,
} from "./lib/auto-image.mjs";
import { imageSize, imageType } from "./lib/media-guard.mjs";
import { assertVisualProof } from "./lib/visual-proof.mjs";

assert.deepEqual(
  FREE_CATALOGUE_IMAGE_SOURCES,
  ["wikimedia-commons", "openverse"],
  "both no-key, reuse-safe catalogue providers must remain part of the fallback chain",
);

// Exercise the provider adapters with their documented response shapes. This
// confirms a provider response is transformed into a normal candidate for the
// existing quality/relevance gate — it never bypasses that gate.
{
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).startsWith("https://commons.wikimedia.org/")) {
      return { ok: true, json: async () => ({ query: { pages: {
        "1": { title: "File:Berlin.jpg", imageinfo: [{
          url: "https://upload.wikimedia.org/berlin.jpg",
          thumburl: "https://upload.wikimedia.org/berlin-1440.jpg",
          extmetadata: { LicenseShortName: { value: "CC0" }, ImageDescription: { value: "Berlin" } },
        }] },
      } } }) };
    }
    return { ok: true, json: async () => ({ results: [{
      title: "Creator camera", license: "pdm", creator: "Author",
      url: "https://example.test/original.jpg", foreign_landing_url: "https://example.test/page",
    }] }) };
  };
  try {
    const commons = await wikimediaCommonsImageHits("Berlin");
    const openverse = await openverseImageHits("Berlin");
    assert.equal(commons[0].provider, "wikimedia-commons");
    assert.equal(commons[0].image, "https://upload.wikimedia.org/berlin-1440.jpg");
    assert.equal(openverse[0].provider, "openverse");
    assert.equal(openverse[0].url, "https://example.test/page");
  } finally {
    globalThis.fetch = realFetch;
  }
}

const found = generateLocalFallbackImage("Instagram analytics", "آمار View و درآمد را بررسی کن");
try {
  assert.equal(found.sourceType, "generated-fallback");
  assert.equal(found.sourceUrl, "generated-fallback:local-contextual-svg");
  assert.ok(existsSync(found.photo), "the local fallback must actually create a media file");
  assert.equal(imageType(found.photo), "svg", "the file must be an explicitly identified SVG, never a fake photo");
  assert.deepEqual(imageSize(found.photo), { width: 1080, height: 1440 }, "the fallback must meet the portrait quality floor");
  assert.doesNotThrow(() => assertVisualProof({
    id: "local-fallback-test",
    source: "generated-fallback:local-contextual-svg",
    tips: [{
      photo: found.photo,
      visualEvidence: {
        sourceUrl: found.sourceUrl, sourceType: found.sourceType, claim: "test",
        mainVisual: found.photo, whatItProves: found.alt,
        motionAction: "test", secondaryMotion: "test", ambientMotion: "test", coverage: 0.55,
      },
    }],
  }));
} finally {
  rmSync(found.photo, { force: true });
}

console.log("ok   free catalogue sources and the labelled local image fallback pass visual QC");
