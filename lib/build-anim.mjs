// "Animated counter" builder — an illustrated, fully animated take on a German
// A1 lesson, built on the owner's request of 2026-09-27 ("a different,
// animated video of today's lesson").
//
// The ink builder is photo-led: one real photo per phrase, editorial layout.
// This one draws the lesson's own situation instead — a German public office:
// the waiting-number board, the counter window, the clerk behind the glass and
// the visitor in front of it — and every phrase is acted out on that stage:
// the appointment slip goes across the desk, the ID card is scanned, the form
// makes the visitor frown, the clerk walks through it line by line.
//
// Rules this keeps (PROJECT_RULES.md / VIDEO_CREATIVE_PROMPT.md):
// - each scene's main motion IS the phrase's action; a secondary reaction
//   (clerk nod, check mark, question marks, light bulb) and one quiet ambient
//   motion (LED blink / light on the glass) — never more than three at once;
// - text appears on the voice's own beats (German, example, Persian), so
//   nothing is shown before it is said and every line lands before the cut;
// - the two formats are two designs, not a recolour: TikTok is a night-shift
//   counter with the stage on top and a roller-shutter cut, Instagram a
//   daylight office with the card on top and a paper-sheet wipe;
// - deterministic: no clocks, no randomness, one paused timeline.
import { readFileSync } from "node:fs";

const b64 = (p) => readFileSync(p).toString("base64");
const FONT_FACES = [[500, "Medium"], [700, "Bold"], [800, "ExtraBold"], [900, "Black"]]
  .map(([w, n]) => `@font-face{font-family:"Vazirmatn";font-weight:${w};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b64(`public/fonts/Vazirmatn-${n}.woff2`)}) format("woff2");}`)
  .join("\n");
// public/fonts/BalooBhaijaan2-ExtraBold.woff2 is an Arabic-only subset (no
// Latin glyphs, checked with fontTools), so every German word — in the card
// and in the drawings — is set in Vazirmatn, which carries Latin and umlauts.
const GSAP = readFileSync("public/gsap.min.js", "utf8");

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const faDigits = (s) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

export const ANIM_VARIANTS = {
  tiktok: {
    // night shift: deep institutional blue, amber LED board, TikTok's own
    // cyan/pink only as the "action" colour
    bg: "#0E1726", wall: "#17263D", wallLine: "#1F3352", floor: "#0B1220",
    desk: "#2B3F5E", deskTop: "#3C5680", glass: "#9FD8E8", glassA: 0.16, frame: "#5B7396",
    led: "#FFB02E", ledBg: "#1A0F02", clerkShirt: "#25F4EE", clerkSkin: "#E8B48A", clerkHair: "#2A1B12",
    visHair: "#101010", visSkin: "#C98B62", visShirt: "#FE2C55",
    paper: "#F6F3EA", ink: "#1C2533", accent: "#25F4EE", accent2: "#FE2C55", ok: "#3DDC84", warm: "#FE2C55", loopColor: "#FE2C55",
    cardBg: "#0A111D", cardLine: "#25F4EE", deColor: "#FFB02E", faColor: "#FFFFFF", subColor: "#A9B8CF",
    headColor: "#E6EEF9", layout: "stage-top", cut: "shutter",
  },
  instagram: {
    // daylight Bürgeramt: warm paper walls, steel-blue counter, Instagram's
    // purple→orange only on the action highlights
    bg: "#F5EFE6", wall: "#EADFCC", wallLine: "#DDCDB4", floor: "#D9C7AA",
    desk: "#3E5C76", deskTop: "#5A7A96", glass: "#CFE7F2", glassA: 0.55, frame: "#8FA3B5",
    led: "#F0506E", ledBg: "#1E161C", clerkShirt: "#833AB4", clerkSkin: "#F0C29C", clerkHair: "#6B3F24",
    visHair: "#3A2A1E", visSkin: "#B97A55", visShirt: "#F77737",
    paper: "#FFFFFF", ink: "#2A2433", accent: "#833AB4", accent2: "#F77737", ok: "#1FA971", warm: "#C2410C", loopColor: "#833AB4",
    cardBg: "#FFFFFF", cardLine: "#833AB4", deColor: "#6A1FA0", faColor: "#1D1A24", subColor: "#5C5566",
    headColor: "#3B3345", layout: "card-top", cut: "sheet",
  },
};

