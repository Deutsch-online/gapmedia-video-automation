// The everyday room for the animated German lessons.
//
// Owner, 2026-09-28: every lesson must use the new character-film design,
// not only episode 40. The office scene in build-anim.mjs acts out one
// specific lesson (appointment slip, ID card, form); this module gives every
// other lesson a scene whose pictures never contradict its text:
//
//   - a living room with a friend seated at a table (the seated rig) and the
//     learner standing (the full-body rig);
//   - each German phrase is read for meaning: the noun it names (a thing to
//     hold up, a piece of furniture in the room to point at, or anything else
//     shown in a thought bubble), whether it is a question, a negation, or
//     about "me" / "you" — and acted with those gestures only;
//   - a phrase with no recognised noun gets gestures only. No picture is ever
//     guessed, so the image on screen always matches the words.
//
// Icons are drawn in a 100x100 box with the origin at the top-left corner.

const ICON = {
  schluessel: (P) => `<circle cx="30" cy="40" r="20" fill="none" stroke="#E0B23A" stroke-width="11"/><circle cx="30" cy="40" r="20" fill="none" stroke="${P.ink}" stroke-width="2.5"/>
    <rect x="46" y="35" width="50" height="11" rx="4" fill="#E0B23A" stroke="${P.ink}" stroke-width="2.5"/><rect x="76" y="44" width="8" height="16" fill="#E0B23A" stroke="${P.ink}" stroke-width="2.5"/><rect x="88" y="44" width="8" height="11" fill="#E0B23A" stroke="${P.ink}" stroke-width="2.5"/>`,
  buch: (P) => `<rect x="12" y="14" width="76" height="74" rx="6" fill="${P.accent2}" stroke="${P.ink}" stroke-width="4"/><rect x="12" y="14" width="14" height="74" fill="${P.ink}" opacity=".35"/>
    <rect x="80" y="18" width="6" height="66" fill="${P.paper}"/><rect x="36" y="32" width="38" height="7" rx="3" fill="${P.paper}"/><rect x="36" y="46" width="28" height="6" rx="3" fill="${P.paper}" opacity=".8"/>`,
  tasche: (P) => `<path d="M32 42 Q32 10 50 10 Q68 10 68 42" fill="none" stroke="${P.ink}" stroke-width="7"/><rect x="12" y="38" width="76" height="54" rx="12" fill="#B5652E" stroke="${P.ink}" stroke-width="4"/><rect x="42" y="52" width="16" height="10" rx="3" fill="#E0B23A" stroke="${P.ink}" stroke-width="2.5"/>`,
  geld: (P) => `<rect x="6" y="22" width="88" height="54" rx="7" fill="#7FC98B" stroke="${P.ink}" stroke-width="4"/><circle cx="50" cy="49" r="16" fill="#B7E6BE" stroke="${P.ink}" stroke-width="3"/>
    <text x="50" y="58" text-anchor="middle" font-family="Vazirmatn" font-weight="900" font-size="24" fill="${P.ink}">€</text>`,
  brot: (P) => `<ellipse cx="50" cy="58" rx="42" ry="26" fill="#D99A4E" stroke="${P.ink}" stroke-width="4"/><path d="M30 44 l8 16 M48 40 l8 18 M66 44 l8 16" stroke="#9A5E22" stroke-width="5" stroke-linecap="round"/>`,
  wasser: (P) => `<rect x="38" y="6" width="24" height="10" rx="3" fill="#2F6FD6" stroke="${P.ink}" stroke-width="3"/><rect x="41" y="16" width="18" height="16" fill="#CDEBFA" stroke="${P.ink}" stroke-width="3"/>
    <rect x="30" y="30" width="40" height="64" rx="12" fill="#9ED7F5" stroke="${P.ink}" stroke-width="4"/><rect x="30" y="52" width="40" height="18" fill="#2F6FD6" opacity=".75"/>`,
  kaffee: (P) => `<path d="M36 10 q-6 8 0 16 M50 8 q-6 8 0 16" fill="none" stroke="${P.ink}" stroke-width="3" opacity=".5" stroke-linecap="round"/><path d="M70 50 q20 0 20 14 q0 14 -20 14" fill="none" stroke="${P.ink}" stroke-width="6"/>
    <rect x="18" y="34" width="54" height="56" rx="10" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/><rect x="18" y="34" width="54" height="10" fill="#7A4A26"/>`,
  milch: (P) => `<path d="M26 32 L50 10 L74 32 V94 H26 Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/><rect x="26" y="52" width="48" height="22" fill="#4C8DF0"/><path d="M26 32 H74" stroke="${P.ink}" stroke-width="3"/>`,
  apfel: (P) => `<circle cx="50" cy="58" r="34" fill="#E0413A" stroke="${P.ink}" stroke-width="4"/><path d="M50 26 q2 -12 10 -16" stroke="${P.ink}" stroke-width="4" fill="none"/><path d="M54 22 q16 -12 26 0 q-12 10 -26 0z" fill="#3FA34D" stroke="${P.ink}" stroke-width="2.5"/>`,
  karte: (P) => `<rect x="6" y="24" width="88" height="52" rx="8" fill="${P.accent}" stroke="${P.ink}" stroke-width="4"/><path d="M70 28 v44" stroke="${P.paper}" stroke-width="4" stroke-dasharray="5 5"/>
    <rect x="16" y="36" width="42" height="8" rx="3" fill="${P.paper}"/><rect x="16" y="52" width="30" height="7" rx="3" fill="${P.paper}" opacity=".8"/>`,
  brief: (P) => `<rect x="8" y="22" width="84" height="58" rx="5" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/><path d="M8 24 L50 58 L92 24" fill="none" stroke="${P.ink}" stroke-width="4"/><rect x="70" y="30" width="14" height="14" fill="${P.accent2}"/>`,
  handy: (P) => `<rect x="30" y="6" width="40" height="88" rx="9" fill="${P.ink}"/><rect x="34" y="16" width="32" height="64" rx="3" fill="#8FD3FF"/><circle cx="50" cy="87" r="3" fill="#FFFFFF"/>`,
  schirm: (P) => `<path d="M8 50 Q50 -2 92 50 Q82 42 71 50 Q61 42 50 50 Q39 42 29 50 Q19 42 8 50Z" fill="${P.accent2}" stroke="${P.ink}" stroke-width="4"/><path d="M50 50 V86 q0 8 -9 8 q-8 0 -8 -8" fill="none" stroke="${P.ink}" stroke-width="5"/>`,
  ausweis: (P) => `<rect x="4" y="22" width="92" height="58" rx="8" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/><rect x="4" y="22" width="92" height="14" rx="6" fill="${P.accent}"/>
    <rect x="12" y="42" width="24" height="30" rx="4" fill="#D8DEE8"/><rect x="44" y="46" width="42" height="6" rx="3" fill="${P.ink}" opacity=".6"/><rect x="44" y="58" width="32" height="6" rx="3" fill="${P.ink}" opacity=".4"/>`,
  formular: (P) => `<rect x="18" y="4" width="64" height="92" rx="5" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="26" y="${16 + i * 15}" width="${[46, 40, 48, 30, 42][i]}" height="6" rx="3" fill="${P.ink}" opacity=".5"/>`).join("")}<path d="M28 88 q10 -10 18 0 q8 8 16 -4" fill="none" stroke="${P.accent2}" stroke-width="3"/>`,
  termin: (P) => `<rect x="10" y="14" width="80" height="76" rx="8" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/><rect x="10" y="14" width="80" height="20" rx="6" fill="${P.accent2}"/>
    <rect x="24" y="6" width="8" height="18" rx="3" fill="${P.ink}"/><rect x="68" y="6" width="8" height="18" rx="3" fill="${P.ink}"/>${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${20 + c * 17}" y="${44 + r * 14}" width="10" height="8" rx="2" fill="${r === 1 && c === 2 ? P.accent2 : P.ink}" opacity="${r === 1 && c === 2 ? 1 : 0.35}"/>`).join("")).join("")}`,
  uhr: (P) => `<circle cx="50" cy="50" r="42" fill="${P.paper}" stroke="${P.ink}" stroke-width="5"/><path d="M50 50 V22 M50 50 L70 60" stroke="${P.ink}" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="50" r="5" fill="${P.accent2}"/>`,
  zug: (P) => `<rect x="12" y="14" width="76" height="66" rx="16" fill="${P.accent}" stroke="${P.ink}" stroke-width="4"/><rect x="22" y="24" width="56" height="24" rx="5" fill="#DDF3FF" stroke="${P.ink}" stroke-width="3"/>
    <circle cx="30" cy="64" r="6" fill="#FFE066"/><circle cx="70" cy="64" r="6" fill="#FFE066"/><path d="M24 80 l-10 14 M76 80 l10 14" stroke="${P.ink}" stroke-width="5"/>`,
  bus: (P) => `<rect x="6" y="18" width="88" height="60" rx="12" fill="#F2C12E" stroke="${P.ink}" stroke-width="4"/>${[0, 1, 2].map((i) => `<rect x="${14 + i * 26}" y="28" width="20" height="20" rx="3" fill="#DDF3FF" stroke="${P.ink}" stroke-width="2.5"/>`).join("")}
    <circle cx="26" cy="80" r="10" fill="${P.ink}"/><circle cx="74" cy="80" r="10" fill="${P.ink}"/>`,
  auto: (P) => `<path d="M8 66 V52 Q10 44 20 42 L30 26 Q34 20 42 20 H62 Q70 20 74 26 L84 42 Q92 44 92 52 V66 Z" fill="${P.accent2}" stroke="${P.ink}" stroke-width="4"/><path d="M34 28 H48 V42 H26Z M54 28 H66 L74 42 H54Z" fill="#DDF3FF"/>
    <circle cx="28" cy="68" r="11" fill="${P.ink}"/><circle cx="72" cy="68" r="11" fill="${P.ink}"/>`,
  fahrrad: (P) => `<circle cx="24" cy="64" r="18" fill="none" stroke="${P.ink}" stroke-width="5"/><circle cx="76" cy="64" r="18" fill="none" stroke="${P.ink}" stroke-width="5"/>
    <path d="M24 64 L42 36 H70 L76 64 M42 36 L54 64 L70 36 M38 30 H50 M70 36 L66 24 H76" fill="none" stroke="${P.accent2}" stroke-width="5" stroke-linejoin="round"/>`,
  haus: (P) => `<path d="M10 48 L50 12 L90 48" fill="${P.accent2}" stroke="${P.ink}" stroke-width="5" stroke-linejoin="round"/><rect x="20" y="46" width="60" height="46" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>
    <rect x="42" y="62" width="16" height="30" fill="#8A5A32"/><rect x="26" y="54" width="12" height="12" fill="#8FD3FF"/><rect x="62" y="54" width="12" height="12" fill="#8FD3FF"/>`,
  bett: (P) => `<rect x="8" y="34" width="10" height="56" rx="3" fill="#8A5A32"/><rect x="82" y="50" width="10" height="40" rx="3" fill="#8A5A32"/><rect x="12" y="58" width="78" height="20" rx="5" fill="${P.accent}" stroke="${P.ink}" stroke-width="3"/>
    <rect x="20" y="46" width="24" height="14" rx="6" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/>`,
  sonne: () => `${Array.from({ length: 8 }, (_, i) => `<rect x="47" y="2" width="6" height="16" rx="3" fill="#FFB400" transform="rotate(${i * 45} 50 50)"/>`).join("")}<circle cx="50" cy="50" r="26" fill="#FFD23F" stroke="#E09A00" stroke-width="4"/>`,
  kuchen: (P) => `<rect x="18" y="50" width="64" height="40" rx="6" fill="#F7C6D0" stroke="${P.ink}" stroke-width="4"/><path d="M18 62 q8 8 16 0 q8 8 16 0 q8 8 16 0 q8 8 16 0" fill="none" stroke="${P.paper}" stroke-width="5"/>
    <rect x="46" y="28" width="8" height="22" rx="2" fill="${P.accent}"/><path d="M50 12 q8 10 0 16 q-8 -6 0 -16z" fill="#FFB400"/>`,
  arzt: (P) => `<circle cx="50" cy="50" r="42" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/><path d="M42 24 h16 v18 h18 v16 h-18 v18 h-16 v-18 h-18 v-16 h18z" fill="#E0413A"/>`,
  musik: (P) => `<path d="M34 76 V22 L80 12 V66" fill="none" stroke="${P.ink}" stroke-width="6"/><ellipse cx="24" cy="78" rx="12" ry="9" fill="${P.accent2}" stroke="${P.ink}" stroke-width="3"/><ellipse cx="70" cy="68" rx="12" ry="9" fill="${P.accent2}" stroke="${P.ink}" stroke-width="3"/>`,
  familie: (P) => `${[[26, 30, 13, P.accent], [74, 30, 13, P.accent2], [50, 52, 10, "#F2C12E"]].map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#E7B48C" stroke="${P.ink}" stroke-width="3"/><path d="M${x - r - 6} ${y + r * 3.4} q0 -${r * 2} ${r + 6} -${r * 2} q${r + 6} 0 ${r + 6} ${r * 2}z" fill="${c}" stroke="${P.ink}" stroke-width="3"/>`).join("")}`,
  tuer: (P) => `<rect x="24" y="6" width="52" height="88" rx="4" fill="#A86B3C" stroke="${P.ink}" stroke-width="4"/><rect x="32" y="16" width="36" height="30" rx="3" fill="none" stroke="${P.ink}" stroke-width="2.5" opacity=".5"/><circle cx="66" cy="54" r="5" fill="#E0B23A" stroke="${P.ink}" stroke-width="2"/>`,
};

// Word patterns → icon. Order matters: the first match in a phrase wins.
const NOUNS = [
  ["schluessel", /schlüssel/], ["buch", /\bbuch\b|\bbücher/], ["tasche", /tasche/], ["geld", /\bgeld\b|\beuro\b|geldautomat/],
  ["brot", /\bbrot|brötchen/], ["wasser", /\bwasser\b/], ["kaffee", /\bkaffee\b|\btee\b|\btasse\b/], ["milch", /\bmilch\b/],
  ["apfel", /\bäpfel|\bapfel/], ["karte", /\bkarte\b|fahrkarte|ticket/], ["brief", /\bbrief|\bpaket\b|briefmarke/],
  ["handy", /\bhandy\b|telefon/], ["schirm", /schirm\b/], ["ausweis", /ausweis|reisepass/], ["formular", /formular|unterschrift/],
  ["termin", /\btermin\b/], ["uhr", /\buhr\b|verspätung|\bminuten\b/], ["zug", /\bzug\b|hauptbahnhof|\bbahn\b/],
  ["bus", /\bbus\b|haltestelle/], ["auto", /\bauto\b/], ["fahrrad", /fahrrad/], ["bett", /\bbett\b/],
  ["haus", /wohnung|\bhaus\b|\bhause\b/], ["sonne", /\bsonne\b|\bsommer\b/], ["kuchen", /geburtstag|glückwunsch/],
  ["arzt", /\barzt\b|medikament|fieber|kopfschmerz|\brezept\b|husten/], ["musik", /\bmusik\b/],
  ["familie", /familie|\bkinder\b|\bsohn\b|\btochter\b|\bbruder\b/], ["tuer", /\btür\b/],
  ["fenster", /fenster/], ["tisch", /\btisch\b/], ["stuhl", /\bstuhl\b|\bstühle\b/], ["sofa", /\bsofa\b/], ["sessel", /\bsessel\b/], ["lampe", /\blampe\b/],
];
/** Things small enough to hold up in one hand. */
const HOLDABLE = new Set(["schluessel", "buch", "tasche", "geld", "brot", "wasser", "kaffee", "milch", "apfel", "karte", "brief", "handy", "schirm", "ausweis", "formular", "termin"]);
/** Furniture that stands in the room: [centre x, centre y, box] in stage coordinates. */
export const ROOM_TARGETS = {
  fenster: [820, 190, [668, 86, 304, 208]],
  lampe: [520, 136, [470, 60, 100, 110]],
  sofa: [180, 632, [28, 548, 304, 158]],
  sessel: [412, 644, [344, 574, 136, 132]],
  stuhl: [690, 640, [640, 470, 100, 390]],
  tisch: [900, 562, [730, 540, 350, 40]],
};

/** Read one German phrase for what can be acted without guessing. */
export function readPhrase(de) {
  const lc = ` ${String(de).toLowerCase()} `;
  const hit = NOUNS.find(([, re]) => re.test(lc));
  const noun = hit ? hit[0] : null;
  return {
    noun,
    kind: !noun ? "none" : ROOM_TARGETS[noun] ? "point" : HOLDABLE.has(noun) ? "hold" : "think",
    question: /\?\s*$/.test(String(de).trim()),
    negation: /\b(nicht|nein)\b|\bkein/.test(lc),
    self: /\b(ich|mir|mich)\b|\bmein/.test(lc),
    you: /\b(du|dir|dich)\b|\bdein/.test(lc),
  };
}

export const iconSVG = (key, P) => (ICON[key] ? ICON[key](P) : "");
export const iconKeys = Object.keys(ICON);

/** The room behind the characters (the .cam-bg layer). */
export function roomBackSVG(P) {
  const R = P.room;
  const planks = Array.from({ length: 12 }, (_, i) => `<path d="M${-200 + i * 130} 880 L${120 + i * 90} 700" stroke="${P.floorLine}" stroke-width="3"/>`).join("");
  const ring = (k) => { const [, , [x, y, w, h]] = ROOM_TARGETS[k]; return `<rect class="ring-${k}" x="${x - 8}" y="${y - 8}" width="${w + 16}" height="${h + 16}" rx="18" fill="none" stroke="${P.accent2}" stroke-width="7" opacity="0"/>`; };
  return `<rect width="1080" height="880" fill="${P.wall}"/>
  ${Array.from({ length: 14 }, (_, i) => `<rect x="${i * 80 + 20}" y="0" width="30" height="700" fill="${P.wallLine}" opacity=".45"/>`).join("")}
  <rect y="700" width="1080" height="180" fill="${P.floor}"/>${planks}
  <rect y="690" width="1080" height="14" fill="${R.wood}"/>
  <!-- window, up behind the friend -->
  <g class="obj-fenster"><rect x="668" y="86" width="304" height="208" rx="12" fill="${P.window}" stroke="${P.frame}" stroke-width="10"/>
    <path d="M820 86 v208 M668 190 h304" stroke="${P.frame}" stroke-width="8"/>
    <rect class="win-light" x="690" y="98" width="40" height="184" fill="${P.windowLight}" opacity=".25" transform="skewX(-14)"/></g>
  <g class="curtain-l"><path d="M646 70 h40 q-10 120 6 236 h-50 z" fill="${R.curtain}" stroke="${R.line}" stroke-width="3"/></g>
  <g class="curtain-r"><path d="M954 70 h40 v236 h-50 q18 -116 10 -236 z" fill="${R.curtain}" stroke="${R.line}" stroke-width="3"/></g>
  <rect x="630" y="62" width="380" height="12" rx="6" fill="${R.wood}"/>
  <polygon class="beam" points="690,294 960,294 760,880 340,880" fill="url(#beam-g)" opacity=".5"/>
  ${Array.from({ length: 12 }, (_, i) => `<circle class="dust dust${i % 3}" cx="${420 + ((i * 97) % 380)}" cy="${330 + ((i * 131) % 440)}" r="${2 + (i % 3)}" fill="${P.windowLight}" opacity=".5"/>`).join("")}
  ${ring("fenster")}
  <!-- pendant lamp -->
  <g class="obj-lampe"><path d="M520 0 V78" stroke="${R.line}" stroke-width="4"/><path d="M478 128 Q480 80 520 78 Q560 80 562 128 Z" fill="${R.lamp}" stroke="${R.line}" stroke-width="4"/>
    <ellipse class="lamp-glow" cx="520" cy="136" rx="46" ry="16" fill="#FFE9A8" opacity=".55"/></g>
  ${ring("lampe")}
  <!-- clock and a framed picture over the sofa -->
  <g transform="translate(360 120)">
    <circle r="50" fill="${P.paper}" stroke="${R.wood}" stroke-width="9"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="-3" y="-42" width="6" height="10" rx="3" fill="${P.ink}" opacity=".5" transform="rotate(${i * 30})"/>`).join("")}
    <rect class="clock-h" x="-4" y="-28" width="8" height="32" rx="4" fill="${P.ink}"/><rect class="clock-m" x="-3" y="-40" width="6" height="44" rx="3" fill="${P.ink}"/>
    <rect class="clock-s" x="-1" y="-44" width="2" height="50" fill="${P.accent2}"/><circle r="6" fill="${P.ink}"/></g>
  <g transform="translate(84 300)"><rect width="200" height="140" rx="6" fill="${R.wood}"/><rect x="12" y="12" width="176" height="116" fill="${R.picSky}"/>
    <path d="M12 128 L70 60 L108 100 L140 72 L188 128 Z" fill="${R.picHill}"/><circle cx="150" cy="44" r="14" fill="#FFD23F"/></g>
  <!-- sofa and armchair -->
  <g class="obj-sofa"><rect x="28" y="560" width="304" height="96" rx="26" fill="${R.sofaShade}" stroke="${R.line}" stroke-width="4"/>
    <rect x="52" y="606" width="128" height="58" rx="14" fill="${R.sofa}" stroke="${R.line}" stroke-width="3"/><rect x="180" y="606" width="128" height="58" rx="14" fill="${R.sofa}" stroke="${R.line}" stroke-width="3"/>
    <rect x="16" y="596" width="44" height="98" rx="18" fill="${R.sofa}" stroke="${R.line}" stroke-width="4"/><rect x="300" y="596" width="44" height="98" rx="18" fill="${R.sofa}" stroke="${R.line}" stroke-width="4"/>
    <rect x="60" y="692" width="12" height="16" fill="${R.line}"/><rect x="288" y="692" width="12" height="16" fill="${R.line}"/>
    <rect class="cushion" x="220" y="582" width="58" height="48" rx="14" fill="${P.accent2}" stroke="${R.line}" stroke-width="3" transform="rotate(-8 249 606)"/></g>
  ${ring("sofa")}
  <g class="obj-sessel"><rect x="352" y="582" width="120" height="90" rx="24" fill="${R.chair}" stroke="${R.line}" stroke-width="4"/>
    <rect x="344" y="624" width="30" height="72" rx="12" fill="${R.chairShade}" stroke="${R.line}" stroke-width="4"/><rect x="450" y="624" width="30" height="72" rx="12" fill="${R.chairShade}" stroke="${R.line}" stroke-width="4"/>
    <rect x="372" y="640" width="84" height="44" rx="12" fill="${R.chairShade}" stroke="${R.line}" stroke-width="3"/></g>
  ${ring("sessel")}`;
}

