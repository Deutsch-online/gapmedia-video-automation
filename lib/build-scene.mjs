// "Storybook scene" German lesson — modelled on the owner's reference reel
// (2026-09-27): one full-frame painted scene per line, a short German line in a
// white bubble with its key words in colour, the scene slowly alive under it.
//
// What moves (HyperFrames skills: hyperframes-keyframes camera moves,
// hyperframes-animation caption rules): every scene drifts with a slow push-in
// and pan toward the speaker (Ken Burns), a soft light sweep crosses it, the
// German bubble pops on the voice's own beat, the example line follows on its
// beat and the Persian meaning lands last. TikTok and Instagram are two
// designs: navy/red bubbles with a punch cut, versus purple/orange pills with a
// cross-dissolve and a different drift direction.
//
// Images are embedded as data URIs, so a render never reads the network.
// Deterministic: no clocks, no randomness, one paused timeline.
import { readFileSync } from "node:fs";

const b64 = (p) => readFileSync(p).toString("base64");
const FONT_FACES = [[700, "Bold"], [800, "ExtraBold"], [900, "Black"]]
  .map(([w, n]) => `@font-face{font-family:"Vazirmatn";font-weight:${w};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b64(`public/fonts/Vazirmatn-${n}.woff2`)}) format("woff2");}`)
  .join("\n");
const GSAP = readFileSync("public/gsap.min.js", "utf8");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const faDigits = (s) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const F = (x) => (+x).toFixed(3);
const dataUri = (p) => `data:image/${/\.jpe?g$/i.test(p) ? "jpeg" : "png"};base64,${b64(p)}`;

export const SCENE_VARIANTS = {
  tiktok: { bubble: "#FFFFFF", ink: "#1B2A6B", key: "#D7263D", edge: "#0B1020", faBg: "rgba(11,16,32,.82)", faInk: "#FFFFFF",
    chipBg: "rgba(11,16,32,.72)", chipInk: "#FFFFFF", radius: 22, cut: "punch", drift: 1 },
  instagram: { bubble: "#FFF8F1", ink: "#5B1E9B", key: "#E4572E", edge: "#2A1A3A", faBg: "rgba(255,248,241,.92)", faInk: "#2A1A3A",
    chipBg: "rgba(255,248,241,.85)", chipInk: "#2A1A3A", radius: 60, cut: "dissolve", drift: -1 },
};

/** German line → words, with capitalised nouns (after the first word) and the
 *  last word of a question in the key colour, like the reference bubbles. */
function germanWords(text, V) {
  const words = String(text).split(/\s+/).filter(Boolean);
  return words.map((w, i) => {
    const bare = w.replace(/[^\p{L}]/gu, "");
    const key = (i > 0 && /^\p{Lu}/u.test(bare)) || (i === words.length - 1 && /\?$/.test(w));
    return `<span class="w" style="color:${key ? V.key : V.ink}">${esc(w)}</span>`;
  }).join(" ");
}

/**
 * @param {object} a
 *   variant, episodeNo, total, topic, hook, loopLine, nextTopic, outroLine
 *   items: [{ de, fa, exDe, exFa }]
 *   images: { hook, items: [path…], outro }   — 1080x1920 scene images
 *   beats: [{ de, deDur, ex, exDur, fa } | null]
 *   hookDuration, tipDurations[], outroDuration
 */
