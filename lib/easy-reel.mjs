// EasyDeutsch series film (owner, 2026-10-04, after four reference shorts): a full-screen
// 9:16 film of AI shots. On the picture: the spoken German line, big, with the lesson phrase
// lit up in neon; the Persian subtitle small underneath. No English, no boxes, no stage frame.
// Between the story and its cliffhanger: a "learned today" card with the lesson's phrases.
// At the end: "Fortsetzung folgt…". One composition, two looks: "easy" for Instagram
// (pink, blue and yellow) and "tiktok" (TikTok's cyan and red).
import { readFileSync, existsSync } from "node:fs";

const b64 = (p) => readFileSync(p).toString("base64");
const GSAP = readFileSync("public/gsap.min.js", "utf8");
const FONT = existsSync("public/fonts/Vazirmatn-Black.woff2") ? b64("public/fonts/Vazirmatn-Black.woff2") : "";
const LOGO = existsSync("public/brand/easydeutsch-logo.jpg") ? `data:image/jpeg;base64,${b64("public/brand/easydeutsch-logo.jpg")}` : "";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const F = (x) => (+x).toFixed(3);

const LOOK = {
  easy: { text: "#FFFFFF", hl: "#FFE14D", glow: "#FF8A00", badge: "#FF5FA2", badge2: "#7FD3FF" },
  tiktok: { text: "#FFFFFF", hl: "#25F4EE", glow: "#25F4EE", badge: "#FE2C55", badge2: "#25F4EE" },
};

// The line with its lesson phrase lit up: hl is matched without case and without final punctuation.
export function lineHTML(de, hl) {
  const s = String(de);
  const h = String(hl || "").replace(/[.!?]+$/, "");
  const k = h ? s.toLowerCase().indexOf(h.toLowerCase()) : -1;
  if (k < 0) return esc(s);
  return `${esc(s.slice(0, k))}<span class="hl">${esc(s.slice(k, k + h.length))}</span>${esc(s.slice(k + h.length))}`;
}