// ---------------------------------------------------------------- the stage
// One office, drawn once per scene. `props` decides what is on the desk.
function stage(sid, P, props) {
  const c = (n) => `${sid}-${n}`;
  return `<svg class="stage-svg" viewBox="0 0 1080 780" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect width="1080" height="780" fill="${P.wall}"/>
  ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="0" y="${70 + i * 78}" width="1080" height="2" fill="${P.wallLine}"/>`).join("")}
  <rect y="610" width="1080" height="170" fill="${P.floor}"/>
  <!-- waiting-number board -->
  <g class="board">
    <rect x="40" y="50" width="300" height="170" rx="16" fill="${P.ledBg}"/>
    <rect x="40" y="50" width="300" height="170" rx="16" fill="none" stroke="${P.frame}" stroke-width="5"/>
    ${props.message
      ? `<g class="board-num"><text x="190" y="170" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="58" fill="${P.led}">${esc(props.message)}</text></g>`
      : `<text x="62" y="88" font-family="Vazirmatn" font-weight="900" font-size="22" fill="${P.led}">NUMMER</text>
    <text x="318" y="88" text-anchor="end" font-family="Vazirmatn" font-weight="900" font-size="22" fill="${P.led}">SCHALTER</text>
    <g class="board-num"><text x="62" y="176" font-family="Vazirmatn" font-weight="900" font-size="58" fill="${P.led}">${esc(props.board || "A040")}</text></g>
    <text x="318" y="176" text-anchor="end" font-family="Vazirmatn" font-weight="900" font-size="58" fill="${P.led}">3</text>`}
    <circle class="board-dot" cx="190" cy="80" r="8" fill="${P.led}"/>
  </g>
  <!-- wall clock -->
  <g class="clock">
    <circle cx="960" cy="128" r="66" fill="${P.paper}" stroke="${P.frame}" stroke-width="8"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => { const a = i * Math.PI / 6; return `<rect x="${(957 + Math.sin(a) * 52).toFixed(1)}" y="${(122 - Math.cos(a) * 52).toFixed(1)}" width="6" height="12" rx="3" fill="${P.ink}" opacity=".5" transform="rotate(${i * 30} ${(960 + Math.sin(a) * 52).toFixed(1)} ${(128 - Math.cos(a) * 52).toFixed(1)})"/>`; }).join("")}
    <rect class="clock-h" x="956" y="96" width="8" height="36" rx="4" fill="${P.ink}"/>
    <rect class="clock-m" x="957" y="78" width="6" height="54" rx="3" fill="${P.ink}"/>
    <rect class="clock-s" x="959" y="72" width="2" height="60" fill="${P.accent2}"/>
    <circle cx="960" cy="128" r="7" fill="${P.ink}"/>
  </g>
  <!-- counter window with the clerk -->
  <rect x="352" y="96" width="420" height="44" rx="10" fill="${P.desk}"/>
  <text x="562" y="128" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="30" fill="#FFFFFF">SCHALTER 3</text>
  <rect x="352" y="146" width="420" height="390" rx="18" fill="${P.wallLine}"/>
  <g class="clerk">
    <path d="M430 536 q0 -150 132 -150 q132 0 132 150 z" fill="${P.clerkShirt}"/>
    <g class="clerk-arm"><path d="M650 450 q70 30 60 86" stroke="${P.clerkShirt}" stroke-width="34" stroke-linecap="round" fill="none"/><circle cx="708" cy="536" r="18" fill="${P.clerkSkin}"/></g>
    <g class="clerk-head">
      <rect x="546" y="340" width="32" height="40" fill="${P.clerkSkin}"/>
      <circle cx="562" cy="296" r="62" fill="${P.clerkSkin}"/>
      <path d="M500 290 q4 -72 62 -72 q60 0 64 70 q-22 -34 -64 -38 q-40 4 -62 40 z" fill="${P.clerkHair}"/>
      <circle cx="540" cy="300" r="7" fill="${P.ink}"/><circle cx="584" cy="300" r="7" fill="${P.ink}"/>
      <rect x="524" y="288" width="34" height="24" rx="8" fill="none" stroke="${P.ink}" stroke-width="4"/>
      <rect x="568" y="288" width="34" height="24" rx="8" fill="none" stroke="${P.ink}" stroke-width="4"/>
      <path class="clerk-mouth" d="M546 330 q16 12 32 0" stroke="${P.ink}" stroke-width="5" stroke-linecap="round" fill="none"/>
    </g>
  </g>
  <rect x="352" y="146" width="420" height="390" rx="18" fill="${P.glass}" opacity="${P.glassA}"/>
  <rect class="glint" x="380" y="160" width="46" height="360" fill="#FFFFFF" opacity=".18" transform="skewX(-12)"/>
  <rect x="352" y="146" width="420" height="390" rx="18" fill="none" stroke="${P.frame}" stroke-width="10"/>
  <!-- desk -->
  <rect x="0" y="536" width="1080" height="96" fill="${P.desk}"/>
  <rect x="0" y="528" width="1080" height="16" rx="4" fill="${P.deskTop}"/>
  ${props.desk || ""}
  <!-- visitor, seen from behind -->
  <g class="visitor">
    <path d="M40 780 q0 -170 170 -170 q170 0 170 170 z" fill="${P.visShirt}"/>
    <g class="vis-arm">${props.arm || `<path d="M330 700 q40 -20 60 -70" stroke="${P.visShirt}" stroke-width="40" stroke-linecap="round" fill="none"/><circle cx="392" cy="624" r="22" fill="${P.visSkin}"/>`}</g>
    <g class="vis-head">
      <rect x="186" y="570" width="48" height="50" fill="${P.visSkin}"/>
      <circle cx="210" cy="530" r="84" fill="${P.visHair}"/>
      <ellipse cx="128" cy="540" rx="14" ry="22" fill="${P.visSkin}"/>
      <ellipse cx="292" cy="540" rx="14" ry="22" fill="${P.visSkin}"/>
    </g>
  </g>
  ${props.over || ""}
