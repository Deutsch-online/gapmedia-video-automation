// «Ich koche» film (owner, 2026-10-05, after the three reference shorts): one slim man, one bright kitchen, six actions.
// Only the German sentence is on the picture, the verb in red. No translation, no names, no brand, no English.
// The picture is public/2d/koch-stage.js (SVG, a pure function of time); the mouth follows the real voice (cfg.mouth).
import { readFileSync, existsSync } from "node:fs";

const GSAP = readFileSync("public/gsap.min.js", "utf8");
const b64 = (p) => readFileSync(p).toString("base64");
const FONT = existsSync("public/fonts/Vazirmatn-Black.woff2") ? b64("public/fonts/Vazirmatn-Black.woff2") : "";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const F = (x) => (+x).toFixed(3);

const LOOK = {
  easy: { card: "#FFFFFF", border: "#1A1A1A", bw: 6, shadow: "0 10px 0 #FFCE00", de: "#1A1A1A", hl: "#DD0000", right: 44 },
  youtube: { card: "#FFFFFF", border: "#0F0F0F", bw: 6, shadow: "0 10px 0 #FF0000", de: "#0F0F0F", hl: "#FF0000", right: 44 },
  tiktok: { card: "#121212", border: "#FFFFFF", bw: 5, shadow: "-6px 6px 0 #25F4EE, 6px 10px 0 #FE2C55", de: "#FFFFFF", hl: "#FE2C55", right: 150 },
};

// a: { total, theme, scenes: [{t0, t1, de, verb}], mouth: [..25 per s], end: { t0, de } }
export function buildKochHTML(a) {
  const L = LOOK[a.theme] || LOOK.easy, TOTAL = a.total, js = [];
  const sentence = (s) => String(s.de).split(/\s+/).map((w) => (w.replace(/[.!?]+$/, "").toLowerCase() === s.verb.toLowerCase() ? `<span class="hl">${esc(w)}</span>` : esc(w))).join(" ");
  const caps = a.scenes.map((s, i) => `<div id="c${i}" class="cap">${sentence(s)}</div>`).join("") + `<div id="end" class="cap">${esc(a.end.de)}</div>`;
  a.scenes.forEach((s, i) => {
    js.push(`tl.fromTo("#c${i}",{opacity:0,y:30,scale:.94},{opacity:1,y:0,scale:1,duration:.3,ease:"back.out(2)",immediateRender:false},${F(s.t0 + 0.35)});`);
    js.push(`tl.to("#c${i}",{opacity:0,y:-10,duration:.18},${F(s.t1 - 0.2)});`);
  });
  js.push(`tl.fromTo("#end",{opacity:0,scale:.85},{opacity:1,scale:1,duration:.45,ease:"back.out(2.2)",immediateRender:false},${F(a.end.t0)});`);
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1920">
<style>
${FONT ? `@font-face{font-family:"EasyFont";font-weight:900;src:url(data:font/woff2;base64,${FONT}) format("woff2");}` : ""}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;background:#BBD8C2;overflow:hidden}
#root{position:relative;width:1080px;height:1920px;background:#BBD8C2;font-family:"EasyFont",Arial,sans-serif;overflow:hidden}
#koch-stage{position:absolute;left:0;top:0;width:1080px;height:1350px;display:block}
.cap{position:absolute;left:44px;right:${L.right}px;top:1400px;padding:26px 24px 30px;text-align:center;opacity:0;font-size:78px;line-height:1.12;color:${L.de};background:${L.card};border:${L.bw}px solid ${L.border};border-radius:40px;box-shadow:${L.shadow}}
.hl{color:${L.hl}}
</style>
<script>${GSAP}</script>
</head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${F(TOTAL)}">
<div id="film" class="clip" data-start="0" data-duration="${F(TOTAL)}" data-track-index="1">
<svg id="koch-stage" viewBox="0 100 1080 1350" xmlns="http://www.w3.org/2000/svg"></svg>
${caps}
</div>
</div>
<script>
window.__koch = ${JSON.stringify({ total: TOTAL, scenes: a.scenes.map((s) => ({ t0: s.t0, t1: s.t1 })), mouth: a.mouth, endAt: a.end.t0 })};
window.__timelines = window.__timelines || {};
var tl = gsap.timeline({ paused: true });
${js.join("\n")}
tl.set({}, {}, ${F(TOTAL)});
window.__timelines["main"] = tl;
</script>
<script src="public/2d/koch-stage.js"></script>
<script>tl.eventCallback("onUpdate", function () { if (window.__kochDraw) window.__kochDraw(tl.time()); });</script>
</body></html>`;
}

// The loudness of a voice file, 25 values a second, 0..1 (the lips open as far as the voice is loud, no more).
export function mouthEnvelope(samples, rate = 8000, fps = 25) {
  const win = Math.round(rate / fps), n = Math.floor(samples.length / win), raw = [];
  for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < win; k++) { const v = samples[i * win + k] / 32768; s += v * v; } raw.push(Math.sqrt(s / win)); }
  const sorted = [...raw].sort((x, y) => x - y), peak = sorted[Math.floor(sorted.length * 0.92)] || 1e-6, floor = peak * 0.12;
  const out = raw.map((v) => Math.max(0, Math.min(1, (v - floor) / (peak - floor))));
  return out.map((v, i) => +((out[i - 1] ?? v) * 0.25 + v * 0.5 + (out[i + 1] ?? v) * 0.25).toFixed(2));
}
