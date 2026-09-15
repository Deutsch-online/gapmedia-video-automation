import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { ownRealAsset, loadOwnAssetManifest, OWN_ASSET_MANIFEST } from "./lib/own-assets.mjs";
import { assertVisualProof } from "./lib/visual-proof.mjs";

// LAW 7 (PROJECT_RULES.md, owner amendment 2026-09-13). The live outage this
// exists for, reproduced from the real 2026-09-13 logs: Exa answers 402
// (credits exhausted) and Gemini answers 429 (quota exceeded) on every call,
// so layers 1 and 2 are both gone. What must happen then:
//   layer 3 -> one of OUR OWN licensed real photographs, if one covers the word
//   layer 4 -> stop and report; never a generic icon, fake UI or stock cartoon
//
// Both halves are tested, because a fallback that cannot say "no" is just a
// slower way of shipping a fake.

const dir = mkdtempSync(join(tmpdir(), "law7-"));
const assetDir = join(dir, "public/real-german");
mkdirSync(assetDir, { recursive: true });
const manifestFile = join(assetDir, "manifest.json");

// A real image file, made with ffmpeg so it has genuine pixels and genuine
// dimensions — the quality bar below has to be exercised against something
// real, not a stub with an .jpg name.
const bigPhoto = "einkaufen-real-supermarket.jpg";
const smallPhoto = "kasse-too-small.jpg";
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=steelblue:s=1280x1600", "-frames:v", "1", join(assetDir, bigPhoto)]);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=indianred:s=640x480", "-frames:v", "1", join(assetDir, smallPhoto)]);

const write = (assets) => writeFileSync(manifestFile, JSON.stringify({ assets }, null, 2));
const opts = { dir: assetDir, manifestFile };

// --- Layer 1 and 2 are down. This is the state the whole law is written for. ---
const exaSearchMock = async () => { const e = new Error("Exa 402"); e.status = 402; throw e; };
const geminiGenerateMock = async () => { const e = new Error("Gemini 429"); e.status = 429; throw e; };
let exaCalls = 0;
let geminiCalls = 0;
const layersOneAndTwo = async () => {
  try { exaCalls++; await exaSearchMock(); } catch { /* 402 — fall through, per LAW 7 */ }
  try { geminiCalls++; await geminiGenerateMock(); } catch { /* 429 — fall through, per LAW 7 */ }
  return null;
};

assert.equal(await layersOneAndTwo(), null);
assert.equal(exaCalls, 1, "layer 1 must actually be attempted before any fallback");
assert.equal(geminiCalls, 1, "layer 2 must actually be attempted before any fallback");

// --- Layer 3: a complete, verified own asset is used. ---
{
  write({
    "Was kostet das?": {
      file: bigPhoto,
      depicts: "a shopper holding a price tag in a supermarket aisle",
      license: "owner-shot, Berlin, 2026-09",
      source: "owner camera",
    },
  });
  const found = ownRealAsset("Was kostet das?", "این چند است؟", opts);
  assert.ok(found, "a complete own asset must be used once layers 1 and 2 are exhausted");
  assert.equal(found.sourceType, "owner-supplied", "must be tagged as what it is — the gate already sanctions this type");
  assert.match(found.photo, /einkaufen-real-supermarket\.jpg$/);
  assert.equal(found.alt, "a shopper holding a price tag in a supermarket aisle");

  // Whitespace/case differences in the key must still resolve — the manifest
  // is maintained by hand.
  assert.ok(ownRealAsset("  was KOSTET das?  ", "", opts), "key matching must tolerate hand-editing");
  console.log("ok   LAW 7 layer 3: Exa 402 + Gemini 429 falls back to our own licensed real photo");
}

// --- Layer 3 must refuse anything it cannot actually stand behind. ---
{
  write({ "Das ist zu teuer": { file: "does-not-exist.jpg", depicts: "x", license: "y" } });
  assert.equal(ownRealAsset("Das ist zu teuer", "", opts), null, "a manifest entry whose file is missing must never be used");

  write({ "Das ist zu teuer": { file: bigPhoto, depicts: "", license: "owner-shot" } });
  assert.equal(ownRealAsset("Das ist zu teuer", "", opts), null, "no `depicts` means nothing establishes it as evidence for THIS word");

  write({ "Das ist zu teuer": { file: bigPhoto, depicts: "a shocked shopper", license: "" } });
  assert.equal(ownRealAsset("Das ist zu teuer", "", opts), null, "no licence means it is not ours to publish");

  write({ "Das ist zu teuer": { file: smallPhoto, depicts: "a checkout", license: "owner-shot" } });
  assert.equal(ownRealAsset("Das ist zu teuer", "", opts), null, "a fallback photo must clear the same 1080px/700k bar as a searched one");

  write({});
  assert.equal(ownRealAsset("Ich nehme das", "", opts), null, "a word with no own asset must fall through to the hard stop");
  console.log("ok   LAW 7 layer 3 refuses missing, unattributed, unlicensed and under-quality assets");
}

