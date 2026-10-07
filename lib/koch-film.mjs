// «Ich koche» film (owner, 2026-10-05, after the three reference shorts): one slim man, one bright kitchen, six actions.
// German sentence (verb in red) with a Persian subtitle (owner, 2026-10-05); no names, no brand, no English.
// The picture is public/2d/koch-stage.js (SVG, a pure function of time); the mouth follows the real voice (cfg.mouth).
import { readFileSync, existsSync } from "node:fs";

const GSAP = readFileSync("public/gsap.min.js", "utf8");
const b64 = (p) => readFileSync(p).toString("base64");
const FONT = existsSync("public/fonts/Vazirmatn-Black.woff2") ? b64("public/fonts/Vazirmatn-Black.woff2") : "";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const F = (x) => (+x).toFixed(3);

const LOOK = {
  easy: { card: "#FFFFFF", border: "#1A1A1A", bw: 6, shadow: "0 10px 0 #FFCE00", de: "#1A1A1A", hl: "#DD0000", fa: "#5C4B3A", right: 44 },
  youtube: { card: "#FFFFFF", border: "#0F0F0F", bw: 6, shadow: "0 10px 0 #FF0000", de: "#0F0F0F", hl: "#FF0000", fa: "#606060", right: 44 },
  tiktok: { card: "#121212", border: "#FFFFFF", bw: 5, shadow: "-6px 6px 0 #25F4EE, 6px 10px 0 #FE2C55", de: "#FFFFFF", hl: "#FE2C55", fa: "#BDBDBD", right: 150 },
};

