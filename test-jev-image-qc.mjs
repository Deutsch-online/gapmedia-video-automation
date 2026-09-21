// Does Jev judge image relevance well enough for VISUAL_QC_STANDARD?
//
//   node test-jev-image-qc.mjs      (needs TYPESAFE_API_KEY)
//
// This is a measurement, not a gate. It runs the project's OWN A1 items —
// including the phrase items, which are the hard ones — against three caption
// kinds each:
//
//   good      the picture a careful editor would pick
//   near      plausible, same scene family, but not the item  ← the dangerous one
//   wrong     obviously unrelated
//
// A usable QC signal must put good clearly above near. Separating good from
// wrong is easy and proves little.
import { noul, TypeSafeClient } from "@typesafe-ai/sdk";

const key = (process.env.TYPESAFE_API_KEY || "").trim();
if (!key) { console.error("✗ TYPESAFE_API_KEY is not set."); process.exit(2); }

const CASES = [
  // Concrete nouns — the easy end.
  { de: "die Apotheke", fa: "داروخانه",
    good:  "a German pharmacy storefront with the red Apotheke A sign",
    near:  "a hospital reception desk with a nurse",
    wrong: "a child riding a bicycle in a park" },
  { de: "der Flughafen", fa: "فرودگاه",
    good:  "an airport terminal building with departure boards and travellers",
    near:  "an airplane flying above clouds",
    wrong: "a bowl of tomato soup on a table" },
  // Phrases — what this curriculum is actually made of.
  { de: "Ich brauche einen Arzt.", fa: "من داکتر لازم دارم",
    good:  "a doctor in a white coat examining a patient in a clinic room",
    near:  "an empty hospital corridor",
    wrong: "a laptop on a desk next to a coffee cup" },
  { de: "Ich habe Schmerzen.", fa: "درد دارم",
    good:  "a person wincing and holding their lower back in pain",
    near:  "a person sleeping peacefully in bed",
    wrong: "a sunny beach with palm trees" },
  { de: "Ich möchte einen Termin.", fa: "من یک وقت می‌خواهم",
    good:  "a receptionist writing an appointment into a desk calendar",
    near:  "a wall clock showing three o'clock",
    wrong: "a football stadium full of fans" },
  { de: "Ich bin krank.", fa: "من مریض هستم",
    good:  "a person lying in bed with a thermometer, looking unwell",
    near:  "a person stretching after a workout",
    wrong: "a busy motorway at night" },
];

const client = new TypeSafeClient();

async function ask(de, fa, caption) {
  const res = await client.systemOne({
    state: {
      german_phrase: de,
      persian_meaning: fa,
      image_caption: caption,
      purpose: "The image is the only picture on a slide that teaches this German phrase to a Persian-speaking beginner.",
    },
    questions: {
      teaches: noul(
        {
          question: "Would a learner seeing ONLY this image understand which situation `german_phrase` is about?",
          note: "Judge the situation the phrase names, not the individual words. A picture may be beautiful and still teach nothing about this phrase.",
        },
        {
          true: "The image plainly shows the situation, object or action the phrase names, so the phrase and picture reinforce each other.",
          false: "The image shows something else, or something so general that it would fit many unrelated phrases.",
        },
      ),
    },
  });
  const a = res.answers.teaches;
  return typeof a?.noul === "number" ? a.noul : (a?.probability ?? NaN);
}

const rows = [];
for (const c of CASES) {
  const [good, near, wrong] = await Promise.all([ask(c.de, c.fa, c.good), ask(c.de, c.fa, c.near), ask(c.de, c.fa, c.wrong)]);
  rows.push({ de: c.de, good, near, wrong });
  console.log(`${c.de.padEnd(26)} good ${good.toFixed(2)}   near ${near.toFixed(2)}   wrong ${wrong.toFixed(2)}`);
}

const fmt = (n) => (Number.isFinite(n) ? n.toFixed(2) : "n/a");
const min = (k) => Math.min(...rows.map((r) => r[k]));
const max = (k) => Math.max(...rows.map((r) => r[k]));
console.log(`\ngood : ${fmt(min("good"))} – ${fmt(max("good"))}`);
console.log(`near : ${fmt(min("near"))} – ${fmt(max("near"))}`);
console.log(`wrong: ${fmt(min("wrong"))} – ${fmt(max("wrong"))}`);

const gap = min("good") - max("near");
console.log(`\nseparation between the worst good and the best near-miss: ${fmt(gap)}`);
if (gap > 0) {
  const t = (min("good") + max("near")) / 2;
  console.log(`✅ a threshold exists. Every good caption scores above ${fmt(t)} and every near-miss below it.`);
} else {
  console.log(`✗ NO threshold separates good captions from near-misses on these items.`);
  console.log(`  Jev cannot gate images here as asked. Do not wire it into the QC path on this evidence.`);
}
