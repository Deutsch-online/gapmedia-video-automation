// PER-SLIDE concept art.
//
// The earlier system picked ONE concept for the whole video, so all four slides
// showed the same camera or the same waveform while their captions described
// four different actions. This library instead draws a full illustration for the
// ACTION OF EACH SLIDE: "open the website" draws a browser, "write your text"
// draws a pen writing on a page, "pick a voice" draws a microphone with a
// waveform, "publish" draws a rocket. So slide 1 and slide 3 of the same video
// look nothing alike, because they are about different things.
//
// Each scene is chosen from the step's own icon + its Persian caption, so new
// features get sensible art without any extra wiring.
//
// Shared animation hooks (one seek-safe animator drives them all):
//   .mfx pops in · .mbar grows from base · .mdr strokes draw ·
//   .mpulse beats · .mcaret blinks

import { appScreen, toolCard, APP_SCREEN_CSS } from "./app-screen.mjs";

const draw = (s) =>
  s.replace(/<(path|circle|rect|ellipse|line|polyline|polygon)\b/g, '<$1 pathLength="1"');

const ground = (cx = 120, rx = 92, ry = 14) =>
  `<ellipse cx="${cx}" cy="238" rx="${rx}" ry="${ry}" fill="var(--d)" opacity=".11"/>`;

