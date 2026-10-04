// EasyDeutsch reels (owner, 2026-10-04, after two reference shorts): a full-screen 9:16 film
// of AI shots in which Lena and Herr Braun act out each phrase, with big captions on the
// picture: the English meaning, the German phrase under it, Persian only as a small
// subtitle. No boxes, no stage frame. One composition, two looks: "easy" for Instagram
// (pink, blue and yellow like the references) and "tiktok" (TikTok's cyan and red).
import { readFileSync, existsSync } from "node:fs";

const b64 = (p) => readFileSync(p).toString("base64");
const GSAP = readFileSync("public/gsap.min.js", "utf8");
const FONT = existsSync("public/fonts/Vazirmatn-Black.woff2") ? b64("public/fonts/Vazirmatn-Black.woff2") : "";
const LOGO = existsSync("public/brand/easydeutsch-logo.jpg") ? `data:image/jpeg;base64,${b64("public/brand/easydeutsch-logo.jpg")}` : "";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const F = (x) => (+x).toFixed(3);

const LOOK = {
  easy: { en: "#FFFFFF", key: "#7FD3FF", de: "#FFE14D", badge: "#FF5FA2", badge2: "#7FD3FF" },
  tiktok: { en: "#FFFFFF", key: "#25F4EE", de: "#25F4EE", badge: "#FE2C55", badge2: "#25F4EE" },
};

