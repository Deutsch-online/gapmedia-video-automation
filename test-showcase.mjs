// The Character Builder showcase (owner, 2026-09-28): 20 s, 16:9, Lena reacts to the editor.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildShowcaseHTML, SHOW } from "./lib/showcase-video.mjs";

const html = buildShowcaseHTML();
assert.equal(SHOW.total, 20);
assert.match(html, /data-width="1920" data-height="1080" data-duration="20.000"/);
assert.match(html, /<canvas id="three-stage" width="1920" height="1080">/);
assert.match(html, /window\.__timelines\["main"\] = tl;/);
assert.match(html, /setting: "none"/, "no lesson set: the backdrop is the page's own");
assert.match(html, /src="public\/3d\/toon-showcase\.js"/);
assert.doesNotMatch(html, /Magnific/i, "no other brand");
for (const k of ["head", "height"]) assert.match(html, new RegExp(`#th-${k}`));
const t = Object.values(SHOW.t); assert.deepEqual(t, [...t].sort((a, b) => a - b), "shots in order");
const show = readFileSync("public/3d/toon-showcase.js", "utf8"), stage = readFileSync("public/3d/toon-stage.js", "utf8");
assert.doesNotMatch(show, /Math\.random|Date\.now|requestAnimationFrame/);
assert.match(show, /window\.__toonDriver = drive/);
assert.match(stage, /\(window\.__toonDriver \|\| renderAt\)\(ev\.detail\.time\)/);
assert.match(stage, /const W = canvas\.width \|\| 1080, H = canvas\.height \|\| 1080/);
console.log("showcase: ok");