// ── the art library: one illustration per action ─────────────────────────────
const SCENES = {
  // open a site / go to a section
  browser: () => `${ground()}
    <rect class="mfx" x="24" y="52" width="192" height="156" rx="18" fill="#fff" stroke="var(--d)" stroke-width="5"/>
    <rect class="mfx" x="24" y="52" width="192" height="38" rx="18" fill="var(--d)"/>
    <circle cx="46" cy="71" r="6" fill="#fff" opacity=".9"/><circle cx="66" cy="71" r="6" fill="#fff" opacity=".6"/>
    <rect class="mfx" x="88" y="63" width="108" height="16" rx="8" fill="#fff" opacity=".35"/>
    <rect class="mfx" x="44" y="112" width="120" height="16" rx="8" fill="var(--a)"/>
    <rect class="mfx" x="44" y="140" width="152" height="12" rx="6" fill="var(--d)" opacity=".22"/>
    <rect class="mfx" x="44" y="164" width="96"  height="12" rx="6" fill="var(--d)" opacity=".22"/>
    <circle class="mpulse" cx="186" cy="176" r="18" fill="var(--a)"/>
    <path class="mdr" d="M180 176 l5 6 10 -12" stroke="#fff" stroke-width="5"/>`,

  // a menu / list where one row is chosen
  menu: () => `${ground()}
    <rect class="mfx" x="30" y="46" width="180" height="168" rx="20" fill="#fff" stroke="var(--d)" stroke-width="5"/>
    <rect class="mfx" x="48" y="70"  width="144" height="34" rx="12" fill="var(--a)"/>
    <circle cx="70" cy="87" r="10" fill="#fff"/>
    <rect class="mfx" x="48" y="116" width="144" height="30" rx="12" fill="var(--d)" opacity=".14"/>
    <rect class="mfx" x="48" y="156" width="144" height="30" rx="12" fill="var(--d)" opacity=".14"/>
    <path class="mpulse" d="M168 176 c14 -8 26 2 22 16 l-8 -6 -6 12z" fill="var(--d)"/>`,

  // writing text — a pen on a page, caret blinking
  write: () => `${ground()}
    <rect class="mfx" x="34" y="40" width="150" height="176" rx="16" fill="#fff" stroke="var(--d)" stroke-width="5"/>
    <rect class="mfx" x="56" y="76"  width="106" height="14" rx="7" fill="var(--d)" opacity=".5"/>
    <rect class="mfx" x="56" y="106" width="78"  height="14" rx="7" fill="var(--a)"/>
    <rect class="mcaret" x="140" y="102" width="7" height="22" rx="3" fill="var(--a)"/>
    <rect class="mfx" x="56" y="136" width="120" height="14" rx="7" fill="var(--d)" opacity=".22"/>
    <path class="mfx" d="M150 206 l52 -52 20 20 -52 52 -26 6z" fill="var(--a)"/>
    <path class="mdr" d="M202 154 l20 20" stroke="#fff" stroke-width="4"/>`,

  // a CV / media kit — a document with a portrait and stat bars
  resume: () => `${ground(120, 84)}
    <rect class="mfx" x="40" y="28" width="160" height="196" rx="16" fill="#fff" stroke="var(--d)" stroke-width="5"/>
    <rect class="mfx" x="40" y="28" width="160" height="48" rx="16" fill="var(--a)"/>
    <circle class="mfx" cx="82" cy="104" r="24" fill="var(--d)"/>
    <path class="mfx" d="M56 148 a26 24 0 0 1 52 0z" fill="var(--d)"/>
    <rect class="mfx" x="120" y="92" width="60" height="12" rx="6" fill="var(--d)" opacity=".45"/>
    <rect class="mfx" x="120" y="112" width="44" height="10" rx="5" fill="var(--d)" opacity=".25"/>
    <rect class="mbar" x="62"  y="196" width="26" height="18" rx="9" fill="var(--a)"/>
    <rect class="mbar" x="98"  y="188" width="26" height="26" rx="9" fill="var(--a)"/>
    <rect class="mbar" x="134" y="176" width="26" height="38" rx="9" fill="var(--a)"/>
    <path class="mpulse" d="M186 44 l5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5z" fill="#fff"/>`,

  // studio sound — a broadcast mic on a stand, level bars behind it
  studio: () => `${ground(118, 86)}
    ${[40, 68, 100, 74, 46].map((h, i) =>
      `<rect class="mbar" x="${22 + i * 15}" y="${140 - h / 2}" width="9" height="${h}" rx="4.5" fill="var(--a)" opacity=".35"/>`).join("")}
    ${[40, 68, 100, 74, 46].map((h, i) =>
      `<rect class="mbar" x="${172 + i * 15}" y="${140 - h / 2}" width="9" height="${h}" rx="4.5" fill="var(--a)" opacity=".35"/>`).join("")}
    <rect class="mfx" x="86" y="34" width="68" height="106" rx="34" fill="var(--d)"/>
    ${[0, 1, 2, 3].map((i) => `<line class="mdr" x1="96" y1="${58 + i * 20}" x2="144" y2="${58 + i * 20}" stroke="#fff" stroke-width="4" opacity=".32"/>`).join("")}
    <path class="mdr" d="M62 126 a58 58 0 0 0 116 0" stroke="var(--a)" stroke-width="9"/>
    <line class="mdr" x1="120" y1="182" x2="120" y2="208" stroke="var(--a)" stroke-width="9"/>
    <rect class="mfx" x="84" y="208" width="72" height="14" rx="7" fill="var(--a)"/>
    <circle class="mpulse" cx="188" cy="56" r="12" fill="#ff4d5e"/>`,

  // camera / recording
  camera: () => `${ground(104)}
    <rect class="mfx" x="30" y="94" width="146" height="100" rx="22" fill="var(--d)"/>
    <path class="mfx" d="M176 126 l42 -24 v72 l-42 -24z" fill="var(--d)" opacity=".82"/>
    <rect class="mfx" x="72" y="70" width="48" height="26" rx="9" fill="var(--d)"/>
    <circle class="mfx" cx="94" cy="144" r="40" fill="#fff"/>
    <circle class="mfx" cx="94" cy="144" r="29" fill="var(--a)"/>
    <circle class="mfx" cx="94" cy="144" r="14" fill="var(--d)"/>
    <circle cx="83" cy="133" r="6" fill="#fff" opacity=".85"/>
    <circle class="mpulse" cx="154" cy="116" r="9" fill="#ff4d5e"/>`,

  // microphone + waveform (voice, dubbing, audio pick)
  mic: () => `${ground(96)}
    <rect class="mfx" x="72" y="40" width="52" height="98" rx="26" fill="var(--d)"/>
    <rect class="mfx" x="86" y="58" width="24" height="16" rx="8" fill="#fff" opacity=".35"/>
    <path class="mdr" d="M54 116 a44 44 0 0 0 88 0" stroke="var(--a)" stroke-width="8"/>
    <line class="mdr" x1="98" y1="160" x2="98" y2="196" stroke="var(--a)" stroke-width="8"/>
    <line class="mdr" x1="70" y1="200" x2="126" y2="200" stroke="var(--a)" stroke-width="8"/>
    ${[40, 72, 108, 74, 46].map((h, i) =>
      `<rect class="mbar" x="${164 + i * 15}" y="${150 - h / 2}" width="9" height="${h}" rx="4.5"
        fill="${i % 2 ? "var(--a)" : "var(--d)"}" opacity=".9"/>`).join("")}`,

  // waveform only (music / audio result)
  wave: () => {
    const hs = [30, 62, 96, 52, 116, 140, 88, 120, 64, 100, 40, 74];
    return `<ellipse cx="120" cy="146" rx="126" ry="88" fill="var(--a)" opacity=".08"/>
      ${hs.map((h, i) => `<rect class="mbar" x="${26 + i * 16}" y="${146 - h / 2}" width="10" height="${h}" rx="5"
        fill="${i % 2 ? "var(--a)" : "var(--d)"}" opacity=".95"/>`).join("")}`;
  },

  // music note (make a track / pick a song)
  music: () => `${ground(112)}
    <circle class="mfx" cx="120" cy="132" r="76" fill="var(--a)" opacity=".14"/>
    <ellipse class="mfx" cx="84" cy="176" rx="30" ry="24" fill="var(--d)"/>
    <ellipse class="mfx" cx="164" cy="158" rx="30" ry="24" fill="var(--a)"/>
    <path class="mfx" d="M108 176 v-108 l86 -18 v108" stroke="var(--d)" stroke-width="11" fill="none"/>
    <path class="mfx" d="M108 96 l86 -18" stroke="var(--d)" stroke-width="11"/>
    <path class="mpulse" d="M40 60 l5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5z" fill="var(--a)"/>`,

  // search / keywords
  search: () => `${ground(112, 80)}
    <circle class="mfx" cx="108" cy="94" r="58" fill="#fff" stroke="var(--d)" stroke-width="10"/>
    <circle class="mfx" cx="108" cy="94" r="30" fill="var(--a)" opacity=".2"/>
    <circle class="mdr" cx="108" cy="94" r="30" stroke="var(--a)" stroke-width="7"/>
    <line class="mfx" x1="150" y1="136" x2="198" y2="184" stroke="var(--d)" stroke-width="15"/>
    <rect class="mfx" x="36" y="196" width="120" height="22" rx="11" fill="var(--a)"/>`,

  // analytics / numbers
  chart: () => `${ground(120, 88, 12)}
    <rect class="mfx" x="24" y="42" width="192" height="172" rx="20" fill="#fff" stroke="var(--d)" stroke-width="5"/>
    ${[86, 126, 166].map((y) => `<line x1="40" y1="${y}" x2="200" y2="${y}" stroke="var(--d)" stroke-width="2" opacity=".12"/>`).join("")}
    ${[70, 104, 60, 128].map((h, i) => `<rect class="mbar" x="${52 + i * 40}" y="${194 - h}" width="26" height="${h}" rx="7"
      fill="${i === 3 ? "var(--a)" : "var(--d)"}" opacity=".9"/>`).join("")}
    <path class="mdr" d="M60 130 L100 108 L140 132 L192 76" stroke="var(--a)" stroke-width="6"/>
    <circle class="mpulse" cx="192" cy="76" r="12" fill="#fff" stroke="var(--a)" stroke-width="6"/>`,

  // trending up
  trend: () => `${ground(120, 86)}
    <path class="mdr" d="M32 190 L92 132 L132 166 L206 76" stroke="var(--a)" stroke-width="12"/>
    <path class="mfx" d="M166 70 h46 v46" stroke="var(--a)" stroke-width="12" fill="none"/>
    ${[0, 1, 2].map((i) => `<circle class="mpulse" cx="${92 + i * 40}" cy="${132 + (i === 1 ? 34 : 0)}" r="10" fill="var(--d)"/>`).join("")}`,

  // a clock / timing
  clock: () => `${ground(120, 78)}
    <circle class="mfx" cx="120" cy="126" r="80" fill="#fff" stroke="var(--d)" stroke-width="8"/>
    <circle class="mfx" cx="120" cy="126" r="64" fill="var(--a)" opacity=".12"/>
    ${[0, 90, 180, 270].map((a) => {
      const r1 = 56, r2 = 66, rad = (a * Math.PI) / 180;
      return `<line x1="${120 + r1 * Math.cos(rad)}" y1="${126 + r1 * Math.sin(rad)}"
        x2="${120 + r2 * Math.cos(rad)}" y2="${126 + r2 * Math.sin(rad)}" stroke="var(--d)" stroke-width="6"/>`;
    }).join("")}
    <path class="mdr" d="M120 126 v-42" stroke="var(--d)" stroke-width="9"/>
    <path class="mdr" d="M120 126 l34 20" stroke="var(--a)" stroke-width="9"/>
    <circle cx="120" cy="126" r="9" fill="var(--d)"/>`,

  // calendar / schedule
  calendar: () => `${ground(112, 82)}
    <rect class="mfx" x="30" y="60" width="164" height="152" rx="18" fill="#fff" stroke="var(--d)" stroke-width="5"/>
    <rect class="mfx" x="30" y="60" width="164" height="42" rx="18" fill="var(--a)"/>
    <rect class="mfx" x="62" y="44" width="12" height="30" rx="6" fill="var(--d)"/>
    <rect class="mfx" x="150" y="44" width="12" height="30" rx="6" fill="var(--d)"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => {
      const on = i === 4, x = 54 + (i % 3) * 46, y = 122 + Math.floor(i / 3) * 44;
      return `<rect class="${on ? "mpulse" : "mfx"}" x="${x}" y="${y}" width="30" height="28" rx="7"
        fill="${on ? "var(--a)" : "var(--d)"}" opacity="${on ? 1 : .2}"/>`;
    }).join("")}`,

  // globe / languages / the web
  globe: () => `${ground(112, 78)}
    <circle class="mfx" cx="112" cy="122" r="76" fill="var(--a)" opacity=".16"/>
    <circle class="mdr" cx="112" cy="122" r="76" stroke="var(--d)" stroke-width="7"/>
    <ellipse class="mdr" cx="112" cy="122" rx="32" ry="76" stroke="var(--d)" stroke-width="5"/>
    <line class="mdr" x1="36"  y1="122" x2="188" y2="122" stroke="var(--d)" stroke-width="5"/>
    <line class="mdr" x1="48"  y1="84"  x2="176" y2="84"  stroke="var(--d)" stroke-width="5"/>
    <line class="mdr" x1="48"  y1="160" x2="176" y2="160" stroke="var(--d)" stroke-width="5"/>`,

  // before → after transform
  transform: () => `${ground()}
    <rect class="mfx" x="14" y="82" width="90" height="116" rx="16" fill="var(--d)" opacity=".22"/>
    <circle class="mfx" cx="42" cy="152" r="13" fill="#fff" opacity=".7"/>
    <path class="mfx" d="M24 198 q32 -38 66 0z" fill="#fff" opacity=".5"/>
    <path class="mdr" d="M112 140 h30 m-12 -11 l12 11 -12 11" stroke="var(--d)" stroke-width="7"/>
    <rect class="mfx" x="138" y="82" width="90" height="116" rx="16" fill="#fff" stroke="var(--a)" stroke-width="7"/>
    <circle class="mfx" cx="198" cy="120" r="15" fill="#ffd24a"/>
    <path class="mfx" d="M148 198 q34 -44 88 0 v0 h-88z" fill="var(--a)"/>
    <path class="mpulse" d="M150 44 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6z" fill="var(--a)"/>`,

  // magic wand / auto-process
  wand: () => `${ground(120, 80)}
    <path class="mfx" d="M56 200 l112 -112 22 22 -112 112z" fill="var(--a)"/>
    <path class="mfx" d="M168 88 l22 22" stroke="#fff" stroke-width="5"/>
    ${[[186, 48, 16], [56, 74, 12], [206, 116, 10]].map(([x, y, r]) =>
      `<path class="mpulse" d="M${x} ${y - r} l${r * .3} ${r * .6} ${r * .6} ${r * .3} -${r * .6} ${r * .3} -${r * .3} ${r * .6} -${r * .3} -${r * .6} -${r * .6} -${r * .3} ${r * .6} -${r * .3}z" fill="var(--d)"/>`).join("")}`,

  // send — a paper plane. No disc behind it: an accent-on-accent wing vanishes.
  // The body is the deep ink, the fold is the accent, both on open paper, so the
  // silhouette stays legible at phone size.
  send: () => `${ground(126, 78)}
    <path class="mfx" d="M212 44 L28 112 l74 30z" fill="var(--a)"/>
    <path class="mfx" d="M212 44 L102 142 l20 62z" fill="var(--d)"/>
    <path class="mfx" d="M102 142 l20 62 26 -38z" fill="#fff" stroke="var(--d)" stroke-width="4"/>
    <path class="mdr" d="M212 44 L102 142" stroke="#fff" stroke-width="5"/>
    ${[0, 1, 2].map((i) => `<line class="mpulse" x1="${18 + i * 14}" y1="${168 + i * 20}" x2="${66 - i * 4}" y2="${168 + i * 20}" stroke="var(--a)" stroke-width="8" opacity="${(0.55 - i * 0.15).toFixed(2)}"/>`).join("")}`,

  // upload to the cloud
  // Upload YOUR photo. The old art was a bare cloud with an arrow — the generic
  // upload glyph, which says "something is being sent somewhere" and nothing
  // about the picture the step is asking for. Now the photo itself is the
  // subject: a real image card (sky, sun, hills) lifting out of a tray.
  upload: () => `${ground(120, 84)}
    <path class="mfx" d="M40 150 v46 a12 12 0 0 0 12 12 h136 a12 12 0 0 0 12 -12 v-46"
      fill="none" stroke="var(--d)" stroke-width="7" stroke-linecap="round"/>
    <rect class="mfx" x="62" y="34" width="116" height="96" rx="12" fill="#fff" stroke="var(--d)" stroke-width="6"/>
    <path class="mfx" d="M68 118 l30 -34 22 22 20 -26 32 38z" fill="var(--a)"/>
    <circle class="mpulse" cx="150" cy="60" r="12" fill="var(--a)"/>
    <path class="mpulse" d="M120 196 v-52 m-22 22 l22 -22 22 22"
      stroke="var(--d)" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  // Download the finished file. This step used to fall through to `sparkle` — a
  // decorative star that tells the viewer nothing about saving their video.
  download: () => `${ground(120, 84)}
    <rect class="mfx" x="60" y="24" width="120" height="104" rx="12" fill="#fff" stroke="var(--d)" stroke-width="6"/>
    <path class="mfx" d="M78 66 h60 M78 88 h84 M78 108 h48" stroke="var(--d)" stroke-width="7"
      stroke-linecap="round" opacity=".3"/>
    <path class="mfx" d="M104 40 l16 0 0 0z" fill="var(--a)"/>
    <path class="mpulse" d="M120 128 v56 m-24 -24 l24 24 24 -24"
      stroke="var(--a)" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="mdr" d="M44 186 v20 a12 12 0 0 0 12 12 h128 a12 12 0 0 0 12 -12 v-20"
      fill="none" stroke="var(--d)" stroke-width="7" stroke-linecap="round"/>`,

  // A toolbox. The previous version read as a PADLOCK: a semicircular handle
  // over a box with a centred dot is exactly a padlock's shackle and keyhole.
  // Fixed by using a flat grip bar on two posts (never an arc), splitting the
  // body into a lid and a tray, and letting a screwdriver and wrench stick out.
  toolbox: () => `${ground(120, 88)}
    <rect class="mfx" x="88" y="60" width="64" height="12" rx="6" fill="var(--d)"/>
    <rect class="mfx" x="88" y="60" width="12" height="30" rx="5" fill="var(--d)"/>
    <rect class="mfx" x="140" y="60" width="12" height="30" rx="5" fill="var(--d)"/>
    <rect class="mfx" x="28" y="88" width="184" height="46" rx="10" fill="var(--d)"/>
    <rect class="mfx" x="28" y="134" width="184" height="70" rx="12" fill="var(--a)"/>
    <rect class="mfx" x="96" y="104" width="48" height="16" rx="6" fill="#fff" opacity=".35"/>
    <rect class="mfx" x="52" y="152" width="34" height="36" rx="6" fill="#fff" opacity=".85"/>
    <rect class="mfx" x="100" y="152" width="34" height="36" rx="6" fill="#fff" opacity=".55"/>
    <rect class="mfx" x="148" y="152" width="34" height="36" rx="6" fill="#fff" opacity=".85"/>
    <path class="mpulse" d="M186 34 l22 22 -14 14 -22 -22z" fill="var(--d)"/>
    <path class="mpulse" d="M164 56 l14 -14 10 10 -14 14z" fill="var(--a)"/>`,

  // a toggle switching on
  toggle: () => `${ground(120, 78, 12)}
    <rect class="mfx" x="44" y="106" width="152" height="76" rx="38" fill="var(--a)" opacity=".22"/>
    <rect class="mdr" x="44" y="106" width="152" height="76" rx="38" fill="none" stroke="var(--a)" stroke-width="6"/>
    <circle class="mfx" cx="158" cy="144" r="32" fill="var(--a)"/>
    <circle cx="148" cy="134" r="9" fill="#fff" opacity=".65"/>
    <path class="mdr" d="M146 144 l8 10 18 -21" stroke="#fff" stroke-width="7"/>`,

  // people / collaborators / audience
  users: () => `${ground(120, 88)}
    <circle class="mfx" cx="82" cy="98" r="34" fill="var(--d)"/>
    <path class="mfx" d="M32 186 a50 46 0 0 1 100 0z" fill="var(--d)"/>
    <circle class="mfx" cx="162" cy="110" r="28" fill="var(--a)"/>
    <path class="mfx" d="M122 186 a40 38 0 0 1 80 0z" fill="var(--a)"/>
    <path class="mpulse" d="M112 54 l6 13 13 6 -13 6 -6 13 -6 -13 -13 -6 13 -6z" fill="var(--a)"/>`,

  // one person / profile
  user: () => `${ground(120, 82)}
    <circle class="mfx" cx="120" cy="112" r="80" fill="var(--a)" opacity=".14"/>
    <circle class="mfx" cx="120" cy="94" r="38" fill="var(--d)"/>
    <path class="mfx" d="M64 190 a56 52 0 0 1 112 0z" fill="var(--d)"/>
    <circle class="mpulse" cx="180" cy="62" r="20" fill="var(--a)"/>
    <path class="mdr" d="M172 62 l6 7 12 -14" stroke="#fff" stroke-width="5"/>`,

  // a comment / chat bubble
  chat: () => `${ground(112, 86)}
    <path class="mfx" d="M28 62 h150 a18 18 0 0 1 18 18 v76 a18 18 0 0 1 -18 18 h-92 l-38 30 v-30 h-20 a18 18 0 0 1 -18 -18 v-76 a18 18 0 0 1 18 -18z" fill="#fff" stroke="var(--d)" stroke-width="5"/>
    <rect class="mfx" x="52" y="94"  width="102" height="14" rx="7" fill="var(--a)"/>
    <rect class="mfx" x="52" y="122" width="70"  height="14" rx="7" fill="var(--d)" opacity=".28"/>
    <circle class="mpulse" cx="186" cy="66" r="22" fill="var(--a)"/>
    <path class="mdr" d="M186 56 v20 M176 66 h20" stroke="#fff" stroke-width="5"/>`,

  // layers / grid / carousel
  layers: () => `${ground(120, 88)}
    <path class="mfx" d="M120 44 l88 42 -88 42 -88 -42z" fill="var(--a)"/>
    <path class="mfx" d="M32 126 l88 42 88 -42" stroke="var(--d)" stroke-width="10" fill="none" opacity=".5"/>
    <path class="mfx" d="M32 166 l88 42 88 -42" stroke="var(--d)" stroke-width="10" fill="none" opacity=".25"/>`,

  // a star / highlight / pin
  // The halo is drawn in the INK colour, not the accent: an accent shape on an
  // accent-tinted disc merges into one blob at phone size — the star read as an
  // orange circle. Ink halo + accent shape keeps the silhouette readable.
  star: () => `${ground(120, 78)}
    <circle class="mfx" cx="120" cy="118" r="84" fill="var(--d)" opacity=".08"/>
    <path class="mfx" d="M120 46 l24 50 55 8 -40 39 10 55 -49 -27 -49 27 10 -55 -40 -39 55 -8z"
      fill="var(--a)" stroke="#fff" stroke-width="5"/>
    <path class="mpulse" d="M198 56 l5 11 11 5 -11 5 -5 11 -5 -11 -11 -5 11 -5z" fill="var(--d)"/>`,

  // editing a keyword list: one chip removed, one added. "Write" drew a pen on
  // a page, which is a different act entirely.
  keywords: () => `${ground(120, 86)}
    <rect class="mfx" x="26" y="40" width="188" height="172" rx="18" fill="#fff" stroke="var(--d)" stroke-width="5"/>
    <rect class="mfx" x="46" y="64" width="106" height="30" rx="15" fill="var(--d)" opacity=".85"/>
    <rect class="mfx" x="46" y="108" width="128" height="30" rx="15" fill="var(--d)" opacity=".22"/>
    <rect class="mfx" x="46" y="152" width="92" height="30" rx="15" fill="var(--a)"/>
    <circle class="mpulse" cx="176" cy="79" r="21" fill="#ff4d5e"/>
    <path class="mdr" d="M168 71l16 16M184 71l-16 16" stroke="#fff" stroke-width="6"/>
    <circle class="mpulse" cx="176" cy="167" r="21" fill="var(--a)"/>
    <path class="mdr" d="M176 157v20M166 167h20" stroke="#fff" stroke-width="6"/>`,

  // being FOUND in search: your result sitting at the top of the list
  found: () => `${ground(120, 86)}
    <rect class="mfx" x="26" y="30" width="188" height="52" rx="26" fill="#fff" stroke="var(--d)" stroke-width="5"/>
    <circle class="mdr" cx="58" cy="56" r="14" stroke="var(--a)" stroke-width="6"/>
    <line class="mdr" x1="69" y1="67" x2="82" y2="80" stroke="var(--a)" stroke-width="6"/>
    <rect class="mfx" x="94" y="47" width="98" height="16" rx="8" fill="var(--d)" opacity=".28"/>
    <rect class="mfx" x="26" y="98" width="188" height="52" rx="14" fill="var(--a)"/>
    <path class="mfx" d="M52 112l26 12-26 12z" fill="#fff"/>
    <rect class="mfx" x="92" y="114" width="96" height="12" rx="6" fill="#fff" opacity=".95"/>
    <rect class="mfx" x="92" y="132" width="62" height="10" rx="5" fill="#fff" opacity=".6"/>
    <rect class="mghost" x="26" y="162" width="188" height="44" rx="14" fill="var(--d)" opacity=".14"/>
    <path class="mpulse" d="M196 22l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="var(--a)"/>`,

  // a deportation flight: a plane leaving over the border line, not a decorative
  // circle. This is the single most common story on the German Insider beat and
  // it had been falling through to `sparkle`.
  deport: () => `${ground(120, 86)}
    <path class="mfx" d="M22 210 h196" stroke="var(--d)" stroke-width="7" stroke-dasharray="18 15" opacity=".4"/>
    <g transform="rotate(-34 120 120)">
      <path class="mfx" d="M120 26 q13 26 13 62 v54 q0 22 -13 32 q-13 -10 -13 -32 v-54 q0 -36 13 -62z" fill="var(--d)"/>
      <path class="mfx" d="M108 104 L26 150 v20 l82 -28z" fill="var(--d)"/>
      <path class="mfx" d="M132 104 L214 150 v20 l-82 -28z" fill="var(--d)"/>
      <path class="mfx" d="M110 178 L80 198 v12 l30 -14z" fill="var(--a)"/>
      <path class="mfx" d="M130 178 L160 198 v12 l-30 -14z" fill="var(--a)"/>
    </g>
    <path class="mpulse" d="M44 96 h30 M34 122 h44 M52 70 h22" stroke="var(--a)" stroke-width="9"/>`,

  // a protest: a raised placard, the picture every demonstration story needs
  protest: () => `${ground(120, 84)}
    <rect class="mfx" x="56" y="30" width="128" height="86" rx="10" fill="#fff" stroke="var(--d)" stroke-width="6"/>
    <path class="mfx" d="M76 58 h88 M76 78 h64 M76 96 h80" stroke="var(--a)" stroke-width="8"/>
    <path class="mfx" d="M120 116 v52" stroke="var(--d)" stroke-width="9"/>
    <circle class="mfx" cx="76" cy="188" r="24" fill="var(--d)"/>
    <circle class="mfx" cx="164" cy="188" r="24" fill="var(--a)"/>
    <path class="mpulse" d="M120 168 l-28 20 M120 168 l28 20" stroke="var(--d)" stroke-width="9"/>`,

  // an empty folder beside a full one — the video's opening contrast
  dossier: () => `${ground(120, 88)}
    <path class="mfx" d="M18 70h58l14 18h34a8 8 0 0 1 8 8v92a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8V78a8 8 0 0 1 8-8z"
      fill="none" stroke="var(--d)" stroke-width="7" opacity=".45"/>
    <path class="mfx" d="M96 56h56l14 18h30a8 8 0 0 1 8 8v90a8 8 0 0 1-8 8h-100a8 8 0 0 1-8-8V64a8 8 0 0 1 8-8z"
      fill="var(--a)"/>
    <path class="mdr" d="M118 104h68M118 126h52M118 148h60" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`,

  // a rate card filling in: the numbers a brand actually reads
  ratecard: () => `${ground(120, 84)}
    <rect class="mfx" x="34" y="26" width="152" height="168" rx="12" fill="#fff" stroke="var(--d)" stroke-width="6"/>
    <rect class="mfx" x="34" y="26" width="152" height="34" rx="12" fill="var(--d)"/>
    <path class="mfx" d="M56 90h44M56 122h44M56 154h44" stroke="var(--d)" stroke-width="8" stroke-linecap="round" opacity=".3"/>
    <rect class="mpulse" x="120" y="80" width="46" height="18" rx="9" fill="var(--a)"/>
    <rect class="mpulse" x="120" y="112" width="46" height="18" rx="9" fill="var(--a)"/>
    <rect class="mpulse" x="120" y="144" width="46" height="18" rx="9" fill="var(--a)" opacity=".45"/>`,

  // an approval stamp coming down on the page
  stamp: () => `${ground(120, 86)}
    <rect class="mfx" x="40" y="120" width="140" height="76" rx="10" fill="#fff" stroke="var(--d)" stroke-width="6"/>
    <rect class="mpulse" x="62" y="140" width="96" height="38" rx="8" fill="none" stroke="var(--a)" stroke-width="8"/>
    <path class="mpulse" d="M78 160l14 14 30 -32" stroke="var(--a)" stroke-width="9" fill="none"
      stroke-linecap="round" stroke-linejoin="round"/>
    <rect class="mfx" x="86" y="28" width="48" height="56" rx="8" fill="var(--d)"/>
    <rect class="mfx" x="66" y="84" width="88" height="20" rx="8" fill="var(--d)"/>`,

  // a court ruling: scales, level and settled
  court: () => `${ground(120, 88)}
    <rect class="mfx" x="112" y="40" width="16" height="150" rx="6" fill="var(--d)"/>
    <rect class="mfx" x="70" y="190" width="100" height="18" rx="9" fill="var(--d)"/>
    <line class="mdr" x1="40" y1="70" x2="200" y2="70" stroke="var(--d)" stroke-width="9"/>
    <line class="mdr" x1="52" y1="70" x2="52" y2="104" stroke="var(--d)" stroke-width="5"/>
    <line class="mdr" x1="188" y1="70" x2="188" y2="104" stroke="var(--d)" stroke-width="5"/>
    <path class="mfx" d="M22 104 h60 l-30 42z" fill="var(--a)"/>
    <path class="mfx" d="M158 104 h60 l-30 42z" fill="var(--a)"/>
    <circle class="mpulse" cx="120" cy="40" r="13" fill="var(--a)"/>`,

  // an official decision on paper, with a stamp
  decree: () => `${ground(120, 84)}
    <rect class="mfx" x="42" y="26" width="156" height="196" rx="12" fill="#fff" stroke="var(--d)" stroke-width="5"/>
    <rect class="mfx" x="66" y="58" width="108" height="14" rx="7" fill="var(--d)" opacity=".8"/>
    <rect class="mfx" x="66" y="88" width="130" height="11" rx="5" fill="var(--d)" opacity=".28"/>
    <rect class="mfx" x="66" y="112" width="112" height="11" rx="5" fill="var(--d)" opacity=".28"/>
    <rect class="mfx" x="66" y="136" width="126" height="11" rx="5" fill="var(--d)" opacity=".28"/>
    <circle class="mpulse" cx="152" cy="182" r="34" fill="none" stroke="var(--a)" stroke-width="7"/>
    <circle class="mfx" cx="152" cy="182" r="22" fill="var(--a)" opacity=".2"/>
    <path class="mdr" d="M140 182 l9 10 17 -19" stroke="var(--a)" stroke-width="7"/>`,

  // a family waiting — the people a policy is about
  family: () => `${ground(120, 92)}
    <circle class="mfx" cx="74" cy="70" r="27" fill="var(--d)"/>
    <path class="mfx" d="M34 168 a40 40 0 0 1 80 0z" fill="var(--d)"/>
    <circle class="mfx" cx="150" cy="84" r="22" fill="var(--a)"/>
    <path class="mfx" d="M118 168 a32 32 0 0 1 64 0z" fill="var(--a)"/>
    <circle class="mfx" cx="196" cy="112" r="15" fill="var(--d)" opacity=".55"/>
    <path class="mfx" d="M174 168 a22 22 0 0 1 44 0z" fill="var(--d)" opacity=".55"/>
    <rect class="mbar" x="34" y="186" width="184" height="14" rx="7" fill="var(--d)" opacity=".18"/>`,

  // a timeline: what happened, in order
  timeline: () => `${ground(120, 86)}
    <line class="mdr" x1="40" y1="128" x2="200" y2="128" stroke="var(--d)" stroke-width="7"/>
    ${[0, 1, 2].map((i) => {
      const x = 60 + i * 60, on = i === 2;
      return `<circle class="${on ? "mpulse" : "mfx"}" cx="${x}" cy="128" r="${on ? 22 : 15}"
        fill="${on ? "var(--a)" : "var(--d)"}"/>
        <rect class="mfx" x="${x - 26}" y="${on ? 62 : 78}" width="52" height="12" rx="6"
          fill="var(--d)" opacity="${on ? .8 : .3}"/>`;
    }).join("")}
    <path class="mdr" d="M186 118 l16 10 -16 10" stroke="var(--a)" stroke-width="7" fill="none"/>`,

  // a ribbon bookmark — "save this style / save this post"
  bookmark: () => `${ground(120, 74)}
    <circle class="mfx" cx="120" cy="118" r="84" fill="var(--d)" opacity=".08"/>
    <path class="mfx" d="M74 44 h92 a10 10 0 0 1 10 10 v148 l-56 -38 -56 38 v-148 a10 10 0 0 1 10 -10z"
      fill="var(--a)" stroke="#fff" stroke-width="5"/>
    <path class="mpulse" d="M120 92 l9 19 21 3 -15 15 4 21 -19 -10 -19 10 4 -21 -15 -15 21 -3z" fill="#fff"/>`,

  // a heart / follow / like
  heart: () => `${ground(120, 76)}
    <circle class="mfx" cx="120" cy="120" r="84" fill="var(--d)" opacity=".08"/>
    <path class="mpulse" d="M120 190 c-58 -38 -74 -66 -74 -92 a38 38 0 0 1 74 -14 a38 38 0 0 1 74 14 c0 26 -16 54 -74 92z"
      fill="var(--a)" stroke="#fff" stroke-width="5"/>`,

  // a key / access
  key: () => `${ground(120, 82)}
    <circle class="mfx" cx="80" cy="120" r="46" fill="none" stroke="var(--d)" stroke-width="16"/>
    <path class="mfx" d="M124 120 h84 v26 h-22 v-26" fill="none" stroke="var(--d)" stroke-width="16"/>
    <circle class="mpulse" cx="80" cy="120" r="16" fill="var(--a)"/>`,

  // a shield / protection / rules
  shield: () => `${ground(120, 74)}
    <path class="mfx" d="M120 36 l72 26 v52 c0 44 -32 74 -72 90 -40 -16 -72 -46 -72 -90 v-52z" fill="var(--a)" opacity=".18"/>
    <path class="mdr" d="M120 36 l72 26 v52 c0 44 -32 74 -72 90 -40 -16 -72 -46 -72 -90 v-52z" stroke="var(--d)" stroke-width="7"/>
    <path class="mdr" d="M92 118 l20 22 40 -48" stroke="var(--a)" stroke-width="11"/>`,

  // an idea / tip
  bulb: () => `${ground(120, 68)}
    <circle class="mfx" cx="120" cy="106" r="80" fill="var(--a)" opacity=".14"/>
    <path class="mfx" d="M120 40 a52 52 0 0 1 32 93 v17 h-64 v-17 a52 52 0 0 1 32 -93z" fill="#fff" stroke="var(--d)" stroke-width="6"/>
    <path class="mpulse" d="M96 138 a44 44 0 0 1 48 0z" fill="var(--a)"/>
    <rect class="mfx" x="94" y="164" width="52" height="14" rx="7" fill="var(--d)"/>
    <rect class="mfx" x="100" y="186" width="40" height="14" rx="7" fill="var(--d)" opacity=".6"/>`,

  // a target / choose the right thing
  target: () => `${ground(120, 76)}
    <circle class="mfx" cx="120" cy="120" r="80" fill="none" stroke="var(--d)" stroke-width="12"/>
    <circle class="mfx" cx="120" cy="120" r="52" fill="none" stroke="var(--a)" stroke-width="12"/>
    <circle class="mpulse" cx="120" cy="120" r="22" fill="var(--a)"/>`,

  // a phone screen
  phone: () => `${ground(120, 66)}
    <rect class="mfx" x="66" y="26" width="108" height="192" rx="24" fill="#fff" stroke="var(--d)" stroke-width="6"/>
    <rect class="mfx" x="100" y="38" width="40" height="8" rx="4" fill="var(--d)" opacity=".4"/>
    <rect class="mfx" x="82" y="62" width="76" height="58" rx="10" fill="var(--a)" opacity=".25"/>
    <rect class="mfx" x="82" y="134" width="76" height="12" rx="6" fill="var(--a)"/>
    <rect class="mfx" x="82" y="158" width="52" height="10" rx="5" fill="var(--d)" opacity=".3"/>
    <circle class="mpulse" cx="120" cy="196" r="12" fill="var(--d)" opacity=".4"/>`,

  // sparkle / done / AI magic
  sparkle: () => `${ground(120, 70)}
    <circle class="mfx" cx="120" cy="118" r="76" fill="var(--a)" opacity=".14"/>
    <path class="mpulse" d="M120 40 l16 46 46 16 -46 16 -16 46 -16 -46 -46 -16 46 -16z" fill="var(--a)"/>
    <path class="mfx" d="M196 60 l7 18 18 7 -18 7 -7 18 -7 -18 -18 -7 18 -7z" fill="var(--d)"/>
    <path class="mfx" d="M44 158 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6z" fill="var(--d)" opacity=".7"/>`,

  // a hashtag / tag
  hashtag: () => `${ground(120, 76)}
    <circle class="mfx" cx="120" cy="120" r="80" fill="var(--a)" opacity=".14"/>
    <path class="mdr" d="M92 56 L74 190 M158 56 L140 190 M52 96 h140 M46 146 h140" stroke="var(--d)" stroke-width="13"/>`,

  // play / video result
  play: () => `${ground(120, 76)}
    <circle class="mfx" cx="120" cy="120" r="80" fill="var(--a)"/>
    <path class="mfx" d="M102 84 l60 36 -60 36z" fill="#fff"/>
    <circle class="mdr" cx="120" cy="120" r="96" stroke="var(--a)" stroke-width="6" opacity=".4"/>`,

  // a chip / settings
  chip: () => `${ground(120, 78)}
    <rect class="mfx" x="60" y="60" width="120" height="120" rx="20" fill="#fff" stroke="var(--d)" stroke-width="6"/>
    <rect class="mfx" x="92" y="92" width="56" height="56" rx="12" fill="var(--a)"/>
    ${[0, 1, 2].map((i) => `
      <line class="mdr" x1="${86 + i * 34}" y1="34" x2="${86 + i * 34}" y2="60" stroke="var(--d)" stroke-width="8"/>
      <line class="mdr" x1="${86 + i * 34}" y1="180" x2="${86 + i * 34}" y2="206" stroke="var(--d)" stroke-width="8"/>
      <line class="mdr" x1="34" y1="${86 + i * 34}" x2="60" y2="${86 + i * 34}" stroke="var(--d)" stroke-width="8"/>
      <line class="mdr" x1="180" y1="${86 + i * 34}" x2="206" y2="${86 + i * 34}" stroke="var(--d)" stroke-width="8"/>`).join("")}`,

  // a megaphone / broadcast
  megaphone: () => `${ground(120, 84)}
    <path class="mfx" d="M40 106 h44 l88 -50 v144 l-88 -50 h-44z" fill="var(--a)"/>
    <rect class="mfx" x="84" y="156" width="30" height="52" rx="14" fill="var(--d)"/>
    ${[0, 1, 2].map((i) => `<path class="mpulse" d="M${186 + i * 14} ${104 - i * 8} a${20 + i * 14} ${20 + i * 14} 0 0 1 0 ${44 + i * 16}"
      stroke="var(--d)" stroke-width="6" opacity="${.8 - i * .2}"/>`).join("")}`,

  // a magnet / attract
  magnet: () => `${ground(120, 78)}
    <path class="mfx" d="M56 172 v-52 a64 64 0 0 1 128 0 v52 h-40 v-52 a24 24 0 0 0 -48 0 v52z" fill="var(--d)"/>
    <rect class="mfx" x="56" y="172" width="40" height="34" rx="6" fill="var(--a)"/>
    <rect class="mfx" x="144" y="172" width="40" height="34" rx="6" fill="var(--a)"/>
    <path class="mpulse" d="M120 34 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6z" fill="var(--a)"/>`,

  // a bolt / fast
  bolt: () => `${ground(120, 66)}
    <circle class="mfx" cx="120" cy="118" r="80" fill="var(--a)" opacity=".14"/>
    <path class="mpulse" d="M136 34 L66 132 h44 l-16 84 74 -104 h-46z" fill="var(--a)"/>`,

  // a pen writing (generic edit)
  pen: () => `${ground(120, 78)}
    <circle class="mfx" cx="120" cy="120" r="80" fill="var(--a)" opacity=".13"/>
    <path class="mfx" d="M58 190 l100 -100 24 24 -100 100 -32 8z" fill="var(--a)"/>
    <path class="mfx" d="M158 90 l24 24" stroke="#fff" stroke-width="6"/>
    <path class="mfx" d="M58 190 l32 -8 -24 -24z" fill="var(--d)"/>`,

  // a refresh / swap
  refresh: () => `${ground(120, 76)}
    <circle class="mfx" cx="120" cy="120" r="80" fill="var(--a)" opacity=".13"/>
    <path class="mdr" d="M180 120 a60 60 0 1 1 -22 -46" stroke="var(--d)" stroke-width="14"/>
    <path class="mfx" d="M162 34 l6 46 -46 -8z" fill="var(--a)"/>`,
};

