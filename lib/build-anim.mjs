// Animated re-telling of a German A1 lesson — a small cartoon film.
//
// Owner, 2026-09-27: the first animated version (flat props on a static stage)
// was "too simple"; build "a real, moving animated character" with the
// HyperFrames skills. This version is one continuous office scene with two
// rigged characters (lib/anim-rig.mjs):
//
//   the visitor walks in on the registry walk cycle, looks up at the number
//   board, freezes; for each phrase he SAYS the German line (lip-synced from
//   its vowels), and ACTS it — pulls out the appointment slip and hands it
//   over, shows his ID which the clerk scans, takes the form and scratches his
//   head, asks with open palms while the clerk walks him through the form with
//   her pen — and waves goodbye at the end.
//
// The camera moves with the action (push-ins on each exchange); the lesson
// text lives on a card that changes per phrase, on the voice's own beats.
// TikTok and Instagram are two designs (night counter, stage on top, flip
// cards / daylight office, card on top, sliding cards) with their own palettes.
// Deterministic: no clocks, no randomness, one paused timeline.
import { readFileSync } from "node:fs";
import { visitorSVG, clerkSVG, rigDefs, Actor, walkAt, HIP_TO_FLOOR } from "./anim-rig.mjs";
import { readPhrase, iconSVG, roomBackSVG, roomChairBackSVG, roomFrontSVG, ROOM_TARGETS } from "./anim-room.mjs";

/** Which scene a unit is acted in. The office acts out the authorities
 *  lesson prop by prop; every other lesson plays in the everyday room. */
export const animSettingFor = (unitId) => (/authorit|behoerde|amt\b/.test(String(unitId)) ? "office" : "room");

const b64 = (p) => readFileSync(p).toString("base64");
// public/fonts/BalooBhaijaan2-ExtraBold.woff2 is an Arabic-only subset (no
// Latin glyphs, checked with fontTools), so every German word is set in
// Vazirmatn, which carries Latin and umlauts.
const FONT_FACES = [[500, "Medium"], [700, "Bold"], [800, "ExtraBold"], [900, "Black"]]
  .map(([w, n]) => `@font-face{font-family:"Vazirmatn";font-weight:${w};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b64(`public/fonts/Vazirmatn-${n}.woff2`)}) format("woff2");}`)
  .join("\n");
const GSAP = readFileSync("public/gsap.min.js", "utf8");

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const faDigits = (s) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const F = (x) => (+x).toFixed(3);

export const ANIM_VARIANTS = {
  tiktok: {
    bg: "#0E1726", wall: "#1B2B45", wallLine: "#22375A", floor: "#101A2C", floorLine: "#1A2842",
    window: "#0B1A33", windowLight: "#2E5C9A", desk: "#2B3F5E", deskTop: "#46628E", glass: "#9FD8E8", glassA: 0.13, frame: "#6A84A8",
    led: "#FFB02E", ledBg: "#1A0F02", paper: "#F6F3EA", ink: "#1C2533", accent: "#25F4EE", accent2: "#FE2C55", ok: "#3DDC84",
    cardBg: "#0A111D", cardLine: "#25F4EE", deColor: "#FFB02E", faColor: "#FFFFFF", subColor: "#A9B8CF", headColor: "#E6EEF9",
    warm: "#FE2C55", loopColor: "#FE2C55", onAccent: "#0A111D", layout: "stage-top", cardMove: "flip",
    room: { line: "#0B1220", wood: "#6B4A33", woodShade: "#553A28", curtain: "#3A2F5E", sofa: "#2E6F8E", sofaShade: "#245A74", chair: "#8E3B5A", chairShade: "#732F49",
      cloth: "#E9E2D0", clothShade: "#CFC5AE", lamp: "#FFB02E", picSky: "#2E5C9A", picHill: "#1F7A5A",
      night: true, sky: "#0B1A3A", skyLow: "#1C3566", light: "#FFB764", lightA: 0.22, rug: "#3A2F5E", rug2: "#FFB02E", plant: "#2F9E6A", plantStem: "#3E8A5A", pot: "#C0643A" },
    visitor: { line: "#2A1A14", iris: "#6B4226", skinLight: "#E2A57C", topLight: "#FF6F8A", hairLight: "#4A3A30", skin: "#C98B62", skinShade: "#A86E4A", blush: "#E0795F", hair: "#1B1512", eye: "#2A1C12", lip: "#6E3526", mouth: "#4A1A14", tongue: "#E0707A",
      top: "#FE2C55", topShade: "#C81E43", cuff: "#FFD9E1", belt: "#8E1530", pants: "#27364F", pantsShade: "#1D2A40", shoe: "#F4F6FA", sole: "#9AA8BD" },
    clerk: { line: "#2A1A14", iris: "#3E6B4A", skinLight: "#FFE0C4", topLight: "#4FD6D1", hairLight: "#9A6440", pantsShade: "#168A86", skin: "#F0C7A2", skinShade: "#D6A57E", blush: "#F29B8C", hair: "#6B3F24", eye: "#2A1C12", lip: "#8C3B3B", mouth: "#5A1E1E", tongue: "#E0707A",
      top: "#1FB5B0", topShade: "#168A86", cuff: "#E8FFFE", shirt: "#FFFFFF", lanyard: "#FFB02E", glasses: "#2A2433" },
  },
  instagram: {
    bg: "#F5EFE6", wall: "#EADFCC", wallLine: "#DDCDB4", floor: "#CFB995", floorLine: "#BFA67F",
    window: "#BFE3F2", windowLight: "#FFFFFF", desk: "#3E5C76", deskTop: "#5A7A96", glass: "#CFE7F2", glassA: 0.22, frame: "#8FA3B5",
    led: "#F0506E", ledBg: "#1E161C", paper: "#FFFFFF", ink: "#2A2433", accent: "#833AB4", accent2: "#F77737", ok: "#1FA971",
    cardBg: "#FFFFFF", cardLine: "#833AB4", deColor: "#6A1FA0", faColor: "#1D1A24", subColor: "#5C5566", headColor: "#3B3345",
    warm: "#C2410C", loopColor: "#833AB4", onAccent: "#FFFFFF", layout: "card-top", cardMove: "slide",
    room: { line: "#4A3A2C", wood: "#B98556", woodShade: "#9E6F45", curtain: "#E7A78C", sofa: "#5E9E8C", sofaShade: "#4C8373", chair: "#E0B25A", chairShade: "#C6983F",
      cloth: "#FFFFFF", clothShade: "#E7DCCB", lamp: "#833AB4", picSky: "#BFE3F2", picHill: "#7CB36A",
      night: false, sky: "#7CC3F0", skyLow: "#CDEBFA", light: "#FFE7B0", lightA: 0.35, rug: "#E7A78C", rug2: "#FFFFFF", plant: "#4F9E5A", plantStem: "#5E8A48", pot: "#C0643A" },
    visitor: { line: "#2A1A14", iris: "#6B4226", skinLight: "#D8966C", topLight: "#FF9A5E", hairLight: "#4E3A2C", skin: "#B97A55", skinShade: "#98603F", blush: "#D9725A", hair: "#2B1D14", eye: "#2A1C12", lip: "#6E3526", mouth: "#4A1A14", tongue: "#E0707A",
      top: "#F77737", topShade: "#D35E22", cuff: "#FFE3CF", belt: "#9E4214", pants: "#3E5C76", pantsShade: "#314A61", shoe: "#FFFFFF", sole: "#B8B0A6" },
    clerk: { line: "#2A1A14", iris: "#3E5C8A", skinLight: "#FFE6CE", topLight: "#A45BD6", hairLight: "#6A5040", pantsShade: "#65288F", skin: "#F3CFAE", skinShade: "#DDAE88", blush: "#F29B8C", hair: "#3A2A1E", eye: "#2A1C12", lip: "#8C3B3B", mouth: "#5A1E1E", tongue: "#E0707A",
      top: "#833AB4", topShade: "#65288F", cuff: "#F3E6FF", shirt: "#FFFFFF", lanyard: "#F77737", glasses: "#2A2433" },
  },
};

// Stage coordinates (viewBox 0 0 1080 880).
const VX = 560;                        // visitor hip, where he stops
const VY = 850 - HIP_TO_FLOOR;         // feet on the floor at y=850
const CX = 905, CY = 648;              // clerk hip (seated, mirrored)
const HAND_OFF = [736, 512];           // where papers change hands, over the slot
const WALK_FROM = -700;                // visitor starts off-stage left

// ------------------------------------------------------------------ props
const slipArt = (P) => `<g class="pr-slip" opacity="0"><rect x="-4" y="-96" width="118" height="92" rx="10" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>
  <rect x="-4" y="-96" width="118" height="28" rx="10" fill="${P.accent}"/><rect x="-4" y="-80" width="118" height="12" fill="${P.accent}"/>
  <text x="55" y="-75" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="20" fill="${P.onAccent}">TERMIN</text>
  <text x="55" y="-22" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="34" fill="${P.warm}">10:00</text></g>`;
