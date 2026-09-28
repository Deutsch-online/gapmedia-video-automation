// The 3D stage film for an animated German lesson.
//
// Owner, 2026-09-28: the animated lessons must show people who look and move
// like real humans. The stage (two characters in a set that fits the topic,
// runtime in public/3d/stage.js) is rendered ONCE per episode as a silent
// film at 1080x880; the TikTok and Instagram compositions then play that film
// in their stage box (buildAnimHTML with `stageVideo`), under their own cards.
// WebGL renders on the CPU in CI (about 1 s a frame), so one stage for both
// formats halves the cost.
import { readPhrase, iconSVG } from "./anim-room.mjs";
import { ANIM_VARIANTS } from "./build-anim.mjs";

export const STAGE_W = 1080, STAGE_H = 880;
const F = (x) => (+x).toFixed(3);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The same windows buildAnimHTML uses for the cards, so the acting lands on
// the voice: she says the phrase, he answers with the example sentence.
export function stageTimes(a) {
  const HOOK = +a.hookDuration, OUTRO = +a.outroDuration, DURS = a.tipDurations.map(Number);
  const starts = []; { let t = HOOK; for (const d of DURS) { starts.push(t); t += d; } }
  const outroAt = starts.length ? starts[starts.length - 1] + DURS[DURS.length - 1] : HOOK;
  const total = +(outroAt + OUTRO).toFixed(3);
  const phrases = a.items.map((it, i) => {
    const d = DURS[i], b = a.beats?.[i];
    const beat = b
      ? { de: b.de, deDur: b.deDur ?? Math.max(0.8, b.ex - b.de - 0.45), ex: b.ex, exDur: b.exDur ?? Math.max(0.8, b.fa - b.ex - 0.45), fa: b.fa }
      : { de: 0.25, deDur: d * 0.16, ex: d * 0.24, exDur: d * 0.3, fa: d * 0.6 };
    const r = readPhrase(it.de, {});
    if (!r.noun && it.exDe) { const e = readPhrase(it.exDe, {}); Object.assign(r, { noun: e.noun, kind: e.kind }); }
    return {
      t0: +starts[i].toFixed(3), dur: d, ...beat, again: b?.again ?? null, hasEx: Boolean(it.exDe),
      negation: r.negation, question: r.question,
      // a thing the phrase names is pictured over her head; struck out when the
      // sentence says it is NOT there ("Ich habe kein Geld")
      icon: r.noun && r.kind !== "none" ? r.noun : null, crossed: Boolean(r.noun && r.negation),
    };
  });
  return { hook: HOOK, outroAt: +outroAt.toFixed(3), total, phrases };
}

export function build3DStageHTML(a) {
  const tm = stageTimes(a);
  const P = ANIM_VARIANTS.instagram;
  const icons = tm.phrases.map((p, i) => {
    const art = p.icon ? iconSVG(p.icon, P) : "";
    if (!art) { p.icon = null; return ""; }
    return `<div id="b-ic${i}" class="bub think"><svg viewBox="-10 -10 120 120" width="150" height="150" aria-hidden="true">${art}${p.crossed
      ? `<circle cx="50" cy="50" r="56" fill="none" stroke="#E0413A" stroke-width="10"/><path d="M12 12 L88 88" stroke="#E0413A" stroke-width="10" stroke-linecap="round"/>` : ""}</svg></div>`;
  }).join("\n");
  const cfg = { setting: a.setting === "room" ? "home" : (a.setting || "cafe"), ...tm };
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=${STAGE_W},height=${STAGE_H}">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${STAGE_W}px;height:${STAGE_H}px;background:#1b1512;overflow:hidden}
#root{position:relative;width:${STAGE_W}px;height:${STAGE_H}px;overflow:hidden;font-family:"Helvetica Neue",Arial,sans-serif}
#three-stage{position:absolute;left:0;top:0;width:${STAGE_W}px;height:${STAGE_H}px;display:block}
.bub{position:absolute;left:0;top:0;opacity:0;padding:12px 28px;border-radius:30px;background:#FFFFFF;color:#C2410C;font-weight:900;font-size:44px;box-shadow:0 8px 24px rgba(0,0,0,.25);white-space:nowrap}
.bub.think{padding:10px;border-radius:50%}
</style>
<script src="public/gsap.min.js"></script>
<script type="importmap">{"imports":{"three":"./public/3d/vendor/three.module.js","three/addons/":"./public/3d/vendor/jsm/"}}</script>
</head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="${STAGE_W}" data-height="${STAGE_H}" data-duration="${F(tm.total)}">
<div id="stage3d" class="clip" data-start="0" data-duration="${F(tm.total)}" data-track-index="1">
<canvas id="three-stage" width="${STAGE_W}" height="${STAGE_H}"></canvas>
<div id="b-her" class="bub">${esc("Hallo!")}</div>
<div id="b-him" class="bub">${esc("Guten Tag!")}</div>
<div id="b-bye" class="bub">${esc("Tschüss!")}</div>
${icons}
</div>
</div>
<script>
window.__stage3d = ${JSON.stringify(cfg)};
window.__timelines = window.__timelines || {};
var tl = gsap.timeline({ paused: true });
tl.set({}, {}, ${F(tm.total)});
window.__timelines["main"] = tl;
</script>
<script type="module" src="public/3d/stage.js"></script>
</body></html>`;
}