// ── choose the scene for THIS slide, from its icon + its own caption ─────────
const BY_ICON = {
  globe: "browser", phone: "phone", camera: "camera", mic: "mic", music: "music",
  pen: "write", chart: "chart", trend: "trend", clock: "clock", calendar: "calendar",
  wand: "wand", rocket: "send", magnet: "magnet", bolt: "bolt", key: "key",
  users: "users", user: "user", chat: "chat", layers: "layers", star: "star",
  heart: "heart", bulb: "bulb", target: "target", target2: "target", chip: "chip",
  megaphone: "megaphone", hashtag: "hashtag", play: "play", sparkle: "sparkle",
  refresh: "refresh",
};

export function sceneArtFor(tip) {
  const text = String(tip.head || "");
  const has = (...w) => w.some((x) => text.includes(x));

  // Ordered most-specific first. A caption names an OBJECT or a concrete action;
  // bare verbs like "برو" or "بزن" must never decide the art on their own, which
  // is how "go to the tools section" wrongly became a profile picture.
  if (has("کلمهٔ نامربوط", "حذف و", "اضافه کن", "کلمه‌ها را")) return "keywords";
  // "پیدا شو", "پیدا شود", "پیدا کن" are the same idea as "پیدا می‌شوی" and were
  // all falling through to the decorative sparkle, which is the meaningless
  // circle this channel keeps being told to stop shipping.
  if (has("پیدا می‌شوی", "پیدا شوی", "پیدا شو", "پیدا شود", "بالا می‌آید", "بالا بیاید", "در جستجو")) return "found";
  if (has("Search", "سرچ", "جستجو می‌کنند", "جست‌وجو می‌کنند", "عبارتی که مردم")) return "search";
  // Three more hooks were reaching the sparkle: a view collapse, an eligibility
  // check, and captions. Each has a picture that already exists.
  if (has("می ریزد", "می‌ریزد", "افت", "سقوط", "یک دفعه")) return "chart";
  if (has("شرایط", "چک کن", "واجد", "قبل از شمردن")) return "decree";
  if (has("زیرنویس", "کپشن", "Caption", "بی‌صدا")) return "text";
  if (has("معترض", "اعتراض", "تظاهرات", "پارچه‌نوشته", "شعار")) return "protest";
  if (has("اخراج", "بازگرداند", "دیپورت", "پرواز", "میدان هوایی", "هواپیما")) return "deport";
  if (has("دادگاه", "رأی", "قانون اساسی", "حکم", "قاضی")) return "court";
  if (has("تعهد", "لغو", "باطل", "ویزا", "پذیرش", "پرونده", "درخواست")) return "decree";
  if (has("نفر", "زن و کودک", "خانواده", "مهاجر", "پناهجو")) return "family";
  if (has("در ۲۰۲۱", "در ۲۰۲۵", "دسامبر", "جولای", "از سپتامبر")) return "timeline";
  if (has("بوکمارک", "ذخیرهٔ استایل", "نشان کن")) return "bookmark";
  if (has("مدیا کیت", "معرفی‌نامه", "پرونده")) return "dossier";
  if (has("نرخ", "قیمت", "تعرفه", "آمار پیج")) return "ratecard";
  if (has("تأیید", "تایید", "واجد شرایط", "قبول شد")) return "stamp";
  if (has("رزومه")) return "resume";
  if (has("کپی‌رایت", "رایگان و", "بدون پول", "بدون طراح", "بدون نصب")) return "key";
  if (has("کلمه‌ای پیدا", "دنبالش می‌گردند", "داغ است", "پرجستجو")) return "search";
  if (has("عکس ساکن", "متحرک بساز", "کم‌کیفیت", "واضح کن", "پشت خودت", "کاور")) return "transform";
  if (has("تست کن", "غریبه‌ها", "آزمایش")) return "target";
  if (has("یک شب آماده", "هفته را", "یک‌جا آماده")) return "calendar";
  if (has("ده شروع", "ایده", "بدون تدوین", "حرفه‌ای بدون")) return "bulb";
  if (has("دو پیج", "پشت‌سرهم", "بیننده")) return "users";
  if (has("بالای پیج", "نگه دار")) return "star";
  if (has("ضبط صدا", "روایت")) return "mic";
  if (has("ویدیوی باکیفیت", "پس‌زمینه", "بی‌روتوش")) return "play";
  if (has("استودیو", "استودیویی", "صدای بد", "صدای تمیز")) return "studio";
  if (has("ابزارهای سازنده", "ابزارها", "جعبه")) return "toolbox";
  if (has("ویب‌سایت", "سایت", "نصب کن", "مرورگر")) return "browser";
  if (has("دوربین", "ضبط کن", "فیلم")) return "camera";
  if (has("بارگذاری", "آپلود")) return "upload";
  if (has("بفرست", "ارسال", "منتشر", "انتشار", "لینکش را")) return "send";
  if (has("زمان‌بندی", "روز و ساعت", "تاریخ", "تقویم")) return "calendar";
  if (has("سرعت", "اندازهٔ متن", "مدت", "ثانیه")) return "clock";
  if (has("زبان", "ترجمه", "دوبله")) return "globe";
  if (has("گوش کن", "پیش‌نمایش", "پخش")) return "play";
  if (has("میکروفون", "صدا را", "صدایت", "آهنگ", "موسیقی")) return "mic";
  if (has("بخوان", "از روی صفحه", "حفظ کردن", "تله‌پرامپتر")) return "write";
  if (has("بنویس", "کپشن", "اطلاعات تماس", "توضیح", "متن")) return "write";
  if (has("پنهان", "فیلتر", "مسدود", "آزاردهنده")) return "shield";
  if (has("کاروسل", "اسلاید", "قالب", "چند عکس")) return "layers";
  if (has("ماندگار", "هایلایت", "سنجاق")) return "star";
  if (has("آمار", "نمودار", "امتیاز", "بازدید")) return "chart";
  if (has("ذخیره کن", "ذخیره", "نشان کن", "سیو")) return "bookmark";
  if (has("دانلود", "خروجی بگیر", "ذخیره روی گوشی")) return "download";
  if (has("بهبود", "خودکار", "پاک", "حذف")) return "wand";
  if (has("پروفایل", "حساب کاربری")) return "user";
  if (has("افراد", "مخاطب", "دوستان", "همکار", "برندها")) return "users";
  if (has("کامنت", "پیام", "سؤال", "سوال")) return "chat";
  if (has("استوری", "هایلایت")) return "star";
  if (has("دنبال کن", "لایک")) return "heart";
  if (has("تنظیمات", "گزینهٔ", "گزینه", "انتخاب کن", "بزن")) return "menu";

  return BY_ICON[tip.icon] || "sparkle";
}