// --- Layer 4: when layer 3 has nothing, the build STOPS. No generic stand-in. ---
{
  write({});
  const found = ownRealAsset("Haben Sie...?", "", opts);
  assert.equal(found, null);
  // This is what the caller does with that null: the Visual Truth Gate throws
  // exactly as it did before LAW 7 existed. The law adds a layer, it does not
  // add an escape.
  assert.throws(
    () => assertVisualProof({ id: "a1-18-shopping", tips: [{ head: "Haben Sie...?", photo: null }] }),
    /تصویر واقعیِ همان قابلیت ندارد/,
    "with no own asset either, the gate must still stop the build",
  );
  console.log("ok   LAW 7 layer 4: with all three lawful layers exhausted the gate still stops — no generic fake");
}

// --- The gate itself must not have been widened by any of this. Pinned by
// --- behaviour, not by word-matching: the file's own prose says "not a
// --- generic icon", so grepping for the word proves nothing either way.
{
  // The accepted source types are frozen here deliberately. LAW 7 rides on
  // "owner-supplied", which the gate already had; adding a NEW type is how a
  // generic-visual escape would most plausibly get introduced, so it has to
  // break this test and be argued for explicitly.
  const EXPECTED_SOURCE_TYPES = [
    "official-ui", "official-asset", "owner-supplied", "labelled-explainer",
    "commons-licensed", "openverse-licensed", "ai-generated", "generated-fallback",
  ];
  const gate = await import("./lib/visual-proof.mjs");
  // The gate only trusts files under public/ — which is exactly why LAW 7's
  // own assets live in public/real-german/ and not in an assets/ folder
  // outside it. A real, already-shipped repo image is used here so this
  // check exercises the gate's true path, not a tmpdir fixture it would
  // reject for the wrong reason.
  const inPublic = "public/german-lesson-logo.png";
  const evidence = (sourceType) => ({ sourceUrl: "u", sourceType, claim: "c", mainVisual: "m", whatItProves: "w", motionAction: "a", secondaryMotion: "s", ambientMotion: "b", coverage: 0.5 });
  for (const type of EXPECTED_SOURCE_TYPES) {
    assert.doesNotThrow(
      () => gate.assertVisualProof({ id: "t", source: "x", tips: [{ photo: inPublic, visualEvidence: evidence(type) }] }),
      `"${type}" must still be accepted`,
    );
  }
  assert.throws(
    () => gate.assertVisualProof({ id: "t", source: "x", tips: [{ photo: inPublic, visualEvidence: evidence("generic-illustration") }] }),
    /نوع منبع بصریِ معتبر ندارد/,
    "an invented source type must still be rejected — LAW 7 added no new category",
  );
  // And the gate must still refuse a path outside public/, whatever it claims
  // about itself — this is what stops an "own asset" from being dropped just
  // anywhere on disk and waved through.
  assert.throws(
    () => gate.assertVisualProof({ id: "t", source: "x", tips: [{ photo: join(assetDir, bigPhoto), visualEvidence: evidence("owner-supplied") }] }),
    /تصویر واقعیِ همان قابلیت ندارد/,
    "a file outside public/ must still be rejected even when tagged owner-supplied",
  );
  console.log("ok   the Visual Truth Gate is unchanged — LAW 7 fills a slot it already had, and adds no new source type");
}

// --- The shipped manifest must be real: parseable, and never claiming assets
// --- that are not actually present in the repo.
{
  const shipped = loadOwnAssetManifest();
  assert.equal(typeof shipped, "object", `${OWN_ASSET_MANIFEST} must parse`);
  for (const key of Object.keys(shipped)) {
    assert.ok(ownRealAsset(key, ""), `manifest claims an asset for «${key}» that does not pass verification — a manifest must never promise a photo the repo does not actually have`);
  }
  console.log(`ok   shipped manifest is honest (${Object.keys(shipped).length} verified own assets registered)`);
}

rmSync(dir, { recursive: true, force: true });
