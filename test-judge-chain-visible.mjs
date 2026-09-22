// A judge that ANSWERS must leave a trace in the build log.
//
// Episode 31 (2026-09-22) was the first scheduled build with Jev in the
// vocabulary chain, and afterwards the log could not show whether Jev had
// answered: lib/auto-image.mjs printed provider names only inside
// findRealImage()'s rejection diagnostic, so a build whose images all passed
// proved nothing about which model judged them. VISUAL_QC_STANDARD asks that
// question after the fact, so the answer has to be in the log.
//
// The line is announced once per provider per process — at most three lines —
// and names the whole available chain, so one line shows both that Jev
// answered and that Gemini/Groq are still behind it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync("lib/auto-image.mjs", "utf8");

assert.match(src, /const judgeAnnounced = new Set\(\);/,
  "the successful-judge announcement must be de-duplicated per process, not printed per candidate");
assert.match(src, /judgeAnnounced\.has\(name\)[\s\S]{0,200}console\.log\([\s\S]{0,120}\$\{name\}[\s\S]{0,120}\$\{available\.join/,
  "a judge that answers must log its own name and the whole available chain");

// The announcement belongs to the success branch. If it moved above the
// `if (verdict)` test it would claim an answer a provider never gave.
const chain = src.slice(src.indexOf("for (const name of judgeProviderOrder(available))"));
const verdictOk = chain.indexOf("if (verdict) {");
const announce = chain.indexOf("judgeAnnounced.has(name)");
assert.ok(verdictOk > -1 && announce > verdictOk,
  "only a parsed verdict may announce a judge — a thrown or unparsable answer is not an answer");

// The cache short-circuit must stay ahead of it: a cached verdict is a real
// model's answer, already announced, and must not re-announce or re-charge.
const fn = src.slice(src.indexOf("export async function judgeRelevance"));
assert.ok(fn.indexOf("const cached = verdictCache.get(prompt);") < fn.indexOf("judgeAnnounced.has(name)"),
  "the verdict cache must still short-circuit before any provider is asked");

console.log("a judge that answers now names itself and its chain in the build log");
