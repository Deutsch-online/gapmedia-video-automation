// TypeSafe's System One model "Jev" as a relevance judge.
//
// Owner directive 2026-09-21: use Jev from now on. It joins the judges in
// lib/auto-image.mjs rather than replacing them, so a Jev outage costs a
// judgement, never a lesson: judgeRelevance() falls through to Gemini and
// Groq exactly as before.
//
// Why a Noul and not a prompt: the other judges return free text that
// parseVerdict() has to find JSON inside, and "no parsable verdict" already
// counts as "not relevant" — a parsing miss silently rejects a good picture.
// Jev returns a typed probability, so there is nothing to parse.
//
// The threshold comes from measurement, not taste. test-jev-image-qc.mjs ran
// this project's own A1 items on 2026-09-21:
//
//   correct captions   0.74 – 0.95
//   near-miss captions 0.04 – 0.27
//
// a 0.47-wide gap, so 0.50 sits in the middle of it. Re-measure before moving
// it; QUALITY_LEARNINGS.md forbids changing a gate on a guess.
import { noul, TypeSafeClient } from "@typesafe-ai/sdk";

export const JEV_RELEVANCE_THRESHOLD = 0.5;

export function jevConfigured() {
  return Boolean((process.env.TYPESAFE_API_KEY || "").trim());
}

let client = null;
function jevClient() {
  if (!client) client = new TypeSafeClient();
  return client;
}

/**
 * Judges one vocabulary image candidate.
 *
 * Returns the SAME JSON string shape the other judges return, so
 * parseVerdict() in lib/auto-image.mjs needs no change and the verdict cache
 * keeps working. Throws on a transport or API error, which the caller already
 * treats as "this provider did not answer" and moves on.
 *
 * Both questions must pass. The second one carries the exclusions the Persian
 * prompt already states — a drawing, logo, screenshot or chart is not evidence
 * of what a word means, however well it matches the topic.
 */
export async function jevVocabularyVerdict({ concept, meaning = "", candidate }) {
  const res = await jevClient().systemOne({
    state: {
      german_concept: concept,
      persian_meaning: meaning || undefined,
      image_title: candidate?.title || "",
      image_source: candidate?.url || "",
      image_snippet: candidate?.snippet && candidate.snippet !== candidate?.title ? candidate.snippet : undefined,
      purpose: "This is the only picture on a slide teaching this German word to a Persian-speaking beginner.",
    },
    questions: {
      shows_concept: noul(
        {
          question: "Would a learner seeing ONLY this image understand the concept in `german_concept`?",
          note: "Judge the situation or thing the concept names. An ordinary everyday photograph of people, objects, places or a real situation is a correct answer when it shows that concept; being a stock photo is not by itself a reason to reject.",
        },
        {
          true: "The image plainly shows that concept, so word and picture reinforce each other.",
          false: "The image is about something else, or so general and empty that the concept cannot be seen in it.",
        },
      ),
      is_real_photograph: noul(
        "The image is a real photograph of the thing itself.",
        {
          true: "A real photograph of people, objects, places or a situation.",
          false: "A drawing, cartoon, icon, clip-art, 3D render, logo, screenshot, chart, table or text.",
        },
      ),
    },
  });
  const shows = res.answers.shows_concept?.noul;
  const real = res.answers.is_real_photograph?.noul;
  if (typeof shows !== "number" || typeof real !== "number") {
    throw new Error("Jev returned no probability");
  }
  const relevant = shows >= JEV_RELEVANCE_THRESHOLD && real >= JEV_RELEVANCE_THRESHOLD;
  return JSON.stringify({
    relevant,
    reason: `jev: مفهوم ${shows.toFixed(2)}، عکس واقعی ${real.toFixed(2)}`,
  });
}