</svg>`;
}

// ------------------------------------------------------------ desk props
function slip(P) {
  return `<g class="prop slip"><rect x="0" y="0" width="230" height="160" rx="12" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>
    <text x="115" y="46" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="30" fill="${P.ink}">TERMIN</text>
    <text x="115" y="134" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="44" fill="${P.warm}">10:00</text></g>`;
}
function idCard(P) {
  return `<g class="prop idcard"><rect x="0" y="0" width="260" height="160" rx="16" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>
    <rect x="0" y="0" width="260" height="40" rx="16" fill="${P.accent}"/><rect x="0" y="24" width="260" height="16" fill="${P.accent}"/>
    <text x="130" y="30" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="26" fill="#FFFFFF">AUSWEIS</text>
    <rect x="20" y="56" width="70" height="86" rx="8" fill="${P.wallLine}"/><circle cx="55" cy="86" r="18" fill="${P.frame}"/><path d="M28 140 q27 -34 54 0 z" fill="${P.frame}"/>
    <rect x="108" y="64" width="130" height="12" rx="6" fill="${P.ink}" opacity=".7"/><rect x="108" y="92" width="100" height="12" rx="6" fill="${P.ink}" opacity=".45"/><rect x="108" y="120" width="120" height="12" rx="6" fill="${P.ink}" opacity=".45"/>
    <rect class="scan" x="-30" y="-6" width="20" height="172" fill="${P.ok}" opacity="0"/></g>`;
}
function form(P, highlight) {
  const rows = [0, 1, 2, 3, 4];
  return `<g class="prop form"><rect x="0" y="0" width="300" height="360" rx="10" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>
    <text x="150" y="50" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="34" fill="${P.ink}">FORMULAR</text>
    ${rows.map((i) => `${highlight ? `<rect class="hl hl${i}" x="24" y="${86 + i * 56}" width="252" height="34" rx="6" fill="${P.accent2}" opacity=".35"/>` : ""}<g class="fline fl${i}"><rect x="30" y="${96 + i * 56}" width="${[200, 240, 170, 220, 150][i]}" height="12" rx="6" fill="${P.ink}" opacity=".55"/><rect x="30" y="${114 + i * 56}" width="240" height="3" fill="${P.ink}" opacity=".25"/></g>`).join("")}</g>`;
}
const check = (P, x, y) => `<g class="check" transform="translate(${x} ${y})"><circle r="44" fill="${P.ok}"/><path d="M-20 2 l14 14 l26 -30" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>`;
const bubble = (P, x, y, body) => `<g class="bubble" transform="translate(${x} ${y})"><path d="M0 0 h170 a24 24 0 0 1 24 24 v58 a24 24 0 0 1 -24 24 h-120 l-30 26 l6 -26 h-26 a24 24 0 0 1 -24 -24 v-58 a24 24 0 0 1 24 -24 z" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>${body}</g>`;
const qmarks = (P) => [0, 1, 2].map((i) => `<text class="qm qm${i}" x="${120 + i * 70}" y="${380 - (i % 2) * 40}" font-family="Vazirmatn" font-weight="900" font-size="${90 - i * 8}" fill="${P.accent2}">?</text>`).join("");
const bulb = (P) => `<g class="bulb" transform="translate(210 330)">
    <g class="bulb-rays" opacity="0">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="-5" y="-86" width="10" height="26" rx="5" fill="#FFC928" transform="rotate(${a})"/>`).join("")}</g>
    <path d="M0 -48 a44 44 0 0 1 26 80 v12 h-52 v-12 a44 44 0 0 1 26 -80 z" fill="${P.paper}" stroke="${P.ink}" stroke-width="5"/>
    <path class="bulb-glow" d="M0 -48 a44 44 0 0 1 26 80 v12 h-52 v-12 a44 44 0 0 1 26 -80 z" fill="#FFC928" opacity="0"/>
    <path d="M-12 20 q12 -26 24 0" stroke="${P.ink}" stroke-width="4" fill="none"/>
    <rect x="-22" y="46" width="44" height="12" rx="4" fill="${P.frame}"/><rect x="-18" y="60" width="36" height="12" rx="4" fill="${P.frame}"/></g>`;
