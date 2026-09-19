// Owner report, 2026-09-19, against episode 25 (a1-25-modal-verbs): "متن و صدا
// در هر سلاید دو بار تکرار می‌شد".
//
// Cause: an item's `example` carries the sentence plus its Persian meaning,
// and the build spoke BOTH `de` and the example's German half, and printed
// both `head` and `sub`. For 28 of the bank's 148 items the example's German
// half is the headword verbatim, so the slide printed one sentence twice and
// the voice track spoke it twice back to back.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GERMAN_A1, exampleGermanFor } from "./lib/german-a1.mjs";

// ── the rule itself ──────────────────────────────────────────────────────
assert.equal(
  exampleGermanFor({ de: "Kannst du mir helfen?", example: "Kannst du mir helfen? — می‌توانی به من کمک کنی؟" }),
  null,
  "an example that repeats the headword is not an example",
);
// Trailing punctuation and case must not hide a repeat: to a listener
// «Ich kann Deutsch sprechen.» and «Ich kann Deutsch sprechen» are one
// sentence, and the duplicate is just as audible.
assert.equal(
  exampleGermanFor({ de: "Ich kann Deutsch sprechen", example: "ICH KANN DEUTSCH SPRECHEN. — من می‌توانم آلمانی صحبت کنم." }),
  null,
  "a repeat must not slip through on punctuation or case alone",
);
// A real example varies the sentence, and must survive untouched.
assert.equal(
  exampleGermanFor({ de: "Was kannst du?", example: "Was kannst du gut? — چه کاری را خوب انجام می‌دهی؟" }),
  "Was kannst du gut?",
  "a genuine example must still reach the slide and the voice track",
);
assert.equal(exampleGermanFor({ de: "x", example: "" }), null, "an absent example has no German half");
console.log("ok   a repeated example is recognised, a real one is kept");

// ── the build must act on it, in both channels ───────────────────────────
const build = readFileSync("german-lesson-build.mjs", "utf8");
assert.match(build, /sub: exampleGermanFor\(it\) \? it\.example : ""/,
  "the slide caption must be dropped when it only repeats the head line");
assert.match(build, /if \(exampleGerman\) ttsSynthesize\(exampleGerman, "German", exampleFile, GERMAN_WORD_VOICE_ID\);/,
  "the example must not be synthesised when it repeats the headword");
assert.match(build, /if \(t\.exampleFile\) parts\.push\(\{ file: t\.exampleFile/,
  "a skipped example must not be scheduled into the voice track");
// A missing example is a different thing from a repeated one, and must still
// fail the build rather than ship a lesson with no example at all.
assert.match(build, /throw new Error\(`missing German example for/,
  "an absent example must remain a build error");
console.log("ok   the build drops the duplicate from both the slide and the voice track");

// ── the timing must not leave a silent hole ──────────────────────────────
assert.match(build, /\(t\.exampleFile \? t\.exampleDur \+ GAP : 0\)/,
  "a tip without an example must not reserve the gap its second clip used to fill");
console.log("ok   a collapsed tip reclaims the gap instead of holding silence");

// ── report the real extent, so the content debt stays visible ────────────
const items = GERMAN_A1.flatMap((unit) => (unit.items || []).map((item) => ({ unit: unit.id, item })));
// Only items that HAVE an example but repeat the head. An absent example is a
// separate fault the build still refuses outright, counted apart from this.
const repeats = items.filter(({ item }) =>
  String(item.example || "").split(" — ")[0].trim() && !exampleGermanFor(item));
const absent = items.filter(({ item }) => !String(item.example || "").split(" — ")[0].trim());
assert.equal(absent.length, 0, `${absent.length} item(s) have no German example at all, which fails the build: ${absent.map((e) => e.unit).join(", ")}`);
console.log(`ok   ${repeats.length} of ${items.length} items still repeat their headword as the example, across ${new Set(repeats.map((e) => e.unit)).size} units — collapsed at build time, and worth rewriting as real sentences`);
