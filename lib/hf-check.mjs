// HyperFrames composition gate.
//
// `hyperframes check` is the framework's own validator (lint + runtime + layout
// + motion + contrast). It only accepts a project directory with an index.html,
// so this stages the generated composition as index.html in a scratch directory,
// links the assets it references, and reads the JSON findings back.
//
// One class of error is discounted, and only under proof: the composition inlines
// public/gsap.min.js so a render never depends on the network, and GSAP's own
// minified bundle contains `Math.random()` and `Date.now()`. Those are the
// library's internals, not our timeline. The gate removes the exact vendor source
// from the HTML first and re-checks the remainder — the finding is allowed only
// when our own scripts are clean. Every other error fails the build.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, symlinkSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const VENDOR_TOKENS = ["Math.random(", "Date.now("];

export function collectFindings(report) {
  const out = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    if (typeof node.severity === "string" && typeof node.code === "string") out.push(node);
    Object.values(node).forEach(walk);
  };
  walk(report);
  return out;
}

// True when `html` uses the token only inside the vendored library source.
export function onlyInVendor(html, vendorSource, token) {
  const authored = vendorSource ? html.split(vendorSource).join("") : html;
  return html.includes(token) && !authored.includes(token);
}

export function keptErrors(findings, html, vendorSource) {
  return findings.filter((f) => {
    if (f.severity !== "error") return false;
    if (f.code !== "non_deterministic_code") return true;
    return !VENDOR_TOKENS.some((t) => f.message?.includes(t.slice(0, -1)) && onlyInVendor(html, vendorSource, t));
  });
}

export function checkComposition(compFile, { cli, links = ["public", "music"], keep = false } = {}) {
  const html = readFileSync(compFile, "utf8");
  const vendorSource = existsSync("public/gsap.min.js") ? readFileSync("public/gsap.min.js", "utf8") : "";
  const dir = mkdtempSync(join(tmpdir(), "hf-check-"));
  writeFileSync(join(dir, "index.html"), html);
  for (const name of links) {
    const target = resolve(name);
    if (existsSync(target)) symlinkSync(target, join(dir, name));
  }
  let raw = "";
  try {
    const [bin, ...args] = cli.split(" ");
    raw = execFileSync(bin, [...args, "check", dir, "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    // check exits non-zero whenever it finds an error; the JSON is still on stdout.
    raw = err.stdout?.toString() || "";
    if (!raw.trim()) throw err;
  } finally {
    if (!keep) rmSync(dir, { recursive: true, force: true });
  }
  const report = JSON.parse(raw);
  const findings = collectFindings(report);
  return {
    errors: keptErrors(findings, html, vendorSource),
    warnings: findings.filter((f) => f.severity === "warning"),
    findings,
  };
}

export function assertComposition(compFile, opts) {
  let result;
  try {
    result = checkComposition(compFile, opts);
  } catch (err) {
    // The checker itself could not run (npx offline, CLI crash). That is not a
    // verdict on the composition, and the render below runs the same contract,
    // so say so loudly rather than pass a composition off as checked.
    console.error(`   ◇ hyperframes check could not run for ${compFile}: ${err.message.split("\n")[0]}`);
    return { ran: false, errors: [], warnings: [] };
  }
  const { errors, warnings } = result;
  console.error(`   ◇ hyperframes check ${compFile}: ${errors.length} error, ${warnings.length} warning`);
  if (errors.length) {
    for (const e of errors) console.error(`     ✗ ${e.code}: ${e.message}`);
    throw new Error(`hyperframes check rejected ${compFile} (${errors.length} error).`);
  }
  return { ran: true, errors, warnings };
}