const idArt = (P) => `<g class="pr-id" opacity="0"><rect x="-4" y="-84" width="130" height="80" rx="10" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>
  <rect x="-4" y="-84" width="130" height="22" rx="10" fill="${P.accent}"/><rect x="-4" y="-72" width="130" height="10" fill="${P.accent}"/>
  <text x="61" y="-67" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="15" fill="${P.onAccent}">AUSWEIS</text>
  <rect x="6" y="-56" width="34" height="44" rx="5" fill="#D8DEE8"/><circle cx="23" cy="-42" r="9" fill="#8A97AB"/><path d="M10 -14 q13 -18 26 0 z" fill="#8A97AB"/>
  <rect x="50" y="-52" width="64" height="7" rx="3" fill="${P.ink}" opacity=".7"/><rect x="50" y="-38" width="50" height="7" rx="3" fill="${P.ink}" opacity=".45"/><rect x="50" y="-24" width="58" height="7" rx="3" fill="${P.ink}" opacity=".45"/>
  <rect class="pr-scan" x="-10" y="-90" width="10" height="92" fill="${P.ok}" opacity="0"/></g>`;
const formArt = (P) => `<g class="pr-form" opacity="0"><rect x="-10" y="-206" width="150" height="200" rx="8" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>
  <text x="65" y="-178" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="19" fill="${P.ink}">FORMULAR</text>
  ${[0, 1, 2, 3, 4].map((i) => `<rect class="pr-hl pr-hl${i}" x="2" y="${-160 + i * 30}" width="126" height="20" rx="4" fill="${P.accent2}" opacity=".45" transform="scale(0 1)"/><rect x="8" y="${-154 + i * 30}" width="${[96, 110, 80, 104, 70][i]}" height="7" rx="3" fill="${P.ink}" opacity=".55"/>`).join("")}</g>`;
const penArt = (P) => `<g class="pr-pen" opacity="0"><rect x="-4" y="-58" width="9" height="64" rx="4" fill="${P.accent}" transform="rotate(-28)"/><path d="M-4 6 l5 12 l4 -12 z" fill="${P.ink}" transform="rotate(-28)"/></g>`;
// A mirrored hand would print its paper backwards; the clerk's copies flip back.
const unflip = (art) => `<g transform="scale(-1 1) translate(-110 0)">${art}</g>`;

function officeSVG(P) {
  const V = visitorSVG(P.visitor, `${slipArt(P)}${idArt(P)}${formArt(P)}`, "");
  const C = clerkSVG(P.clerk, `${unflip(slipArt(P))}${unflip(idArt(P))}${penArt(P)}`, `${unflip(formArt(P))}`);
  const floorLines = Array.from({ length: 12 }, (_, i) => `<path d="M${-200 + i * 130} 880 L${120 + i * 90} 700" stroke="${P.floorLine}" stroke-width="3"/>`).join("");
  return `<svg class="stage-svg" viewBox="0 0 1080 880" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>${rigDefs("v", P.visitor)}${rigDefs("c", P.clerk)}
    <linearGradient id="beam-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.windowLight}" stop-opacity=".55"/><stop offset="1" stop-color="${P.windowLight}" stop-opacity="0"/></linearGradient>
    <radialGradient id="vignette" cx="50%" cy="45%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient></defs>
  <!-- depth: the room behind moves less than the people in front of it -->
  <g class="cam-bg">
  <rect width="1080" height="880" fill="${P.wall}"/>
  ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="0" y="${80 + i * 80}" width="1080" height="3" fill="${P.wallLine}"/>`).join("")}
  <rect y="700" width="1080" height="180" fill="${P.floor}"/>${floorLines}
  <rect y="696" width="1080" height="8" fill="${P.wallLine}"/>
  <!-- window -->
  <rect x="44" y="250" width="250" height="260" rx="12" fill="${P.window}" stroke="${P.frame}" stroke-width="10"/>
  <path d="M169 250 v260 M44 380 h250" stroke="${P.frame}" stroke-width="8"/>
  <rect class="win-light" x="60" y="264" width="44" height="232" fill="${P.windowLight}" opacity=".25" transform="skewX(-14)"/>
  <!-- window light across the room, with dust hanging in it -->
  <polygon class="beam" points="60,264 294,264 520,880 120,880" fill="url(#beam-g)" opacity=".5"/>
  ${Array.from({ length: 14 }, (_, i) => `<circle class="dust dust${i % 3}" cx="${120 + ((i * 97) % 320)}" cy="${330 + ((i * 131) % 460)}" r="${2 + (i % 3)}" fill="${P.windowLight}" opacity=".55"/>`).join("")}
  <!-- waiting chairs -->
  ${[0, 1].map((i) => `<g transform="translate(${40 + i * 118} 610)"><rect width="100" height="60" rx="12" fill="${P.frame}"/><rect y="56" width="100" height="18" rx="8" fill="${P.desk}"/><rect x="12" y="74" width="10" height="70" fill="${P.desk}"/><rect x="78" y="74" width="10" height="70" fill="${P.desk}"/></g>`).join("")}
  <!-- people waiting: they idle on their own (heads drift, one scrolls a phone) -->
  <g transform="translate(58 520)">
    <path d="M-6 150 q0 -70 42 -70 q42 0 42 70 z" fill="#5B7FA6" stroke="#2A1A14" stroke-width="4"/>
    <g class="bgp1-head"><circle cx="36" cy="46" r="32" fill="#D9A07A" stroke="#2A1A14" stroke-width="4"/><path d="M4 40 q4 -40 34 -38 q30 2 30 34 q-12 -18 -30 -18 q-20 0 -34 22z" fill="#6B4A2A"/><circle cx="46" cy="46" r="3.5" fill="#2A1A14"/><path d="M40 60 q8 5 14 0" stroke="#2A1A14" stroke-width="3" fill="none"/></g>
  </g>
  <g transform="translate(176 520)">
    <path d="M-6 150 q0 -70 42 -70 q42 0 42 70 z" fill="#8A6BB0" stroke="#2A1A14" stroke-width="4"/>
    <g class="bgp2-head"><circle cx="36" cy="46" r="32" fill="#F0C9A8" stroke="#2A1A14" stroke-width="4"/><path d="M2 60 q-4 -56 34 -58 q38 2 34 58 q-6 -30 -34 -34 q-28 4 -34 34z" fill="#C9892E"/><path d="M28 50 q6 3 12 0 M50 50 q6 3 12 0" stroke="#2A1A14" stroke-width="3" fill="none"/></g>
    <g class="bgp2-phone"><rect x="22" y="96" width="22" height="34" rx="4" fill="#20242E" stroke="#2A1A14" stroke-width="3"/><rect class="bgp2-glow" x="25" y="100" width="16" height="24" rx="2" fill="#8FD3FF" opacity=".6"/></g>
  </g>
  <!-- a passer-by crossing the back of the room -->
  <g transform="translate(-160 488) scale(1.05)"><g class="pb">
    <g class="pb-l1"><rect x="-10" y="120" width="20" height="100" rx="9" fill="#34405A"/></g>
    <g class="pb-l2"><rect x="-10" y="120" width="20" height="100" rx="9" fill="#2A3448"/></g>
    <path d="M-34 130 q-4 -90 34 -92 q38 2 34 92 z" fill="#3C8D6E" stroke="#2A1A14" stroke-width="4"/>
    <circle cx="4" cy="12" r="30" fill="#C88A62" stroke="#2A1A14" stroke-width="4"/><path d="M-26 6 q6 -34 32 -34 q26 2 28 30 q-14 -14 -30 -14 q-16 0 -30 18z" fill="#231815"/>
    <rect x="20" y="70" width="34" height="46" rx="6" fill="#E9D8B4" stroke="#2A1A14" stroke-width="3"/>
  </g></g>
  <!-- ticket machine -->
  <g transform="translate(330 470)"><rect width="84" height="230" rx="14" fill="${P.frame}"/><rect x="12" y="18" width="60" height="44" rx="6" fill="${P.ledBg}"/><text x="42" y="48" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="18" fill="${P.led}">A040</text><rect x="22" y="84" width="40" height="10" rx="5" fill="${P.ink}"/><rect x="26" y="96" width="32" height="30" fill="${P.paper}"/></g>
  <!-- number board -->
  <g class="board">
    <rect x="40" y="46" width="300" height="160" rx="16" fill="${P.ledBg}"/>
    <rect x="40" y="46" width="300" height="160" rx="16" fill="none" stroke="${P.frame}" stroke-width="5"/>
    <g class="board-nums">
      <text x="62" y="84" font-family="Vazirmatn" font-weight="900" font-size="22" fill="${P.led}">NUMMER</text>
      <text x="318" y="84" text-anchor="end" font-family="Vazirmatn" font-weight="900" font-size="22" fill="${P.led}">SCHALTER</text>
      <g class="board-old"><text x="62" y="170" font-family="Vazirmatn" font-weight="900" font-size="56" fill="${P.led}">A039</text></g>
      <g class="board-new" opacity="0"><text x="62" y="170" font-family="Vazirmatn" font-weight="900" font-size="56" fill="${P.led}">A040</text></g>
      <text x="318" y="170" text-anchor="end" font-family="Vazirmatn" font-weight="900" font-size="56" fill="${P.led}">3</text>
    </g>
    <g class="board-thanks" opacity="0"><text x="190" y="150" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="60" fill="${P.led}">DANKE!</text></g>
    <circle class="board-dot" cx="190" cy="74" r="8" fill="${P.led}"/>
    <rect class="board-ring" x="32" y="38" width="316" height="176" rx="22" fill="none" stroke="${P.led}" stroke-width="6" opacity="0"/>
  </g>
  <!-- clock -->
  <g transform="translate(540 120)">
    <circle r="54" fill="${P.paper}" stroke="${P.frame}" stroke-width="8"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="-3" y="-46" width="6" height="11" rx="3" fill="${P.ink}" opacity=".5" transform="rotate(${i * 30})"/>`).join("")}
    <rect class="clock-h" x="-4" y="-30" width="8" height="34" rx="4" fill="${P.ink}"/>
    <rect class="clock-m" x="-3" y="-44" width="6" height="48" rx="3" fill="${P.ink}"/>
    <rect class="clock-s" x="-1" y="-48" width="2" height="54" fill="${P.accent2}"/>
    <circle r="6" fill="${P.ink}"/>
  </g>
  </g>
  <g class="cam">
  <!-- the clerk, behind the glass -->
  <rect x="690" y="212" width="376" height="340" rx="18" fill="${P.wallLine}"/>
  <g transform="translate(1000 452)"><rect x="-10" y="0" width="70" height="92" rx="8" fill="${P.ink}"/><rect x="-4" y="6" width="58" height="72" rx="4" fill="${P.accent}" opacity=".35"/><rect x="18" y="92" width="14" height="18" fill="${P.ink}"/></g>
  <g transform="translate(${CX} ${CY}) scale(-1 1)"><g class="c-root">${C}</g></g>
  <rect x="690" y="212" width="376" height="340" rx="18" fill="${P.glass}" opacity="${P.glassA}"/>
  <rect class="glint" x="720" y="226" width="40" height="310" fill="#FFFFFF" opacity=".16" transform="skewX(-12)"/>
  <rect x="690" y="212" width="376" height="340" rx="18" fill="none" stroke="${P.frame}" stroke-width="10"/>
  <rect x="780" y="168" width="200" height="40" rx="10" fill="${P.desk}"/>
  <text x="880" y="196" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="24" fill="#FFFFFF">SCHALTER 3</text>
  <!-- counter -->
  <rect x="672" y="560" width="408" height="320" fill="${P.desk}"/>
  <rect x="660" y="548" width="420" height="18" rx="5" fill="${P.deskTop}"/>
  <rect x="700" y="620" width="340" height="6" rx="3" fill="${P.deskTop}" opacity=".6"/>
  <g class="scanner" transform="translate(850 530)"><rect x="-40" y="0" width="80" height="20" rx="6" fill="${P.ink}"/><rect class="scan-glow" x="-32" y="-2" width="64" height="6" rx="3" fill="${P.ok}" opacity=".3"/></g>
  <!-- the visitor -->
  <g transform="translate(${VX} ${VY})">${V}</g>
  <!-- effects -->
  <g class="fx-sweat" opacity="0"><path d="M0 -14 q10 14 0 22 q-10 -8 0 -22 z" fill="#8FD3FF" stroke="#3A8CC0" stroke-width="2"/></g>
  ${[0, 1, 2].map((i) => `<text class="fx-q fx-q${i}" x="${610 + i * 46}" y="${300 - (i % 2) * 30}" font-family="Vazirmatn" font-weight="900" font-size="${64 - i * 8}" fill="${P.accent2}" opacity="0">?</text>`).join("")}
  <g class="fx-bulb" opacity="0" transform="translate(${VX + 40} 190)">
    <g class="fx-rays">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="-4" y="-70" width="8" height="20" rx="4" fill="#FFC928" transform="rotate(${a})"/>`).join("")}</g>
    <path d="M0 -40 a36 36 0 0 1 21 66 v10 h-42 v-10 a36 36 0 0 1 21 -66 z" fill="#FFC928" stroke="${P.ink}" stroke-width="4"/>
    <rect x="-18" y="38" width="36" height="10" rx="4" fill="${P.frame}"/><rect x="-14" y="50" width="28" height="10" rx="4" fill="${P.frame}"/></g>
  <g class="fx-check" opacity="0" transform="translate(800 380)"><circle r="36" fill="${P.ok}"/><path d="M-16 2 l11 11 l21 -24" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>
  <g class="fx-bubble" opacity="0" transform="translate(760 262)"><path d="M0 0 h130 a20 20 0 0 1 20 20 v46 a20 20 0 0 1 -20 20 h-54 l-26 22 l4 -22 h-54 a20 20 0 0 1 -20 -20 v-46 a20 20 0 0 1 20 -20 z" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/><text x="65" y="60" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="40" fill="${P.ink}">…?</text></g>
  </g>
  <rect class="vignette" width="1080" height="880" fill="url(#vignette)" pointer-events="none"/>
