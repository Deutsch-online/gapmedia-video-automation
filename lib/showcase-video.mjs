// EasyDeutsch "Character Builder" showcase (owner, 2026-09-28: make one like the
// reference clip). 20 s, 16:9: Lena on the left reacts to an editor panel on the
// right: bored side-eye, a balloon head, stretched legs, an orange / violet / blue
// light, backdrop beats with a pose each, a close-up with a raised brow and a smirk.
// The 3D acting is public/3d/toon-showcase.js; this file is the page and the panel.
//
// Usage: node lib/showcase-video.mjs [out.mp4]  (renders, adds music, writes the MP4)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const b64 = (f) => readFileSync(f).toString("base64");
const F = (x) => (+x).toFixed(3);

export const SHOW = {
  total: 20,
  t: { head: 3.2, legs: 6.6, color: 9.8, bg: 13.0, close: 16.4 },
  tints: [{ t: 10.1, c: "#ff8a3d", a: 0.5 }, { t: 11.2, c: "#b44fd6", a: 0.55 }, { t: 12.3, c: "#2f7bff", a: 0.55 }],
  tintOff: 13.0,
  bgs: [{ t: 13.2, c: "#e4dcf7" }, { t: 14.3, c: "#fbe8a6" }, { t: 15.4, c: "#cfe3f7" }],
};
// the backdrop behind Lena, as [time, inner colour, outer colour]
const BACK = [
  [0, "#f1ece4", "#d9d0c4"],
  [10.1, "#ffb069", "#e2672a"], [11.2, "#d77be8", "#8a2aa8"], [12.3, "#39a6f2", "#0d5fc4"],
  [13.2, "#efe9fb", "#cdbff0"], [14.3, "#fff3c6", "#f3d27a"], [15.4, "#e6f1fb", "#b9d3ec"],
  [16.4, "#d6ecea", "#9fc6c6"],
];
const TINTS = ["none", "#ff8a3d", "#ffc93c", "#ff6fa3", "#b44fd6", "#2f7bff", "#27c4b5"];
const BGS = ["none", "#f3efe8", "#e4dcf7", "#fbe8a6", "#cfe3f7", "#d6f0e0", "#9fc6c6"];