/** The table, the empty chair and the friend's chair (the .cam layer, behind the friend). */
export function roomChairBackSVG(P) {
  const R = P.room;
  return `<g transform="translate(958 420)"><rect x="0" y="0" width="92" height="250" rx="16" fill="${R.wood}" stroke="${R.line}" stroke-width="4"/><rect x="14" y="16" width="64" height="96" rx="10" fill="${R.woodShade}"/></g>`;
}
export function roomFrontSVG(P) {
  const R = P.room;
  const ring = (k) => { const [, , [x, y, w, h]] = ROOM_TARGETS[k]; return `<rect class="ring-${k}" x="${x - 8}" y="${y - 8}" width="${w + 16}" height="${h + 16}" rx="18" fill="none" stroke="${P.accent2}" stroke-width="7" opacity="0"/>`; };
  return `<!-- the empty chair on this side of the table -->
  <g class="obj-stuhl"><rect x="652" y="470" width="22" height="380" rx="8" fill="${R.wood}" stroke="${R.line}" stroke-width="4"/>
    <rect x="652" y="470" width="80" height="120" rx="12" fill="${R.wood}" stroke="${R.line}" stroke-width="4"/><rect x="664" y="484" width="56" height="88" rx="8" fill="${R.woodShade}"/>
    <rect x="652" y="640" width="96" height="22" rx="8" fill="${R.wood}" stroke="${R.line}" stroke-width="4"/><rect x="724" y="660" width="18" height="190" rx="7" fill="${R.wood}" stroke="${R.line}" stroke-width="4"/></g>
  ${ring("stuhl")}
  <!-- the table, with a long cloth -->
  <g class="obj-tisch"><rect x="730" y="548" width="360" height="22" rx="8" fill="${R.wood}" stroke="${R.line}" stroke-width="4"/>
    <path d="M740 566 H1080 V860 Q1010 846 950 860 Q880 874 810 858 Q770 850 740 860 Z" fill="${R.cloth}" stroke="${R.line}" stroke-width="4"/>
    <path d="M790 574 V850 M870 574 V862 M950 574 V856 M1030 574 V852" stroke="${R.clothShade}" stroke-width="6" opacity=".6"/></g>
  ${ring("tisch")}
  <g transform="translate(1010 500)"><path class="steam" d="M-6 -14 q-8 -12 0 -24 q8 -12 0 -24" fill="none" stroke="${P.paper}" stroke-width="4" opacity=".6" stroke-linecap="round"/>
    <rect x="-22" y="0" width="44" height="48" rx="9" fill="${P.paper}" stroke="${R.line}" stroke-width="4"/><path d="M22 12 q16 0 16 12 q0 12 -16 12" fill="none" stroke="${R.line}" stroke-width="5"/></g>`;
}