// sceneArtFor()'s whole keyword list above is written for GapMedia's own
// app-feature hooks ("پیج", "پروفایل", "کاروسل", "دنبال کن"...) — not one of
// those words appears in a German-lesson hook, so every episode's hook text
// fell through the entire chain to the generic "sparkle" (star-shaped)
// decoration regardless of topic. Owner report 2026-09-12: "سه ویدیو با
// یک قلاب ستاره‌ای... هیچ ربط به محتوا ندارد". Mapped by topic id instead —
// stable across a curriculum whose hook wording changes more often than its
// subject does, and every one of the 24 A1 units is covered explicitly.
const GERMAN_LESSON_ART = {
  greetings: "chat", "formal-informal": "chat", politeness: "chat",
  "numbers-1": "hashtag", "numbers-2": "hashtag", "numbers-3": "hashtag",
  family: "family", "question-words": "chat",
  sein: "pen", haben: "pen", "common-verbs": "pen",
  colors: "wand", weekdays: "calendar", time: "clock",
  "food-drink": "chat", cafe: "chat",
  weather: "globe", adjectives: "layers",
  shopping: "search", directions: "target", countries: "globe",
  professions: "user", "daily-routine": "clock", clothes: "user",
  "modal-verbs": "key", home: "family", "train-station": "target",
  tickets: "bookmark", appointments: "calendar", health: "shield",
  "small-talk": "chat", "spelling-contact": "pen", payment: "chart",
  accusative: "layers", "separable-verbs": "layers", leisure: "target",
  // Nico's Weg A1 topics added 2026-09-25, when the 36-unit curriculum ran out
  // mid-schedule. Every topic slug needs a line here or hookArtFor() falls back
  // to the meaningless "sparkle" — the exact fault the owner reported on
  // 2026-09-12, which test-german-lesson-art.mjs now catches before a build.
  "numbers-21-100": "hashtag", "important-numbers": "phone", address: "target",
  authorities: "stamp", "what-is-this": "search", possession: "key",
  "negation-kein": "toggle", furniture: "family", "times-of-day": "clock",
  weekend: "calendar", "making-plans": "timeline", "being-late": "clock",
  "dream-jobs": "user", "inside-building": "layers",
  "traffic-directions": "target", groceries: "menu",
  "at-the-counter": "chat", "day-trip": "globe", "weather-forecast": "trend",
  "body-parts": "user", symptoms: "shield", pharmacy: "heart",
  "perfekt-haben": "timeline", "perfekt-sein": "send", "war-hatte": "bookmark",
  "where-is-it": "target", "in-europe": "globe", "other-countries": "globe",
  "why-here": "chat", months: "calendar", seasons: "wand",
  "dates-birthday": "calendar",
};