export function buildShowcaseHTML(S = SHOW) {
  const GSAP = readFileSync("public/gsap.min.js", "utf8");
  const R = b64("public/fonts/Vazirmatn-Medium.woff2"), B = b64("public/fonts/Vazirmatn-Black.woff2");
  const LOGO = `data:image/jpeg;base64,${b64("public/brand/easydeutsch-logo.jpg")}`;
  const T = S.t, js = [];
  const at = (x) => F(x);
  // panel geometry (px, inside the 1920 × 1080 frame)
  const PX = 1392, PY = 150, SL = { head: 176, body: 272, height: 368 }, TRACK = [PX + 34, 400];   // slider x, width
  const thumbX = (v) => TRACK[0] + v * TRACK[1];                                                  // v: 0..1
  const swX = (i) => PX + 34 + i * 58, TINT_Y = PY + 510, BG_Y = PY + 622;

  // backdrop colour changes on the beats
  BACK.slice(1).forEach(([t, a, b]) => js.push(`tl.to("#back",{"--in":"${a}","--out":"${b}",duration:.35,ease:"power2.out"},${at(t - 0.05)});`));
  // sliders: head to max and back, height to max and back
  const slide = (k, t0, v, d = 0.55) => js.push(`tl.to("#th-${k}",{x:${F(thumbX(v) - thumbX(0.5))},duration:${d},ease:"power2.inOut"},${at(t0)});tl.to("#fill-${k}",{width:${F(v * TRACK[1])},duration:${d},ease:"power2.inOut"},${at(t0)});`);
  slide("head", T.head + 0.3, 1); slide("head", T.head + 2.8, 0.5);
  slide("height", T.legs + 0.3, 1); slide("height", T.color - 0.35, 0.5, 0.4);
  // swatches: ring on the picked one
  const pick = (grp, i, t) => js.push(`tl.set("#${grp} .sw",{boxShadow:"0 0 0 0 rgba(0,0,0,0)"},${at(t)});tl.fromTo("#${grp}-${i}",{scale:.82},{scale:1,boxShadow:"0 0 0 4px #ffffff, 0 0 0 7px #1b1b1f",duration:.3,ease:"back.out(3)"},${at(t)});`);
  pick("tints", 0, 0);
  S.tints.forEach((x, i) => pick("tints", [1, 4, 5][i], x.t));
  pick("tints", 0, S.tintOff);
  pick("bgs", 0, 0);
  S.bgs.forEach((x, i) => pick("bgs", i + 2, x.t)); pick("bgs", 6, T.close);
  // the cursor: moves to each control, presses on the beat
  const moves = [
    [0.4, thumbX(0.5), PY + SL.head + 52], [T.head + 0.3, thumbX(1), PY + SL.head + 52, true], [T.head + 2.8, thumbX(0.5), PY + SL.head + 52, true],
    [T.legs + 0.3, thumbX(1), PY + SL.height + 52, true], [T.color - 0.35, thumbX(0.5), PY + SL.height + 52, true],
    ...S.tints.map((x, i) => [x.t, swX([1, 4, 5][i]) + 14, TINT_Y + 14, true]), [S.tintOff, swX(0) + 14, TINT_Y + 14, true],
    ...S.bgs.map((x, i) => [x.t, swX(i + 2) + 14, BG_Y + 14, true]), [T.close, swX(6) + 14, BG_Y + 14, true],
    [T.close + 1.2, PX + 330, PY + 720],
  ];
  moves.forEach(([t, x, y, press]) => {
    js.push(`tl.to("#cursor",{x:${F(x)},y:${F(y)},duration:${press ? 0.32 : 0.6},ease:"power3.inOut"},${at(Math.max(0, t - (press ? 0.34 : 0.6)))});`);
    if (press) js.push(`tl.to("#cursor",{scale:.8,duration:.08,yoyo:true,repeat:1},${at(t)});tl.fromTo("#ripple",{x:${F(x - 22)},y:${F(y - 22)},scale:.2,opacity:.55},{scale:1.4,opacity:0,duration:.45,ease:"power2.out",immediateRender:false},${at(t)});`);
  });
  // the panel fades a little for the close-up; the name card slides in
  js.push(`tl.fromTo("#panel",{opacity:0,x:40},{opacity:1,x:0,duration:.6,ease:"power3.out"},0.15);`);
  js.push(`tl.to("#panel",{opacity:.55,duration:.6},${at(T.close + 0.2)});`);
  js.push(`tl.fromTo("#brand",{opacity:0,y:-16},{opacity:1,y:0,duration:.5,ease:"power3.out"},0.1);`);
  js.push(`tl.fromTo("#name",{opacity:0,y:24},{opacity:1,y:0,duration:.5,ease:"back.out(2)",immediateRender:false},${at(T.close + 2.0)});`);

  const sliderRow = (k, label, lo, hi) => `
    <div class="sl" style="top:${SL[k]}px"><div class="lab">${label}</div>
      <div class="track"><div class="fill" id="fill-${k}" style="width:${TRACK[1] / 2}px"></div><div class="thumb" id="th-${k}" style="left:${TRACK[1] / 2 - 13}px"></div></div>
      <div class="ends"><span>${lo}</span><span>${hi}</span></div></div>`;
  const sw = (grp, list) => list.map((c, i) => `<div class="sw${c === "none" ? " clear" : ""}" id="${grp}-${i}" style="left:${34 + i * 58}px${c === "none" ? "" : `;background:${c}`}"></div>`).join("");

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080">
<style>
@font-face{font-family:"UI";font-weight:500;src:url(data:font/woff2;base64,${R}) format("woff2")}
@font-face{font-family:"UI";font-weight:900;src:url(data:font/woff2;base64,${B}) format("woff2")}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1920px;height:1080px;overflow:hidden;background:#d9d0c4}
#root{position:relative;width:1920px;height:1080px;overflow:hidden;font-family:"UI",Arial,sans-serif;color:#1b1b1f}
#back{--in:${BACK[0][1]};--out:${BACK[0][2]};position:absolute;inset:0;background:radial-gradient(ellipse 70% 85% at 36% 40%,var(--in),var(--out))}
#three-stage{position:absolute;left:0;top:0;width:1920px;height:1080px}
#brand{position:absolute;left:44px;top:36px;display:flex;align-items:center;gap:16px}
#brand img{width:74px;height:74px;border-radius:50%;box-shadow:0 4px 14px rgba(0,0,0,.18)}
#brand b{font-weight:900;font-size:34px;letter-spacing:.01em}
#panel{position:absolute;left:${PX}px;top:${PY}px;width:468px;height:790px;border-radius:28px;background:rgba(255,255,255,.72);box-shadow:0 20px 60px rgba(0,0,0,.14);backdrop-filter:blur(14px)}
#panel .h1{position:absolute;left:34px;top:34px;font-size:22px;color:#6b6b73;font-weight:500;letter-spacing:.06em;text-transform:uppercase}
#panel .h2{position:absolute;left:34px;top:68px;font-size:44px;font-weight:900}
#panel .grp{position:absolute;left:34px;font-size:20px;color:#6b6b73;letter-spacing:.08em;text-transform:uppercase}
.sl{position:absolute;left:34px;width:400px}
.sl .lab{font-size:26px;font-weight:900}
.track{position:relative;margin-top:16px;height:8px;border-radius:8px;background:#dcdce2}
.fill{position:absolute;left:0;top:0;height:8px;border-radius:8px;background:#1b1b1f}
.thumb{position:absolute;top:-9px;width:26px;height:26px;border-radius:50%;background:#1b1b1f;border:4px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.ends{display:flex;justify-content:space-between;margin-top:10px;font-size:18px;color:#8a8a92}
.sw{position:absolute;width:44px;height:44px;border-radius:50%;border:2px solid rgba(0,0,0,.08)}
.sw.clear{background:#fff;background-image:linear-gradient(45deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%),linear-gradient(45deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%);background-size:12px 12px;background-position:0 0,6px 6px}
#bgs .sw{border-radius:12px}
.btn{position:absolute;left:34px;top:${PY + 50 + 620 - PY}px;width:400px;height:58px;border-radius:14px;border:2px solid #1b1b1f;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900}
#cursor{position:absolute;left:0;top:0;width:34px;height:44px;transform-origin:4px 4px}
#ripple{position:absolute;left:0;top:0;width:44px;height:44px;border-radius:50%;border:3px solid #1b1b1f;opacity:0}
#name{position:absolute;left:120px;bottom:90px;padding:14px 26px;border-radius:999px;background:#1b1b1f;color:#fff;font-size:34px;font-weight:900;opacity:0}
#name span{color:#ffce00}
</style>
<script>${GSAP}</script>
<script type="importmap">{"imports":{"three":"./public/3d/vendor/three.module.js"}}</script>
</head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${F(S.total)}">
<div id="film" class="clip" data-start="0" data-duration="${F(S.total)}" data-track-index="1">
  <div id="back"></div>
  <canvas id="three-stage" width="1920" height="1080"></canvas>
  <div id="brand"><img src="${LOGO}" alt="EasyDeutsch"/><b>EasyDeutsch</b></div>
  <div id="panel">
    <div class="h1">Character Builder</div><div class="h2">Lena · 3D</div>
    <div class="grp" style="top:${SL.head - 42}px">Shape</div>
    ${sliderRow("head", "Head size", "smaller", "bigger")}${sliderRow("body", "Body shape", "lean", "sturdy")}${sliderRow("height", "Height", "shorter", "taller")}
    <div class="grp" style="top:472px">Colour lighting</div>
    <div id="tints" style="position:absolute;left:0;top:510px">${sw("tints", TINTS)}</div>
    <div class="grp" style="top:584px">Background</div>
    <div id="bgs" style="position:absolute;left:0;top:622px">${sw("bgs", BGS)}</div>
    <div class="btn" style="top:702px">Back to original</div>
  </div>
  <div id="ripple"></div>
  <svg id="cursor" viewBox="0 0 34 44"><path d="M3 3 L3 36 L12 28 L18 41 L24 38 L18 26 L30 26 Z" fill="#1b1b1f" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>
  <div id="name">Lena · <span>EasyDeutsch</span></div>
</div>
</div>
<script>
window.__timelines = window.__timelines || {};
var tl = gsap.timeline({ paused: true });
tl.set("#cursor",{x:${F(PX + 520)},y:${F(PY + 820)}},0);
${js.join("\n")}
tl.set({}, {}, ${F(S.total)});
window.__timelines["main"] = tl;
window.__toon = { lines: [], hookDur: 0, outroAt: ${F(S.total + 5)}, total: ${F(S.total + 5)}, setting: "none", looks: null };
window.__show = ${JSON.stringify(S)};
</script>
<script type="module" src="public/3d/toon-stage.js"></script>
<script type="module" src="public/3d/toon-showcase.js"></script>
</body></html>`;
}

// render: silent film → music with accents on each control press → MP4
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] || "renders/showcase/lena-character-builder.mp4";
  const HF = "npx --yes hyperframes@0.8.79";
  mkdirSync("compositions/showcase", { recursive: true }); mkdirSync("renders/showcase", { recursive: true });
  const comp = "compositions/showcase/index.html";
  writeFileSync(comp, buildShowcaseHTML());
  if (process.env.SHOW_ONLY_HTML) process.exit(0);
  const silent = "renders/showcase/silent.mp4", music = "renders/showcase/music.m4a";
  execSync(`${HF} render -c "${comp}" --quality high --fps 30 -o "${silent}"`, { stdio: "inherit" });
  const cuts = [SHOW.t.head + 0.3, SHOW.t.legs + 0.3, ...SHOW.tints.map((x) => x.t), ...SHOW.bgs.map((x) => x.t), SHOW.t.close];
  const kinds = ["riser", "riser", "sweep", "sweep", "sweep", "click", "click", "click", "chime"];
  execSync(`node music/make-one.mjs ${SHOW.total} 2 "${music}" 2`, { stdio: "inherit", env: { ...process.env, MUSIC_MOOD: "play",
    MUSIC_CUTS: cuts.map((c) => c.toFixed(3)).join(","), MUSIC_ACCENTS: cuts.map((c, i) => `${c.toFixed(3)}:${kinds[i]}:1`).join(",") } });
  execSync(`ffmpeg -y -v error -i "${silent}" -i "${music}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -af "afade=t=out:st=${SHOW.total - 1.2}:d=1.2" -shortest "${out}"`, { stdio: "inherit" });
  if (!existsSync(out)) throw new Error("the showcase did not render");
  console.log(`showcase: ${out}`);
}
