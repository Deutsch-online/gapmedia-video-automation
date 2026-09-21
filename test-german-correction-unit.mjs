// A correction request must re-render the unit it names.
//
//   node test-german-correction-unit.mjs
//
// .german-correction-request.json carries a "unit" field, german-cycle.mjs
// accepts --unit, and german-lesson-build.mjs derives isCorrection ENTIRELY
// from that flag:
//
//   const correctionUnitId = unitArgIdx >= 0 ? process.argv[unitArgIdx + 1] : null;
//   const isCorrection = !!correctionUnitId;
//
// The workflow ran `node german-cycle.mjs` with no arguments, so the unit
// never arrived and isCorrection was always false. A correction request
// therefore built the NEXT episode instead of the broken one, ran the
// duplicate check against it, and advanced the curriculum pointer — burning
// an episode while the defective one stayed unfixed.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/news-scan.yml", "utf8");
const build = readFileSync("german-lesson-build.mjs", "utf8");
const cycle = readFileSync("german-cycle.mjs", "utf8");

// ── the chain, end to end ────────────────────────────────────────────────
assert.match(workflow, /jq -r '\.unit \/\/ empty' \.german-correction-request\.json/,
  "the gate must read the unit the correction request names");
assert.match(workflow, /echo "unit=\$unit" >> "\$GITHUB_OUTPUT"/,
  "the gate must publish the unit for the build step");
assert.match(workflow, /LESSON_UNIT: \$\{\{ steps\.gate\.outputs\.unit \}\}/,
  "the build step must receive it");
assert.match(workflow, /node german-cycle\.mjs --unit "\$LESSON_UNIT"/,
  "and must actually pass it to the cycle");
assert.match(cycle, /argOf\("--unit"\)/, "the cycle must still accept --unit");
assert.match(cycle, /\.\.\.\(unit \? \["--unit", unit\] : \[\]\)/,
  "the cycle must forward it to the build");
assert.match(build, /const isCorrection\s*=\s*!!correctionUnitId/,
  "isCorrection is derived from the flag — if the chain breaks anywhere, corrections silently become normal builds");

// ── the value never reaches a command line directly ──────────────────────
// It comes from a file in the repository, so it goes through an env var.
assert.doesNotMatch(workflow, /german-cycle\.mjs --unit \$\{\{/,
  "the unit must not be interpolated into the command line");

// ── an empty unit must still build normally ──────────────────────────────
assert.match(workflow, /if \[ -n "\$\{LESSON_UNIT:-\}" \]; then[\s\S]{0,140}else[\s\S]{0,60}node german-cycle\.mjs/,
  "a scheduled slot names no unit and must run the ordinary next-episode build");
assert.match(workflow, /unit=""/, "the output must always exist, empty when there is no correction");

// ── a correction must not consume an episode ─────────────────────────────
assert.match(build, /if \(!isCorrection\)[\s\S]{0,400}saveProgress/,
  "a correction must not advance the curriculum pointer");
assert.match(build, /if \(!isCorrection\) \{\s*\n\s*const dup = check/,
  "a correction re-renders an episode that already shipped, so it must skip the duplicate check");

console.log("a correction request re-renders the unit it names, and consumes no episode");