export function buildSceneHTML(a) {
  const V = SCENE_VARIANTS[a.variant] || SCENE_VARIANTS.tiktok;
  const n = a.items.length;
  const HOOK = +a.hookDuration, OUTRO = +a.outroDuration, DURS = a.tipDurations.map(Number);
  const starts = []; { let t = HOOK; for (const d of DURS) { starts.push(t); t += d; } }
  const outroAt = n ? starts[n - 1] + DURS[n - 1] : HOOK;
  const TOTAL = +(outroAt + OUTRO).toFixed(3);
  const beat = (i) => {
    const b = a.beats?.[i], d = DURS[i];
    return b ? { de: b.de, ex: b.ex, fa: b.fa } : { de: 0.25, ex: d * 0.24, fa: d * 0.6 };
  };
  const counter = `A1 · ${String(a.episodeNo).padStart(3, "0")}/${a.total || 100}`;
  const scenes = [
    { id: "s0", at: 0, dur: HOOK, img: a.images.hook },
    ...a.items.map((_, i) => ({ id: `s${i + 1}`, at: starts[i], dur: DURS[i], img: a.images.items[i] })),
    { id: `s${n + 1}`, at: outroAt, dur: OUTRO, img: a.images.outro },
  ];

  const layer = (s, inner) => `<section id="${s.id}" class="clip scene" data-start="${F(s.at)}" data-duration="${F(s.dur)}" data-track-index="1">
  <div class="cam"><img class="bg" src="${dataUri(s.img)}" alt=""/></div><div class="light"></div><div class="shade"></div>
  ${inner}
</section>`;
  const html = [
    layer(scenes[0], `<div class="bubble hook" dir="rtl"><div class="hooktext">${esc(a.hook)}</div><div class="loop">${esc(a.loopLine)}</div></div>`),
    ...a.items.map((it, i) => layer(scenes[i + 1], `
  <div class="step" dir="rtl">${faDigits(i + 1)}/${faDigits(n)}</div>
  <div class="bubble de${String(it.de).length > 20 ? " long" : ""}" dir="ltr">${germanWords(it.de, V)}</div>
  ${it.exDe ? `<div class="bubble ex" dir="ltr">${germanWords(it.exDe, V)}</div>` : ""}
  <div class="fa" dir="rtl"><div class="fa1">${esc(it.fa)}</div>${it.exFa ? `<div class="fa2">${esc(it.exFa)}</div>` : ""}</div>`)),
    layer(scenes[n + 1], `<div class="bubble out" dir="rtl"><div class="next">${esc(`قسمت بعد: ${a.nextTopic}`)}</div><div class="outro">${esc(a.outroLine)}</div></div>`),
  ].join("\n");

  const css = `${FONT_FACES}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;background:#000;overflow:hidden}
#root{position:relative;width:100%;height:100%;background:#000;font-family:"Vazirmatn",sans-serif;overflow:hidden}
.scene{position:absolute;inset:0;overflow:hidden}
.cam{position:absolute;inset:0}
.bg{display:block;width:1080px;height:1920px;object-fit:cover}
.light{position:absolute;top:-200px;left:-600px;width:500px;height:2400px;background:linear-gradient(90deg,rgba(255,240,200,0),rgba(255,240,200,.22),rgba(255,240,200,0));opacity:.9}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 18%,rgba(0,0,0,0) 62%,rgba(0,0,0,.45) 100%)}
.head{position:absolute;top:150px;left:60px;right:60px;display:flex;justify-content:space-between;align-items:center;z-index:5}
.chip{display:block;padding:10px 24px;border-radius:999px;background:${V.chipBg};color:${V.chipInk};font-weight:900;font-size:32px;direction:ltr}
.topic{display:block;padding:10px 24px;border-radius:999px;background:${V.chipBg};color:${V.chipInk};font-weight:900;font-size:36px;direction:rtl}
.ailabel{position:absolute;left:28px;bottom:26px;color:rgba(255,255,255,.8);font-weight:700;font-size:22px;direction:ltr;z-index:5}
.bubble{position:absolute;left:70px;right:70px;background:${V.bubble};border:5px solid ${V.edge};border-radius:${V.radius}px;padding:20px 34px;text-align:center;box-shadow:0 12px 0 rgba(0,0,0,.28)}
.bubble .w{display:inline-block}
.bubble.de{top:760px;font-weight:900;font-size:72px;line-height:1.12}
.bubble.de.long{font-size:54px}
.bubble.ex{top:1000px;font-weight:900;font-size:38px;line-height:1.25}
.bubble.hook{top:640px;padding:30px 40px}
.hooktext{display:block;color:${V.ink};font-weight:900;font-size:64px;line-height:1.35}
.loop{display:block;margin-top:14px;color:${V.key};font-weight:800;font-size:38px}
.bubble.out{top:700px;padding:30px 40px}
.next{display:block;color:${V.ink};font-weight:900;font-size:54px;line-height:1.35}
.outro{display:block;margin-top:16px;color:${V.key};font-weight:800;font-size:42px;line-height:1.45}
.step{position:absolute;top:250px;left:0;right:0;text-align:center;color:#FFFFFF;font-weight:900;font-size:36px;text-shadow:0 3px 8px rgba(0,0,0,.6)}
.fa{position:absolute;left:90px;right:90px;top:1200px;padding:18px 28px;border-radius:24px;background:${V.faBg};color:${V.faInk};text-align:center}
.fa1{display:block;font-weight:900;font-size:50px;line-height:1.35}
.fa2{display:block;margin-top:6px;font-weight:700;font-size:30px;line-height:1.45;opacity:.85}
.flash{position:absolute;inset:0;background:#FFFFFF;opacity:0;z-index:20}
`;

  const js = [];
  const drift = V.drift;
  scenes.forEach((s, k) => {
    // Camera: a slow push toward the characters, alternating pan direction.
    const dir = (k % 2 ? -1 : 1) * drift;
    js.push(`tl.fromTo("#${s.id} .cam",{scale:1.02,x:${-24 * dir},y:10},{scale:1.12,x:${24 * dir},y:-18,duration:${F(s.dur)},ease:"none"},${F(s.at)});`);
    js.push(`tl.fromTo("#${s.id} .light",{x:0},{x:2200,duration:${F(Math.max(2.5, s.dur))},ease:"none"},${F(s.at)});`);
  });
  // Hook: readable in frame 0 — the bubble is already there; it only settles.
  js.push(`tl.fromTo("#s0 .bubble",{scale:.94},{scale:1,duration:.5,ease:"back.out(1.8)"},0);`);
  js.push(`tl.fromTo("#s0 .loop",{opacity:0},{opacity:1,duration:.4},1.0);`);
  a.items.forEach((_, i) => {
    const s = scenes[i + 1], b = beat(i), t0 = s.at;
    const pop = (sel, at) => js.push(`tl.fromTo("#${s.id} ${sel}",{scale:.3,opacity:0,transformOrigin:"50% 50%"},{scale:1,opacity:1,duration:.42,ease:"back.out(2.2)"},${F(at)});`);
    js.push(`tl.fromTo("#${s.id} .step",{opacity:0,y:-12},{opacity:1,y:0,duration:.3},${F(t0 + 0.1)});`);
    pop(".bubble.de", t0 + b.de);
    js.push(`tl.fromTo("#${s.id} .bubble.de .w",{y:18},{y:0,duration:.3,stagger:.06,ease:"back.out(2)"},${F(t0 + b.de + 0.05)});`);
    pop(".bubble.ex", t0 + b.ex);
    js.push(`tl.fromTo("#${s.id} .fa",{opacity:0,y:40},{opacity:1,y:0,duration:.4,ease:"power3.out"},${F(t0 + b.fa)});`);
  });
  const o = scenes[n + 1];
  js.push(`tl.fromTo("#${o.id} .bubble",{scale:.3,opacity:0,transformOrigin:"50% 50%"},{scale:1,opacity:1,duration:.45,ease:"back.out(2)"},${F(o.at + 0.2)});`);
  // Cuts: TikTok punches in with a white flash; Instagram dissolves.
  scenes.slice(1).forEach((s) => {
    if (V.cut === "punch") {
      js.push(`tl.fromTo(".flash",{opacity:.55},{opacity:0,duration:.22,ease:"power2.out",immediateRender:false},${F(s.at)});`);
    } else {
      js.push(`tl.fromTo("#${s.id}",{opacity:0},{opacity:1,duration:.45,ease:"power1.inOut"},${F(s.at)});`);
    }
  });

  return `<!doctype html>
<html lang="fa"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1920">
<style>${css}</style>
<script>${GSAP}</script>
</head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${TOTAL}">
${html}
<div id="hud" class="clip" data-start="0" data-duration="${TOTAL}" data-track-index="3" style="position:absolute;inset:0;pointer-events:none">
  <div class="head"><span class="chip">${esc(counter)}</span><span class="topic">${esc(a.topic)}</span></div>
  <div class="ailabel">AI-generated</div>
  <div class="flash"></div>
</div>
</div>
<script>
window.__timelines = window.__timelines || {};
var tl = gsap.timeline({ paused: true });
${js.join("\n")}
tl.set({}, {}, ${TOTAL});
window.__timelines["main"] = tl;
</script>
</body></html>`;
}