</svg>`;
}

// The everyday room: the friend sits at the table, the learner stands.
const RX_HAND = [792, 520];            // where things change hands, over the table
function roomSVG(P, held, thought) {
  const heldArt = (keys) => keys.map((k) => `<g class="ic-${k}" opacity="0"><g transform="translate(-6 -104)">${iconSVG(k, P)}</g></g>`).join("");
  const V = visitorSVG(P.visitor, heldArt(held), "");
  const C = clerkSVG(P.clerk, unflip(heldArt(held)), "", { badge: false });
  return `<svg class="stage-svg" viewBox="0 0 1080 880" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>${rigDefs("v", P.visitor)}${rigDefs("c", P.clerk)}
    <linearGradient id="beam-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.windowLight}" stop-opacity=".5"/><stop offset="1" stop-color="${P.windowLight}" stop-opacity="0"/></linearGradient>
    <radialGradient id="vignette" cx="50%" cy="45%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
    <radialGradient id="lamp-light" cx="50%" cy="20%" r="60%"><stop offset="0" stop-color="${P.room.light}" stop-opacity="${P.room.lightA}"/><stop offset=".55" stop-color="${P.room.light}" stop-opacity="${(P.room.lightA * 0.35).toFixed(2)}"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient>
    <linearGradient id="floor-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
    <linearGradient id="sky-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.room.sky}"/><stop offset="1" stop-color="${P.room.skyLow}"/></linearGradient>
    <clipPath id="win-clip"><rect x="668" y="86" width="304" height="208" rx="12"/></clipPath></defs>
  <!-- the camera drifts a few pixels the whole time, so no frame is ever frozen -->
  <g class="cam-drift">
  <g class="cam-bg">${roomBackSVG(P)}</g>
  <g class="cam">
  ${roomChairBackSVG(P)}
  <g transform="translate(${CX} ${CY}) scale(-1 1)"><g class="c-root">${C}</g></g>
  ${roomFrontSVG(P)}
  <g transform="translate(${VX} ${VY})">${V}</g>
  <g class="fx-sweat" opacity="0"><path d="M0 -14 q10 14 0 22 q-10 -8 0 -22 z" fill="#8FD3FF" stroke="#3A8CC0" stroke-width="2"/></g>
  ${[0, 1, 2].map((i) => `<text class="fx-q fx-q${i}" x="${640 + i * 46}" y="${290 - (i % 2) * 30}" font-family="Vazirmatn" font-weight="900" font-size="${64 - i * 8}" fill="${P.accent2}" opacity="0">?</text>`).join("")}
  <g class="fx-think" opacity="0" transform="translate(420 170)">
    <circle cx="150" cy="118" r="9" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/><circle cx="124" cy="96" r="13" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>
    <ellipse rx="100" ry="74" fill="${P.paper}" stroke="${P.ink}" stroke-width="5"/>
    ${thought.map((k) => `<g class="ic-${k}" opacity="0"><g transform="translate(-55 -55) scale(1.1)">${iconSVG(k, P)}</g></g>`).join("")}</g>
  <g transform="translate(790 300)">${Array.from({ length: 8 }, (_, i) => `<g transform="rotate(${i * 45})"><circle class="spark" cx="0" cy="0" r="${i % 2 ? 6 : 8}" fill="${i % 2 ? P.accent : P.accent2}" opacity="0"/></g>`).join("")}</g>
  <g class="fx-check" opacity="0" transform="translate(790 300)"><circle r="36" fill="${P.ok}"/><path d="M-16 2 l11 11 l21 -24" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>
  <g class="fx-bubble" opacity="0" transform="translate(690 190)"><path d="M0 0 h130 a20 20 0 0 1 20 20 v46 a20 20 0 0 1 -20 20 h-30 l22 22 l-44 -22 h-58 a20 20 0 0 1 -20 -20 v-46 a20 20 0 0 1 20 -20 z" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/><text x="65" y="60" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="40" fill="${P.ink}">…?</text></g>
  <g class="fx-bye" opacity="0" transform="translate(620 180)"><path d="M0 0 h210 a20 20 0 0 1 20 20 v50 a20 20 0 0 1 -20 20 h-40 l26 24 l-52 -24 h-144 a20 20 0 0 1 -20 -20 v-50 a20 20 0 0 1 20 -20 z" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/><text x="115" y="60" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="40" fill="${P.warm}">Tschüss!</text></g>
  </g>
  </g>
  <rect class="vignette" width="1080" height="880" fill="url(#vignette)" pointer-events="none"/>
