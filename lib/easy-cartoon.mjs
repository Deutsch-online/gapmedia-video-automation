// EasyDeutsch cartoon film — hand-drawn vector art, animated.
//
// Owner, 2026-09-28: make the EasyDeutsch animation look like the cartoon
// shorts they sent (clean thick outlines, warm colours, cel shading, one
// sentence per shot in a speech bubble, the verb in colour) — built by us, with
// no paid image or video model. Everything here is drawn as SVG paths and moved
// by one paused GSAP timeline: blinks, lip shapes on every syllable, head and
// arm gestures, a prop for the sentence, and a camera that frames each speaker.
import { readFileSync, existsSync } from "node:fs";
import { verbIndex } from "./build-anim.mjs";

const b64 = (p) => readFileSync(p).toString("base64");
const GSAP = readFileSync("public/gsap.min.js", "utf8");
const FONT = existsSync("public/fonts/Vazirmatn-Black.woff2") ? b64("public/fonts/Vazirmatn-Black.woff2") : "";
const LOGO = existsSync("public/brand/easydeutsch-logo.jpg") ? `data:image/jpeg;base64,${b64("public/brand/easydeutsch-logo.jpg")}` : "";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const F = (x) => (+x).toFixed(3);

const INK = "#2B1D16";
const O = `stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const O4 = `stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;