const holdArm = (P, x, y) => `<path d="M330 700 q${x - 330} -40 ${x - 330} ${y - 700}" stroke="${P.visShirt}" stroke-width="40" stroke-linecap="round" fill="none"/><circle cx="${x}" cy="${y}" r="22" fill="${P.visSkin}"/>`;
const scratchArm = (P) => `<path d="M100 720 q-40 -120 40 -220" stroke="${P.visShirt}" stroke-width="40" stroke-linecap="round" fill="none"/><circle cx="140" cy="494" r="22" fill="${P.visSkin}"/>`;
const waveArm = (P) => `<g class="wave"><path d="M320 700 q60 -80 40 -200" stroke="${P.visShirt}" stroke-width="40" stroke-linecap="round" fill="none"/><circle cx="360" cy="496" r="24" fill="${P.visSkin}"/></g>`;

// ---------------------------------------------------------------- builder
/**
 * @param {object} a
 *   variant: "tiktok" | "instagram"
 *   episodeNo, total, topic, hook, loopLine, nextTopic, outroLine
 *   items: [{ de, fa, exDe, exFa }]
 *   beats: [{ de, ex, fa } | null]  — seconds from each scene's start
 *   hookDuration, tipDurations[], outroDuration, duration
 */
export function buildAnimHTML(a) {
  const P = ANIM_VARIANTS[a.variant] || ANIM_VARIANTS.tiktok;
  const n = a.items.length;
  const HOOK = +a.hookDuration, OUTRO = +a.outroDuration, DURS = a.tipDurations.map(Number);
  const starts = [];
  { let t = HOOK; for (const d of DURS) { starts.push(t); t += d; } }
  const outroAt = starts.length ? starts[n - 1] + DURS[n - 1] : HOOK;
  const TOTAL = +(outroAt + OUTRO).toFixed(3);
  const cuts = [HOOK, ...starts.slice(1), outroAt];
  const beatsFor = (i) => a.beats?.[i] || { de: 0.25, ex: DURS[i] * 0.35, fa: DURS[i] * 0.62 };
  const counter = `A1 · ${String(a.episodeNo).padStart(3, "0")}/${a.total || 100}`;
  const stageTop = P.layout === "stage-top";
  const stepProps = [
    { board: "A040", desk: `<g transform="translate(560 452)">${slip(P)}</g>`, arm: holdArm(P, 520, 560), over: check(P, 860, 470) },
    { board: "A040", desk: `<g transform="translate(540 440)">${idCard(P)}</g>`, arm: holdArm(P, 520, 560), over: check(P, 880, 460) },
    { board: "A040", desk: `<g transform="translate(470 250)">${form(P, false)}</g>`, arm: scratchArm(P), over: qmarks(P) },
    { board: "A040", desk: `<g transform="translate(470 250)">${form(P, true)}</g>`, arm: holdArm(P, 440, 600), over: bulb(P) + bubble(P, 760, 190, `<circle cx="60" cy="54" r="10" fill="${P.ink}"/><circle cx="97" cy="54" r="10" fill="${P.ink}"/><circle cx="134" cy="54" r="10" fill="${P.ink}"/>`) },
  ];

  const card = (inner) => `<div class="card">${inner}</div>`;
  const header = `<div class="head"><span class="chip ltr">${esc(counter)}</span><span class="topic">${esc(a.topic)}</span></div>`;
  const wrap = (sid, svg, cardHtml) => stageTop
    ? `${header}<div class="stage">${svg}</div>${card(cardHtml)}`
    : `${header}${card(cardHtml)}<div class="stage">${svg}</div>`;

  const hookSvg = stage("s1", P, {
    board: "A040",
    over: bubble(P, 760, 190, `<text x="97" y="72" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="56" fill="${P.ink}">…?</text>`),
  });
  const hookSec = `<section id="s1" class="clip scene" data-start="0" data-duration="${HOOK.toFixed(3)}" data-track-index="1">
  ${wrap("s1", hookSvg, `<div class="hooktext" dir="rtl">${esc(a.hook)}</div><div class="loop" dir="rtl">${esc(a.loopLine)}</div>`)}
</section>`;

  const stepSecs = a.items.map((it, i) => {
    const sid = `s${i + 2}`;
    const svg = stage(sid, P, stepProps[i % stepProps.length]);
    const words = String(it.de).split(/\s+/).map((w) => `<span class="w">${esc(w)}</span>`).join(" ");
    const inner = `<div class="step" dir="rtl">${faDigits(i + 1)}/${faDigits(n)}</div>
      <div class="de ltr${String(it.de).length > 20 ? " long" : ""}" dir="ltr">${words}</div>
      <div class="fa" dir="rtl">${esc(it.fa)}</div>
      ${it.exDe ? `<div class="rule"></div><div class="exde ltr" dir="ltr">${esc(it.exDe)}</div><div class="exfa" dir="rtl">${esc(it.exFa)}</div>` : ""}`;
    return `<section id="${sid}" class="clip scene" data-start="${starts[i].toFixed(3)}" data-duration="${DURS[i].toFixed(3)}" data-track-index="1">
  ${wrap(sid, svg, inner)}
</section>`;
  });

  const outroSvg = stage("sOut", P, { message: "DANKE!", arm: waveArm(P) });
  const outroSec = `<section id="sOut" class="clip scene" data-start="${outroAt.toFixed(3)}" data-duration="${OUTRO.toFixed(3)}" data-track-index="1">
  ${wrap("sOut", outroSvg, `<div class="next" dir="rtl">${esc(`قسمت بعد: ${a.nextTopic}`)}</div><div class="outro" dir="rtl">${esc(a.outroLine)}</div>`)}
</section>`;

  const cutLayer = P.cut === "shutter"
    ? `<div class="cutlayer shutter">${Array.from({ length: 16 }, (_, i) => `<div class="slat" style="top:${i * 120}px"></div>`).join("")}</div>`
    : `<div class="cutlayer sheet"><div class="sheetlines">${Array.from({ length: 22 }, () => `<div class="sl"></div>`).join("")}</div></div>`;

  const cardTop = stageTop ? 1070 : 270;
  const stageTopPx = stageTop ? 262 : 800;

  const css = `${FONT_FACES}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;background:${P.bg};overflow:hidden}
#root{position:relative;width:100%;height:100%;background:${P.bg};font-family:"Vazirmatn",sans-serif;overflow:hidden}
.scene{position:absolute;inset:0}
.ltr{font-family:"Vazirmatn",sans-serif;font-weight:900}
.head{position:absolute;top:150px;left:70px;right:70px;height:90px;display:flex;align-items:center;justify-content:space-between;gap:24px}
.chip{display:block;padding:12px 26px;border-radius:999px;border:4px solid ${P.cardLine};color:${P.headColor};font-size:36px;direction:ltr}
.topic{display:block;color:${P.headColor};font-weight:900;font-size:46px;direction:rtl}
.stage{position:absolute;left:0;top:${stageTopPx}px;width:1080px;height:780px;overflow:hidden}
.stage-svg{display:block;width:1080px;height:780px}
.card{position:absolute;left:60px;right:60px;top:${cardTop}px;height:500px;padding:26px 40px;border-radius:40px;background:${P.cardBg};border:5px solid ${P.cardLine};display:flex;flex-direction:column;justify-content:center;gap:6px;overflow:hidden}
.hooktext{display:block;color:${P.faColor};font-weight:900;font-size:68px;line-height:1.35;text-align:center}
.loop{display:block;margin-top:18px;color:${P.loopColor};font-weight:800;font-size:42px;text-align:center}
.step{display:block;color:${P.subColor};font-weight:800;font-size:34px;text-align:center}
.de{display:block;color:${P.deColor};font-size:78px;line-height:1.1;text-align:center;direction:ltr}
.w{display:inline-block}
.de.long{font-size:62px}
.fa{display:block;color:${P.faColor};font-weight:900;font-size:54px;line-height:1.35;text-align:center}
.rule{display:block;height:4px;margin:8px 120px;border-radius:2px;background:${P.cardLine};opacity:.5}
.exde{display:block;color:${P.subColor};font-size:32px;line-height:1.25;text-align:center;direction:ltr}
.exfa{display:block;color:${P.subColor};font-weight:700;font-size:31px;line-height:1.45;text-align:center}
.next{display:block;color:${P.deColor};font-weight:900;font-size:60px;line-height:1.35;text-align:center}
.outro{display:block;margin-top:20px;color:${P.faColor};font-weight:800;font-size:46px;line-height:1.45;text-align:center}
.cutlayer{position:absolute;inset:0;pointer-events:none;z-index:50}
.shutter{top:-1920px;bottom:auto;height:1920px}
.slat{position:absolute;left:0;width:1080px;height:116px;background:linear-gradient(${P.frame},${P.desk});border-bottom:4px solid ${P.floor}}
.sheet{left:1080px;right:auto;width:1080px;background:${P.paper};border-left:8px solid ${P.accent}}
.sheetlines{position:absolute;inset:180px 90px;display:flex;flex-direction:column;gap:48px}
.sl{display:block;height:6px;border-radius:3px;background:${P.accent};opacity:.25}
`;

  // ------------------------------------------------------------ timeline
  const js = [];
  const T = (x) => (+x).toFixed(3);
  // Clip-relative helpers: `at(sec)` = absolute time in the film.
  const sceneIn = (sid, at) => {
    js.push(`tl.fromTo("#${sid} .head",{y:-40,opacity:0},{y:0,opacity:1,duration:.4,ease:"power3.out"},${T(at + 0.05)});`);
    js.push(`tl.fromTo("#${sid} .stage",{scale:1.06,opacity:0},{scale:1,opacity:1,duration:.5,ease:"power2.out"},${T(at)});`);
    js.push(`tl.fromTo("#${sid} .card",{y:${stageTop ? 60 : -60},opacity:0},{y:0,opacity:1,duration:.45,ease:"power3.out"},${T(at + 0.1)});`);
  };
  const ambient = (sid, at, dur) => {
    const reps = Math.max(1, Math.floor(dur / 0.9));
    js.push(`tl.fromTo("#${sid} .board-dot",{opacity:1},{opacity:.15,duration:.45,repeat:${reps * 2 - 1},yoyo:true,ease:"none"},${T(at)});`);
    js.push(`tl.fromTo("#${sid} .glint",{x:-40},{x:340,duration:${T(dur)},ease:"none"},${T(at)});`);
  };
  const pop = (sel, at) => js.push(`tl.fromTo("${sel}",{scale:0,opacity:0,transformOrigin:"50% 50%"},{scale:1,opacity:1,duration:.4,ease:"back.out(2.2)"},${T(at)});`);
  const textBeats = (sid, t0, b) => {
    js.push(`tl.fromTo("#${sid} .step",{opacity:0},{opacity:1,duration:.3},${T(t0 + 0.1)});`);
    js.push(`tl.fromTo("#${sid} .de .w",{y:40,opacity:0},{y:0,opacity:1,duration:.35,stagger:.08,ease:"back.out(1.8)"},${T(t0 + b.de)});`);
    js.push(`tl.fromTo("#${sid} .rule, #${sid} .exde",{opacity:0,y:16},{opacity:1,y:0,duration:.35,ease:"power2.out"},${T(t0 + b.ex)});`);
    js.push(`tl.fromTo("#${sid} .exfa",{opacity:0,y:16},{opacity:1,y:0,duration:.35,ease:"power2.out"},${T(t0 + b.fa)});`);
    js.push(`tl.fromTo("#${sid} .fa",{opacity:0,scale:.9},{opacity:1,scale:1,duration:.4,ease:"back.out(1.6)"},${T(t0 + b.fa)});`);
  };

  // hook: the number is called, the clerk waits, the visitor says nothing
  // The hook must be readable in frame 0 (the platform thumbnail), so its
  // entrance moves things into place without ever hiding them.
  js.push(`tl.fromTo("#s1 .stage",{scale:1.04},{scale:1,duration:.8,ease:"power2.out"},0);`);
  js.push(`tl.fromTo("#s1 .card",{y:${stageTop ? 24 : -24}},{y:0,duration:.6,ease:"power3.out"},0);`);
  ambient("s1", 0, HOOK);
  js.push(`tl.fromTo("#s1 .board-num",{y:-24},{y:0,duration:.35,ease:"back.out(2)"},0.3);`);
  js.push(`tl.fromTo("#s1 .clock-s",{rotation:0,svgOrigin:"960 128"},{rotation:${Math.round(HOOK) * 6},svgOrigin:"960 128",duration:${T(HOOK)},ease:"steps(${Math.max(1, Math.round(HOOK))})"},0);`);
  pop("#s1 .bubble", 0.9);
  js.push(`tl.fromTo("#s1 .hooktext",{scale:.96},{scale:1,duration:.5,ease:"back.out(1.6)"},0);`);
  js.push(`tl.fromTo("#s1 .loop",{opacity:0},{opacity:1,duration:.4},1.0);`);
  js.push(`tl.to("#s1 .clerk-head",{rotation:-6,svgOrigin:"562 380",duration:.5,repeat:3,yoyo:true,ease:"sine.inOut"},1.4);`);

  a.items.forEach((_, i) => {
    const sid = `s${i + 2}`, t0 = starts[i], d = DURS[i], b = beatsFor(i);
    sceneIn(sid, t0);
    ambient(sid, t0, d);
    textBeats(sid, t0, b);
    const k = i % 4;
    if (k === 0) {
      // Termin: the appointment slip crosses the desk, the clock is at ten
      js.push(`tl.fromTo("#${sid} .slip",{x:-380,y:120,rotation:-14,svgOrigin:"115 80"},{x:0,y:0,rotation:0,svgOrigin:"115 80",duration:.7,ease:"power3.out"},${T(t0 + b.de)});`);
      js.push(`tl.fromTo("#${sid} .clock-h",{rotation:-90,svgOrigin:"960 128"},{rotation:-60,svgOrigin:"960 128",duration:.8,ease:"power2.inOut"},${T(t0 + b.ex)});`);
      js.push(`tl.fromTo("#${sid} .clock-m",{rotation:-180,svgOrigin:"960 128"},{rotation:0,svgOrigin:"960 128",duration:.8,ease:"power2.inOut"},${T(t0 + b.ex)});`);
      js.push(`tl.to("#${sid} .clerk-head",{rotation:5,svgOrigin:"562 380",duration:.25,repeat:3,yoyo:true,ease:"sine.inOut"},${T(t0 + b.fa)});`);
      pop(`#${sid} .check`, t0 + b.fa + 0.5);
    } else if (k === 1) {
      // Ausweis: the card is handed over and scanned
      js.push(`tl.fromTo("#${sid} .idcard",{x:-360,y:140,rotation:12,svgOrigin:"130 80"},{x:0,y:0,rotation:0,svgOrigin:"130 80",duration:.7,ease:"power3.out"},${T(t0 + b.de)});`);
      js.push(`tl.fromTo("#${sid} .scan",{x:0,opacity:.85},{x:290,opacity:.85,duration:.9,ease:"power1.inOut"},${T(t0 + b.ex)});`);
      js.push(`tl.to("#${sid} .scan",{opacity:0,duration:.2},${T(t0 + b.ex + 0.9)});`);
      pop(`#${sid} .check`, t0 + b.fa + 0.3);
    } else if (k === 2) {
      // verstehe nicht: the form comes up, its lines swim, question marks
      js.push(`tl.fromTo("#${sid} .form",{y:260,opacity:0},{y:0,opacity:1,duration:.6,ease:"power3.out"},${T(t0 + b.de)});`);
      js.push(`tl.to("#${sid} .fline",{x:10,duration:.18,repeat:5,yoyo:true,stagger:.06,ease:"sine.inOut"},${T(t0 + b.ex)});`);
      [0, 1, 2].forEach((q) => pop(`#${sid} .qm${q}`, t0 + b.fa + q * 0.35));
      js.push(`tl.to("#${sid} .vis-head",{rotation:-8,svgOrigin:"210 610",duration:.3,repeat:3,yoyo:true,ease:"sine.inOut"},${T(t0 + b.fa)});`);
    } else {
      // erklären: the clerk points, the form lights up line by line, the bulb
      js.push(`tl.fromTo("#${sid} .clerk-arm",{rotation:0,svgOrigin:"650 450"},{rotation:28,svgOrigin:"650 450",duration:.5,ease:"back.out(1.6)"},${T(t0 + b.de)});`);
      js.push(`tl.fromTo("#${sid} .hl",{scaleX:0,transformOrigin:"0% 50%"},{scaleX:1,transformOrigin:"0% 50%",duration:.3,stagger:.35,ease:"power2.out"},${T(t0 + b.ex)});`);
      pop(`#${sid} .bubble`, t0 + b.de + 0.4);
      js.push(`tl.fromTo("#${sid} .bulb",{scale:0,opacity:0,transformOrigin:"50% 50%"},{scale:1,opacity:1,duration:.45,ease:"back.out(2)"},${T(t0 + b.fa)});`);
      js.push(`tl.fromTo("#${sid} .bulb-glow",{opacity:0},{opacity:1,duration:.3,ease:"power2.out"},${T(t0 + b.fa + 0.35)});`);
      js.push(`tl.fromTo("#${sid} .bulb-rays",{opacity:0,scale:.6,transformOrigin:"50% 50%"},{opacity:1,scale:1,transformOrigin:"50% 50%",duration:.35,ease:"back.out(2)"},${T(t0 + b.fa + 0.35)});`);
    }
  });

  // outro: the board says thanks, the visitor waves
  sceneIn("sOut", outroAt);
  ambient("sOut", outroAt, OUTRO);
  js.push(`tl.fromTo("#sOut .board-num",{scale:.6,opacity:0,transformOrigin:"50% 50%"},{scale:1,opacity:1,duration:.4,ease:"back.out(2)"},${T(outroAt + 0.3)});`);
  js.push(`tl.fromTo("#sOut .wave",{rotation:-10,svgOrigin:"320 700"},{rotation:10,svgOrigin:"320 700",duration:.35,repeat:5,yoyo:true,ease:"sine.inOut"},${T(outroAt + 0.5)});`);
  js.push(`tl.fromTo("#sOut .next",{opacity:0,y:24},{opacity:1,y:0,duration:.4,ease:"power3.out"},${T(outroAt + 0.2)});`);
  js.push(`tl.fromTo("#sOut .outro",{opacity:0,y:24},{opacity:1,y:0,duration:.4,ease:"power3.out"},${T(outroAt + 0.8)});`);

  // cuts: the counter shutter comes down and up again / a sheet of paper passes
  // Every cut re-uses the same layer, so no cut tween may render its start
  // state at build time: the last one created would otherwise leave the layer
  // covering the frame from 0s until the first cut.
  const layer = P.cut === "shutter" ? ".shutter" : ".sheet";
  const prop = P.cut === "shutter" ? "y" : "x";
  const [cover, gone, half] = P.cut === "shutter" ? [1920, 0, 0.3] : [-1080, -2160, 0.28];
  js.push(`tl.set("${layer}",{${prop}:0},0);`);
  for (const c of cuts) {
    js.push(`tl.fromTo("${layer}",{${prop}:0},{${prop}:${cover},duration:${half},ease:"power2.in",immediateRender:false},${T(c - half)});`);
    js.push(`tl.fromTo("${layer}",{${prop}:${cover}},{${prop}:${gone},duration:${half},ease:"power2.out",immediateRender:false},${T(c)});`);
  }

  return `<!doctype html>
<html lang="fa"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1920">
<style>${css}</style>
<script>${GSAP}</script>
</head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${TOTAL}">
${hookSec}
${stepSecs.join("\n")}
${outroSec}
<div class="clip" data-start="0" data-duration="${TOTAL}" data-track-index="30" style="position:absolute;inset:0;pointer-events:none">${cutLayer}</div>
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
