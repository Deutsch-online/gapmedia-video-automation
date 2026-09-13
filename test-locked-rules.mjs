import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// Rules the user has stated, turned into a test that fails the build.
//
// Each of these was corrected by hand at least once and came back anyway,
// because a rule that lives only in a conversation gets re-broken the next time
// content is written. A rule that fails a test does not.
//
//   node test-locked-rules.mjs
import { featuresFor } from "./lib/features.mjs";
import { minimaxSpeakable } from "./lib/pronounce.mjs";

const CATS = ["tiktok", "instagram", "tools", "general", "ai"];
const failures = [];

for (const cat of CATS) {
  for (const f of featuresFor(cat) || []) {
    const ask = String(f.hook?.ask || "");
    if (!ask) continue;
    const where = `${cat}/${f.id}`;

    // LOCKED: the word رایگان never appears in a hook. Not first, not last,
    // not after a dash. The value comes first; free is mentioned later in the
    // body if it is mentioned at all.
    if (/رایگان|\bfree\b/i.test(ask)) {
      failures.push(`${where}: hook contains «رایگان» — ${ask}`);
    }

    // LOCKED: a brand or product name is one spoken unit. If breathe() drops a
    // pause inside one, the narration says «تیک، تاک».
    const spoken = minimaxSpeakable(ask);
    for (const name of ["تیک تاک", "بک گراند", "ری اکشن", "کپ کات", "اسکرین شات"]) {
      const broken = name.replace(" ", "، ");
      if (spoken.includes(broken)) {
        failures.push(`${where}: «${name}» split by a breath — ${spoken}`);
      }
    }

    // LOCKED: no hook may open by naming the tool. Curiosity first, name later.
    const opener = ask.trim().split(/\s+/).slice(0, 2).join(" ");
    if (/^(گوگل|کپ‌?کات|کنوا|کانوا|فتوشاپ|اپ‌?سکیل|سونو)/i.test(opener)) {
      failures.push(`${where}: hook opens with the tool's name — ${ask}`);
    }
  }
}

if (failures.length) {
  console.error(`${failures.length} locked-rule violation${failures.length === 1 ? "" : "s"}:\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("all locked rules hold across every hook in the catalogue");

// The clitic that cost three production runs, 2026-09-13. The second-person
// possessive ـت immediately before a word starting with «د» loses its /t/ to
// the following consonant and the word is heard as a different one:
//   «اولین خریدت در آلمان …»       → «خریده»  (run #248)
//   «اولین خرید خودت در آلمان …»  → «خوده»   (run #250)
// The first fix only MOVED the clitic from «خریدت» to «خودت» and it failed
// identically, which is the proof that the fault belongs to the pattern rather
// than to either word. music/voice-qc.mjs was right both times — these are
// different words — so the gate is untouched and the TEXT is what changed.
{
  const { narrationLineCheck } = await import("./lib/voice-settings.mjs");
  const flagged = (t) => narrationLineCheck(t).some((i) => i.includes("ـت"));

  // Both real failures must be caught before a single second of audio is made.
  assert.equal(flagged("اولین خریدت در آلمان را با همین جمله‌ها انجام بده."), true);
  assert.equal(flagged("اولین خرید خودت در آلمان را با همین جمله‌ها انجام بده."), true);
  // And the third instance the rule found on its own, in a1-14-cafe, which had
  // not been built yet and would have failed exactly the same way.
  assert.equal(flagged("این چند جمله، اولین سفارشت در کافهٔ آلمانی را آسان می‌کند."), true);

  // The shipped replacements must pass.
  assert.equal(flagged("اولین خرید در آلمان را با همین جمله‌ها انجام بده."), false);
  assert.equal(flagged("با این چهار جمله، خرید را کامل به آلمانی انجام بده."), false);
  assert.equal(flagged("این چند جمله، اولین سفارش در کافهٔ آلمانی را آسان می‌کند."), false);

  // Narrow on purpose. A ـت that is part of the word, or one not followed by
  // «د», is ordinary Persian and must not be rejected — a rule that fires on
  // everything would block the whole channel instead of one sentence.
  assert.equal(flagged("دست راست را بالا بگیر."), false);
  assert.equal(flagged("قیمتت را بگو."), false);
  assert.equal(flagged("این سؤال را برای پرسیدن قیمت به کار ببر."), false);
}

// Every line the channel actually speaks must satisfy that rule — this is what
// turns one fixed sentence into a property of the whole corpus.
{
  const { narrationLineCheck } = await import("./lib/voice-settings.mjs");
  const { narrationFor } = await import("./lib/narration.mjs");
  const ids = new Set();
  for (const m of readFileSync("lib/narration.mjs", "utf8").matchAll(/"([a-z0-9-]{4,})":\s*\{/g)) ids.add(m[1]);
  const bad = [];
  for (const id of ids) {
    let vo;
    try { vo = narrationFor(id); } catch { continue; }
    if (!vo) continue;
    for (const line of [vo.hook, ...(vo.steps || []), vo.outro].filter(Boolean)) {
      if (narrationLineCheck(line).some((i) => i.includes("ـت"))) bad.push(`${id}: ${line}`);
    }
  }
  assert.deepEqual(bad, [], `narration lines carry a clitic the ASR cannot hear:\n${bad.join("\n")}`);
}

console.log("ok   no spoken line carries the ـت-before-«د» clitic that was heard as a different word three times");
