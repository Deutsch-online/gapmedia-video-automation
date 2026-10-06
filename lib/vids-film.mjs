// A film made in Google Vids (owner, 2026-10-06), merged and captioned here: the picture is the owner's own AI clips
// (public/ai-cast/oma-vids.mp4, 16:9), shown big in the middle of a 9:16 frame over a blurred copy of itself, with the
// German sentence (verb in red) and the Persian subtitle in a card under it. The audio is the clips' own (lip-synced by Vids).
import { readFileSync, existsSync } from "node:fs";

const GSAP = readFileSync("public/gsap.min.js", "utf8");
const FONT = existsSync("public/fonts/Vazirmatn-Black.woff2") ? readFileSync("public/fonts/Vazirmatn-Black.woff2").toString("base64") : "";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const F = (x) => (+x).toFixed(3);
const LOOK = {
  easy: { card: "#FFFFFF", border: "#1A1A1A", bw: 6, shadow: "0 10px 0 #FFCE00", de: "#1A1A1A", hl: "#DD0000", fa: "#5C4B3A", right: 44 },
  youtube: { card: "#FFFFFF", border: "#0F0F0F", bw: 6, shadow: "0 10px 0 #FF0000", de: "#0F0F0F", hl: "#FF0000", fa: "#606060", right: 44 },
  tiktok: { card: "#121212", border: "#FFFFFF", bw: 5, shadow: "-6px 6px 0 #25F4EE, 6px 10px 0 #FE2C55", de: "#FFFFFF", hl: "#FE2C55", fa: "#BDBDBD", right: 150 },
};

// a: { total, theme, video, caps: [{ t0, t1, de, verb, fa }] }
export function buildVidsHTML(a) {
  const L = LOOK[a.theme] || LOOK.easy, js = [];
  const words = (c) => String(c.de).split(/\s+/);
  const isVerb = (w, c) => w.replace(/[.!?]+$/, "").toLowerCase() === String(c.verb).toLowerCase();
  const cards = a.caps.map((c, i) => `<div id="c${i}" class="cap"><div class="de">${words(c).map((w, k) => `<span class="w c${i}w${k}${isVerb(w, c) ? " hl" : ""}">${esc(w)}</span>`).join(" ")}</div><div class="fa" dir="rtl">${esc(c.fa)}</div></div>`).join("");
  a.caps.forEach((c, i) => {
    js.push(`tl.fromTo("#c${i}",{opacity:0,y:36,scale:.92},{opacity:1,y:0,scale:1,duration:.28,ease:"back.out(2)",immediateRender:false},${F(c.t0)});`);
    words(c).forEach((w, k) => {
      js.push(`tl.fromTo(".c${i}w${k}",{opacity:0,y:24,scale:.6},{opacity:1,y:0,scale:1,duration:.26,ease:"back.out(3)",immediateRender:false},${F(c.t0 + 0.08 + k * 0.1)});`);
      if (isVerb(w, c)) js.push(`tl.fromTo(".c${i}w${k}",{scale:1.35},{scale:1,duration:.4,ease:"elastic.out(1.4,.5)",immediateRender:false},${F(c.t0 + 0.35 + k * 0.1)});`);
    });
    js.push(`tl.fromTo("#c${i} .fa",{opacity:0,y:12},{opacity:1,y:0,duration:.3,immediateRender:false},${F(c.t0 + 0.2 + words(c).length * 0.1)});`);
    js.push(`tl.to("#c${i}",{opacity:0,y:-10,duration:.18},${F(c.t1 - 0.18)});`);
  });
  const T = F(a.total);
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1920">
<style>
${FONT ? `@font-face{font-family:"EasyFont";font-weight:900;src:url(data:font/woff2;base64,${FONT}) format("woff2");}` : ""}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;background:#1A1A1A;overflow:hidden}
#root{position:relative;width:1080px;height:1920px;background:#1A1A1A;font-family:"EasyFont",Arial,sans-serif;overflow:hidden}
#bgv{position:absolute;left:-340px;top:0;width:1760px;height:1920px;object-fit:cover;filter:blur(36px) brightness(.62) saturate(1.2)}
#mainw{position:absolute;left:0;top:200px;width:1080px;height:844px;overflow:hidden;border-top:6px solid #FFFFFF;border-bottom:6px solid #FFFFFF;box-sizing:content-box}
#mainv{position:absolute;left:-210px;top:0;width:1500px;height:844px;object-fit:cover}
.cap{position:absolute;left:44px;right:${L.right}px;top:1130px;padding:24px 24px 26px;text-align:center;opacity:0;color:${L.de};background:${L.card};border:${L.bw}px solid ${L.border};border-radius:40px;box-shadow:${L.shadow}}
.cap .de{font-size:76px;line-height:1.12}
.cap .fa{margin-top:10px;font-size:54px;line-height:1.35;color:${L.fa};font-family:"EasyFont",Tahoma,sans-serif}
.w{display:inline-block}
.hl{color:${L.hl};text-decoration:underline;text-decoration-thickness:7px;text-underline-offset:9px}
</style>
<script>${GSAP}</script>
</head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${T}">
<video id="bgv" class="clip" src="${esc(a.video)}" muted playsinline data-start="0" data-duration="${T}" data-track-index="0"></video>
<div id="mainw"><video id="mainv" class="clip" src="${esc(a.video)}" muted playsinline data-start="0" data-duration="${T}" data-track-index="1"></video></div>
<div id="caps" class="clip" data-start="0" data-duration="${T}" data-track-index="2">${cards}</div>
</div>
<script>
window.__timelines = window.__timelines || {};
var tl = gsap.timeline({ paused: true });
${js.join("\n")}
tl.set({}, {}, ${T});
window.__timelines["main"] = tl;
</script>
</body></html>`;
}