// a: { total, theme, scenes: [{t0, t1, de, fa, verb}], mouth: [..25 per s], end: { t0, de, fa } }
// Motion graphics (owner, 2026-10-05: "use your motion graphics to make it attractive"): the words of the sentence pop in
// one by one, the verb is struck in red with a sweeping underline, a colour wipe carries every scene change, a burst of
// sparkles marks the finished action, and six dots show the progress. The Persian subtitle sits under the German sentence.
const WIPE = ["#FFC83D", "#F0643C", "#2FA39A", "#7B6CF6", "#FF6F91", "#4DB6FF"];
const SPARK = "M 0 -34 Q 4 -4 34 0 Q 4 4 0 34 Q -4 4 -34 0 Q -4 -4 0 -34 Z";
export function buildKochHTML(a) {
  const L = LOOK[a.theme] || LOOK.easy, TOTAL = a.total, js = [];
  const ST = a.stage || { id: "koch-stage", src: "public/2d/koch-stage.js", cfg: "__koch", draw: "__kochDraw" };   // the picture: koch-stage.js (Ich koche) or oma-stage.js (Oma sagt)
  const to = (sel, v, t) => js.push(`tl.to("${sel}",${v},${F(t)});`);
  const fromTo = (sel, f, v, t) => js.push(`tl.fromTo("${sel}",${f},${v},${F(t)});`);
  const sentence = (s, i) => String(s.de).split(/\s+/).map((w, k) => `<span class="w c${i}w${k}${w.replace(/[.!?]+$/, "").toLowerCase() === s.verb.toLowerCase() ? " hl" : ""}">${esc(w)}</span>`).join(" ");
  const card = (id, de, fa) => `<div id="${id}" class="cap"><div class="de">${de}</div>${fa ? `<div class="fa" dir="rtl">${esc(fa)}</div>` : ""}</div>`;
  const caps = a.scenes.map((s, i) => card(`c${i}`, sentence(s, i), s.fa)).join("") + card("end", esc(a.end.de), a.end.fa);
  a.scenes.forEach((s, i) => {
    const words = String(s.de).split(/\s+/), t0 = s.t0 + 0.4;
    fromTo(`#c${i}`, `{opacity:0,y:40,scale:.9}`, `{opacity:1,y:0,scale:1,duration:.28,ease:"back.out(2)",immediateRender:false}`, t0);
    words.forEach((w, k) => {
      fromTo(`.c${i}w${k}`, `{opacity:0,y:26,scale:.6}`, `{opacity:1,y:0,scale:1,duration:.26,ease:"back.out(3)",immediateRender:false}`, t0 + 0.1 + k * 0.11);
      if (w.replace(/[.!?]+$/, "").toLowerCase() === s.verb.toLowerCase()) fromTo(`.c${i}w${k}`, `{scale:1.35}`, `{scale:1,duration:.4,ease:"elastic.out(1.4,.5)",immediateRender:false}`, t0 + 0.4 + k * 0.11);
    });
    fromTo(`#c${i} .fa`, `{opacity:0,y:14}`, `{opacity:1,y:0,duration:.3,immediateRender:false}`, t0 + 0.25 + words.length * 0.11);
    to(`#c${i}`, `{opacity:0,y:-12,duration:.18}`, s.t1 - 0.22);
    // the colour wipe that carries the scene change
    if (i > 0) {
      fromTo(`#wipe${i}`, `{x:1100}`, `{x:0,duration:.26,ease:"power2.in",immediateRender:false}`, s.t0 - 0.26);
      to(`#wipe${i}`, `{x:-1100,duration:.34,ease:"power2.out"}`, s.t0);
    }
    // sparkles when the action is done
    const tk = s.t0 + 5.25;
    for (let k = 0; k < (a.noSparks ? 0 : 6); k++) {
      const ang = (k / 6) * Math.PI * 2 + i, dx = Math.cos(ang) * 190, dy = Math.sin(ang) * 130;
      fromTo(`#sp${i}_${k}`, `{x:0,y:0,scale:0,opacity:1,rotation:0}`, `{x:${dx.toFixed(0)},y:${dy.toFixed(0)},scale:${(0.8 + (k % 3) * 0.3).toFixed(2)},rotation:140,duration:.55,ease:"power2.out",immediateRender:false}`, tk + k * 0.02);
      to(`#sp${i}_${k}`, `{opacity:0,scale:0,duration:.3}`, tk + 0.55);
    }
    // progress dots
    to(`#dot${i}`, `{scale:1.5,backgroundColor:"#F0643C",duration:.25,ease:"back.out(3)"}`, s.t0 + 0.1);
  });
  fromTo("#end", `{opacity:0,scale:.8}`, `{opacity:1,scale:1,duration:.5,ease:"back.out(2.4)",immediateRender:false}`, a.end.t0);
  fromTo("#end", `{rotation:-2}`, `{rotation:2,duration:.5,repeat:5,yoyo:true,ease:"sine.inOut",immediateRender:false}`, a.end.t0 + 0.5);
  const wipes = a.scenes.map((_, i) => (i ? `<rect id="wipe${i}" x="0" y="100" width="1080" height="1350" fill="${WIPE[i % WIPE.length]}" transform="translate(1100 0)"/>` : "")).join("");
  const sparks = a.noSparks ? "" : a.scenes.map((_, i) => `<g transform="translate(540 1030)">${Array.from({ length: 6 }, (_, k) => `<path id="sp${i}_${k}" d="${SPARK}" fill="${["#FFC83D", "#FFFFFF", "#FF6F91"][k % 3]}" stroke="#3B2A24" stroke-width="3" opacity="0"/>`).join("")}</g>`).join("");
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1920">
<style>
${FONT ? `@font-face{font-family:"EasyFont";font-weight:900;src:url(data:font/woff2;base64,${FONT}) format("woff2");}` : ""}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;background:#BBD8C2;overflow:hidden}
#root{position:relative;width:1080px;height:1920px;background:#BBD8C2;font-family:"EasyFont",Arial,sans-serif;overflow:hidden}
#${ST.id},#fx{position:absolute;left:0;top:0;width:1080px;height:1350px;display:block}
#fx{pointer-events:none}
.cap{position:absolute;left:44px;right:${L.right}px;top:1392px;padding:22px 24px 24px;text-align:center;opacity:0;color:${L.de};background:${L.card};border:${L.bw}px solid ${L.border};border-radius:40px;box-shadow:${L.shadow}}
.cap .de{font-size:74px;line-height:1.12}
.cap .fa{margin-top:10px;font-size:54px;line-height:1.35;color:${L.fa};font-family:"EasyFont",Tahoma,sans-serif}
.w{display:inline-block}
.hl{color:${L.hl};text-decoration:underline;text-decoration-thickness:7px;text-underline-offset:9px}
.dots{position:absolute;left:0;right:${L.right}px;top:1810px;display:flex;justify-content:center;gap:26px}
.dot{width:26px;height:26px;border-radius:50%;background:#FFFFFF;border:4px solid #3B2A24}
</style>
<script>${GSAP}</script>
</head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${F(TOTAL)}">
<div id="film" class="clip" data-start="0" data-duration="${F(TOTAL)}" data-track-index="1">
<svg id="${ST.id}" viewBox="0 100 1080 1350" xmlns="http://www.w3.org/2000/svg"></svg>
<svg id="fx" viewBox="0 100 1080 1350" xmlns="http://www.w3.org/2000/svg">${sparks}${wipes}</svg>
${caps}
<div class="dots">${a.scenes.map((_, i) => `<div id="dot${i}" class="dot"></div>`).join("")}</div>
</div>
</div>
<script>
window.${ST.cfg} = ${JSON.stringify({ total: TOTAL, scenes: a.scenes.map((s) => ({ t0: s.t0, t1: s.t1, who: s.who, ex: s.ex, mood: s.mood, prop: s.prop })), mouth: a.mouth, endAt: a.end.t0, set: a.set || 1 })};
window.__timelines = window.__timelines || {};
var tl = gsap.timeline({ paused: true });
${js.join("\n")}
tl.set({}, {}, ${F(TOTAL)});
window.__timelines["main"] = tl;
</script>
<script src="${ST.src}"></script>
<script>tl.eventCallback("onUpdate", function () { if (window.${ST.draw}) window.${ST.draw}(tl.time()); });</script>
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