// a: { episodeNo, title, total, video, theme, caps: [{ t0, t1, en, de, fa }], quiz?: { t0, tc, ta, t1, en, de, fa },
//      rep: [{ t0, t1 }], teaser?: { en, fa, t1 } }
export function buildEasyReelHTML(a) {
  const L = LOOK[a.theme] || LOOK.easy, TOTAL = a.total;
  const js = [];
  const to = (sel, v, t) => js.push(`tl.to("${sel}", ${v}, ${F(t)});`);
  const fromTo = (sel, f, v, t) => js.push(`tl.fromTo("${sel}", ${f}, ${v}, ${F(t)});`);
  // the last word of the English line in the accent colour, like the references ("This is my FATHER")
  const enHTML = (en) => { const w = String(en).split(" "); const last = w.pop(); return `${esc(w.join(" "))} <span class="k">${esc(last)}</span>`; };
  const caps = a.caps.map((c, i) => `<div id="c${i}" class="cap"><div class="en">${enHTML(c.en)}</div><div class="de">${esc(c.de)}</div>${c.fa ? `<div class="fa" dir="rtl">${esc(c.fa)}</div>` : ""}</div>`).join("");
  a.caps.forEach((c, i) => {
    fromTo(`#c${i}`, `{opacity:0,y:30,scale:.92}`, `{opacity:1,y:0,scale:1,duration:.35,ease:"back.out(2)",immediateRender:false}`, c.t0);
    to(`#c${i}`, `{opacity:0,y:-16,duration:.2}`, c.t1 - 0.2);
  });
  (a.rep || []).forEach((r, i) => { fromTo(`#rep${i}`, `{opacity:0,scale:.6}`, `{opacity:1,scale:1,duration:.25,ease:"back.out(2.5)",immediateRender:false}`, r.t0); to(`#rep${i}`, `{opacity:0,duration:.2}`, r.t1); });
  const reps = (a.rep || []).map((_, i) => `<div id="rep${i}" class="rep">Sprich nach! · Say it!</div>`).join("");
  if (a.teaser) { fromTo("#teaser", `{opacity:0,y:-20}`, `{opacity:1,y:0,duration:.35,ease:"back.out(2)",immediateRender:false}`, 0.2); to("#teaser", `{opacity:0,duration:.2}`, a.teaser.t1); }
  const Q = a.quiz;
  if (Q) {
    fromTo("#quiz", `{opacity:0,scale:.85}`, `{opacity:1,scale:1,duration:.4,ease:"back.out(2)",immediateRender:false}`, Q.t0);
    [3, 2, 1].forEach((n, k) => { fromTo(`#qn${n}`, `{opacity:0,scale:2}`, `{opacity:1,scale:1,duration:.3,ease:"back.out(2.5)",immediateRender:false}`, Q.tc + k); to(`#qn${n}`, `{opacity:0,duration:.2}`, Q.tc + k + 0.8); });
    fromTo("#qa", `{opacity:0,scale:.3}`, `{opacity:1,scale:1,duration:.45,ease:"back.out(3)",immediateRender:false}`, Q.ta);
    to("#quiz", `{opacity:0,duration:.3}`, Q.t1 - 0.3);
  }
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1920">
<style>
${FONT ? `@font-face{font-family:"EasyFont";font-weight:900;src:url(data:font/woff2;base64,${FONT}) format("woff2");}` : ""}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;background:#000;overflow:hidden}
#root{position:relative;width:1080px;height:1920px;background:#000;font-family:"EasyFont",Arial,sans-serif;overflow:hidden}
#bg{position:absolute;left:0;top:0;width:1080px;height:1920px;object-fit:cover}
.shade{position:absolute;left:0;right:0;top:0;height:760px;background:linear-gradient(rgba(0,0,0,.42),rgba(0,0,0,0));pointer-events:none}
.brand{position:absolute;left:40px;top:60px;display:flex;align-items:center;gap:18px;color:#FFF;font-size:34px;text-shadow:0 3px 8px rgba(0,0,0,.6)}
.brand img{width:96px;height:96px;border-radius:50%;border:4px solid #FFF}
.cap{position:absolute;left:60px;right:150px;top:330px;text-align:center;opacity:0}
.cap .en{font-size:78px;line-height:1.08;color:${L.en};-webkit-text-stroke:3px #000;paint-order:stroke fill;text-shadow:0 6px 14px rgba(0,0,0,.55)}
.cap .en .k{color:${L.key}}
.cap .de{margin-top:14px;font-size:84px;line-height:1.08;color:${L.de};-webkit-text-stroke:3px #000;paint-order:stroke fill;text-shadow:0 6px 14px rgba(0,0,0,.55)}
.cap .fa{margin-top:16px;font-size:38px;line-height:1.4;color:#FFF;opacity:.92;text-shadow:0 2px 8px rgba(0,0,0,.9)}
.rep{position:absolute;left:50%;top:1180px;transform:translateX(-50%);padding:16px 36px;border-radius:999px;background:${L.badge};color:#FFF;font-size:46px;white-space:nowrap;opacity:0;box-shadow:-5px 5px 0 ${L.badge2}}
#teaser{position:absolute;left:60px;right:150px;top:176px;padding:14px 20px;text-align:center;border-radius:26px;background:${L.badge};color:#FFF;font-size:44px;opacity:0;box-shadow:-5px 5px 0 ${L.badge2}}
#teaser .tfa{font-size:30px;margin-top:4px}
#quiz{position:absolute;left:60px;right:150px;top:260px;padding:26px;text-align:center;border-radius:36px;background:rgba(0,0,0,.72);border:5px solid ${L.badge2};opacity:0}
#quiz .qt{display:inline-block;padding:6px 30px;border-radius:999px;background:${L.badge};color:#FFF;font-size:44px;letter-spacing:.1em}
#quiz .qq{margin-top:12px;font-size:46px;color:#FFF}
#quiz .qen{margin-top:8px;font-size:66px;line-height:1.1;color:${L.de}}
#quiz .qfa{margin-top:8px;font-size:34px;color:#DDD}
#quiz .qa{margin-top:16px;display:inline-block;padding:12px 34px;border-radius:26px;background:${L.badge};color:#FFF;font-size:64px;opacity:0}
.qn{position:absolute;left:50%;top:880px;margin-left:-150px;width:300px;height:300px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:200px;color:#FFF;background:${L.badge};border:10px solid #FFF;box-shadow:-8px 8px 0 ${L.badge2};opacity:0}
</style>
<script>${GSAP}</script>
</head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${F(TOTAL)}">
<video id="bg" class="clip" src="${esc(a.video)}" muted playsinline data-start="0" data-duration="${F(TOTAL)}" data-track-index="0"></video>
<div id="film" class="clip" data-start="0" data-duration="${F(TOTAL)}" data-track-index="1">
  <div class="shade"></div>
  <div class="brand">${LOGO ? `<img src="${LOGO}" alt="EasyDeutsch"/>` : ""}<div>EasyDeutsch · A1 ${esc(a.episodeNo)}</div></div>
  ${a.teaser ? `<div id="teaser">${esc(a.teaser.en)}${a.teaser.fa ? `<div class="tfa" dir="rtl">${esc(a.teaser.fa)}</div>` : ""}</div>` : ""}
  ${caps}
  ${reps}
  ${Q ? `<div id="quiz"><div class="qt">QUIZ</div><div class="qq">How do you say it in German?</div><div class="qen">“${esc(Q.en)}”</div>${Q.fa ? `<div class="qfa" dir="rtl">${esc(Q.fa)}</div>` : ""}<div id="qa" class="qa">${esc(Q.de)}</div></div>${[3, 2, 1].map((n) => `<div id="qn${n}" class="qn">${n}</div>`).join("")}` : ""}
</div>
</div>
<script>
window.__timelines = window.__timelines || {};
var tl = gsap.timeline({ paused: true });
${js.join("\n")}
tl.set({}, {}, ${F(TOTAL)});
window.__timelines["main"] = tl;
</script>
</body></html>`;
}