// The hook is a slide too: it must draw art for ITS OWN promise line, not
// borrow slide 1's. Showing "resume" text over a toolbox is exactly the kind of
// mismatch that makes the video look careless.
export function hookArtFor(pack) {
  if (pack.kind === "german-lesson") {
    const topic = String(pack.id || "").replace(/^a1-\d+-/, "");
    return GERMAN_LESSON_ART[topic] || "sparkle";
  }
  const text = `${pack.hook?.l1 || ""} ${pack.hook?.l2 || ""}`;
  return sceneArtFor({ head: text, icon: "sparkle" });
}

// Pick art for a whole video at once, so no two slides repeat the same drawing.
// When a slide's first choice is taken, fall back to its icon's art, then to a
// small rotation of neutral scenes — the point is that four slides never look
// like the same picture four times.
const FALLBACKS = ["menu", "phone", "target", "layers", "bulb", "star", "chip", "wand", "sparkle"];

export function sceneArtPlan(tips) {
  const used = new Set();
  return tips.map((tip) => {
    const candidates = [sceneArtFor(tip), BY_ICON[tip.icon], ...FALLBACKS];
    for (const c of candidates) {
      if (c && SCENES[c] && !used.has(c)) { used.add(c); return c; }
    }
    return "sparkle";
  });
}


