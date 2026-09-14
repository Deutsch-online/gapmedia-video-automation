// Topics withheld from the rotation for a stated reason, for now.
//
// A pause is not a delete. lib/features.mjs still holds every one of these
// features in full; this file only keeps them from being SELECTED, and
// removing an id from .topics-paused.json puts it back in rotation with no
// other change anywhere. That distinction is the whole point: the daily lane
// has failed all day on 2026-09-14 for lack of a search index, and a
// content-pool that quietly shrinks every time sourcing breaks would be a
// worse outcome than the outage itself.
//
// Every entry must carry `why` and `until`. An entry without them is ignored
// — an unexplained pause is indistinguishable from a topic someone deleted by
// accident, and this file exists precisely so that can never happen silently.
//
// What this does NOT do: it does not touch lib/visual-proof.mjs, it does not
// change what counts as a real photo, and it does not touch lib/dedupe.mjs.
// A paused topic is simply not offered; every topic that IS offered faces the
// identical imageType check, the identical 1080px/700,000px floor, the
// identical judgeRelevance() call and the identical assertVisualProof().
import { existsSync, readFileSync } from "node:fs";

export const PAUSED_FILE = ".topics-paused.json";

/**
 * @returns {Map<string, {why:string, until:string, since?:string}>}
 *   empty whenever the file is missing, unreadable or malformed — a pause
 *   list that cannot be read must never block the whole rotation.
 */
export function pausedTopics(file = PAUSED_FILE) {
  if (!existsSync(file)) return new Map();
  let parsed;
  try { parsed = JSON.parse(readFileSync(file, "utf8")); } catch { return new Map(); }
  const entries = parsed && typeof parsed === "object" ? parsed.paused : null;
  if (!entries || typeof entries !== "object") return new Map();
  const out = new Map();
  for (const [id, meta] of Object.entries(entries)) {
    // No reason, no pause. See the header.
    if (!meta || typeof meta !== "object") continue;
    if (!String(meta.why || "").trim() || !String(meta.until || "").trim()) continue;
    out.set(id, meta);
  }
  return out;
}

/** The ids alone, ready to merge into featureFor()'s `exclude` set. */
export function pausedTopicIds(file = PAUSED_FILE) {
  return new Set(pausedTopics(file).keys());
}
