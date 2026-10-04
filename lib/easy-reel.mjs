// EasyDeutsch comedy series film (owner, 2026-10-04, after four reference shorts): a full-screen
// 9:16 film of AI shots. On the picture, low, in the caption card of the earlier EasyDeutsch
// videos: who speaks, the German line big (the punchline word in red) and the Persian as a
// smaller subtitle under it. No English, no "what you learned", no photo cards. At the end:
// "Fortsetzung folgt …". One composition, two looks: "easy" for Instagram (white card, yellow
// shadow), "tiktok" (dark card, TikTok's cyan and red) and "youtube" (white card, YouTube red).
import { readFileSync, existsSync } from "node:fs";

const b64 = (p) => readFileSync(p).toString("base64");
const GSAP = readFileSync("public/gsap.min.js", "utf8");
const FONT = existsSync("public/fonts/Vazirmatn-Black.woff2") ? b64("public/fonts/Vazirmatn-Black.woff2") : "";
const LOGO = existsSync("public/brand/easydeutsch-logo.jpg") ? `data:image/jpeg;base64,${b64("public/brand/easydeutsch-logo.jpg")}` : "";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const F = (x) => (+x).toFixed(3);

const LOOK = {
  easy: { card: "#FFFFFF", border: "#1A1A1A", bw: 6, shadow: "0 10px 0 #FFCE00", de: "#1A1A1A", hl: "#DD0000", fa: "#5C4B3A",
    who: { lena: "#3D5A80", braun: "#3E8A5A", krause: "#A0457E" }, endDe: "#DD0000" },
  youtube: { card: "#FFFFFF", border: "#0F0F0F", bw: 6, shadow: "0 10px 0 #FF0000", de: "#0F0F0F", hl: "#FF0000", fa: "#606060",
    who: { lena: "#065FD4", braun: "#2BA640", krause: "#CC0000" }, endDe: "#FF0000" },
  tiktok: { card: "#121212", border: "#FFFFFF", bw: 5, shadow: "-6px 6px 0 #25F4EE, 6px 10px 0 #FE2C55", de: "#FFFFFF", hl: "#FE2C55", fa: "#BDBDBD",
    who: { lena: "#25F4EE", braun: "#FE2C55", krause: "#FFFFFF" }, endDe: "#25F4EE" },
};

// The line with its punchline word in red: hl is matched without case and without final punctuation.
export function lineHTML(de, hl) {
  const s = String(de);
  const h = String(hl || "").replace(/[.!?]+$/, "");
  const k = h ? s.toLowerCase().indexOf(h.toLowerCase()) : -1;
  if (k < 0) return esc(s);
  return `${esc(s.slice(0, k))}<span class="hl">${esc(s.slice(k, k + h.length))}</span>${esc(s.slice(k + h.length))}`;
}

// a: { episodeNo, seriesTitle, title, total, video, theme,
//      caps: [{ t0, t1, de, fa, hl, who, whoName }],
//      end?: { t0, de, fa, small, smallFa } }
export function buildEasyReelHTML(a) {
  const L = LOOK[a.theme] || LOOK.easy, TOTAL = a.total;
  const js = [];
  const to = (sel, v, t) => js.push(`tl.to("${sel}", ${v}, ${F(t)});`);
  const fromTo = (sel, f, v, t) => js.push(`tl.fromTo("${sel}", ${f}, ${v}, ${F(t)});`);
  const caps = a.caps.map((c, i) => `<div id="c${i}" class="cap${String(c.de).length > 34 ? " long" : ""}">${c.whoName ? `<b class="who ${esc(c.who || "")}">${esc(c.whoName)}</b>` : ""}<div class="de">${lineHTML(c.de, c.hl)}</div>${c.fa ? `<div class="fa" dir="rtl">${esc(c.fa)}</div>` : ""}</div>`).join("");
  a.caps.forEach((c, i) => {
    fromTo(`#c${i}`, `{opacity:0,y:34,scale:.94}`, `{opacity:1,y:0,scale:1,duration:.3,ease:"back.out(2)",immediateRender:false}`, c.t0);
    to(`#c${i}`, `{opacity:0,y:-12,duration:.18}`, c.t1 - 0.18);
  });
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
.cap{position:absolute;left:44px;right:150px;top:1220px;padding:16px 28px 20px;text-align:center;opacity:0;background:${L.card};border:${L.bw}px solid ${L.border};border-radius:38px;box-shadow:${L.shadow}}
.cap .who{display:block;font-size:30px;letter-spacing:.04em;margin-bottom:2px}
.cap .who.lena{color:${L.who.lena}}.cap .who.braun{color:${L.who.braun}}.cap .who.krause{color:${L.who.krause}}
.cap .de{font-size:62px;line-height:1.12;color:${L.de}}
.cap.long .de{font-size:52px}
.hl{color:${L.hl}}
.cap .fa{margin-top:10px;font-size:38px;line-height:1.35;color:${L.fa}}
#end{position:absolute;left:44px;right:150px;top:1080px;padding:30px 20px 32px;text-align:center;opacity:0;background:${L.card};border:${L.bw}px solid ${L.border};border-radius:40px;box-shadow:${L.shadow}}
#end .ed{font-size:80px;line-height:1.1;color:${L.endDe}}
#end .ef{margin-top:8px;font-size:44px;color:${L.fa}}
#end .es{margin-top:16px;font-size:36px;color:${L.de}}
#end .esf{margin-top:4px;font-size:30px;color:${L.fa}}
</style>
<script>${GSAP}</script>
</head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${F(TOTAL)}">
<video id="bg" class="clip" src="${esc(a.video)}" muted playsinline data-start="0" data-duration="${F(TOTAL)}" data-track-index="0"></video>
<div id="film" class="clip" data-start="0" data-duration="${F(TOTAL)}" data-track-index="1">
  <div class="shade"></div><div class="shade2"></div>
  <div class="brand">${LOGO ? `<img src="${LOGO}" alt="EasyDeutsch"/>` : ""}<div><div class="s1">${esc(a.seriesTitle || "EasyDeutsch")}</div><div class="s2">EasyDeutsch · A1 ${esc(a.episodeNo)}</div></div></div>
  ${caps}
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