// The small corner emblem must agree with the slide's art, not with the icon
// hand-written in the feature data — that data predates the caption rules and
// still says "user" for "go to the creator tools section". Deriving it here
// keeps picture, emblem and caption from ever contradicting each other.
const ICON_FOR_ART = {
  toolbox: "chip", browser: "globe", menu: "layers", write: "pen", camera: "camera",
  mic: "mic", wave: "music", music: "music", search: "magnet", chart: "chart",
  trend: "trend", clock: "clock", calendar: "calendar", globe: "globe",
  transform: "wand", wand: "wand", send: "rocket", upload: "camera",
  download: "play", toggle: "bolt",
  users: "users", user: "user", chat: "chat", layers: "layers", star: "star",
  court: "key", decree: "pen", family: "users", timeline: "clock",
  dossier: "resume", ratecard: "chart", stamp: "key",
  deport: "globe", protest: "megaphone",
  keywords: "hashtag", found: "magnet", bookmark: "star", heart: "heart", key: "key", shield: "key", bulb: "bulb", target: "target",
  phone: "phone", sparkle: "sparkle", hashtag: "hashtag", play: "play",
  chip: "chip", megaphone: "megaphone", magnet: "magnet", bolt: "bolt",
  pen: "pen", refresh: "refresh",
  shop: "toolbox",
};

