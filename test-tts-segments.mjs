import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { segment, needsEnglishModel } from "./lib/tts-segments.mjs";

// The production line this exists for. music/pocket-tts.mjs used to exit 1
// whenever HF_TOKEN was unset — for EVERY line, including ones with no Latin
// character anywhere. Proven wrong on a real runner 2026-09-13
// (.github/workflows/tts-probe.yml): mehdi-hf/pocket-tts-farsi downloads
// unauthenticated and spoke this exact sentence from lib/narration.mjs into a
// 247,724-byte, 5.16s wav. The token is for the GATED kyutai weights that only
// the English half uses.
{
  const persianOnly = "و با این سؤال رسمی، از فروشنده بپرس که چیزی را دارد یا نه.";
  const segs = segment(persianOnly);
  assert.ok(segs.length > 0, "a real Persian sentence must produce segments");
  assert.ok(segs.every((p) => p.lang === "fa"), "no Latin character means no English segment");
  assert.equal(needsEnglishModel(segs), false, "a pure-Persian line must not be refused for a missing token");
}

// The case the token IS for: this project's narration routinely names apps in
// Latin script, and those spans really do go through the gated English model.
{
  const mixed = "با اپلیکیشن Second Space دو حساب داشته باش.";
  const segs = segment(mixed);
  const en = segs.filter((p) => p.lang === "en");
  assert.deepEqual(en.map((p) => p.text), ["Second Space"], "an app name is one English span, not two");
  assert.ok(segs.some((p) => p.lang === "fa"), "the Persian around it must survive");
  assert.equal(needsEnglishModel(segs), true, "a line with English still needs the token");
}

// A bare digit counts as Latin for this model — it is spoken by the English
// half — so it must not slip past the check.
assert.equal(needsEnglishModel(segment("قیمت ۲ است")), false, "Persian digits are Persian");
assert.equal(needsEnglishModel(segment("قیمت 2 است")), true, "an ASCII digit reaches the English model");

// Degenerate input must not crash the CLI before it can report anything.
assert.deepEqual(segment(""), []);
assert.equal(needsEnglishModel([]), false);
assert.equal(needsEnglishModel(undefined), false);

// The guard must stay CONDITIONAL. If it ever goes back to refusing every line
// regardless of content, pure-Persian narration is blocked again for a token
// it provably does not need.
{
  const src = readFileSync("music/pocket-tts.mjs", "utf8");
  assert.match(src, /needsEnglishModel\(segs\) && !process\.env\.HF_TOKEN/,
    "the token is required only when the line actually contains English");
  assert.ok(!/^\s*if \(!process\.env\.HF_TOKEN\) \{/m.test(src),
    "the unconditional refusal must not come back — it turned away work that succeeds");
}

console.log("ok   pocket-tts asks for HF_TOKEN only when a line really reaches the gated English model");