</svg>`;
}

// ---------------------------------------------------------------- builder
/**
 * @param {object} a
 *   variant: "tiktok" | "instagram"
 *   episodeNo, total, topic, hook, loopLine, nextTopic, outroLine
 *   items: [{ de, fa, exDe, exFa }]
 *   beats: [{ de, deDur, ex, exDur, fa } | null]  — seconds from scene start
 *   hookDuration, tipDurations[], outroDuration
 */
export function buildAnimHTML(a) {
  const P = ANIM_VARIANTS[a.variant] || ANIM_VARIANTS.tiktok;
  const n = a.items.length;
  const office = (a.setting || "office") === "office";
  // Room: what each phrase can show without guessing. A phrase with no noun
  // of its own borrows the one in its example sentence (also on the card).
  const reads = a.items.map((it) => {
    const r = readPhrase(it.de);
    if (!r.noun && it.exDe) { const e = readPhrase(it.exDe); Object.assign(r, { noun: e.noun, kind: e.kind }); }
    return r;
  });
  const heldKeys = [...new Set(reads.filter((r) => r.kind === "hold").map((r) => r.noun))];
  const thoughtKeys = [...new Set(reads.filter((r) => r.kind === "think").map((r) => r.noun))];
  const HOOK = +a.hookDuration, OUTRO = +a.outroDuration, DURS = a.tipDurations.map(Number);
  const starts = [];
  { let t = HOOK; for (const d of DURS) { starts.push(t); t += d; } }
  const outroAt = starts.length ? starts[n - 1] + DURS[n - 1] : HOOK;
  const TOTAL = +(outroAt + OUTRO).toFixed(3);
  const beatsFor = (i) => {
    const b = a.beats?.[i];
    if (b) return { de: b.de, deDur: b.deDur ?? Math.max(0.8, b.ex - b.de - 0.45), ex: b.ex, exDur: b.exDur ?? Math.max(0.8, b.fa - b.ex - 0.45), fa: b.fa };
    const d = DURS[i];
    return { de: 0.25, deDur: d * 0.16, ex: d * 0.24, exDur: d * 0.3, fa: d * 0.6 };
  };
  const counter = `A1 · ${String(a.episodeNo).padStart(3, "0")}/${a.total || 100}`;
  const stageTop = P.layout === "stage-top";
  const STAGE_TOP = stageTop ? 250 : 700, CARD_TOP = stageTop ? 1150 : 250;

  // ---- cards (one clip per scene)
  const header = `<div class="head"><span class="chip">${esc(counter)}</span><span class="topic">${esc(a.topic)}</span></div>`;
  const hookSec = `<section id="k0" class="clip scene" data-start="0" data-duration="${F(HOOK)}" data-track-index="2">
  <div class="card"><div class="hooktext" dir="rtl">${esc(a.hook)}</div><div class="loop" dir="rtl">${esc(a.loopLine)}</div></div>
</section>`;
  const stepSecs = a.items.map((it, i) => {
    const words = String(it.de).split(/\s+/).map((w) => `<span class="w">${esc(w)}</span>`).join(" ");
    return `<section id="k${i + 1}" class="clip scene" data-start="${F(starts[i])}" data-duration="${F(DURS[i])}" data-track-index="2">
  <div class="card"><div class="step" dir="rtl">${faDigits(i + 1)}/${faDigits(n)}</div>
    <div class="de${String(it.de).length > 20 ? " long" : ""}" dir="ltr">${words}</div>
    <div class="fa" dir="rtl">${esc(it.fa)}</div>
    ${it.exDe ? `<div class="rule"></div><div class="exde" dir="ltr">${esc(it.exDe)}</div><div class="exfa" dir="rtl">${esc(it.exFa)}</div>` : ""}</div>
</section>`;
  });
  const outroSec = `<section id="k${n + 1}" class="clip scene" data-start="${F(outroAt)}" data-duration="${F(OUTRO)}" data-track-index="2">
  <div class="card"><div class="next" dir="rtl">${esc(`قسمت بعد: ${a.nextTopic}`)}</div><div class="outro" dir="rtl">${esc(a.outroLine)}</div></div>
</section>`;

  const css = `${FONT_FACES}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;background:${P.bg};overflow:hidden}