export function iconKeyFor(artName) {
  return ICON_FOR_ART[artName] || "sparkle";
}

export function sceneArt(name, PAIR) {
  const body = (SCENES[name] || SCENES.sparkle)();
  return `<div class="hero hero-${name}" style="--d:${PAIR[0]};--a:${PAIR[1]}">
    <svg viewBox="0 0 240 260" fill="none" stroke-linecap="round" stroke-linejoin="round"
      style="overflow:visible">${draw(body)}</svg></div>`;
}

// the step stage: this slide's own illustration + platform badge + step icon
export function stepStage(PAIR, { tip, art, platform, markSVG = "", iconSVG = "", allowScreen = true }) {
  // A step that names the real screen, or the real tool, shows THAT — the viewer
  // has to recognise it in the app, or find it on the web. Abstract art stays the
  // fallback for steps that are about an action rather than a place.
  // Every tutorial step with an explicit in-app path receives a recognisable
  // app page, even when the feature author supplied no full screen schema.
  // A generic illustration for "tap Save" or "open Search" makes the viewer
  // guess; the reconstructed screen makes the next tap visible.
  const pathParts = String(tip?.path || "").split(">").map((p) => p.trim()).filter(Boolean);
  const generatedScreen = pathParts.length
    ? { title: pathParts[0], rows: pathParts.slice(1).concat(["Settings", "Help"]).slice(0, 3), hit: Math.max(0, Math.min(pathParts.length - 2, 2)) }
    : tip?.ui
      ? { title: tip.ui.title || "TikTok", rows: tip.ui.rows || ["Continue"], hit: tip.ui.hit || 0 }
      : null;
  const screen = allowScreen ? (tip?.screen || generatedScreen) : null;
  if (tip && screen && ["tiktok", "instagram"].includes(platform)) {
    return `<div class="stage stage-screen">
      ${appScreen(platform, screen)}
    </div>`;
  }
  if (tip && tip.brand) {
    return `<div class="stage stage-brand">
      ${toolCard(tip.brand)}
      <span class="stage-ico">${iconSVG}</span>
    </div>`;
  }
  const name = art || sceneArtFor(tip);
  return `<div class="stage stage-${name}">
    <span class="stage-badge">${markSVG}</span>
    ${sceneArt(name, PAIR)}
    <span class="stage-ico">${iconSVG}</span>
  </div>`;
}