// a: { episodeNo, seriesTitle, title, total, video, theme,
//      caps: [{ t0, t1, de, fa, hl }],
//      recap?: { t0, t1, title, titleFa, items: [{ t0, de, fa }] },
//      end?: { t0, de, fa, small, smallFa } }
export function buildEasyReelHTML(a) {
  const L = LOOK[a.theme] || LOOK.easy, TOTAL = a.total;
  const js = [];
  const to = (sel, v, t) => js.push(`tl.to("${sel}", ${v}, ${F(t)});`);
  const fromTo = (sel, f, v, t) => js.push(`tl.fromTo("${sel}", ${f}, ${v}, ${F(t)});`);
  const caps = a.caps.map((c, i) => `<div id="c${i}" class="cap${String(c.de).length > 30 ? " long" : ""}"><div class="de">${lineHTML(c.de, c.hl)}</div>${c.fa ? `<div class="fa" dir="rtl">${esc(c.fa)}</div>` : ""}</div>`).join("");
  a.caps.forEach((c, i) => {
    fromTo(`#c${i}`, `{opacity:0,y:34,scale:.94}`, `{opacity:1,y:0,scale:1,duration:.3,ease:"back.out(2)",immediateRender:false}`, c.t0);
    to(`#c${i}`, `{opacity:0,y:-12,duration:.18}`, c.t1 - 0.18);
  });
  const R = a.recap;
  if (R) {
    fromTo("#recap", `{opacity:0,scale:.9}`, `{opacity:1,scale:1,duration:.4,ease:"back.out(2)",immediateRender:false}`, R.t0);
    R.items.forEach((_, i) => fromTo(`#ri${i}`, `{opacity:0,x:-40}`, `{opacity:1,x:0,duration:.35,ease:"power3.out",immediateRender:false}`, R.items[i].t0));
    to("#recap", `{opacity:0,duration:.3}`, R.t1 - 0.3);
  }
  const E = a.end;
  if (E) fromTo("#end", `{opacity:0,scale:.8}`, `{opacity:1,scale:1,duration:.5,ease:"back.out(2.2)",immediateRender:false}`, E.t0);
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1920">
<style>
${FONT ? `@font-face{font-family:"EasyFont";font-weight:900;src:url(data:font/woff2;base64,${FONT}) format("woff2");}` : ""}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;background:#000;overflow:hidden}
#root{position:relative;width:1080px;height:1920px;background:#000;font-family:"EasyFont",Arial,sans-serif;overflow:hidden}
#bg{position:absolute;left:0;top:0;width:1080px;height:1920px;object-fit:cover}
.shade{position:absolute;left:0;right:0;top:0;height:420px;background:linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,0));pointer-events:none}
.shade2{position:absolute;left:0;right:0;bottom:0;height:760px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.55));pointer-events:none}
.brand{position:absolute;left:40px;top:60px;display:flex;align-items:center;gap:18px;color:#FFF;text-shadow:0 3px 8px rgba(0,0,0,.7)}
.brand img{width:96px;height:96px;border-radius:50%;border:4px solid #FFF}
.brand .s1{font-size:38px;line-height:1.1}.brand .s2{font-size:28px;opacity:.9}
.cap{position:absolute;left:50px;right:150px;top:1120px;text-align:center;opacity:0}
.cap .de{font-size:84px;line-height:1.1;color:${L.text};-webkit-text-stroke:3px #000;paint-order:stroke fill;text-shadow:0 6px 14px rgba(0,0,0,.6)}
.cap.long .de{font-size:68px}
.hl{color:${L.hl};text-shadow:0 0 10px ${L.glow},0 0 26px ${L.glow},0 0 46px ${L.glow};-webkit-text-stroke:2px #000}
.cap .fa{margin-top:14px;font-size:40px;line-height:1.4;color:#FFF;text-shadow:0 2px 8px #000,0 0 14px #000}
#recap{position:absolute;left:50px;right:150px;top:300px;padding:30px 30px 26px;border-radius:38px;background:rgba(0,0,0,.74);border:5px solid ${L.badge2};opacity:0}
#recap .rt{display:inline-block;padding:6px 30px;border-radius:999px;background:${L.badge};color:#FFF;font-size:42px}
#recap .rtf{margin-top:6px;font-size:32px;color:#DDD}
.ri{margin-top:18px;opacity:0;text-align:left}
.ri .rd{font-size:50px;line-height:1.12;color:#FFF}
.ri .rf{font-size:32px;line-height:1.3;color:${L.hl};text-align:right}
#end{position:absolute;left:50px;right:150px;top:700px;padding:36px 20px;text-align:center;border-radius:40px;background:rgba(0,0,0,.72);border:6px solid ${L.badge};opacity:0}
#end .ed{font-size:86px;line-height:1.1;color:${L.hl};text-shadow:0 0 16px ${L.glow}}
#end .ef{margin-top:10px;font-size:44px;color:#FFF}
#end .es{margin-top:18px;font-size:36px;color:#EEE}
#end .esf{margin-top:4px;font-size:30px;color:#CCC}
</style>
<script>${GSAP}</script>
</head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${F(TOTAL)}">
<video id="bg" class="clip" src="${esc(a.video)}" muted playsinline data-start="0" data-duration="${F(TOTAL)}" data-track-index="0"></video>
<div id="film" class="clip" data-start="0" data-duration="${F(TOTAL)}" data-track-index="1">
  <div class="shade"></div><div class="shade2"></div>
  <div class="brand">${LOGO ? `<img src="${LOGO}" alt="EasyDeutsch"/>` : ""}<div><div class="s1">${esc(a.seriesTitle || "EasyDeutsch")}</div><div class="s2">EasyDeutsch · A1 ${esc(a.episodeNo)}</div></div></div>
  ${caps}
  ${R ? `<div id="recap"><div class="rt">${esc(R.title)}</div><div class="rtf" dir="rtl">${esc(R.titleFa || "")}</div>${R.items.map((it, i) => `<div id="ri${i}" class="ri"><div class="rd">${esc(it.de)}</div><div class="rf" dir="rtl">${esc(it.fa)}</div></div>`).join("")}</div>` : ""}
  ${E ? `<div id="end"><div class="ed">${esc(E.de)}</div><div class="ef" dir="rtl">${esc(E.fa)}</div>${E.small ? `<div class="es">${esc(E.small)}</div>` : ""}${E.smallFa ? `<div class="esf" dir="rtl">${esc(E.smallFa)}</div>` : ""}</div>` : ""}
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