#root{position:relative;width:100%;height:100%;background:${P.bg};font-family:"Vazirmatn",sans-serif;overflow:hidden}
.head{position:absolute;top:150px;left:70px;right:70px;height:84px;display:flex;align-items:center;justify-content:space-between;gap:24px}
.chip{display:block;padding:10px 24px;border-radius:999px;border:4px solid ${P.cardLine};color:${P.headColor};font-weight:900;font-size:34px;direction:ltr}
.topic{display:block;color:${P.headColor};font-weight:900;font-size:44px;direction:rtl}
.stagebox{position:absolute;left:0;top:${STAGE_TOP}px;width:1080px;height:880px;overflow:hidden}
.stage-svg{display:block;width:1080px;height:880px}
.scene{position:absolute;inset:0}
.card{position:absolute;left:56px;right:56px;top:${CARD_TOP}px;height:430px;padding:22px 38px;border-radius:38px;background:${P.cardBg};border:5px solid ${P.cardLine};display:flex;flex-direction:column;justify-content:center;gap:6px;overflow:hidden}
.hooktext{display:block;color:${P.faColor};font-weight:900;font-size:66px;line-height:1.35;text-align:center}
.loop{display:block;margin-top:16px;color:${P.loopColor};font-weight:800;font-size:40px;text-align:center}
.step{display:block;color:${P.subColor};font-weight:800;font-size:32px;text-align:center}
.de{display:block;color:${P.deColor};font-weight:900;font-size:74px;line-height:1.12;text-align:center;direction:ltr}
.de.long{font-size:60px}
.w{display:inline-block}
.fa{display:block;color:${P.faColor};font-weight:900;font-size:50px;line-height:1.35;text-align:center}
.rule{display:block;height:4px;margin:6px 120px;border-radius:2px;background:${P.cardLine};opacity:.5}
.exde{display:block;color:${P.subColor};font-weight:900;font-size:30px;line-height:1.25;text-align:center;direction:ltr}
.exfa{display:block;color:${P.subColor};font-weight:700;font-size:29px;line-height:1.45;text-align:center}
.next{display:block;color:${P.deColor};font-weight:900;font-size:56px;line-height:1.35;text-align:center}
.outro{display:block;margin-top:18px;color:${P.faColor};font-weight:800;font-size:44px;line-height:1.45;text-align:center}
`;

  // ------------------------------------------------------------ timeline
  const js = [];
  const V = new Actor(js, "v", { x: VX, y: VY });
  const C = new Actor(js, "c", { x: CX, y: CY, mirror: true });
  const pop = (sel, at) => js.push(`tl.fromTo("${sel}",{scale:0,opacity:0,transformOrigin:"50% 50%"},{scale:1,opacity:1,duration:.4,ease:"back.out(2.2)",immediateRender:false},${F(at)});`);
  const hide = (sel, at, dur = 0.25) => js.push(`tl.to("${sel}",{opacity:0,duration:${dur}},${F(at)});`);
  const show = (sel, at) => js.push(`tl.set("${sel}",{opacity:1},${F(at)});`);
  const off = (sel, at) => js.push(`tl.set("${sel}",{opacity:0},${F(at)});`);
  // The room behind scales about half as much as the people: a cheap parallax
  // that reads as a real camera push instead of a flat zoom.
  const bgScale = (s) => +(1 + (s - 1) * 0.55).toFixed(3);
  const cam = (at, dur, scale, fx, fy) => {
    js.push(`tl.to(".cam",{scale:${scale},svgOrigin:"${fx} ${fy}",duration:${dur},ease:"power2.inOut"},${F(at)});`);
    js.push(`tl.to(".cam-bg",{scale:${bgScale(scale)},svgOrigin:"${fx} ${fy}",duration:${dur},ease:"power2.inOut"},${F(at)});`);
  };

  // rest poses at 0 — every bone starts from a known angle
  V.set(0, { ...V.pose });
  // The clerk is seated behind the counter: she has no leg bones to pose.
  const { thN, shN, ftN, thF, shF, ftF, ...clerkPose } = C.pose;
  C.set(0, clerkPose);
  C.to(0, 0, { torso: -4, head: 8 });
  V.mouth(0, "M"); C.mouth(0, "M");
  js.push(`tl.set(".cam, .cam-bg",{scale:1,svgOrigin:"540 440"},0);`);
  // ambient life in the room: finite yoyos, so every frame is seekable
  const yo = (sel, from, to, dur, at = 0, ease = "sine.inOut") => js.push(`tl.fromTo("${sel}",${from},{...${to},duration:${dur},repeat:${Math.max(0, Math.floor((TOTAL - at) / dur) - 1)},yoyo:true,ease:"${ease}"},${F(at)});`);
  if (office) {
  yo(".bgp1-head", `{rotation:-4,svgOrigin:"36 70"}`, `{rotation:5,svgOrigin:"36 70"}`, 3.1, 0.3);
  yo(".bgp2-head", `{rotation:6,svgOrigin:"36 70"}`, `{rotation:10,svgOrigin:"36 70"}`, 1.7, 0.8);
  yo(".bgp2-glow", `{opacity:.35}`, `{opacity:.75}`, 0.9, 0);
  yo(".beam", `{opacity:.38}`, `{opacity:.58}`, 4.2, 0);
  [[".dust0", -14, 30, 5.3], [".dust1", 10, -26, 6.1], [".dust2", -8, -34, 4.7]].forEach(([sel, dx, dy, d], i) =>
    yo(sel, `{x:0,y:0}`, `{x:${dx},y:${dy}}`, d, i * 0.6));
  // a passer-by crosses the back of the room once, mid-video
  const PB0 = +(TOTAL * 0.42).toFixed(2), PBD = 6.4, step = 0.4;
  js.push(`tl.fromTo(".pb",{x:0},{x:1400,duration:${PBD},ease:"none",immediateRender:false},${F(PB0)});`);
  for (let k = 0; k < PBD / step; k++) {
    const t = PB0 + k * step, sgn = k % 2 ? 1 : -1;
    js.push(`tl.to(".pb-l1",{rotation:${18 * sgn},svgOrigin:"0 124",duration:${step},ease:"sine.inOut"},${F(t)});`);
    js.push(`tl.to(".pb-l2",{rotation:${-18 * sgn},svgOrigin:"0 124",duration:${step},ease:"sine.inOut"},${F(t)});`);
    js.push(`tl.to(".pb",{y:${k % 2 ? 0 : -6},duration:${step / 2},ease:"sine.out"},${F(t)});`);
  }
  js.push(`tl.fromTo(".glint",{x:-30},{x:280,duration:${F(TOTAL)},ease:"none"},0);`);
  } else {
    yo(".curtain-l", `{rotation:-1.4,svgOrigin:"666 70"}`, `{rotation:1.4,svgOrigin:"666 70"}`, 3.4, 0);
    yo(".curtain-r", `{rotation:1.2,svgOrigin:"974 70"}`, `{rotation:-1.2,svgOrigin:"974 70"}`, 3.9, 0.5);
    yo(".obj-lampe", `{rotation:-1.2,svgOrigin:"520 0"}`, `{rotation:1.2,svgOrigin:"520 0"}`, 3.1, 0.2);
    yo(".lamp-glow", `{opacity:.4}`, `{opacity:.75}`, 2.2, 0);
    yo(".steam", `{y:0,opacity:.2}`, `{y:-12,opacity:.7}`, 1.6, 0);
    yo(".beam", `{opacity:.38}`, `{opacity:.58}`, 4.2, 0);
    [[".dust0", -14, 30, 5.3], [".dust1", 10, -26, 6.1], [".dust2", -8, -34, 4.7]].forEach(([sel, dx, dy, d], i) =>
      yo(sel, `{x:0,y:0}`, `{x:${dx},y:${dy}}`, d, i * 0.6));
    // outside the window: clouds cross, stars twinkle
    js.push(`tl.fromTo(".cloud1",{x:-40},{x:210,duration:${F(TOTAL)},ease:"none"},0);`);
    js.push(`tl.fromTo(".cloud2",{x:60},{x:-150,duration:${F(TOTAL)},ease:"none"},0);`);
    [0, 1, 2].forEach((k) => yo(`.star${k}`, `{opacity:.25}`, `{opacity:1}`, 0.9 + k * 0.45, k * 0.3));
    // the plants breathe in the draught from the window
    yo(".plant", `{rotation:-2.2,svgOrigin:"22 170"}`, `{rotation:2.2,svgOrigin:"22 170"}`, 2.9, 0);
    yo(".shelf-leaf", `{rotation:-4,svgOrigin:"146 32"}`, `{rotation:4,svgOrigin:"146 32"}`, 2.3, 0.4);
    // camera micro-drift: a slow Lissajous (x and y at ~1.3x different periods),
    // scaled up a hair so the drift never shows the frame edge
    js.push(`tl.set(".cam-drift",{scale:1.018,svgOrigin:"540 440"},0);`);
    yo(".cam-drift", `{x:-5}`, `{x:5}`, 6.2, 0);
    yo(".cam-drift", `{y:-3}`, `{y:3}`, 8.1, 0);
  }
  js.push(`tl.fromTo(".clock-s",{rotation:0,svgOrigin:"0 0"},{rotation:${Math.round(TOTAL) * 6},svgOrigin:"0 0",duration:${F(TOTAL)},ease:"steps(${Math.round(TOTAL)})"},0);`);
  js.push(`tl.fromTo(".clock-h",{rotation:-90,svgOrigin:"0 0"},{rotation:-90,svgOrigin:"0 0",duration:.01},0);`);
  js.push(`tl.fromTo(".win-light",{x:0},{x:150,duration:${F(TOTAL)},ease:"none"},0);`);
  V.blinks(0, TOTAL, 0.4); C.blinks(0, TOTAL, 1.7);
  C.breathe(0, TOTAL, 2.2);
  C.life(0, TOTAL, { sway: false, strings: false });

  // ---- HOOK: he walks in, the number is called, he freezes
  const W = 2.6, fps = 15;
  js.push(`tl.fromTo(".v-move",{x:${WALK_FROM}},{x:0,duration:${W},ease:"none"},0);`);
  for (let k = 0; k <= W * fps; k++) {
    const t = k / fps, f = t * 30, w = walkAt(f);
    const swing = Math.sin((2 * Math.PI * f) / 30);
    V.to(t, 1 / fps, { ...w, uN: 8 - 22 * swing, fN: -18, uF: -6 + 22 * swing, fF: -18 }, "none");
    js.push(`tl.to(".v-move",{y:${(-7 * Math.abs(Math.sin((2 * Math.PI * f) / 30))).toFixed(2)},duration:${(1 / fps).toFixed(3)},ease:"none"},${F(t)});`);
  }
  V.to(W, 0.35, { thN: 0, shN: 0, ftN: 0, thF: 0, shF: 0, ftF: 0 }, "power2.out");
  V.rest(W, 0.4);
  js.push(`tl.to(".v-move",{y:0,duration:.3,ease:"power2.out"},${F(W)});`);
  V.breathe(W + 0.4, TOTAL, 1.8);
  V.life(W + 0.4, TOTAL);
  if (office) {
  // the clerk types until the number changes
  for (let k = 0; k < 8; k++) {
    C.to(0.2 + k * 0.32, 0.16, { uN: -18, fN: -52, hN: 70 }, "sine.inOut");
    C.to(0.36 + k * 0.32, 0.16, { uN: -14, fN: -60, hN: 74 }, "sine.inOut");
  }
  C.look(0, -4, 3);
  V.look(W + 0.1, -3, -5);
  V.to(W + 0.1, 0.4, { head: -9 });
  js.push(`tl.to(".board-old",{y:-40,opacity:0,duration:.25,ease:"power2.in"},${F(W + 0.5)});`);
  js.push(`tl.fromTo(".board-new",{y:40,opacity:0},{y:0,opacity:1,duration:.3,ease:"back.out(2)",immediateRender:false},${F(W + 0.75)});`);
  js.push(`tl.fromTo(".board-ring",{opacity:0,scale:.9,transformOrigin:"50% 50%"},{opacity:1,scale:1.06,transformOrigin:"50% 50%",duration:.3,repeat:3,yoyo:true,ease:"sine.inOut",immediateRender:false},${F(W + 0.75)});`);
  C.to(W + 1.0, 0.4, { uN: 8, fN: -10, hN: 2, head: 0, torso: 0 });
  C.look(W + 1.0, 4, 0);
  C.brows(W + 1.1, -8, -8, 4);
  C.mouth(W + 1.1, "S");
  pop(".fx-bubble", W + 1.3);
  V.to(W + 1.3, 0.3, { head: 2 });
  V.look(W + 1.3, 3, 0);
  V.brows(W + 1.5, 14, -10, 5);
  V.mouth(W + 1.6, "W");
  js.push(`tl.fromTo(".fx-sweat",{x:${VX + 78},y:${VY - 282},opacity:0},{opacity:1,y:${VY - 262},duration:.9,ease:"power1.in",immediateRender:false},${F(W + 1.9)});`);
  for (let k = 0; k < 4; k++) V.to(W + 1.6 + k * 0.2, 0.1, { head: k % 2 ? 1 : 3 }, "sine.inOut");
  cam(W + 0.2, 1.4, 1.06, 320, 470);
  hide(".fx-bubble", HOOK - 0.3); hide(".fx-sweat", HOOK - 0.3);

  // ---- the four phrases
  const [hx, hy] = HAND_OFF;
  a.items.forEach((it, i) => {
    const t0 = starts[i], d = DURS[i], b = beatsFor(i);
    const de = t0 + b.de, ex = t0 + b.ex, fa = t0 + b.fa, end = t0 + d;
    V.mouth(t0, "M"); V.brows(t0, 0, 0, 0); C.brows(t0, 0, 0, 0); V.look(t0, 3, 0); C.look(t0, 4, 0);
    V.lipSync(de, b.deDur, it.de);
    if (it.exDe) V.lipSync(ex, b.exDur, it.exDe);
    const k = i % 4;
    if (k === 0) {
      // Termin: the slip comes out of his pocket, up for the clerk, across
      cam(t0, 0.9, 1.12, 320, 470);
      V.reach(t0 + 0.05, 0.35, "N", VX + 30, VY + 40);
      show(".v-held-N .pr-slip", t0 + 0.4);
      V.reach(t0 + 0.45, 0.45, "N", VX + 110, VY - 170);
      V.nod(de + 0.2, 1, 5);
      V.reach(ex + 0.2, 0.7, "N", hx, hy, { torso: 6 });
      C.reach(ex + 0.5, 0.45, "N", hx + 10, hy - 4, { torso: 8 });
      off(".v-held-N .pr-slip", ex + 1.0); show(".c-held-N .pr-slip", ex + 1.0);
      V.rest(ex + 1.1, 0.5); V.to(ex + 1.1, 0.5, { torso: 0 });
      C.reach(ex + 1.1, 0.6, "N", CX - 110, CY - 200, { torso: 0 });
      C.look(ex + 1.2, 2, 5); C.to(ex + 1.2, 0.4, { head: 10 });
      js.push(`tl.to(".clock-h",{rotation:-60,svgOrigin:"0 0",duration:.8,ease:"power2.inOut"},${F(ex)});`);
      js.push(`tl.fromTo(".clock-m",{rotation:-180,svgOrigin:"0 0"},{rotation:0,svgOrigin:"0 0",duration:.8,ease:"power2.inOut",immediateRender:false},${F(ex)});`);
      C.to(fa, 0.3, { head: 0 }); C.nod(fa + 0.2, 2, 7); C.mouth(fa + 0.2, "S");
      pop(".fx-check", fa + 0.6); hide(".fx-check", end - 0.4);
      V.mouth(fa + 0.5, "S"); V.brows(fa + 0.5, -6, -6, 3);
      C.rest(end - 0.8, 0.5); off(".c-held-N .pr-slip", end - 0.35);
    } else if (k === 1) {
      // Ausweis: out of the back pocket, shown at face height, scanned
      cam(t0, 0.9, 1.14, 320, 470);
      V.reach(t0 + 0.05, 0.35, "N", VX - 20, VY + 30);
      show(".v-held-N .pr-id", t0 + 0.4);
      V.reach(t0 + 0.45, 0.45, "N", VX + 120, VY - 190);
      V.nod(de + 0.3, 1, 4);
      V.reach(ex + 0.1, 0.7, "N", hx, hy, { torso: 6 });
      C.reach(ex + 0.45, 0.45, "N", hx + 10, hy - 4, { torso: 8 });
      off(".v-held-N .pr-id", ex + 0.95); show(".c-held-N .pr-id", ex + 0.95);
      V.rest(ex + 1.0, 0.5); V.to(ex + 1.0, 0.5, { torso: 0 });
      C.reach(ex + 1.05, 0.6, "N", 855, 526, { torso: 4 });
      C.look(ex + 1.1, -3, 6);
      js.push(`tl.fromTo(".scan-glow",{opacity:.3},{opacity:1,duration:.2,repeat:3,yoyo:true,immediateRender:false},${F(ex + 1.7)});`);
      js.push(`tl.fromTo(".c-held-N .pr-scan",{x:0,opacity:.9},{x:124,opacity:.9,duration:.8,ease:"power1.inOut",immediateRender:false},${F(ex + 1.7)});`);
      hide(".c-held-N .pr-scan", ex + 2.5, 0.15);
      pop(".fx-check", fa + 0.2); hide(".fx-check", end - 0.6);
      C.look(fa, 4, 0); C.mouth(fa + 0.1, "S"); C.nod(fa + 0.2, 1, 6);
      C.reach(fa + 0.6, 0.6, "N", hx + 10, hy - 4, { torso: 8 });
      V.reach(fa + 0.9, 0.5, "N", hx, hy, { torso: 6 });
      off(".c-held-N .pr-id", fa + 1.45); show(".v-held-N .pr-id", fa + 1.45);
      C.rest(fa + 1.5, 0.5); C.to(fa + 1.5, 0.5, { torso: 0 });
      V.reach(fa + 1.55, 0.5, "N", VX - 20, VY + 30, { torso: 0 });
      off(".v-held-N .pr-id", fa + 2.1); V.rest(fa + 2.15, 0.5);
      V.mouth(fa + 0.3, "S");
    } else if (k === 2) {
      // verstehe nicht: the clerk hands over the form; he reads, frowns, scratches his head
      cam(t0, 0.9, 1.12, 320, 420);
      show(".c-held-F .pr-form", t0 + 0.05);
      C.reach(t0 + 0.1, 0.6, "F", hx + 30, hy - 10, { torso: 8 });
      V.reach(t0 + 0.5, 0.5, "N", hx - 10, hy - 6, { torso: 6 });
      off(".c-held-F .pr-form", t0 + 1.05); show(".v-held-N .pr-form", t0 + 1.05);
      C.rest(t0 + 1.1, 0.5); C.to(t0 + 1.1, 0.5, { torso: 0 });
      V.reach(t0 + 1.1, 0.6, "N", VX + 96, VY - 30, { torso: 0 });
      V.to(t0 + 1.1, 0.5, { head: 10 }); V.look(t0 + 1.1, 2, 6);
      V.brows(de, 16, -12, 2); V.to(de, 0.4, { head: -8 });
      [0, 1, 2].forEach((q) => pop(`.fx-q${q}`, ex + q * 0.4));
      V.reach(fa, 0.55, "F", VX + 4, VY - 322, { elbowDown: false });
      for (let r = 0; r < 5; r++) {
        V.reach(fa + 0.6 + r * 0.3, 0.15, "F", VX + 16, VY - 326, { elbowDown: false, ease: "sine.inOut" });
        V.reach(fa + 0.75 + r * 0.3, 0.15, "F", VX - 8, VY - 318, { elbowDown: false, ease: "sine.inOut" });
      }
      V.mouth(fa + 0.2, "W");
      V.rest(end - 0.9, 0.5, "F");
      [0, 1, 2].forEach((q) => hide(`.fx-q${q}`, end - 0.5));
      C.look(fa, 4, 1); C.brows(fa, -6, -6, 3);
    } else {
      // erklären: form on the counter between them; he asks with open palms,
      // she walks him through it line by line with her pen
      cam(t0, 0.9, 1.08, 320, 440);
      V.reach(t0 + 0.05, 0.55, "N", VX + 150, VY - 90, { torso: 4 });
      V.to(t0 + 0.1, 0.4, { head: 0 }); V.look(t0 + 0.1, 3, 0);
      V.reach(de, 0.5, "F", VX + 70, VY - 60);
      V.brows(de, -10, -10, 6); V.to(de, 0.4, { head: -5 });
      show(".c-held-N .pr-pen", t0 + 0.2);
      C.reach(ex, 0.55, "N", VX + 200, VY - 244, { torso: 14 });
      // .c-bob sits inside the mirrored group: +x here moves her toward him.
      js.push(`tl.to(".c-bob",{x:18,duration:.5,ease:"power2.out"},${F(ex)});`);
      C.look(ex, 3, 4); C.to(ex, 0.4, { head: 12 });
      V.look(ex + 0.2, 2, 5); V.to(ex + 0.2, 0.4, { head: 9 });
      V.rest(ex + 0.2, 0.5, "F");
      for (let r = 0; r < 5; r++) {
        const tt = ex + 0.6 + r * 0.55;
        C.reach(tt, 0.3, "N", VX + 196 + (r % 2) * 26, VY - 244 + r * 30, { torso: 14 });
        js.push(`tl.to(".v-held-N .pr-hl${r}",{scaleX:1,svgOrigin:"2 0",duration:.3,ease:"power2.out"},${F(tt + 0.2)});`);
      }
      V.nod(fa - 0.4, 2, 6);
      pop(".fx-bulb", fa + 0.3);
      js.push(`tl.fromTo(".fx-rays",{scale:.6,opacity:0,transformOrigin:"50% 50%"},{scale:1,opacity:1,transformOrigin:"50% 50%",duration:.35,ease:"back.out(2)",immediateRender:false},${F(fa + 0.5)});`);
      V.mouth(fa + 0.3, "S"); V.brows(fa + 0.3, -8, -8, 5);
      C.mouth(fa + 0.5, "S");
      C.rest(fa + 0.9, 0.5); C.to(fa + 0.9, 0.5, { torso: 0, head: 0 }); off(".c-held-N .pr-pen", fa + 1.3);
      js.push(`tl.to(".c-bob",{x:0,duration:.5,ease:"power2.inOut"},${F(fa + 0.9)});`);
      V.reach(fa + 1.2, 0.5, "N", VX + 40, VY + 20, { torso: 0 }); off(".v-held-N .pr-form", fa + 1.7);
      V.rest(fa + 1.75, 0.5, "N");
      hide(".fx-bulb", end - 0.4);
    }
  });

  // ---- outro: thanks on the board, both wave
  cam(outroAt, 1.0, 1.0, 540, 440);
  js.push(`tl.to(".board-nums",{opacity:0,duration:.25},${F(outroAt + 0.2)});`);
  js.push(`tl.fromTo(".board-thanks",{scale:.6,opacity:0,transformOrigin:"50% 50%"},{scale:1,opacity:1,transformOrigin:"50% 50%",duration:.4,ease:"back.out(2)",immediateRender:false},${F(outroAt + 0.4)});`);
  V.look(outroAt, 0, 0); V.mouth(outroAt + 0.3, "S"); V.brows(outroAt + 0.3, -8, -8, 4); V.to(outroAt, 0.4, { head: -4 });
  V.reach(outroAt + 0.3, 0.5, "N", VX + 70, VY - 330, { elbowDown: true });
  for (let r = 0; r < 6; r++) V.to(outroAt + 0.9 + r * 0.32, 0.16, { hN: r % 2 ? 30 : -20 }, "sine.inOut");
  C.mouth(outroAt + 0.4, "S");
  C.reach(outroAt + 0.5, 0.5, "N", CX - 80, CY - 330);
  for (let r = 0; r < 5; r++) C.to(outroAt + 1.1 + r * 0.34, 0.17, { hN: r % 2 ? 26 : -18 }, "sine.inOut");
  V.rest(outroAt + OUTRO - 1.2, 0.6); C.rest(outroAt + OUTRO - 1.1, 0.6);
  } else {
  // ---- ROOM. HOOK: the friend at the table looks up and waves him over;
  // she asks him something and he has no words yet.
  const VL = new Actor(js, "v", { x: VX, y: VY, mirror: true });
  VL.pose = V.pose;                    // one body, two facings
  const face = (t, left) => js.push(`tl.to(".v-face",{scaleX:${left ? -1 : 1},svgOrigin:"0 0",duration:.22,ease:"power2.inOut"},${F(t)});`);
  const [hx, hy] = RX_HAND;
  C.to(0, 0.01, { head: 12 }); C.look(0, 2, 6);
  C.to(W - 0.9, 0.4, { head: 0 }); C.look(W - 0.9, 4, -1);
  C.mouth(W - 0.8, "S"); C.brows(W - 0.8, -8, -8, 4);
  C.reach(W - 0.7, 0.5, "N", CX - 80, CY - 330);
  for (let r = 0; r < 5; r++) C.to(W - 0.2 + r * 0.3, 0.15, { hN: r % 2 ? 26 : -18 }, "sine.inOut");
  C.rest(W + 1.3, 0.5);
  V.look(W + 0.1, 3, -1);
  V.reach(W + 0.3, 0.45, "N", VX + 70, VY - 330, { elbowDown: true });
  for (let r = 0; r < 3; r++) V.to(W + 0.8 + r * 0.28, 0.14, { hN: r % 2 ? 28 : -18 }, "sine.inOut");
  V.rest(W + 1.7, 0.5);
  pop(".fx-bubble", W + 1.6);
  C.mouth(W + 1.6, "O");
  V.brows(W + 2.0, 14, -10, 5); V.mouth(W + 2.1, "W");
  js.push(`tl.fromTo(".fx-sweat",{x:${VX + 78},y:${VY - 282},opacity:0},{opacity:1,y:${VY - 262},duration:.9,ease:"power1.in",immediateRender:false},${F(W + 2.2)});`);
  cam(W + 0.2, 1.4, 1.06, 600, 470);
  hide(".fx-bubble", HOOK - 0.3); hide(".fx-sweat", HOOK - 0.3); C.mouth(HOOK - 0.3, "M");

  // ---- each phrase: said, and acted only with what its words name
  a.items.forEach((it, i) => {
    const t0 = starts[i], d = DURS[i], b = beatsFor(i), r = reads[i];
    const de = t0 + b.de, ex = t0 + b.ex, fa = t0 + b.fa, end = t0 + d;
    V.mouth(t0, "M"); V.brows(t0, 0, 0, 0); C.brows(t0, 0, 0, 0); V.look(t0, 3, 0); C.look(t0, 4, 0);
    V.to(t0, 0.3, { head: 0 }); C.to(t0, 0.3, { head: 0 });
    V.lipSync(de, b.deDur, it.de);
    if (it.exDe) V.lipSync(ex, b.exDur, it.exDe);
    cam(t0, 0.9, i % 2 ? 1.1 : 1.13, 600, 470);
    let farBusy = false, faced = false;
    if (r.kind === "hold") {
      // out of the pocket and up at face height, for the friend to see
      const mine = `.v-held-N .ic-${r.noun}`, hers = `.c-held-N .ic-${r.noun}`;
      V.look(t0, 2, 5);                                      // eyes first: into the pocket
      V.reach(t0 + 0.08, 0.35, "N", VX + 30, VY + 40);
      show(mine, t0 + 0.42);
      js.push(`tl.fromTo("${mine}",{scale:.35},{scale:1,transformOrigin:"50% 100%",duration:.45,ease:"back.out(2.6)",immediateRender:false},${F(t0 + 0.42)});`);
      V.look(t0 + 0.4, 3, -2);
      V.gesture(t0 + 0.5, 0.5, "N", VX + 120, VY - 190);
      C.look(t0 + 0.6, 3, 2); C.brows(t0 + 0.7, -6, -6, 5);   // she notices it
      if (r.you && !r.question) {
        // "dein …": it goes across the table to her
        V.gesture(ex + 0.1, 0.7, "N", hx, hy, { torso: 6 });
        C.gesture(ex + 0.45, 0.45, "N", hx + 10, hy - 4, { torso: 8, lean: 2 });
        off(mine, ex + 0.95); show(hers, ex + 0.95);
        V.rest(ex + 1.0, 0.5); V.to(ex + 1.0, 0.5, { torso: 0 });
        C.reach(ex + 1.05, 0.6, "N", CX - 110, CY - 200, { torso: 0 });
        C.rest(end - 0.8, 0.5); off(hers, end - 0.35);
      } else {
        V.reach(end - 0.95, 0.45, "N", VX + 30, VY + 40); off(mine, end - 0.45); V.rest(end - 0.4, 0.3, "N");
      }
    } else if (r.kind === "point") {
      // the thing is in the room: turn to it, point, it lights up
      const [tx, ty] = ROOM_TARGETS[r.noun];
      faced = tx < VX - 60;
      const A = faced ? VL : V;
      A.look(t0 + 0.05, 3, ty < VY - 250 ? -4 : 3);            // eyes lead, then the body turns, then the arm
      if (faced) face(t0 + 0.15, true);
      A.gesture(t0 + 0.35, 0.5, "N", tx, ty, { elbowDown: ty > VY - 200, lean: 4 });
      js.push(`tl.fromTo(".ring-${r.noun}",{opacity:0,scale:1.06,transformOrigin:"50% 50%"},{opacity:1,scale:1,transformOrigin:"50% 50%",duration:.3,repeat:5,yoyo:true,ease:"sine.inOut",immediateRender:false},${F(de)});`);
      C.look(t0 + 0.4, tx < CX - 200 ? 4 : -2, ty < CY - 250 ? -4 : 2);
      A.rest(ex + 0.3, 0.5, "N");
      if (faced) face(ex + 0.6, false);
    } else if (r.kind === "think") {
      // not in the room: he pictures it; it appears in a thought bubble
      V.look(t0 + 0.2, 1, -5); V.to(t0 + 0.2, 0.4, { head: -6 });
      V.reach(t0 + 0.3, 0.5, "F", VX + 56, VY - 236); farBusy = true;
      pop(".fx-think", de); show(`.fx-think .ic-${r.noun}`, de);
      V.rest(ex, 0.5, "F"); V.to(ex, 0.4, { head: 0 }); V.look(ex, 3, 0);
      js.push(`tl.fromTo(".fx-think .ic-${r.noun}",{scale:.3,rotation:-12,transformOrigin:"50% 50%"},{scale:1,rotation:0,transformOrigin:"50% 50%",duration:.5,ease:"back.out(2.4)",immediateRender:false},${F(de + 0.1)});`);
      V.gesture(ex + 0.1, 0.5, "N", VX + 160, VY - 110); V.rest(end - 0.8, 0.5, "N");
      hide(".fx-think", end - 0.5); off(`.fx-think .ic-${r.noun}`, end - 0.2);
    } else {
      // nothing to show: he talks with an open palm toward her
      V.gesture(de, 0.45, "N", VX + 160, VY - 110); V.rest(ex - 0.1, 0.45, "N");
      if (it.exDe) { V.gesture(ex + 0.2, 0.45, "N", VX + 150, VY - 90); V.rest(fa - 0.1, 0.45, "N"); }
    }
    // she listens while he speaks: a small nod, eyes on him
    if (r.kind !== "point") { C.look(de + 0.2, 4, 0); C.nod(de + Math.min(1.2, b.deDur * 0.6), 1, 4); }
    // what the sentence means, told with the far hand and the head
    if (r.negation) {
      V.reach(ex + 0.1, 0.4, "F", VX + 120, VY - 170);
      for (let k = 0; k < 4; k++) { V.to(ex + 0.5 + k * 0.2, 0.1, { hF: k % 2 ? 34 : -22 }, "sine.inOut"); V.to(ex + 0.5 + k * 0.2, 0.1, { head: k % 2 ? 6 : -6 }, "sine.inOut"); }
      V.to(ex + 1.35, 0.2, { head: 0 }); V.rest(ex + 1.5, 0.5, "F"); V.mouth(fa + 0.2, "W");
    } else if (r.self && !farBusy) {
      V.gesture(de + 0.35, 0.4, "F", VX + 34, VY - 160, { lean: 2 }); V.rest(de + 1.4, 0.45, "F");
    } else if (r.you && !farBusy && r.kind !== "hold") {
      V.gesture(de + 0.35, 0.4, "F", VX + 190, VY - 150, { lean: 2 }); V.rest(de + 1.4, 0.45, "F");
    }
    if (r.question) {
      V.brows(de + 0.1, 14, -10, 5); V.to(de + 0.1, 0.3, { head: -6 });
      [0, 1, 2].forEach((q) => pop(`.fx-q${q}`, de + 0.3 + q * 0.3));
      [0, 1, 2].forEach((q) => hide(`.fx-q${q}`, fa));
      V.to(fa, 0.3, { head: 0 });
    }
    // her reaction, and his
    cam(fa - 0.2, 0.8, 1.08, 760, 440);
    C.look(fa, 4, 0);
    if (r.question) { C.nod(fa + 0.1, 1, 6); C.reach(fa + 0.2, 0.5, "N", CX - 150, CY - 150); C.mouth(fa + 0.2, "S"); if (r.kind !== "hold" || !r.you) C.rest(end - 0.9, 0.5); }
    else {
      C.nod(fa + 0.2, 2, 7); C.mouth(fa + 0.2, "S"); pop(".fx-check", fa + 0.5); hide(".fx-check", end - 0.4);
      // a small burst around the tick: eight sparks fly out and fade
      js.push(`tl.fromTo(".spark",{y:0,opacity:1,scale:1},{y:-78,opacity:0,scale:.3,duration:.65,ease:"power2.out",immediateRender:false},${F(fa + 0.55)});`);
    }
    if (!r.negation) { V.mouth(fa + 0.5, "S"); V.brows(fa + 0.5, -6, -6, 3); }
    V.rest(end - 0.6, 0.45); C.mouth(end - 0.3, "M");
  });

  // ---- outro: she says goodbye, both wave
  cam(outroAt, 1.0, 1.0, 540, 440);
  pop(".fx-bye", outroAt + 0.4);
  V.look(outroAt, 0, 0); V.mouth(outroAt + 0.3, "S"); V.brows(outroAt + 0.3, -8, -8, 4); V.to(outroAt, 0.4, { head: -4 });
  V.reach(outroAt + 0.3, 0.5, "N", VX + 70, VY - 330, { elbowDown: true });
  for (let r = 0; r < 6; r++) V.to(outroAt + 0.9 + r * 0.32, 0.16, { hN: r % 2 ? 30 : -20 }, "sine.inOut");
  C.mouth(outroAt + 0.4, "S");
  C.reach(outroAt + 0.5, 0.5, "N", CX - 80, CY - 330);
  for (let r = 0; r < 5; r++) C.to(outroAt + 1.1 + r * 0.34, 0.17, { hN: r % 2 ? 26 : -18 }, "sine.inOut");
  V.rest(outroAt + OUTRO - 1.2, 0.6); C.rest(outroAt + OUTRO - 1.1, 0.6);
  hide(".fx-bye", outroAt + OUTRO - 0.8);
  }

  // ---- cards: the hook card is readable from frame 0; the others change on the beat
  const HL = a.variant === "instagram" ? P.warm : P.accent;   // karaoke highlight, readable on each card colour
  const cardIn = (sel, at) => js.push(P.cardMove === "flip"
    ? `tl.fromTo("${sel} .card",{scaleY:0,transformOrigin:"50% 0%"},{scaleY:1,transformOrigin:"50% 0%",duration:.35,ease:"back.out(1.6)"},${F(at)});`
    : `tl.fromTo("${sel} .card",{x:120,opacity:0},{x:0,opacity:1,duration:.4,ease:"power3.out"},${F(at)});`);
  js.push(`tl.fromTo("#k0 .hooktext",{scale:.96},{scale:1,duration:.5,ease:"back.out(1.6)"},0);`);
  js.push(`tl.fromTo("#k0 .loop",{opacity:0},{opacity:1,duration:.4},1.0);`);
  a.items.forEach((_, i) => {
    const sid = `#k${i + 1}`, t0 = starts[i], b = beatsFor(i);
    cardIn(sid, t0);
    js.push(`tl.fromTo("${sid} .de .w",{y:36,opacity:0},{y:0,opacity:1,duration:.3,stagger:.07,ease:"back.out(1.8)"},${F(t0 + b.de)});`);
    // karaoke: each word lights up and lifts while the voice says it
    const nw = String(a.items[i].de).split(/\s+/).length, slot = Math.max(0.12, b.deDur / nw);
    const at = t0 + b.de + 0.35;
    // fromTo on both legs, so a render that seeks out of order paints the same frame
    js.push(`tl.fromTo("${sid} .de .w",{scale:1,color:"${P.deColor}"},{scale:1.12,color:"${HL}",transformOrigin:"50% 80%",duration:${F(slot * 0.45)},stagger:${F(slot)},ease:"power2.out",immediateRender:false},${F(at)});`);
    js.push(`tl.fromTo("${sid} .de .w",{scale:1.12,color:"${HL}"},{scale:1,color:"${P.deColor}",transformOrigin:"50% 80%",duration:${F(slot * 0.55)},stagger:${F(slot)},ease:"power2.inOut",immediateRender:false},${F(at + slot * 0.5)});`);
    js.push(`tl.fromTo("${sid} .rule, ${sid} .exde",{opacity:0,y:14},{opacity:1,y:0,duration:.3,ease:"power2.out"},${F(t0 + b.ex)});`);
    js.push(`tl.fromTo("${sid} .exfa",{opacity:0,y:14},{opacity:1,y:0,duration:.3,ease:"power2.out"},${F(t0 + b.fa)});`);
    js.push(`tl.fromTo("${sid} .fa",{opacity:0,scale:.9},{opacity:1,scale:1,duration:.35,ease:"back.out(1.6)"},${F(t0 + b.fa)});`);
  });
  cardIn(`#k${n + 1}`, outroAt);
  js.push(`tl.fromTo("#k${n + 1} .next",{opacity:0,y:20},{opacity:1,y:0,duration:.4,ease:"power3.out"},${F(outroAt + 0.2)});`);
  js.push(`tl.fromTo("#k${n + 1} .outro",{opacity:0,y:20},{opacity:1,y:0,duration:.4,ease:"power3.out"},${F(outroAt + 0.7)});`);

  return `<!doctype html>
<html lang="fa"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1920">
<style>${css}</style>
<script>${GSAP}</script>
</head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${TOTAL}">
<div id="stage" class="clip" data-start="0" data-duration="${TOTAL}" data-track-index="1"><div class="stagebox">${office ? officeSVG(P) : roomSVG(P, heldKeys, thoughtKeys)}</div>${header}</div>
${hookSec}
${stepSecs.join("\n")}
${outroSec}
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
