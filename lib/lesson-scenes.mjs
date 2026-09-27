// One painted storybook scene per lesson beat, for the "scene" style.
//
// Owner, 2026-09-27: "use this sample for the animation" — a reference reel of
// detailed, warm, hand-painted-looking illustrations (a bakery, a bus stop, a
// station), one per line of dialogue, with a short German line in a white
// bubble. The owner chose the free route (Pollinations) over billed video
// generation (Google Veo), so the scenes are still images; the motion comes
// from the composition (lib/build-scene.mjs).
//
// The same two people appear in every scene of an episode, described the same
// way in every prompt, so the viewer follows one learner through the lesson.
// Seeds come from the unit id and the beat index: a re-run of the same episode
// asks for the same pictures. Every picture is labelled AI-generated on screen
// (PROJECT_RULES rule 39/41: generated media is never passed off as real).
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { imageType, imageSize } from "./media-guard.mjs";

export const SCENE_STYLE = "detailed hand-painted storybook illustration, warm soft natural light, rich detailed background, "
  + "semi-realistic friendly cartoon characters with expressive faces, modern European picture-book style, "
  + "vertical 9:16 composition, characters in the middle of the frame, cinematic depth";
export const SCENE_NEGATIVE = "no text, no letters, no captions, no watermark, no logo, no speech bubbles";
export const LEARNER = "a young man in his twenties with short dark hair and a light beard, olive skin, wearing an orange hoodie and jeans";

const seedFor = (unitId, i, attempt) =>
  parseInt(createHash("sha256").update(`${unitId}#${i}#${attempt}`).digest("hex").slice(0, 8), 16) % 1_000_000;

/** The prompt for one beat. `setting` describes the place; `action` the moment. */
export function scenePrompt({ setting, action }) {
  return `${SCENE_STYLE}. Setting: ${setting}. Main character: ${LEARNER}. Moment: ${action}. ${SCENE_NEGATIVE}.`;
}

/** Fetch one scene, trying a few deterministic seeds; returns a 1080x1920 JPEG path or null. */
export async function sceneImage({ unitId, index, prompt, attempts = 3, fetchImpl = fetch, model = process.env.POLLINATIONS_MODEL || "flux" }) {
  mkdirSync("public/user-media", { recursive: true });
  for (let a = 0; a < attempts; a++) {
    const params = new URLSearchParams({ model, nologo: "true", width: "1080", height: "1920", seed: String(seedFor(unitId, index, a)) });
    let bytes;
    try {
      const res = await fetchImpl(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`, { signal: AbortSignal.timeout(90_000) });
      if (!res.ok) { console.error(`   ⚠ scene ${index} seed ${a}: Pollinations ${res.status}`); continue; }
      bytes = Buffer.from(await res.arrayBuffer());
    } catch (e) {
      console.error(`   ⚠ scene ${index} seed ${a}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }
    const raw = `public/user-media/scene-${unitId}-${index}-${a}.img`;
    writeFileSync(raw, bytes);
    const type = imageType(raw);
    if (!type) { rmSync(raw, { force: true }); console.error(`   ⚠ scene ${index} seed ${a}: not an image`); continue; }
    // JPEG keeps six embedded 1080x1920 paintings to a few MB of HTML.
    const out = `public/user-media/scene-${unitId}-${index}.jpg`;
    try {
      // Fill the 9:16 frame at delivery size whatever size the free tier returned.
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw,
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920", "-frames:v", "1", "-q:v", "3", out], { stdio: "pipe" });
    } catch (e) {
      rmSync(raw, { force: true });
      console.error(`   ⚠ scene ${index} seed ${a}: could not normalise — ${e.message.split("\n")[0]}`);
      continue;
    }
    rmSync(raw, { force: true });
    const size = imageSize(out);
    if (!size || size.width !== 1080 || size.height !== 1920) { console.error(`   ⚠ scene ${index}: wrong size after normalising`); continue; }
    console.error(`   ▣ scene ${index} for ${unitId}: ${out} (seed attempt ${a})`);
    return out;
  }
  return null;
}
