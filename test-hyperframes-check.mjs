// The HyperFrames `check` gate: it must discount the vendored GSAP bundle's own
// `Math.random()`/`Date.now()` and nothing else, and every builder must declare
// the display face its CSS asks for.
import { readFileSync } from "node:fs";
import { keptErrors, onlyInVendor, collectFindings } from "./lib/hf-check.mjs";

let failed = 0;
const ok = (cond, label) => { console.log(`${cond ? "✅" : "🔴"} ${label}`); if (!cond) failed++; };

const VENDOR = "function r(){return Math.random()*Date.now()}";
const nd = (token) => ({
  severity: "error",
  code: "non_deterministic_code",
  message: `Script contains \`${token}\` which produces non-deterministic output.`,
});

// 1. vendor-only occurrences are discounted
{
  const html = `<script>${VENDOR}</script><script>const tl=gsap.timeline();</script>`;
  ok(onlyInVendor(html, VENDOR, "Math.random("), "Math.random() inside the GSAP bundle is recognised as vendor-only");
  ok(keptErrors([nd("Math.random()"), nd("Date.now()")], html, VENDOR).length === 0,
    "vendor-only non-determinism does not fail the gate");
}

// 2. the same token in our own script is NOT discounted
{
  const html = `<script>${VENDOR}</script><script>const x=Math.random();</script>`;
  ok(!onlyInVendor(html, VENDOR, "Math.random("), "Math.random() in an authored script is not vendor-only");
  ok(keptErrors([nd("Math.random()")], html, VENDOR).length === 1,
    "authored non-determinism fails the gate");
}

// 3. no other error is ever discounted
{
  const html = `<script>${VENDOR}</script>`;
  const other = { severity: "error", code: "font_family_without_font_face", message: "Font family used without @font-face declaration: baloo." };
  ok(keptErrors([other], html, VENDOR).length === 1, "an unrelated error is never discounted");
  ok(keptErrors([{ severity: "warning", code: "studio_missing_editable_id", message: "" }], html, VENDOR).length === 0,
    "warnings are not errors");
}

// 4. findings are collected from the nested check report
{
  const report = { ok: false, lint: { findings: [nd("Date.now()")] }, layout: { findings: [] } };
  ok(collectFindings(report).length === 1, "findings are collected out of the nested report");
}

// 5. every builder declares the display face its own CSS asks for
for (const file of ["lib/build-ink.mjs", "lib/build.mjs", "lib/build-neon.mjs"]) {
  const src = readFileSync(file, "utf8");
  if (!src.includes('font-family:"Baloo"')) continue;
  ok(src.includes('@font-face{font-family:"Baloo"'), `${file} declares @font-face for Baloo`);
}

console.log(failed ? `\n🔴 ${failed} check(s) failed` : "\n✅ hyperframes check gate is sound");
process.exit(failed ? 1 : 0);