// ------------------------------------------------------------------ the café
function cafe() {
  const planks = Array.from({ length: 9 }, (_, i) => `<path d="M${-60 + i * 150} 1080 L${140 + i * 110} 900" stroke="#A8703F" stroke-width="4"/>`).join("");
  const jars = [0, 1, 2, 3].map((i) => `<g transform="translate(${660 + i * 78} 330)"><rect x="-26" y="-60" width="52" height="60" rx="10" fill="#F6E7C8" ${O4}/><rect x="-26" y="-34" width="52" height="34" rx="8" fill="${["#C8783A", "#E0B25A", "#8E5A3A", "#D96B4A"][i]}"/><rect x="-26" y="-60" width="52" height="60" rx="10" fill="none" ${O4}/><rect x="-18" y="-72" width="36" height="14" rx="5" fill="#7A5236" ${O4}/></g>`).join("");
  const croissant = (x, y) => `<path d="M${x - 34} ${y} q34 -34 68 0 q-10 14 -34 12 q-24 2 -34 -12z" fill="#E8A04A" ${O4}/><path d="M${x - 12} ${y - 14} l6 14 M${x + 10} ${y - 14} l-4 14" stroke="#B8702A" stroke-width="4"/>`;
  const lamp = (x) => `<g class="lamp" transform="translate(${x} 0)"><path d="M0 0 V92" stroke="${INK}" stroke-width="5"/><path d="M-58 150 Q-54 92 0 92 Q54 92 58 150 Z" fill="#E8783A" ${O}/><ellipse cx="0" cy="152" rx="26" ry="10" fill="#FFF3C4" ${O4}/><ellipse class="glow" cx="0" cy="190" rx="120" ry="60" fill="#FFE9A8" opacity=".28"/></g>`;
  return `<g class="bg">
  <rect width="1080" height="1080" fill="#F4E2BE"/>
  <rect y="0" width="1080" height="1080" fill="url(#warm)"/>
  <!-- window with a street outside -->
  <g transform="translate(60 150)">
    <rect width="330" height="380" rx="14" fill="#BFE6F5" ${O}/>
    <rect x="0" y="250" width="330" height="130" fill="#9FD18B"/>
    <path d="M30 250 q40 -70 90 0 M150 250 q50 -90 110 0" fill="#7DBA6A" ${O4}/>
    <circle cx="260" cy="80" r="34" fill="#FFF3A0" ${O4}/>
    <path class="bird" d="M0 0 q10 -12 20 0 q10 -12 20 0" transform="translate(0 100)" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M40 120 q20 -18 44 0 q18 -14 36 4" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>
    <path d="M165 0 V380 M0 190 H330" stroke="#FFFFFF" stroke-width="16"/>
    <rect width="330" height="380" rx="14" fill="none" ${O}/>
    <rect x="-20" y="372" width="370" height="26" rx="8" fill="#FFFFFF" ${O}/>
    <g transform="translate(60 372)"><rect x="-22" y="-44" width="44" height="44" rx="6" fill="#D96B4A" ${O4}/><path d="M0 -44 q-30 -40 -6 -70 q10 30 6 70 q20 -40 40 -50 q-4 34 -40 50" fill="#5FA35A" ${O4}/></g>
  </g>
  <!-- chalkboard menu -->
  <g transform="translate(610 70)">
    <rect x="-14" y="-14" width="408" height="228" rx="14" fill="#8E5A33" ${O}/>
    <rect width="380" height="200" rx="8" fill="#2F4A3A"/>
    <text x="190" y="52" text-anchor="middle" font-family="EasyFont" font-size="40" fill="#F6F1E4">Kaffee · Tee</text>
    <path d="M50 80 h280 M50 130 h200 M50 170 h240" stroke="#F6F1E4" stroke-width="5" stroke-dasharray="14 10" opacity=".55"/>
    <path d="M300 110 q16 0 16 16 q0 16 -16 16" fill="none" stroke="#F6F1E4" stroke-width="5"/><rect x="262" y="104" width="40" height="44" rx="8" fill="none" stroke="#F6F1E4" stroke-width="5"/>
  </g>
  <!-- shelf -->
  <rect x="620" y="330" width="380" height="18" rx="6" fill="#8E5A33" ${O4}/>${jars}
  <g transform="translate(470 250)"><circle r="46" fill="#FFFFFF" ${O}/>${Array.from({ length: 12 }, (_, i) => `<rect x="-2" y="-40" width="4" height="8" fill="${INK}" transform="rotate(${i * 30})"/>`).join("")}<rect class="clk-h" x="-3" y="-24" width="6" height="26" rx="3" fill="${INK}"/><rect class="clk-m" x="-2" y="-36" width="4" height="38" rx="2" fill="${INK}"/><circle r="5" fill="#DD0000"/></g>
  ${lamp(250)}${lamp(560)}${lamp(880)}
  <!-- wainscot and floor -->
  <rect y="640" width="1080" height="260" fill="#B7794A"/>
  ${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 96} 650 V890" stroke="#9C6238" stroke-width="5"/>`).join("")}
  <rect y="630" width="1080" height="22" fill="#8E5A33" ${O4}/>
  <rect y="890" width="1080" height="190" fill="#D29A5E"/>${planks}
  <path d="M0 892 H1080" ${O}/>
  </g>`;
}
// the counter sits in front of the barista
function counter() {
  return `<g class="fg">
  <rect x="560" y="700" width="560" height="400" fill="#9C6238" ${O}/>
  ${Array.from({ length: 6 }, (_, i) => `<path d="M${600 + i * 90} 740 V1080" stroke="#7E4C2A" stroke-width="6"/>`).join("")}
  <rect x="540" y="672" width="600" height="44" rx="10" fill="#6E4226" ${O}/>
  <!-- pastry case -->
  <g transform="translate(900 570)"><rect x="-120" y="0" width="240" height="104" rx="12" fill="#DFF3F8" opacity=".85" ${O}/>
    <path d="M-100 70 h200" stroke="#FFFFFF" stroke-width="6" opacity=".8"/>
    ${[-60, 10, 76].map((x) => `<path d="M${x - 30} 80 q30 -30 60 0 q-8 12 -30 10 q-22 2 -30 -10z" fill="#E8A04A" ${O4}/>`).join("")}
    <rect x="-120" y="0" width="240" height="104" rx="12" fill="none" ${O}/></g>
  <!-- coffee cup -->
  <g transform="translate(640 672)"><path d="M-26 -52 h52 l-6 52 h-40z" fill="#FFFFFF" ${O4}/><path d="M26 -40 q20 0 20 14 q0 14 -22 14" fill="none" ${O4}/><path class="steam" d="M-8 -64 q-10 -14 0 -26 q10 -12 0 -26 M10 -64 q-10 -14 0 -26" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity=".8"/></g>
  </g>`;
}

// ------------------------------------------------------------------ people
// Faces share one construction: eyes with lids (blink = lid scaleY), brows,
// and three mouths (closed, open, round) swapped for the lip-sync.
function eyes(x1, x2, y, iris, cls) {
  const eye = (x) => `<g transform="translate(${x} ${y})"><ellipse rx="19" ry="23" fill="#FFFFFF" ${O4}/><g class="${cls}-iris"><circle cx="2" cy="3" r="10" fill="${iris}"/><circle cx="3" cy="1" r="5" fill="${INK}"/><circle cx="6" cy="-3" r="3" fill="#FFFFFF"/></g></g>`;
  return `${eye(x1)}${eye(x2)}`;
}
function lids(cls, x1, x2, y, skin) {
  const lid = (x) => `<ellipse cx="${x}" cy="${y}" rx="21" ry="25" fill="${skin}" ${O4}/>`;
  return `<g class="${cls}" style="transform-box:fill-box;transform-origin:50% 0%">${lid(x1)}${lid(x2)}</g>`;
}
function mouths(p, x, y) {
  return `<g class="${p}-m0"><path d="M${x - 22} ${y} q22 16 44 0" fill="none" ${O4}/></g>
  <g class="${p}-m1" opacity="0"><path d="M${x - 24} ${y - 4} q24 -6 48 0 q-6 30 -24 30 q-18 0 -24 -30z" fill="#8E2F2F" ${O4}/><path d="M${x - 12} ${y + 18} q12 -8 24 0 q-4 8 -12 8 q-8 0 -12 -8z" fill="#E7777A"/></g>
  <g class="${p}-m2" opacity="0"><ellipse cx="${x}" cy="${y + 6}" rx="13" ry="16" fill="#8E2F2F" ${O4}/></g>`;
}

// Lena: young woman, ponytail, light-blue blouse. Faces right.
function lena() {
  const skin = "#F4C9A4", skinS = "#E2A980", hair = "#7A4A2A", hairS = "#5E3620";
  const arm = (cls, x, sleeve, back, extra = "") => `<g transform="translate(${x} 40)"><g class="${cls}">
      <path d="M-26 0 q-8 80 -4 150 h52 q6 -70 -4 -150z" fill="${sleeve}" ${O}/>
      <g transform="translate(0 145)"><g class="${cls}-f">
        <path d="M-20 0 q-4 70 0 120 h38 q4 -60 0 -120z" fill="${back ? skinS : skin}" ${O}/>
        <g class="${cls}-h"><path d="M-24 116 q-4 44 22 50 q28 2 30 -30 q0 -22 -10 -24z" fill="${back ? skinS : skin}" ${O}/></g>
        ${extra}
      </g></g></g></g>`;
  return `<g class="lena" transform="translate(330 430)">
  <g class="lena-body">
    ${arm("la-b", -78, "#86B5DA", true)}
    <!-- jeans and blouse -->
    <path d="M-100 330 q0 200 10 330 h200 q10 -130 10 -330z" fill="#3D5A80" ${O}/>
    <path d="M0 360 V660" stroke="#2E4766" stroke-width="5"/>
    <path d="M-110 30 q-20 150 -10 320 h240 q10 -170 -10 -320 q-60 -30 -110 -30 q-50 0 -110 30z" fill="#A9D1EE" ${O}/>
    <path d="M60 40 q30 150 20 310 h40 q10 -170 -10 -320z" fill="#86B5DA"/>
    <path d="M-40 0 l40 60 l40 -60" fill="#FFFFFF" ${O4}/>
    <path d="M0 60 V330" stroke="#86B5DA" stroke-width="5"/>${[110, 170, 230, 290].map((y) => `<circle cx="0" cy="${y}" r="6" fill="#FFFFFF" ${O4}/>`).join("")}
    <path d="M-120 330 h250" ${O}/>
    <!-- bag strap -->
    <path d="M-70 10 L90 300" stroke="#8E4A2A" stroke-width="16" stroke-linecap="round"/>
    <g transform="translate(0 -12)"><g class="lena-head">
      <rect x="-24" y="-40" width="48" height="56" fill="${skin}" ${O4}/>
      <path d="M-24 -8 h48" stroke="${skinS}" stroke-width="10"/>
      <!-- ponytail behind -->
      <path class="pony" d="M-90 -210 q-90 20 -80 120 q10 60 -30 90 q70 -10 90 -80 q14 -60 20 -120z" fill="${hair}" ${O}/>
      <path d="M-104 -150 q-100 -120 10 -150 q120 -30 180 60 q30 60 10 100z" fill="${hair}" ${O}/>
      <!-- face -->
      <path d="M-86 -150 q-10 -70 60 -96 q70 -20 110 30 q30 40 24 96 q-6 66 -60 96 q-50 24 -100 -10 q-44 -34 -34 -116z" fill="${skin}" ${O}/>
      <path d="M40 -40 q-30 30 -80 18 q30 34 80 -18z" fill="${skinS}" opacity=".6"/>
      <ellipse cx="-80" cy="-110" rx="16" ry="24" fill="${skin}" ${O4}/>
      <!-- bangs -->
      <path d="M-92 -150 q10 -110 120 -106 q70 4 96 70 q-60 -40 -110 -20 q-30 -40 -60 10 q-20 20 -46 46z" fill="${hair}" ${O}/>
      <path d="M-40 -230 q60 -20 110 20" fill="none" stroke="${hairS}" stroke-width="6"/>
      <path d="M-100 -224 q-10 -20 10 -26 l14 26 z" fill="#E86A7A" ${O4}/>
      ${eyes(-6, 56, -120, "#6B4A2A", "lena")}
      ${lids("lena-lids", -6, 56, -120, skin)}
      <path class="lena-brow" d="M-30 -160 q24 -12 44 -2 M36 -158 q22 -8 40 6" fill="none" stroke="${hairS}" stroke-width="8" stroke-linecap="round"/>
      <path d="M36 -96 q14 18 -4 26" fill="none" ${O4}/>
      <ellipse cx="-22" cy="-74" rx="18" ry="10" fill="#F29A9A" opacity=".55"/><ellipse cx="74" cy="-74" rx="12" ry="9" fill="#F29A9A" opacity=".55"/>
      ${mouths("lena", 30, -52)}
    </g></g>
    ${arm("la-f", 92, "#A9D1EE", false, `<g class="wallet" opacity="0"><g transform="translate(6 168)"><path d="M-46 -30 h92 v60 h-92z" fill="#8E4A2A" ${O}/><path d="M-46 -30 l46 26 l46 -26" fill="#A95C35" ${O4}/><path d="M-16 -46 q-10 -16 4 -24 M10 -48 q10 -16 -4 -24" fill="none" stroke="#B8B0A6" stroke-width="5" stroke-linecap="round"/></g></g>`)}
  </g></g>`;
}

// Herr Braun: the café owner — round glasses, grey moustache, green apron.
function braun() {
  const skin = "#F0C29A", skinS = "#D9A077";
  const arm = (cls, x, front) => `<g transform="translate(${x} 40)"><g class="${cls}">
      <path d="M-28 0 q-10 80 -4 150 h56 q8 -70 -4 -150z" fill="${front ? "#FFFFFF" : "#E4E8EE"}" ${O}/>
      <g transform="translate(0 145)"><g class="${cls}-f">
        <path d="M-22 0 q-4 70 0 120 h42 q4 -60 0 -120z" fill="${front ? skin : skinS}" ${O}/>
        <g class="${cls}-w" opacity="0"><rect x="-26" y="40" width="50" height="22" rx="6" fill="#2F3A48" ${O4}/><circle cx="0" cy="51" r="14" fill="#FFFFFF" ${O4}/></g>
        <g class="${cls}-h"><path d="M-26 116 q-6 46 24 52 q30 2 32 -32 q0 -22 -10 -24z" fill="${front ? skin : skinS}" ${O}/>
          <g class="${cls}-thumb" opacity="0"><path d="M18 118 q10 -40 -4 -56 q-14 4 -12 56z" fill="${skin}" ${O4}/></g></g>
      </g></g></g></g>`;
  return `<g class="braun" transform="translate(790 440)">
  <g class="braun-body">
    ${arm("ba-b", 96, false)}
    <path d="M-120 40 q-20 150 -10 330 h260 q10 -180 -10 -330 q-60 -40 -120 -40 q-60 0 -120 40z" fill="#FFFFFF" ${O}/>
    <path d="M-80 90 q0 140 -6 280 h180 q-6 -140 -6 -280 z" fill="#3E8A5A" ${O}/>
    <path d="M-80 90 q-10 -40 20 -70 M88 90 q10 -40 -20 -70" fill="none" stroke="#2F6E47" stroke-width="10"/>
    <rect x="-30" y="170" width="60" height="44" rx="6" fill="#2F6E47" ${O4}/>
    <path d="M-22 20 l22 34 l22 -34" fill="#C23B3B" ${O4}/>
    <g transform="translate(0 -12)"><g class="braun-head">
      <rect x="-26" y="-40" width="52" height="56" fill="${skin}" ${O4}/>
      <path d="M-90 -140 q-6 -110 90 -112 q96 2 92 112 q0 80 -50 106 q-40 20 -84 0 q-52 -26 -48 -106z" fill="${skin}" ${O}/>
      <path d="M-60 -60 q40 40 90 4 q-20 44 -90 -4z" fill="${skinS}" opacity=".6"/>
      <ellipse cx="92" cy="-120" rx="16" ry="24" fill="${skin}" ${O4}/>
      <path d="M78 -168 q30 -20 24 40 q-8 -20 -24 -40z M-86 -160 q-18 -6 -14 40 q10 -24 14 -40z" fill="#B8B8B8" ${O4}/>
      <path d="M-40 -238 q40 -12 80 0" fill="none" stroke="${skinS}" stroke-width="6"/>
      ${eyes(-44, 16, -124, "#3E5A7A", "braun")}
      ${lids("braun-lids", -44, 16, -124, skin)}
      <g fill="none" stroke="${INK}" stroke-width="6"><circle cx="-44" cy="-124" r="32"/><circle cx="16" cy="-124" r="32"/><path d="M-12 -126 h-0"/><path d="M-14 -128 q-1 -6 0 0"/></g>
      <path d="M-12 -128 q-2 -10 -2 0" stroke="${INK}" stroke-width="6"/>
      <path class="braun-brow" d="M-74 -170 q30 -18 56 -2 M0 -172 q26 -14 50 4" fill="none" stroke="#9A9A9A" stroke-width="12" stroke-linecap="round"/>
      <path d="M-26 -96 q-20 26 4 30" fill="none" ${O4}/>
      ${mouths("braun", -14, -46)}
      <path d="M-58 -64 q44 -24 88 0 q-20 18 -44 8 q-24 10 -44 -8z" fill="#C9C9C9" ${O4}/>
    </g></g>
    ${arm("ba-f", -104, true)}
  </g></g>`;
}

// ------------------------------------------------------------------ film
/**
 * lines: [{ who: "lena"|"braun", de, action, t, dur, again? }]
 *   t/dur: when the line is spoken (s); again: a second saying for the learner
 */
export function buildEasyCartoonHTML(a) {
  const TOTAL = +a.total.toFixed(3);
  const js = [];
  const set = (sel, v, t) => js.push(`tl.set("${sel}",${v},${F(t)});`);
  const to = (sel, v, t) => js.push(`tl.to("${sel}",${v},${F(t)});`);
  const fromTo = (sel, a1, b1, t) => js.push(`tl.fromTo("${sel}",${a1},${b1},${F(t)});`);

  // ambient life: blinks, breathing, steam, lamp glow — finite and seekable
  const blinks = (who, off) => { for (let t = 0.8 + off; t < TOTAL - 0.3; t += 2.6 + ((t * 7) % 1.4)) { fromTo(`.${who}-lids`, `{scaleY:0}`, `{scaleY:1,duration:.07,yoyo:true,repeat:1,ease:"power1.inOut",immediateRender:false}`, t); } };
  set(".lena-lids, .braun-lids", `{scaleY:0,transformOrigin:"50% 0%"}`, 0);
  blinks("lena", 0); blinks("braun", 1.1);
  const reps = (d) => Math.max(0, Math.floor(TOTAL / d) - 1);
  fromTo(".lena-body", `{y:0}`, `{y:-6,duration:1.7,repeat:${reps(1.7)},yoyo:true,ease:"sine.inOut"}`, 0);
  fromTo(".braun-body", `{y:0}`, `{y:-5,duration:2.1,repeat:${reps(2.1)},yoyo:true,ease:"sine.inOut"}`, 0.4);
  fromTo(".pony", `{rotation:-3,svgOrigin:"-90 -200"}`, `{rotation:4,svgOrigin:"-90 -200",duration:1.3,repeat:${reps(1.3)},yoyo:true,ease:"sine.inOut"}`, 0);
  fromTo(".steam", `{y:0,opacity:.8}`, `{y:-18,opacity:.2,duration:1.6,repeat:${reps(1.6)},ease:"none"}`, 0);
  fromTo(".glow", `{opacity:.22}`, `{opacity:.36,duration:2.4,repeat:${reps(2.4)},yoyo:true,ease:"sine.inOut"}`, 0);

  fromTo(".clk-m", `{rotation:0,svgOrigin:"470 250"}`, `{rotation:720,svgOrigin:"470 250",duration:${F(TOTAL)},ease:"none"}`, 0);
  fromTo(".clk-h", `{rotation:0,svgOrigin:"470 250"}`, `{rotation:60,svgOrigin:"470 250",duration:${F(TOTAL)},ease:"none"}`, 0);
  fromTo(".bird", `{x:-40}`, `{x:340,duration:7,repeat:${reps(7)},ease:"none"}`, 0);
  set(".lena-iris", `{x:2}`, 0); set(".braun-iris", `{x:-6}`, 0);
  // lip-sync: a new mouth shape every syllable while a line is spoken
  const lips = (who, t0, dur, text) => {
    const vowels = String(text).toLowerCase().match(/[aeiouäöü]+/g) || ["a"];
    const step = dur / vowels.length;
    vowels.forEach((v, i) => {
      const shape = /[ouöü]/.test(v) ? 2 : 1, t = t0 + i * step;
      set(`.${who}-m0`, `{opacity:0}`, t); set(`.${who}-m${shape}`, `{opacity:1}`, t); set(`.${who}-m${3 - shape}`, `{opacity:0}`, t);
      set(`.${who}-m${shape}`, `{opacity:0}`, t + step * 0.62); set(`.${who}-m0`, `{opacity:1}`, t + step * 0.62);
    });
  };
  // talking also moves the head a little, on the beat of the words
  const nodTalk = (who, t0, dur) => fromTo(`.${who}-head`, `{rotation:0,svgOrigin:"0 0"}`, `{rotation:${who === "lena" ? 3 : -3},svgOrigin:"0 0",duration:${F(Math.max(0.2, dur / 4))},repeat:3,yoyo:true,ease:"sine.inOut",immediateRender:false}`, t0);

  // the speaker's free arm explains along with the words; the listener looks, nods, raises a brow
  const other = (w) => (w === "lena" ? "braun" : "lena");
  const backArm = (w) => (w === "lena" ? ".la-b" : ".ba-b");
  const explain = (w, t, dur) => {
    const k = w === "lena" ? -1 : 1;
    to(backArm(w), `{rotation:${20 * k},svgOrigin:"0 0",duration:.3,ease:"power2.out"}`, t);
    fromTo(backArm(w), `{rotation:${14 * k},svgOrigin:"0 0"}`, `{rotation:${34 * k},svgOrigin:"0 0",duration:.42,repeat:${Math.max(1, Math.floor(dur / .42) - 1)},yoyo:true,ease:"sine.inOut",immediateRender:false}`, t + 0.3);
    to(backArm(w), `{rotation:0,svgOrigin:"0 0",duration:.4,ease:"power2.inOut"}`, t + dur + 0.05);
  };
  const react = (w, t, dur) => {
    const k = w === "lena" ? 1 : -1;
    to(`.${w}-iris`, `{x:${w === "lena" ? 9 : -14},duration:.25}`, t - 0.1);
    fromTo(`.${w}-head`, `{rotation:0,svgOrigin:"0 0"}`, `{rotation:${5 * k},svgOrigin:"0 0",duration:.28,repeat:1,yoyo:true,ease:"sine.inOut",immediateRender:false}`, t + dur * 0.55);
    to(`.${w}-brow`, `{y:-5,duration:.25}`, t + dur * 0.3); to(`.${w}-brow`, `{y:0,duration:.3}`, t + dur + 0.2);
    to(`.${w}-iris`, `{x:${w === "lena" ? 2 : -6},duration:.3}`, t + dur + 0.3);
  };
  // gestures (angles in degrees about the shoulder / elbow)
  const pose = (sel, rot, t, d = 0.45, ease = "back.out(1.6)") => to(sel, `{rotation:${rot},svgOrigin:"0 0",duration:${d},ease:"${ease}"}`, t);
  const ACT = {
    wallet: (t, end) => { pose(".la-f", -58, t); pose(".la-f-f", -70, t); to(".wallet", `{opacity:1,duration:.25}`, t + 0.25); fromTo(".wallet", `{rotation:-8,svgOrigin:"0 0"}`, `{rotation:8,svgOrigin:"0 0",duration:.5,repeat:3,yoyo:true,ease:"sine.inOut",immediateRender:false}`, t + 0.3); to(".lena-brow", `{y:-6,duration:.3}`, t); to(".wallet", `{opacity:0,duration:.25}`, end - 0.3); pose(".la-f", 0, end - 0.3); pose(".la-f-f", 0, end - 0.3); to(".lena-brow", `{y:0,duration:.3}`, end - 0.3); },
    watch: (t, end) => { pose(".ba-f", 35, t); pose(".ba-f-f", 110, t); to(".ba-f-w", `{opacity:1,duration:.2}`, t); to(".braun-head", `{rotation:-12,svgOrigin:"0 0",duration:.4}`, t + 0.2); to(".braun-head", `{rotation:0,svgOrigin:"0 0",duration:.4}`, end - 0.5); pose(".ba-f", 0, end - 0.3); pose(".ba-f-f", 0, end - 0.3); to(".ba-f-w", `{opacity:0,duration:.2}`, end); },
    thumbs: (t, end) => { pose(".ba-f", 30, t); pose(".ba-f-f", 120, t); to(".ba-f-thumb", `{opacity:1,duration:.15}`, t + 0.2); fromTo(".ba-f-f", `{rotation:120,svgOrigin:"0 0"}`, `{rotation:108,svgOrigin:"0 0",duration:.3,repeat:3,yoyo:true,immediateRender:false}`, t + 0.5); to(".ba-f-thumb", `{opacity:0,duration:.15}`, end - 0.3); pose(".ba-f", 0, end - 0.3); pose(".ba-f-f", 0, end - 0.3); },
    chest: (t, end) => { pose(".la-f", -30, t); pose(".la-f-f", -125, t); to(".lena-head", `{rotation:-8,svgOrigin:"0 0",duration:.4}`, t + 0.1); to(".lena-head", `{rotation:0,svgOrigin:"0 0",duration:.4}`, end - 0.4); pose(".la-f", 0, end - 0.3); pose(".la-f-f", 0, end - 0.3); },
    // a friendly hello: upper arm out to the side, forearm up at head height, the hand waggles
    wave: (t, end, who) => { const s = who === "lena" ? ".la-f" : ".ba-f", k = who === "lena" ? -1 : 1; pose(s, 62 * k, t); pose(`${s}-f`, 105 * k, t); fromTo(`${s}-f`, `{rotation:${85 * k},svgOrigin:"0 0"}`, `{rotation:${125 * k},svgOrigin:"0 0",duration:.24,repeat:5,yoyo:true,ease:"sine.inOut",immediateRender:false}`, t + 0.45); pose(s, 0, end - 0.3); pose(`${s}-f`, 0, end - 0.3); },
    point: (t, end, who) => { const s = who === "lena" ? ".la-f" : ".ba-f", k = who === "lena" ? -1 : 1; pose(s, 70 * k, t); pose(`${s}-f`, 20 * k, t); pose(s, 0, end - 0.3); pose(`${s}-f`, 0, end - 0.3); },
    none: () => {},
  };

  // camera: each speaker framed in turn, a wide shot between
  const cam = (t, s, x, y, d = 0.6) => to(".cam", `{scale:${s},x:${x},y:${y},svgOrigin:"540 540",duration:${d},ease:"power2.inOut"}`, t);
  set(".cam", `{scale:1,x:0,y:0,svgOrigin:"540 540"}`, 0);

  // the words appear in the caption card under the picture, never over a face
  // dialogue lessons: German line + Persian subtitle; the narrator's card is English + Persian
  const faSub = (fa) => (fa ? `<div class="fa" dir="rtl">${esc(fa)}</div>` : "");
  const caps = a.lines.map((l, i) => {
    // the English card, and the Persian on its own box further down (owner, 2026-10-03)
    if (l.who === "narrator") return `<div id="cap${i}" class="explain"><div class="cap sub en"><div class="ci"><div class="tag">💡 English</div>${esc(l.en)}</div></div>${l.fa ? `<div class="fabox" dir="rtl">${esc(l.fa)}</div>` : ""}</div>`;
    const v = verbIndex(l.de);
    const words = String(l.de).split(/\s+/).map((w, k) => `<span class="${k === v ? "verb" : ""}">${esc(w)}</span>`).join(" ");
    if (a.dialogue) {
      // the lesson's phrase is marked in red inside the dialogue line
      const de = String(l.de), k = l.hl ? de.toLowerCase().indexOf(String(l.hl).toLowerCase().replace(/[.!?]+$/, "")) : -1;
      const len = k >= 0 ? String(l.hl).replace(/[.!?]+$/, "").length : 0;
      const marked = l.key ? `<span class="verb">${esc(de)}</span>` : k >= 0 ? `${esc(de.slice(0, k))}<span class="verb">${esc(de.slice(k, k + len))}</span>${esc(de.slice(k + len))}` : esc(de);
      return `<div id="cap${i}" class="cap sub${l.key ? " key" : ""}"><div class="ci">${l.who === "lena" ? "<b class=\"who wl\">Lena</b>" : "<b class=\"who wb\">Herr Braun</b>"}<div class="de">${marked}</div>${faSub(l.fa)}</div></div>`;
    }
    return `<div id="cap${i}" class="cap${String(l.de).length > 24 ? " long" : ""}"><div class="ci">${words}</div></div>`;
  }).join("\n");
  a.lines.forEach((l, i) => {
    if (l.who === "narrator") {
      fromTo(`#cap${i}`, `{opacity:0,y:24}`, `{opacity:1,y:0,duration:.35,ease:"power3.out",immediateRender:false}`, l.t - 0.2);
      to(`#cap${i}`, `{opacity:0,duration:.2}`, (a.lines[i + 1]?.t ?? a.outroAt) - 0.35);
      return;
    }
    if (l.pause) { set("#rep", `{opacity:1}`, l.t + l.dur + 0.05); set("#rep", `{opacity:0}`, l.t + l.dur + l.pause); }
    const end = l.t + l.dur + (l.again ? l.again.dur + l.again.gap : 0) + 0.5;
    fromTo(`#cap${i}`, `{opacity:0,y:24}`, `{opacity:1,y:0,duration:.35,ease:"power3.out",immediateRender:false}`, l.t - 0.2);
    to(`#cap${i}`, `{opacity:0,duration:.2}`, (a.lines[i + 1]?.t ?? a.outroAt) - 0.35);
    lips(l.who, l.t, l.dur, l.de); nodTalk(l.who, l.t, l.dur);
    explain(l.who, l.t, l.dur + (l.again ? l.again.dur + l.again.gap : 0)); react(other(l.who), l.t, l.dur);
    to(`.${l.who}-brow`, `{y:-6,duration:.2}`, l.t); to(`.${l.who}-brow`, `{y:0,duration:.3}`, l.t + l.dur);
    if (l.again) { lips(l.who, l.t + l.dur + l.again.gap, l.again.dur, l.de); set("#rep", `{opacity:1}`, l.t + l.dur + l.again.gap - 0.2); set("#rep", `{opacity:0}`, l.t + l.dur + l.again.gap + l.again.dur + 0.2); }
    (ACT[l.action] || ACT.none)(l.t - 0.2, end, l.who);
    if (l.who === "lena") cam(l.t - 0.5, 1.28, 150, 40); else cam(l.t - 0.5, 1.28, -180, 30);
    if ((l.item ?? i) >= 0) set(".dot" + (l.item ?? i), `{background:"#DD0000",scale:1.25}`, l.t - 0.3);
  });
  cam(a.outroAt, 1, 0, 0);
  // hello and goodbye
  ACT.wave(0.6, a.hookDur - 0.2, "braun"); ACT.wave(1.0, a.hookDur, "lena");
  lips("braun", 0.9, 0.7, "Hallo"); lips("lena", 1.5, 0.7, "Hallo");
  fromTo("#hi", `{opacity:0,y:24}`, `{opacity:1,y:0,duration:.35,ease:"power3.out"}`, 0.5); to("#hi", `{opacity:0,duration:.2}`, a.hookDur - 0.3);
  ACT.wave(a.outroAt + 0.3, TOTAL - 0.4, "lena"); ACT.wave(a.outroAt + 0.5, TOTAL - 0.4, "braun");
  lips("lena", a.outroAt + 0.5, 0.8, "Tschüss"); lips("braun", a.outroAt + 1.0, 0.8, "Tschüss");
  fromTo("#bye", `{opacity:0,y:24}`, `{opacity:1,y:0,duration:.35,ease:"power3.out",immediateRender:false}`, a.outroAt + 0.3);
  fromTo("#title", `{opacity:0,y:30}`, `{opacity:1,y:0,duration:.5,ease:"back.out(1.8)"}`, 0.1);

  // a picture of the word (owner, 2026-09-29: "show the table, not only the caption"):
  // a photo card at the top right of the picture while its word is taught
  const pics = (a.pics || []).filter((p) => p && p.src);
  pics.forEach((p, i) => {
    fromTo(`#pic${i}`, `{opacity:0,scale:.6,rotation:-8}`, `{opacity:1,scale:1,rotation:3,duration:.45,ease:"back.out(2)",immediateRender:false}`, p.t0);
    to(`#pic${i}`, `{opacity:0,scale:.85,duration:.25,ease:"power2.in"}`, p.t1 - 0.25);
  });
  const picHTML = pics.map((p, i) => `<div id="pic${i}" class="pic"><img src="${p.src}" alt="${esc(p.label)}"/><div class="pl">${esc(p.label)}</div></div>`).join("");
  const n = a.lines.length;
  // "three": the same film with the 3D toon characters (public/3d/toon-stage.js)
  const THREE = Boolean(a.three);
  const stageSvg = THREE
    ? `<canvas id="three-stage" width="1080" height="1080" style="display:block;width:1080px;height:1080px"></canvas>`
    : `<svg viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="warm" cx="50%" cy="20%" r="80%"><stop offset="0" stop-color="#FFF6DC" stop-opacity=".9"/><stop offset="1" stop-color="#E9C99A" stop-opacity=".4"/></radialGradient></defs>
    <g class="cam">${cafe()}${braun()}${counter()}${lena()}</g>
  </svg>`;
  const keep = THREE ? js.filter((l) => /#cap|#hi|#bye|#rep|\.dot|#title|#pic/.test(l)) : js;
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1920">
<style>
${FONT ? `@font-face{font-family:"EasyFont";font-weight:900;src:url(data:font/woff2;base64,${FONT}) format("woff2");}` : ""}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;background:#FFF7E6;overflow:hidden}
#root{position:relative;width:1080px;height:1920px;background:#FFF7E6;font-family:"EasyFont",Arial,sans-serif;overflow:hidden}
.top{position:absolute;left:0;right:0;top:0;height:250px;display:flex;align-items:center;gap:28px;padding:0 48px;background:linear-gradient(#FFFFFF,#FFF7E6)}
.top img{width:200px;height:200px;border-radius:50%;box-shadow:0 6px 16px rgba(0,0,0,.18)}
.top .t1{font-size:34px;color:#B8860B}.top .t2{font-size:56px;color:#1A1A1A;line-height:1.1}
.stage{position:absolute;left:0;top:260px;width:1080px;height:1080px;overflow:hidden;border-top:8px solid #1A1A1A;border-bottom:8px solid #FFCE00}
.stage svg{display:block;width:1080px;height:1080px}
.verb{color:#DD0000}
.pic{position:absolute;left:704px;top:296px;width:344px;padding:14px 14px 0;background:#FFFFFF;border:6px solid #1A1A1A;border-radius:26px;box-shadow:0 10px 0 #FFCE00;opacity:0;transform-origin:50% 100%;z-index:5}
.pic img{display:block;width:304px;height:304px;object-fit:cover;border-radius:14px}
.pic .pl{height:70px;display:flex;align-items:center;justify-content:center;font-size:40px;color:#1A1A1A;white-space:nowrap;overflow:hidden}

#rep{position:absolute;left:50%;top:1250px;transform:translateX(-50%);padding:18px 40px;border-radius:999px;background:#1A1A1A;color:#FFCE00;font-size:46px;opacity:0;white-space:nowrap}
.cap{position:absolute;left:44px;right:44px;top:1370px;height:190px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:82px;line-height:1.1;color:#1A1A1A;background:#FFFFFF;border:6px solid #1A1A1A;border-radius:38px;box-shadow:0 10px 0 #FFCE00;opacity:0;padding:0 26px}
.cap.long{font-size:60px}
.cap small{display:block;margin-top:8px;font-size:38px;color:#DD0000}
.vig{position:absolute;left:0;top:0;width:1080px;height:1080px;pointer-events:none}
.dots{position:absolute;left:0;right:0;top:1590px;display:flex;justify-content:center;gap:26px}
.dot{width:34px;height:34px;border-radius:50%;background:#E4D6B8;border:4px solid ${INK}}
.cap.sub{height:auto;min-height:190px;padding:20px 30px 22px;flex-direction:column;font-size:60px;line-height:1.12}
.cap.sub .ci{width:100%}
.cap.sub .who{display:block;font-size:30px;letter-spacing:.04em;margin-bottom:4px}
.cap.sub .wl{color:#3D5A80}.cap.sub .wb{color:#3E8A5A}
.cap.sub .fa{margin-top:10px;font-size:42px;line-height:1.35;color:#5C4B3A;font-family:"EasyFont",Tahoma,sans-serif}
.cap.sub.key{background:#FFF4C2}
.cap.sub.en{border-color:#2F6BD8;box-shadow:0 10px 0 #9CC3FF;font-size:44px;color:#16325C}
.cap.sub.en .tag{font-size:28px;color:#2F6BD8;margin-bottom:6px;letter-spacing:.05em}
.explain{position:absolute;left:44px;right:44px;top:1350px;display:flex;flex-direction:column;gap:30px;opacity:0}
.explain .cap{position:static;opacity:1;min-height:0}
.fabox{align-self:center;max-width:100%;padding:14px 30px;border-radius:24px;background:#3B2F25;color:#FFF7E6;font-size:40px;line-height:1.45;text-align:center;font-family:"EasyFont",Tahoma,sans-serif}
${a.dialogue ? ".dots{display:none}" : ""}
</style>
<script>${GSAP}</script>
${THREE ? `<script type="importmap">{"imports":{"three":"./public/3d/vendor/three.module.js","three/addons/":"./public/3d/vendor/jsm/"}}</script>` : ""}
</head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${F(TOTAL)}">
<div id="film" class="clip" data-start="0" data-duration="${F(TOTAL)}" data-track-index="1">
  <div class="top"><img src="${LOGO}" alt="EasyDeutsch"/><div id="title"><div class="t1">A1 · ${esc(a.episodeNo)}</div><div class="t2">${esc(a.title)}</div></div></div>
  <div class="stage">${stageSvg}
  <svg class="vig" viewBox="0 0 1080 1080"><defs><radialGradient id="vg" cx="50%" cy="46%" r="70%"><stop offset=".55" stop-color="#3A1E0A" stop-opacity="0"/><stop offset="1" stop-color="#3A1E0A" stop-opacity=".38"/></radialGradient></defs><rect width="1080" height="1080" fill="url(#vg)"/></svg>
  </div>
  ${picHTML}
  ${caps}
  ${a.dialogue ? "" : `<div id="hi" class="cap${String(a.hook || "").length > 22 ? " long" : ""}"><div class="ci">${esc(a.hook || "Hallo!")}</div></div>`}<div id="bye" class="cap${a.dialogue ? " sub" : ""}"><div class="ci">${a.dialogue ? `<div class="de">${esc(a.outroText || "Tschüss!")}</div>${faSub(a.outroFa)}` : esc(a.outroText || "Tschüss!")}${a.nextTitle ? `<small>Nächstes Mal: ${esc(a.nextTitle)}</small>` : ""}</div></div>
  <div id="rep">🎙 Sprich nach!</div>
  <div class="dots">${Array.from({ length: Math.max(...a.lines.map((l, i) => l.item ?? i)) + 1 }, (_, i) => `<div class="dot dot${i}"></div>`).join("")}</div>
</div>
</div>
<script>
window.__timelines = window.__timelines || {};
var tl = gsap.timeline({ paused: true });
${keep.join("\n")}
tl.set({}, {}, ${F(TOTAL)});
window.__timelines["main"] = tl;
${THREE ? `window.__toon = ${JSON.stringify({ lines: a.lines.filter((l) => l.who === "lena" || l.who === "braun"), dialogue: Boolean(a.dialogue), hookDur: a.hookDur, outroAt: a.outroAt, total: TOTAL, setting: a.setting || "cafe", looks: a.looks || null, vary: { seed: Number(a.episodeNo) || 0 } })};` : ""}
</script>
${THREE ? `<script type="module" src="public/3d/${a.cast === "human" ? "human-stage" : "toon-stage"}.js"></script>` : ""}
</body></html>`;
}

// Which gesture fits a sentence — from its words, never guessed: money shows the
// wallet, time the watch, "kein Problem" a thumbs-up, "ich bin/heiße/spreche" a
// hand on the chest, a question a pointing hand.
export function actionFor(de) {
  const t = String(de).toLowerCase();
  if (/geld|euro|kaufen|bezahl|kosten/.test(t)) return "wallet";
  if (/zeit|uhr|spät|wann|minute|stunde/.test(t)) return "watch";
  if (/problem|gut\b|super|danke|bitte|ja\b|okay|prima/.test(t) && !/nicht gut/.test(t)) return "thumbs";
  if (/\bich (bin|heiße|spreche|komme|wohne|habe)\b|mein|meine/.test(t)) return "chest";
  if (/\?\s*$/.test(t)) return "point";
  return "none";
}
