// One scene per kind of topic for the animated German lessons.
//
// Owner, 2026-09-28: "each topic must look different and fit its subject".
// Every lesson is set where its phrases are really used — a café for
// ordering, a platform for trains, a surgery for health — and every scene
// has the same bones so the acting code is shared:
//
//   the learner stands on the left (full-body rig), the other person sits
//   behind a counter, desk or table on the right (seated rig at CX,CY, its
//   lower body hidden by the front piece, top edge at y≈548), and things
//   change hands over that edge at HAND.
//
// Each scene lists the things standing in it (`targets`) so a phrase that
// names one is acted by pointing at it; the colours of the walls, and of
// the other person's clothes, change with the scene and the episode.
import { roomBackSVG, roomChairBackSVG, roomFrontSVG, ROOM_TARGETS } from "./anim-room.mjs";

export const HAND = [792, 520];

const ring = (k, t) => { const [, , [x, y, w, h]] = t[k]; return `<rect class="ring-${k}" x="${x - 8}" y="${y - 8}" width="${w + 16}" height="${h + 16}" rx="18" fill="none" stroke="#FF4D6D" stroke-width="7" opacity="0"/>`; };
const clock = (x, y, r, P, wood) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="${P.paper}" stroke="${wood}" stroke-width="${r * 0.18}"/>
  ${Array.from({ length: 12 }, (_, i) => `<rect x="-3" y="${-r + 8}" width="6" height="${r * 0.2}" rx="3" fill="${P.ink}" opacity=".5" transform="rotate(${i * 30})"/>`).join("")}
  <rect class="clock-h" x="-4" y="${-r * 0.56}" width="8" height="${r * 0.64}" rx="4" fill="${P.ink}"/><rect class="clock-m" x="-3" y="${-r * 0.8}" width="6" height="${r * 0.88}" rx="3" fill="${P.ink}"/>
  <rect class="clock-s" x="-1" y="${-r * 0.88}" width="2" height="${r}" fill="${P.accent2}"/><circle r="6" fill="${P.ink}"/></g>`;
const floorPlanks = (P) => Array.from({ length: 12 }, (_, i) => `<path d="M${-200 + i * 130} 880 L${120 + i * 90} 700" stroke="${P.floorLine}" stroke-width="3"/>`).join("");
const tiles = (x0, y0, w, h, s, c) => { let o = ""; for (let y = y0; y < y0 + h; y += s) o += `<path d="M${x0} ${y} h${w}" stroke="${c}" stroke-width="2"/>`; for (let x = x0; x < x0 + w; x += s) o += `<path d="M${x} ${y0} v${h}" stroke="${c}" stroke-width="2"/>`; return o; };
const base = (P) => `<rect width="1080" height="880" fill="${P.wall}"/><ellipse cx="540" cy="250" rx="620" ry="470" fill="url(#lamp-light)"/>`;
const floor = (P, R) => `<rect y="700" width="1080" height="180" fill="${P.floor}"/>${floorPlanks(P)}<rect y="704" width="1080" height="70" fill="url(#floor-shade)"/><rect y="690" width="1080" height="14" fill="${R.wood}"/>`;
const counterFront = (P, R, top, cloth, label = "") => `<ellipse cx="910" cy="866" rx="190" ry="16" fill="#000" opacity=".25"/>
  <rect x="730" y="548" width="360" height="22" rx="8" fill="${top}" stroke="${R.line}" stroke-width="4"/>
  <rect x="740" y="566" width="340" height="300" fill="${cloth}" stroke="${R.line}" stroke-width="4"/>
  <rect x="740" y="566" width="340" height="18" fill="#000" opacity=".12"/>
  ${label ? `<text x="905" y="660" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="38" fill="#FFFFFF" opacity=".92">${label}</text>` : ""}`;
const pendant = (x, P, R) => `<g class="pendant pend${x}"><path d="M${x} 0 V70" stroke="${R.line}" stroke-width="4"/><path d="M${x - 40} 116 Q${x - 38} 72 ${x} 70 Q${x + 38} 72 ${x + 40} 116 Z" fill="${R.lamp}" stroke="${R.line}" stroke-width="4"/><ellipse class="lamp-glow" cx="${x}" cy="124" rx="44" ry="14" fill="#FFE9A8" opacity=".55"/></g>`;

// ------------------------------------------------------------------ scenes
const SCENES = {
  home: {
    friend: null,
    tint: { day: {}, night: {} },
    targets: ROOM_TARGETS,
    back: (P) => roomBackSVG(P), seat: (P) => roomChairBackSVG(P), front: (P) => roomFrontSVG(P), ownRings: true,
  },

  cafe: {
    friend: { top: "#8A5A3C", topShade: "#6E4630", topLight: "#B07A55" },
    tint: { day: { wall: "#F3E3CC", wallLine: "#E8D2B2", floor: "#B98556", floorLine: "#A06F45" }, night: { wall: "#2A2230", wallLine: "#352B3C", floor: "#3A2A22", floorLine: "#4A362A" } },
    targets: {
      speisekarte: [200, 180, [36, 56, 330, 250]],
      kaffee: [490, 440, [410, 360, 160, 160]],
      kuchen: [645, 490, [596, 452, 100, 70]],
      kasse: [1030, 505, [984, 462, 92, 86]],
    },
    back: (P, R, t) => `${base(P)}${tiles(0, 400, 1080, 300, 40, P.wallLine)}
  <g transform="translate(36 56)"><rect width="330" height="250" rx="12" fill="#26312C" stroke="${R.wood}" stroke-width="12"/>
    <text x="165" y="50" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="30" fill="#FFFFFF">SPEISEKARTE</text>
    ${[["Kaffee", "2,50 €"], ["Tee", "2,00 €"], ["Kuchen", "3,50 €"], ["Wasser", "1,80 €"]].map(([a, b], i) => `<text x="26" y="${100 + i * 38}" font-family="Vazirmatn" font-weight="800" font-size="24" fill="#F6EBD0">${a}</text><text x="304" y="${100 + i * 38}" text-anchor="end" font-family="Vazirmatn" font-weight="800" font-size="24" fill="#FFD27A">${b}</text>`).join("")}</g>
  ${pendant(470, P, R)}${pendant(700, P, R)}
  <g transform="translate(400 176)">${[0, 1, 2, 3, 4].map((i) => `<rect x="${i * 44}" y="-34" width="32" height="34" rx="6" fill="${[P.accent, P.paper, P.accent2, P.paper, R.chair][i]}" stroke="${R.line}" stroke-width="3"/>`).join("")}<rect x="-12" width="240" height="12" rx="4" fill="${R.wood}" stroke="${R.line}" stroke-width="3"/></g>
  ${floor(P, R)}
  <!-- back counter with the espresso machine and a cake under a glass dome -->
  <rect x="380" y="520" width="340" height="180" fill="${R.woodShade}" stroke="${R.line}" stroke-width="4"/><rect x="372" y="510" width="356" height="16" rx="6" fill="${R.wood}" stroke="${R.line}" stroke-width="3"/>
  <g class="obj-kaffee"><rect x="420" y="380" width="140" height="130" rx="14" fill="#B8C0CC" stroke="${R.line}" stroke-width="4"/><rect x="432" y="394" width="116" height="30" rx="6" fill="#2A3140"/>
    <circle cx="460" cy="409" r="6" fill="#3DDC84"/><circle cx="480" cy="409" r="6" fill="#FFB02E"/><rect x="462" y="440" width="56" height="16" rx="4" fill="#2A3140"/><rect x="474" y="456" width="10" height="14" fill="#2A3140"/><rect x="496" y="456" width="10" height="14" fill="#2A3140"/>
    <rect x="466" y="480" width="44" height="30" rx="5" fill="${P.paper}" stroke="${R.line}" stroke-width="3"/>
    <path class="steam" d="M478 470 q-8 -12 0 -24 q8 -12 0 -24 M498 470 q-8 -12 0 -24 q8 -12 0 -24" fill="none" stroke="#FFFFFF" stroke-width="4" opacity=".6" stroke-linecap="round"/></g>
  <g class="obj-kuchen"><path d="M600 512 q46 -64 92 0 z" fill="#DDF3FF" opacity=".5" stroke="${R.line}" stroke-width="3"/><rect x="616" y="482" width="60" height="30" rx="6" fill="#F7C6D0" stroke="${R.line}" stroke-width="3"/><path d="M616 492 q8 6 15 0 q8 6 15 0 q8 6 15 0 q8 6 15 0" fill="none" stroke="#FFFFFF" stroke-width="4"/><circle cx="646" cy="476" r="6" fill="#E0413A"/></g>`,
    seat: (P, R) => `<g transform="translate(958 430)"><rect width="80" height="240" rx="10" fill="${R.woodShade}" stroke="${R.line}" stroke-width="4"/></g>`,
    front: (P, R) => `${counterFront(P, R, R.wood, R.woodShade, "CAFÉ")}
  <g class="obj-kasse"><rect x="990" y="470" width="80" height="78" rx="8" fill="#3A4150" stroke="${R.line}" stroke-width="4"/><rect x="998" y="478" width="64" height="26" rx="4" fill="#8FD3FF"/><text x="1030" y="498" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="16" fill="#1C2533">2,50</text>
    ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${1002 + c * 20}" y="${512 + r * 11}" width="14" height="8" rx="2" fill="#D8DEE8"/>`).join("")).join("")}</g>`,
  },

  station: {
    friend: { top: "#C23B3B", topShade: "#962A2A", topLight: "#E05A5A" },
    tint: { day: { wall: "#D9E2EA", wallLine: "#C3CFDA", floor: "#9AA3AD", floorLine: "#8A939D" }, night: { wall: "#1C2533", wallLine: "#26324A", floor: "#2A3140", floorLine: "#343C4C" } },
    targets: {
      zug: [340, 440, [20, 330, 640, 220]],
      uhr: [560, 118, [502, 60, 116, 116]],
      bahnhof: [895, 150, [760, 118, 270, 62]],
    },
    back: (P, R, t) => `${base(P)}${tiles(0, 0, 1080, 320, 60, P.wallLine)}
  <!-- departure board -->
  <g transform="translate(34 50)"><rect width="420" height="176" rx="12" fill="#10151E" stroke="#5A6678" stroke-width="8"/>
    <text x="20" y="40" font-family="Vazirmatn" font-weight="900" font-size="24" fill="#FFD23F">ABFAHRT</text><text x="400" y="40" text-anchor="end" font-family="Vazirmatn" font-weight="900" font-size="24" fill="#FFD23F">GLEIS</text>
    ${[["10:15", "Hamburg", "3"], ["10:40", "Berlin", "5"], ["11:05", "Köln", "2"]].map(([a, b, c], i) => `<g class="dep-row dep${i}"><text x="20" y="${84 + i * 38}" font-family="Vazirmatn" font-weight="800" font-size="26" fill="#FFFFFF">${a}</text><text x="120" y="${84 + i * 38}" font-family="Vazirmatn" font-weight="800" font-size="26" fill="#FFFFFF">${b}</text><text x="400" y="${84 + i * 38}" text-anchor="end" font-family="Vazirmatn" font-weight="800" font-size="26" fill="#FFFFFF">${c}</text></g>`).join("")}</g>
  <g class="obj-uhr"><path d="M560 0 V60" stroke="${R.line}" stroke-width="6"/>${clock(560, 118, 58, P, "#5A6678")}</g>
  <!-- the train on the far track: it pulls in during the opening -->
  <rect x="0" y="548" width="1080" height="12" fill="#5A6678"/>
  <g class="obj-zug"><g class="train">
    <path d="M-260 340 H640 Q690 340 700 400 L712 548 H-260 Z" fill="${P.paper}" stroke="${R.line}" stroke-width="5"/>
    <rect x="-260" y="470" width="972" height="34" fill="${P.accent2}"/>
    ${[-220, -60, 100, 260, 420].map((x) => `<rect x="${x}" y="370" width="120" height="70" rx="12" fill="#8FC7E8" stroke="${R.line}" stroke-width="4"/><rect x="${x + 12}" y="378" width="30" height="54" rx="6" fill="#FFFFFF" opacity=".35"/>`).join("")}
    <path d="M600 370 H660 Q684 372 690 420 H600 Z" fill="#8FC7E8" stroke="${R.line}" stroke-width="4"/>
    <circle cx="682" cy="520" r="9" fill="#FFE27A"/></g></g>
  <rect x="0" y="556" width="1080" height="10" fill="#FFD23F"/>
  <rect y="566" width="1080" height="314" fill="${P.floor}"/>${tiles(0, 566, 1080, 314, 80, P.floorLine)}<rect y="566" width="1080" height="60" fill="url(#floor-shade)"/>
  <rect x="0" y="600" width="1080" height="10" fill="#FFFFFF" opacity=".5" stroke-dasharray="40 20"/>`,
    seat: (P, R) => `<g transform="translate(740 200)"><rect width="340" height="360" rx="14" fill="${R.woodShade}" stroke="${R.line}" stroke-width="5"/><rect x="18" y="20" width="304" height="330" rx="8" fill="${P.wall}" opacity=".85"/></g>
  <g class="obj-bahnhof"><rect x="760" y="118" width="270" height="62" rx="10" fill="#1B4F9C" stroke="${R.line}" stroke-width="4"/><text x="895" y="162" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="36" fill="#FFFFFF">Bahnhof</text></g>`,
    front: (P, R) => counterFront(P, R, "#5A6678", "#1B4F9C", "Fahrkarten"),
    ringsInFront: ["bahnhof"],
  },

  shop: {
    friend: { top: "#E25B45", topShade: "#B8402E", topLight: "#F08068" },
    tint: { day: { wall: "#EEF3EC", wallLine: "#DDE6DA", floor: "#CFD6CC", floorLine: "#BCC4B9" }, night: { wall: "#1E2A26", wallLine: "#28372F", floor: "#2A332E", floorLine: "#35403A" } },
    targets: {
      milch: [130, 236, [30, 170, 200, 120]],
      wasser: [360, 236, [262, 170, 200, 120]],
      brot: [130, 400, [30, 340, 200, 120]],
      apfel: [360, 400, [262, 340, 200, 120]],
      kasse: [1030, 505, [984, 462, 92, 86]],
    },
    back: (P, R) => `${base(P)}
  <rect x="30" y="40" width="440" height="70" rx="12" fill="${P.accent2}" stroke="${R.line}" stroke-width="4"/><text x="250" y="90" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="40" fill="#FFFFFF">SUPERMARKT</text>
  <g class="shelves"><rect x="20" y="130" width="460" height="560" rx="8" fill="${R.woodShade}" stroke="${R.line}" stroke-width="4"/>
    ${[290, 460, 630].map((y) => `<rect x="20" y="${y}" width="460" height="14" fill="${R.wood}" stroke="${R.line}" stroke-width="3"/>`).join("")}
    <g class="obj-milch">${[0, 1, 2, 3].map((i) => `<g transform="translate(${44 + i * 46} 196)"><path d="M0 18 L18 0 L36 18 V92 H0 Z" fill="#FFFFFF" stroke="${R.line}" stroke-width="3"/><rect y="46" width="36" height="20" fill="#4C8DF0"/></g>`).join("")}</g>
    <g class="obj-wasser">${[0, 1, 2, 3].map((i) => `<g transform="translate(${282 + i * 46} 186)"><rect x="10" width="14" height="14" fill="#2F6FD6"/><rect y="14" width="34" height="88" rx="10" fill="#9ED7F5" stroke="${R.line}" stroke-width="3"/></g>`).join("")}</g>
    <g class="obj-brot">${[0, 1, 2].map((i) => `<ellipse cx="${80 + i * 62}" cy="${426 - (i % 2) * 8}" rx="30" ry="20" fill="#D99A4E" stroke="${R.line}" stroke-width="3"/>`).join("")}</g>
    <g class="obj-apfel">${Array.from({ length: 9 }, (_, i) => `<circle cx="${290 + (i % 5) * 36 + (i > 4 ? 18 : 0)}" cy="${440 - (i > 4 ? 26 : 0)}" r="17" fill="${i % 3 ? "#E0413A" : "#8BC34A"}" stroke="${R.line}" stroke-width="3"/>`).join("")}</g>
    ${Array.from({ length: 8 }, (_, i) => `<rect x="${40 + i * 54}" y="${540 + (i % 2) * 8}" width="40" height="${82 - (i % 2) * 8}" rx="6" fill="${[P.accent, R.chair, P.accent2, R.sofa][i % 4]}" stroke="${R.line}" stroke-width="3"/>`).join("")}</g>
  <g transform="translate(520 150)"><rect width="140" height="90" rx="10" fill="#FFD23F" stroke="${R.line}" stroke-width="4" transform="rotate(-6)"/><text x="64" y="64" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="46" fill="#C2410C" transform="rotate(-6)">-20%</text></g>
  ${floor(P, R)}`,
    seat: (P, R) => `<g transform="translate(958 430)"><rect width="80" height="240" rx="10" fill="#3A4150" stroke="${R.line}" stroke-width="4"/></g>`,
    front: (P, R) => `${counterFront(P, R, "#3A4150", "#5E6778", "KASSE")}
  <g class="belt">${Array.from({ length: 7 }, (_, i) => `<rect class="belt-seg" x="${744 + i * 34}" y="552" width="18" height="10" rx="3" fill="#1C2533" opacity=".5"/>`).join("")}</g>
  <g class="obj-kasse"><rect x="990" y="470" width="80" height="78" rx="8" fill="#3A4150" stroke="${R.line}" stroke-width="4"/><rect x="998" y="478" width="64" height="26" rx="4" fill="#8FD3FF"/><text x="1030" y="498" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="16" fill="#1C2533">4,99</text>
    ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${1002 + c * 20}" y="${512 + r * 11}" width="14" height="8" rx="2" fill="#D8DEE8"/>`).join("")).join("")}</g>`,
  },

  doctor: {
    friend: { top: "#F2F5F9", topShade: "#C9D3DF", topLight: "#FFFFFF" },
    tint: { day: { wall: "#E3F1F4", wallLine: "#CFE4EA", floor: "#B7CCD3", floorLine: "#A5BCC4" }, night: { wall: "#18313A", wallLine: "#1F3C46", floor: "#20343A", floorLine: "#2A4148" } },
    targets: {
      apotheke: [340, 240, [260, 120, 160, 240]],
      bett: [190, 620, [20, 560, 340, 120]],
      arzt: [890, 360, [820, 260, 150, 200]],
    },
    back: (P, R) => `${base(P)}
  <g transform="translate(60 80)"><rect width="160" height="220" rx="8" fill="#FFFFFF" stroke="${R.line}" stroke-width="4"/>
    ${[["E", 56], ["F P", 40], ["T O Z", 30], ["L P E D", 22], ["P E C F D", 16]].map(([s, f], i) => `<text x="80" y="${50 + i * 36}" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="${f}" fill="#1C2533">${s}</text>`).join("")}</g>
  <g class="obj-apotheke"><rect x="260" y="120" width="160" height="240" rx="10" fill="#FFFFFF" stroke="${R.line}" stroke-width="4"/><path d="M322 150 h36 v30 h30 v36 h-30 v30 h-36 v-30 h-30 v-36 h30z" fill="#E0413A"/>
    <path d="M270 262 H410 M340 262 V352" stroke="${R.line}" stroke-width="3"/>${[0, 1, 2].map((i) => `<rect x="${280 + i * 22}" y="${280 + (i % 2) * 6}" width="14" height="${40 - (i % 2) * 6}" rx="4" fill="${[P.accent, "#FFB02E", P.accent2][i]}"/>`).join("")}</g>
  <g transform="translate(470 110)"><rect width="150" height="110" rx="8" fill="${R.picSky}" stroke="${R.wood}" stroke-width="8"/><path d="M8 102 L58 50 L92 84 L142 102Z" fill="${R.picHill}"/></g>
  ${floor(P, R)}
  <g class="obj-bett"><rect x="20" y="590" width="340" height="40" rx="10" fill="#D8E6EE" stroke="${R.line}" stroke-width="4"/><rect x="30" y="566" width="90" height="32" rx="14" fill="#FFFFFF" stroke="${R.line}" stroke-width="3"/>
    <rect x="130" y="578" width="224" height="14" fill="#8FD3FF" opacity=".6"/><rect x="40" y="630" width="12" height="70" fill="#8A97AB"/><rect x="330" y="630" width="12" height="70" fill="#8A97AB"/></g>
  <ellipse cx="190" cy="704" rx="170" ry="12" fill="#000" opacity=".2"/>`,
    seat: (P, R) => `<g transform="translate(958 430)"><rect width="80" height="240" rx="10" fill="#3A5A78" stroke="${R.line}" stroke-width="4"/></g>`,
    front: (P, R) => `${counterFront(P, R, "#FFFFFF", "#9FB8C8")}
  <g transform="translate(990 490)"><rect width="76" height="58" rx="6" fill="#2A3140" stroke="${R.line}" stroke-width="3"/><path d="M8 34 l12 0 l6 -14 l8 26 l8 -20 l6 8 l18 0" fill="none" stroke="#3DDC84" stroke-width="3"/></g>
  <path d="M760 546 q20 -40 50 -30 q20 8 10 30" fill="none" stroke="#2A3140" stroke-width="5"/><circle cx="820" cy="546" r="8" fill="#8A97AB" stroke="#2A3140" stroke-width="3"/>
  <text x="905" y="680" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="40" fill="#E0413A">+ PRAXIS</text>`,
  },

  school: {
    friend: { top: "#4E7A3E", topShade: "#3A5E2E", topLight: "#6E9A5A" },
    tint: { day: { wall: "#F4EBD6", wallLine: "#E8DBBE", floor: "#C9A57A", floorLine: "#B38E62" }, night: { wall: "#23293A", wallLine: "#2C3448", floor: "#3A2E26", floorLine: "#4A3A30" } },
    targets: { tafel: [300, 200, [40, 60, 520, 280]] },
    back: (P, R) => `${base(P)}
  <g class="obj-tafel"><rect x="40" y="60" width="520" height="280" rx="10" fill="#2F5B45" stroke="${R.wood}" stroke-width="14"/>
    <text x="300" y="134" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="56" fill="#FFFFFF" opacity=".95">Deutsch A1</text>
    <text x="300" y="204" text-anchor="middle" font-family="Vazirmatn" font-weight="800" font-size="40" fill="#FFE27A">der · die · das</text>
    <text x="300" y="270" text-anchor="middle" font-family="Vazirmatn" font-weight="800" font-size="34" fill="#BEE3F8">A B C Ä Ö Ü ß</text>
    <rect x="60" y="324" width="480" height="12" fill="${R.wood}"/><rect x="420" y="316" width="40" height="10" rx="3" fill="#FFFFFF"/></g>
  ${clock(640, 110, 48, P, R.wood)}
  <g transform="translate(610 250)"><circle cx="40" cy="40" r="40" fill="#5AB0E0" stroke="${R.line}" stroke-width="4"/><path d="M14 30 q16 -10 26 4 q10 12 24 0 M20 58 q14 -6 30 4" fill="none" stroke="#6CC24A" stroke-width="10" stroke-linecap="round"/><rect x="36" y="80" width="8" height="30" fill="${R.wood}"/><rect x="16" y="108" width="48" height="10" rx="4" fill="${R.wood}"/></g>
  ${floor(P, R)}
  <!-- a student desk behind the learner -->
  <g><rect x="40" y="560" width="300" height="20" rx="6" fill="${R.wood}" stroke="${R.line}" stroke-width="4"/><rect x="60" y="580" width="14" height="120" fill="${R.woodShade}"/><rect x="306" y="580" width="14" height="120" fill="${R.woodShade}"/>
    <rect x="100" y="530" width="70" height="30" rx="4" fill="${P.accent}" stroke="${R.line}" stroke-width="3"/><rect x="200" y="540" width="80" height="20" rx="4" fill="${P.paper}" stroke="${R.line}" stroke-width="3"/></g>`,
    seat: (P, R) => `<g transform="translate(958 430)"><rect width="80" height="240" rx="10" fill="${R.woodShade}" stroke="${R.line}" stroke-width="4"/></g>`,
    front: (P, R) => `${counterFront(P, R, R.wood, R.woodShade)}
  <g transform="translate(960 500)">${[0, 1, 2].map((i) => `<rect x="${-i * 4}" y="${-i * 16}" width="100" height="16" rx="3" fill="${[P.accent2, P.accent, "#FFB02E"][i]}" stroke="${R.line}" stroke-width="3"/>`).join("")}</g>
  <circle cx="1060" cy="530" r="16" fill="#E0413A" stroke="${R.line}" stroke-width="3"/><path d="M1060 514 q2 -8 8 -10" stroke="${R.line}" stroke-width="3" fill="none"/>`,
  },

  work: {
    friend: { top: "#2F4A7A", topShade: "#243A60", topLight: "#46679E" },
    tint: { day: { wall: "#E6EAF0", wallLine: "#D5DBE4", floor: "#A9B2BF", floorLine: "#97A1AF" }, night: { wall: "#1A2130", wallLine: "#222B3D", floor: "#262D3A", floorLine: "#303848" } },
    targets: { computer: [1030, 490, [980, 430, 96, 118]], fenster: [560, 180, [420, 60, 290, 240]] },
    back: (P, R) => `${base(P)}
  <g transform="translate(40 80)"><rect width="330" height="220" rx="8" fill="#FFFFFF" stroke="#8A97AB" stroke-width="8"/>
    ${[60, 100, 80, 140].map((h, i) => `<rect x="${40 + i * 64}" y="${190 - h}" width="40" height="${h}" rx="4" fill="${[P.accent, P.accent2, "#FFB02E", "#3DDC84"][i]}"/>`).join("")}<path d="M40 110 L110 80 L170 96 L280 40" fill="none" stroke="#1C2533" stroke-width="5"/><path d="M270 36 l14 2 l-6 12" fill="none" stroke="#1C2533" stroke-width="5"/></g>
  <g class="obj-fenster"><rect x="420" y="60" width="290" height="240" rx="8" fill="url(#sky-g)" stroke="#8A97AB" stroke-width="10"/>
    <g clip-path="url(#win-clip2)">${[[430, 150], [480, 110], [540, 170], [590, 90], [650, 140]].map(([x, h]) => `<rect x="${x}" y="${300 - h}" width="48" height="${h}" fill="#5A6678"/>${[0, 1, 2].map((r) => `<rect x="${x + 10}" y="${310 - h + r * 26}" width="10" height="12" fill="${P.room.night ? "#FFE27A" : "#DDF3FF"}"/>`).join("")}`).join("")}</g>
    <path d="M565 60 v240" stroke="#8A97AB" stroke-width="6"/></g>
  <g transform="translate(760 140)"><rect width="120" height="90" rx="8" fill="#FFD23F" stroke="${R.line}" stroke-width="3" transform="rotate(4)"/><text x="60" y="54" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="26" fill="#1C2533" transform="rotate(4)">Team</text></g>
  ${floor(P, R)}
  <g transform="translate(40 470) scale(1.1)"><path d="M-6 170 h58 l-8 60 h-42 z" fill="${R.pot}" stroke="${R.line}" stroke-width="4"/><g class="plant">${[[-10, -150, -30], [18, -160, 10], [40, -120, 40], [-24, -100, -56]].map(([x, y, r]) => `<g transform="translate(22 170) rotate(${r})"><path d="M0 0 Q${x * 0.3} ${y * 0.5} ${x * 0.2} ${y}" stroke="${R.plantStem}" stroke-width="6" fill="none"/><path d="M${x * 0.2} ${y} q-30 28 -8 66 q36 -16 8 -66 z" fill="${R.plant}" stroke="${R.line}" stroke-width="3"/></g>`).join("")}</g></g>`,
    seat: (P, R) => `<g transform="translate(958 430)"><rect width="80" height="240" rx="12" fill="#2A3140" stroke="${R.line}" stroke-width="4"/></g>`,
    front: (P, R) => `${counterFront(P, R, "#DDE3EA", "#B8C2CE")}
  <g class="obj-computer"><rect x="984" y="434" width="90" height="70" rx="6" fill="#2A3140" stroke="${R.line}" stroke-width="4"/><rect x="992" y="442" width="74" height="54" rx="3" fill="#8FD3FF"/><rect x="1022" y="504" width="14" height="30" fill="#2A3140"/><rect x="1004" y="532" width="50" height="10" rx="4" fill="#2A3140"/>
    <rect x="1000" y="452" width="40" height="6" rx="3" fill="#FFFFFF"/><rect x="1000" y="466" width="56" height="6" rx="3" fill="#FFFFFF" opacity=".7"/></g>
  <rect x="770" y="536" width="90" height="12" rx="4" fill="#2A3140"/>`,
  },

  park: {
    friend: { top: "#F2A93B", topShade: "#C98722", topLight: "#FFC766" },
    tint: { day: { wall: "#9ED3F2", wallLine: "#9ED3F2", floor: "#7CB85A", floorLine: "#6AA64A" }, night: { wall: "#0E1A36", wallLine: "#0E1A36", floor: "#1E3A2A", floorLine: "#254632" } },
    targets: {
      ampel: [470, 250, [430, 150, 80, 200]],
      baum: [150, 300, [30, 90, 260, 420]],
      sonne: [860, 120, [800, 60, 120, 120]],
    },
    back: (P, R) => `<rect width="1080" height="880" fill="url(#sky-g)"/>
  <g class="obj-sonne">${R.night ? `<circle cx="860" cy="120" r="44" fill="#FFF3C4"/><circle cx="878" cy="108" r="40" fill="${R.skyLow}"/>` : `${Array.from({ length: 8 }, (_, i) => `<rect x="856" y="44" width="8" height="24" rx="4" fill="#FFB400" transform="rotate(${i * 45} 860 120)"/>`).join("")}<circle cx="860" cy="120" r="42" fill="#FFD23F"/>`}</g>
  ${R.night ? [[80, 60], [300, 40], [420, 100], [680, 50], [980, 80], [540, 30]].map(([x, y], i) => `<circle class="star star${i % 3}" cx="${x}" cy="${y}" r="3" fill="#FFFFFF"/>`).join("") : ""}
  <g class="cloud cloud1" opacity="${R.night ? 0.2 : 0.95}"><ellipse cx="300" cy="120" rx="70" ry="22" fill="#FFFFFF"/><ellipse cx="336" cy="104" rx="40" ry="26" fill="#FFFFFF"/></g>
  <g class="cloud cloud2" opacity="${R.night ? 0.15 : 0.9}"><ellipse cx="650" cy="180" rx="56" ry="18" fill="#FFFFFF"/><ellipse cx="676" cy="168" rx="30" ry="20" fill="#FFFFFF"/></g>
  <!-- the town far away -->
  ${[[0, 160], [90, 220], [170, 180], [560, 240], [650, 190], [740, 260], [830, 200], [930, 230], [1010, 180]].map(([x, h], i) => `<rect x="${x}" y="${560 - h}" width="84" height="${h}" fill="${R.night ? "#1B2A4A" : "#B9CCDE"}"/>${Array.from({ length: Math.floor(h / 40) }, (_, r) => `<rect x="${x + 16}" y="${574 - h + r * 40}" width="14" height="16" fill="${R.night ? "#FFE27A" : "#FFFFFF"}" opacity="${R.night ? 0.8 : 0.6}"/><rect x="${x + 50}" y="${574 - h + r * 40}" width="14" height="16" fill="${R.night ? "#FFE27A" : "#FFFFFF"}" opacity="${R.night ? 0.5 : 0.6}"/>`).join("")}`).join("")}
  <rect y="560" width="1080" height="320" fill="${P.floor}"/>
  <path d="M-40 880 L360 600 H720 L1120 880 Z" fill="${R.night ? "#3A3F4A" : "#D9CBB0"}"/>
  <path d="M540 610 V880" stroke="#FFFFFF" stroke-width="8" stroke-dasharray="30 26" opacity=".7"/>
  <g class="obj-baum"><g class="tree"><rect x="136" y="300" width="30" height="270" fill="#7A5230" stroke="${R.line}" stroke-width="4"/>
    <circle cx="150" cy="230" r="100" fill="${R.plant}" stroke="${R.line}" stroke-width="4"/><circle cx="80" cy="290" r="64" fill="${R.plant}" stroke="${R.line}" stroke-width="4"/><circle cx="224" cy="286" r="62" fill="${R.plant}" stroke="${R.line}" stroke-width="4"/>
    <circle cx="120" cy="200" r="20" fill="#FFFFFF" opacity=".15"/></g></g>
  <g class="obj-ampel"><rect x="462" y="330" width="16" height="240" fill="#3A4150"/><rect x="438" y="150" width="64" height="180" rx="14" fill="#2A3140" stroke="${R.line}" stroke-width="4"/>
    <circle class="amp-r" cx="470" cy="190" r="20" fill="#E0413A"/><circle class="amp-y" cx="470" cy="240" r="20" fill="#FFB02E" opacity=".25"/><circle class="amp-g" cx="470" cy="290" r="20" fill="#3DDC84" opacity=".25"/></g>
  <g><rect x="620" y="300" width="10" height="270" fill="#3A4150"/><path d="M625 300 q0 -30 40 -30" fill="none" stroke="#3A4150" stroke-width="10"/><rect x="646" y="262" width="44" height="22" rx="8" fill="#3A4150"/><ellipse class="lamp-glow" cx="668" cy="290" rx="30" ry="10" fill="#FFE9A8" opacity="${R.night ? 0.8 : 0.2}"/></g>`,
    seat: (P, R) => `<g transform="translate(958 470)"><rect width="100" height="30" rx="8" fill="#7A5230" stroke="${R.line}" stroke-width="4"/><rect y="46" width="100" height="30" rx="8" fill="#7A5230" stroke="${R.line}" stroke-width="4"/></g>`,
    front: (P, R) => `<ellipse cx="910" cy="866" rx="190" ry="16" fill="#000" opacity=".25"/>
  <rect x="730" y="548" width="360" height="24" rx="8" fill="#9A6A3A" stroke="${R.line}" stroke-width="4"/>
  ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${742 + i * 56}" y="572" width="50" height="290" fill="${i % 2 ? "#8A5E32" : "#9A6A3A"}" stroke="${R.line}" stroke-width="3"/>`).join("")}
  <g transform="translate(1000 500)"><rect x="-22" y="0" width="44" height="48" rx="9" fill="${P.paper}" stroke="${R.line}" stroke-width="4"/><path d="M22 12 q16 0 16 12 q0 12 -16 12" fill="none" stroke="${R.line}" stroke-width="5"/></g>`,
  },

  bureau: {
    friend: null,
    tint: { day: { wall: "#EADFCC", wallLine: "#DDCDB4", floor: "#CFB995", floorLine: "#BFA67F" }, night: { wall: "#1B2B45", wallLine: "#22375A", floor: "#101A2C", floorLine: "#1A2842" } },
    targets: { fenster: [169, 380, [44, 250, 250, 260]] },
    back: (P, R) => `${base(P)}${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="0" y="${80 + i * 80}" width="1080" height="3" fill="${P.wallLine}"/>`).join("")}
  ${floor(P, R)}
  <g class="obj-fenster"><rect x="44" y="250" width="250" height="260" rx="12" fill="url(#sky-g)" stroke="${P.frame}" stroke-width="10"/><path d="M169 250 v260 M44 380 h250" stroke="${P.frame}" stroke-width="8"/></g>
  <g transform="translate(40 46)"><rect width="300" height="160" rx="16" fill="${P.ledBg}" stroke="${P.frame}" stroke-width="5"/>
    <text x="22" y="38" font-family="Vazirmatn" font-weight="900" font-size="22" fill="${P.led}">NUMMER</text><text x="278" y="38" text-anchor="end" font-family="Vazirmatn" font-weight="900" font-size="22" fill="${P.led}">SCHALTER</text>
    <text x="22" y="124" font-family="Vazirmatn" font-weight="900" font-size="56" fill="${P.led}">B017</text><text x="278" y="124" text-anchor="end" font-family="Vazirmatn" font-weight="900" font-size="56" fill="${P.led}">2</text></g>
  ${clock(540, 120, 54, P, P.frame)}
  <g transform="translate(330 470)"><rect width="84" height="230" rx="14" fill="${P.frame}"/><rect x="12" y="18" width="60" height="44" rx="6" fill="${P.ledBg}"/><text x="42" y="48" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="18" fill="${P.led}">B017</text><rect x="22" y="84" width="40" height="10" rx="5" fill="${P.ink}"/></g>`,
    seat: (P, R) => `<rect x="690" y="212" width="376" height="340" rx="18" fill="${P.wallLine}"/>`,
    front: (P, R) => `<rect x="690" y="212" width="376" height="340" rx="18" fill="${P.glass}" opacity="${P.glassA}"/><rect x="690" y="212" width="376" height="340" rx="18" fill="none" stroke="${P.frame}" stroke-width="10"/>
  ${counterFront(P, R, P.deskTop, P.desk)}`,
  },
};

// ------------------------------------------------------------ unit → scene
// Every unit of the course, placed where its phrases are really used.
const SCENE_OF = {
  "a1-01-greetings": "park", "a1-02-formal-informal": "work", "a1-03-politeness": "cafe", "a1-04-numbers-1": "school", "a1-05-numbers-2": "school",
  "a1-06-family": "home", "a1-07-question-words": "school", "a1-08-sein": "park", "a1-09-colors": "shop", "a1-10-weekdays": "school",
  "a1-11-time": "station", "a1-12-haben": "home", "a1-13-food-drink": "cafe", "a1-14-cafe": "cafe", "a1-15-numbers-3": "shop",
  "a1-16-weather": "park", "a1-17-adjectives": "home", "a1-18-shopping": "shop", "a1-19-directions": "park", "a1-20-countries": "school",
  "a1-21-professions": "work", "a1-22-daily-routine": "home", "a1-23-common-verbs": "park", "a1-24-clothes": "shop", "a1-25-modal-verbs": "school",
  "a1-26-home": "home", "a1-27-train-station": "station", "a1-28-tickets": "station", "a1-29-appointments": "doctor", "a1-30-health": "doctor",
  "a1-31-small-talk": "cafe", "a1-32-spelling-contact": "bureau", "a1-33-payment": "shop", "a1-34-accusative": "shop", "a1-35-separable-verbs": "home",
  "a1-36-leisure": "park", "a1-37-bottle-deposit": "shop", "a1-38-important-numbers": "home", "a1-39-address": "bureau", "a1-40-authorities": "office",
  "a1-41-what-is-this": "home", "a1-42-possession": "home", "a1-43-negation-kein": "cafe", "a1-44-furniture": "home", "a1-45-times-of-day": "home",
  "a1-46-weekend": "park", "a1-47-making-plans": "cafe", "a1-48-being-late": "station", "a1-49-dream-jobs": "work", "a1-50-inside-building": "bureau",
  "a1-51-traffic-directions": "park", "a1-52-groceries": "shop", "a1-53-at-the-counter": "shop", "a1-54-day-trip": "station", "a1-55-weather-forecast": "park",
  "a1-56-body-parts": "doctor", "a1-57-symptoms": "doctor", "a1-58-pharmacy": "doctor", "a1-59-perfekt-haben": "home", "a1-60-perfekt-sein": "park",
  "a1-61-war-hatte": "cafe", "a1-62-where-is-it": "park", "a1-63-in-europe": "school", "a1-64-other-countries": "school", "a1-65-why-here": "cafe",
  "a1-66-months": "school", "a1-67-seasons": "park", "a1-68-dates-birthday": "home", "a1-69-restaurant-order": "cafe", "a1-70-invitation": "home",
  "a1-71-feelings": "park", "a1-72-apartment-hunting": "home", "a1-73-rent-and-bills": "home", "a1-74-bank": "bureau", "a1-75-post-office": "bureau",
  "a1-76-telephone": "home", "a1-77-email-form": "work", "a1-78-school-course": "school", "a1-79-children": "park", "a1-80-sport": "park",
  "a1-81-music-media": "home", "a1-82-sizes": "shop", "a1-83-comparison": "shop", "a1-84-muessen": "work", "a1-85-duerfen": "school",
  "a1-86-wollen": "cafe", "a1-87-imperative": "home", "a1-88-dative": "home", "a1-89-possessive": "home", "a1-90-prepositions-place": "home",
  "a1-91-prepositions-time": "station", "a1-92-public-transport": "station", "a1-93-taxi-and-car": "park", "a1-94-hotel": "bureau", "a1-95-emergency": "doctor",
  "a1-96-lost-found": "bureau", "a1-97-neighbours": "home", "a1-98-job-interview": "work", "a1-99-work-day": "work", "a1-100-review": "school",
};
export const SCENE_IDS = [...Object.keys(SCENES), "office"];

/** What moves in each place, besides the people (finite, seek-safe tweens). */
const MOTION = {
  cafe: ({ yo }) => {
    yo(".pend470", `{rotation:-1.5,svgOrigin:"470 0"}`, `{rotation:1.5,svgOrigin:"470 0"}`, 3.3, 0);
    yo(".pend700", `{rotation:1.2,svgOrigin:"700 0"}`, `{rotation:-1.2,svgOrigin:"700 0"}`, 3.8, 0.4);
  },
  station: ({ push, HOOK, outroAt, F }) => {
    // the train pulls in during the opening, and leaves as the lesson ends
    push(".train", `tl.fromTo(".train",{x:-1150},{x:0,duration:2.6,ease:"power2.out",immediateRender:false},0.2);`);
    push(".train", `tl.set(".train",{x:-1150},0);`);
    push(".train", `tl.to(".train",{x:1250,duration:3.4,ease:"power2.in"},${F(outroAt + 1.4)});`);
    // the departure board flips its rows
    [0, 1, 2].forEach((k) => push(`.dep${k}`, `tl.fromTo(".dep${k}",{scaleY:0,transformOrigin:"50% 50%"},{scaleY:1,transformOrigin:"50% 50%",duration:.18,ease:"power1.out",immediateRender:false},${F(HOOK - 1.6 + k * 0.12)});`));
  },
  shop: ({ push, TOTAL, F }) => {
    push(".belt-seg", `tl.fromTo(".belt-seg",{x:0},{x:-34,duration:.8,ease:"none",repeat:${Math.max(1, Math.floor(TOTAL / 0.8) - 1)}},0);`);
  },
  park: ({ yo, push, TOTAL, F }) => {
    yo(".tree", `{rotation:-1.4,svgOrigin:"150 570"}`, `{rotation:1.4,svgOrigin:"150 570"}`, 3.6, 0);
    // the traffic light runs its cycle: red, green, amber
    for (let t = 0; t < TOTAL - 0.5; t += 7) {
      push(".amp-r", `tl.set(".amp-r",{opacity:1},${F(t)});tl.set(".amp-y",{opacity:.25},${F(t)});tl.set(".amp-g",{opacity:.25},${F(t)});`);
      push(".amp-g", `tl.set(".amp-r",{opacity:.25},${F(t + 3.5)});tl.set(".amp-g",{opacity:1},${F(t + 3.5)});`);
      push(".amp-y", `tl.set(".amp-g",{opacity:.25},${F(t + 6)});tl.set(".amp-y",{opacity:1},${F(t + 6)});`);
    }
  },
};
export function sceneAnim(id, ctx) { if (MOTION[id]) MOTION[id](ctx); }
export const sceneFor = (unitId) => SCENE_OF[unitId] || (/authorit/.test(String(unitId)) ? "office" : "home");
export const sceneTargets = (id) => (SCENES[id] || SCENES.home).targets;

/** The scene's palette for this variant: walls and the other person's clothes. */
export function scenePalette(P, id) {
  const S = SCENES[id] || SCENES.home;
  const tint = P.room.night ? S.tint.night : S.tint.day;
  return { ...P, ...tint, clerk: S.friend ? { ...P.clerk, ...S.friend } : P.clerk };
}

/** The three layers of a scene, with the pointing rings in the right layer. */
export function sceneLayers(P, id) {
  const S = SCENES[id] || SCENES.home;
  const R = P.room, T = S.targets;
  const inFront = new Set(S.ringsInFront || []);
  const backRings = S.ownRings ? "" : Object.keys(T).filter((k) => !inFront.has(k)).map((k) => ring(k, T)).join("");
  const frontRings = S.ownRings ? "" : Object.keys(T).filter((k) => inFront.has(k)).map((k) => ring(k, T)).join("");
  return { back: S.back(P, R) + backRings, seat: S.seat(P, R) + frontRings, front: S.front(P, R) };
}
