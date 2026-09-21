// Can Jev enforce this project's HOOK rules? (PROJECT_RULES §4; CLAUDE.md step 3)
//
//   node test-jev-hook-gate.mjs          (needs TYPESAFE_API_KEY)
//
// A different problem from the image check, and a different shape: three
// primitives asked together over one hook — Score for how concrete the promise
// is, Noul for a guaranteed or invented claim, Choice for the verdict. They are
// independent judgments over the same state, so they go in ONE request.
//
// Ground truth comes from the project itself: the hooks in lib/german-a1.mjs
// are the owner's own approved lines and must pass. The failing set breaks a
// named rule each, in the ways this repo's history actually shows.
import { choice, noul, score, TypeSafeClient } from "@typesafe-ai/sdk";
import { GERMAN_A1 } from "./lib/german-a1.mjs";

const key = (process.env.TYPESAFE_API_KEY || "").trim();
if (!key) { console.error("✗ TYPESAFE_API_KEY is not set."); process.exit(2); }

// Real, shipped hooks — these must pass.
const APPROVED = GERMAN_A1.slice(24, 32).map((u) => ({ hook: u.hook, topic: u.topic, expect: "pass" }));

// Rule-breaking hooks. Each names the rule it breaks.
const REJECT = [
  { hook: "در ۷ روز آلمانی را تضمینی یاد بگیر.", topic: "داکتر و سلامت", expect: "reject",
    breaks: "guaranteed claim" },
  { hook: "۹۸٪ مهاجران این جمله را غلط می‌گویند.", topic: "داکتر و سلامت", expect: "reject",
    breaks: "invented statistic" },
  { hook: "بگو «Ich brauche einen Arzt» و کار تمام است.", topic: "داکتر و سلامت", expect: "reject",
    breaks: "gives the answer away in the hook" },
  { hook: "امروز یک قسمت دیگر از سری آموزش آلمانی.", topic: "داکتر و سلامت", expect: "reject",
    breaks: "no benefit, no pain, no result" },
  { hook: "این راز را هیچ‌کس به تو نمی‌گوید.", topic: "داکتر و سلامت", expect: "reject",
    breaks: "empty clickbait, promises nothing concrete" },
];

const client = new TypeSafeClient();

async function judge({ hook, topic }) {
  const res = await client.systemOne({
    state: {
      hook_text: hook,
      lesson_topic: topic,
      audience: "Persian-speaking newcomers in Germany learning A1 German on TikTok and Instagram",
      rule_reminder: "The hook is the first three seconds. It must make a concrete promise the video then keeps. It must not hand over the answer itself, and it must not guarantee results or cite numbers it cannot prove.",
    },
    questions: {
      promise: score(
        "How concrete is the benefit, pain or result that `hook_text` puts in front of the viewer?",
        [
          "Nothing concrete — it announces a lesson, or is pure curiosity bait with no stated gain",
          "Vague — a general good feeling about learning, no recognisable moment",
          "Concrete — it names a real situation, difficulty or result the viewer recognises immediately",
        ],
      ),
      overclaims: noul(
        "`hook_text` makes a guaranteed outcome, or states a number or fact it cannot prove.",
        { true: "It promises certainty, a timeframe, or cites a statistic", false: "It promises only what a short lesson can honestly deliver" },
      ),
      gives_away: noul(
        "`hook_text` already hands the viewer the answer, so there is no reason to keep watching.",
        { true: "The German phrase or the full solution is in the hook itself", false: "It opens a question the video still has to answer" },
      ),
      // The first run of this test put two rule-breaking hooks in `weak`
      // instead of `reject`, and the fault was in these labels, not in the
      // model: "breaks no rule but the promise is thin" and "promises nothing
      // at all" overlap, so a hook that promises nothing fits both. The three
      // options are now disjoint — `weak` is explicitly a hook that DOES make
      // a real promise.
      verdict: choice(
        "Judging `hook_text` against `rule_reminder`, may this hook ship?",
        {
          pass: "It names a concrete situation or result, keeps the answer back, and claims nothing it cannot deliver",
          weak: "It DOES name something concrete and breaks no rule, but too mildly to stop a scroll. Do not use this for a hook that names nothing.",
          reject: "It breaks a rule. Any one of these is enough: it guarantees an outcome or a timeframe; it cites a number it cannot prove; it hands over the German phrase or the whole answer; or it names no benefit, pain or result at all, including pure curiosity bait.",
        },
      ),
    },
  });
  return res.answers;
}

const ALL = [...APPROVED, ...REJECT];
let wrong = 0;
console.log("verdict  expect   promise  over  away   hook");
console.log("-".repeat(96));
for (const c of ALL) {
  const a = await judge(c);
  const v = a.verdict?.choice ?? "?";
  const ok = c.expect === "pass" ? v !== "reject" : v === "reject";
  if (!ok) wrong++;
  console.log(
    `${String(v).padEnd(8)} ${c.expect.padEnd(8)} ${String(a.promise?.score ?? "?").padEnd(8)} ` +
    `${(a.overclaims?.noul ?? NaN).toFixed(2)}  ${(a.gives_away?.noul ?? NaN).toFixed(2)}  ` +
    `${ok ? " " : "✗"} ${c.hook}${c.breaks ? `   [${c.breaks}]` : ""}`,
  );
}
console.log("-".repeat(96));
console.log(`${ALL.length - wrong}/${ALL.length} correct  (${APPROVED.length} shipped hooks, ${REJECT.length} rule-breaking)`);
if (wrong === 0) {
  console.log("✅ Jev agreed with the project's own editorial rules on every hook.");
} else {
  console.log(`✗ ${wrong} disagreements. Read the rows marked ✗ before trusting this as a gate.`);
}
