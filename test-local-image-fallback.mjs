import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import {
  generateLocalFallbackImage, FREE_CATALOGUE_IMAGE_SOURCES,
  wikimediaCommonsImageHits, openverseImageHits,
} from "./lib/auto-image.mjs";
import { imageSize, imageType } from "./lib/media-guard.mjs";
import { assertVisualProof } from "./lib/visual-proof.mjs";
import { buildInkHTML } from "./lib/build-ink.mjs";
import { packForFeature } from "./lib/content.mjs";

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

  // Owner report 2026-09-15 (episode 20): every slide that fell through to
  // this exact fallback rendered as a solid black frame. Root cause:
  // build-ink.mjs's photoSrc() built the data URI as
  // `data:image/${type}` straight from imageType()'s token, and that
  // token is "svg" — not the real MIME subtype "svg+xml". Chromium (the
  // same renderer this project's render pipeline streams frames from)
  // does not decode "data:image/svg;base64,...", so the <img> painted
  // nothing, indistinguishable on this composition's dark ink ground from
  // a black slide. This proves the real buildInkHTML() — not a
  // reimplementation — emits a browser-decodable SVG data URI for a real
  // LAW 7 layer 6 fallback file.
  {
    const pack = packForFeature("tts-voice");
    pack.tips[0].photo = found.photo;
    pack.tips[0].photoAspect = 0.75;
    const html = buildInkHTML(pack);
    assert.match(html, /data:image\/svg\+xml;base64,/,
      "an SVG fallback photo must be embedded with its real MIME subtype (svg+xml), or Chromium renders it as nothing");
    assert.doesNotMatch(html, /data:image\/svg;base64,/,
      "\"image/svg\" is not a real MIME type — this is exactly the bug that rendered every fallback slide black");
  }
} finally {
  rmSync(found.photo, { force: true });
}

console.log("ok   free catalogue sources and the labelled local image fallback pass visual QC");