export const MOTIF_CSS = `
${APP_SCREEN_CSS}
/* ---------- per-slide concept art ---------- */
.hero{position:relative;width:100%;height:100%;display:grid;place-items:center}
.hero svg{width:100%;height:100%;filter:drop-shadow(0 22px 40px rgba(30,20,10,.18))}
.hero .mdr{stroke-dasharray:1;stroke-dashoffset:0}
.hero .mbar{transform-box:fill-box;transform-origin:50% 100%}
.hero .mpulse{transform-box:fill-box;transform-origin:center}
.hookpreview .hero{width:540px;height:480px}
.stage{position:relative;width:500px;height:600px;display:grid;place-items:center;z-index:2}
.stage .hero{width:100%;height:100%}
.stage-badge{position:absolute;top:6px;left:6px;z-index:4;display:grid;place-items:center;
  width:66px;height:66px;border-radius:19px;background:#fff;box-shadow:0 8px 20px rgba(0,0,0,.16)}
.stage-badge svg{width:42px;height:42px}
.stage-ico{position:absolute;top:2px;right:2px;z-index:4;width:104px;height:104px;
  display:grid;place-items:center;opacity:.92;filter:drop-shadow(0 8px 16px rgba(30,20,10,.18))}
.stage-ico .illo{width:80px;height:80px}
`;
