// LAW 7 (PROJECT_RULES.md, owner amendment 2026-09-13), layer 5: the
// project's OWN licensed real photographs, used when every live sourcing
// layer — Pexels, Wikimedia, Exa, and AI generation (layer 4, owner
// directive 2026-09-15) — is unavailable or came back empty.
//
// Why this is not a hole in the Visual Truth Gate:
//   · lib/visual-proof.mjs already sanctions "owner-supplied" as a source
//     type. This module does not widen that gate, weaken it, or add an
//     exception to it — it fills the slot the gate already has, with real
//     photographs the owner licensed, not with anything generated here.
//   · Every asset still passes the SAME mechanical bar as every other
//     layer (real image bytes, long side >= 1080px, area >= 700k px), so a
//     fallback photo can never ship at a quality a searched photo could not.
//   · An asset is only usable when it carries provenance: what it actually
//     depicts, and where it came from / under what licence. No provenance,
//     no use.
//
// Scope, and the reason it is deliberately narrow: this layer serves the
// German A1 vocabulary series, where the thing a slide must prove IS the
// meaning of a word. A licensed photograph of bread truthfully depicts
// «Brot» no matter who took it or when. It must NEVER be extended to
// app-feature videos (TikTok/Instagram tutorials), where a slide has to
// prove "this app has this feature and it looks like this" — no stock
// photograph can prove that, and substituting one there would be precisely
// the «رابط حدسی / تصویرسازی عمومی» that LAW 7's own MUST NOT clause and
// PROJECT_RULES.md rule 41 forbid. Those keep using the verified
// screenshot bank (public/screens) or they stop.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { imageType, imageSize } from "./media-guard.mjs";

export const OWN_ASSET_DIR = "public/real-german";
export const OWN_ASSET_MANIFEST = join(OWN_ASSET_DIR, "manifest.json");

// Same floor lib/visual-proof.mjs and lib/lesson-image.mjs enforce. Named
// here rather than imported so a change to either is a deliberate, visible
// edit in both places instead of one silently relaxing the other.
const MIN_LONG_SIDE = 1080;
const MIN_AREA = 700000;

const normalise = (key) => String(key || "").trim().replace(/\s+/g, " ").toLowerCase();

export function loadOwnAssetManifest(file = OWN_ASSET_MANIFEST) {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" && parsed.assets && typeof parsed.assets === "object"
      ? parsed.assets
      : {};
  } catch {
    return {}; // no manifest yet, or unreadable — layer 5 simply has nothing to offer
  }
}

/**
 * Look up one owner-supplied real photograph for a vocabulary entry.
 *
 * @param {string} key      the vocabulary item's German text (GERMAN_A1 `de`)
 * @param {string} [label]  the Persian meaning, used only as alt-text fallback
 * @returns {{photo:string, sourceUrl:string, sourceType:"owner-supplied", alt:string}|null}
 *   null whenever the entry is missing, the file is absent, its provenance is
 *   incomplete, or it fails the mechanical quality bar — never a guess, and
 *   never a partially-verified asset. A null here means LAW 7 layer 6: stop
 *   and report, rather than ship something generic.
 */
export function ownRealAsset(key, label = "", { dir = OWN_ASSET_DIR, manifestFile = OWN_ASSET_MANIFEST } = {}) {
  const assets = loadOwnAssetManifest(manifestFile);
  const wanted = normalise(key);
  const entry = assets[key] || Object.entries(assets).find(([k]) => normalise(k) === wanted)?.[1];
  if (!entry || typeof entry !== "object") return null;

  // Provenance is not decoration: an unattributed photo cannot be shown to
  // be ours to use, and "what it depicts" is what makes it evidence for
  // THIS word rather than a picture that merely exists.
  if (!entry.file || !String(entry.depicts || "").trim() || !String(entry.license || "").trim()) return null;

  const photo = join(dir, String(entry.file));
  if (!existsSync(photo)) return null;
  if (!imageType(photo)) return null; // not actually an image, whatever the extension claims

  const size = imageSize(photo);
  if (!size || Math.max(size.width, size.height) < MIN_LONG_SIDE || size.width * size.height < MIN_AREA) return null;

  return {
    photo,
    sourceUrl: String(entry.source || entry.license),
    sourceType: "owner-supplied",
    alt: String(entry.depicts || label || key),
  };
}
