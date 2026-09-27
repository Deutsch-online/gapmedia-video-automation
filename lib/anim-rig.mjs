// Jointed cartoon characters for the animated German lessons.
//
// Owner, 2026-09-27: the first animated version was "too simple — build a real,
// moving animated character". A character here is a bone hierarchy, the way a
// rigged puppet is built in an animation package: hip → torso → head, and
// shoulder → upper arm → forearm → hand, hip → thigh → shin → foot. Every bone
// is an SVG <g> whose origin is its joint, so one GSAP rotation turns the bone
// and carries every child with it. Nothing is a flat sprite.
//
// Acting follows the HyperFrames character guidance (hyperframes-animation,
// adapters/lottie.md → Characters): one performance on one paused timeline,
// planted feet, the stage timed to the character's beats. The walk cycle is the
// registry block `lottie-character-walk`'s own animator curves (thigh, shin and
// foot rotation over its 30-frame cycle), re-centred for this rig — so the feet
// move the way that block's feet move instead of a guessed sine.
//
// Deterministic by construction: all poses are solved at build time (inverse
// kinematics for the arms), blinks follow a fixed pattern, lip-sync follows the
// vowels of the German sentence. No clocks, no randomness.

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// ------------------------------------------------------------------ walk data
// From lottie-character-walk/assets/mascot.json, frames 0..30 (one cycle at
// 30 fps). The far leg is the same curve half a cycle (15 frames) later.
const MASCOT_THIGH = [[0, -38.5], [3, -32.8], [6, -22.4], [8, -17.6], [10, -15.7], [12, -14.0], [14, -10.2], [16, -3.0], [17, -0.6], [18, -2.8], [20, -13.0], [23, -33.9], [25, -44.6], [27, -48.2], [29, -43.6], [30, -38.5]];
const MASCOT_SHIN = [[0, 39.9], [2, 43.1], [6, 35.0], [8, 34.2], [12, 45], [14, 46.7], [16, 40.8], [17, 40.1], [18, 45.7], [20, 58.5], [22, 68.4], [24, 71.1], [26, 65.4], [27, 59.9], [30, 39.9]];
const MASCOT_FOOT = [[0, -1.4], [3, -9.3], [6, -12.6], [9, -19.7], [12, -31.0], [15, -37.8], [17, -39.5], [19, -45], [20, -45.5], [22, -41.4], [24, -31.1], [26, -17.9], [28, -6.6], [30, -1.4]];
const sample = (curve, f) => {
  const x = ((f % 30) + 30) % 30;
  for (let i = 1; i < curve.length; i++) {
    const [f0, v0] = curve[i - 1], [f1, v1] = curve[i];
    if (x <= f1) return v0 + (v1 - v0) * ((x - f0) / (f1 - f0 || 1));
  }
  return curve[curve.length - 1][1];
};
// The mascot's rest pose leans its legs forward; centre each curve on its mean
// so this rig's legs swing about the vertical.
const mean = (c) => c.reduce((a, [, v]) => a + v, 0) / c.length;
const THIGH_C = mean(MASCOT_THIGH), SHIN_C = mean(MASCOT_SHIN) - 12, FOOT_C = mean(MASCOT_FOOT);
export const walkAt = (f) => ({
  thN: sample(MASCOT_THIGH, f) - THIGH_C, shN: sample(MASCOT_SHIN, f) - SHIN_C, ftN: sample(MASCOT_FOOT, f) - FOOT_C,
  thF: sample(MASCOT_THIGH, f + 15) - THIGH_C, shF: sample(MASCOT_SHIN, f + 15) - SHIN_C, ftF: sample(MASCOT_FOOT, f + 15) - FOOT_C,
});

// ------------------------------------------------------------------ geometry
// Local coordinates, facing right, origin at the hip, y down.
export const GEO = {
  thigh: 120, shin: 118, footDrop: 14,
  shoulderN: [8, -160], shoulderF: [-10, -164],
  upper: 92, fore: 86, grip: 16,
  neck: [6, -190],
};
export const HIP_TO_FLOOR = GEO.thigh + GEO.shin + GEO.footDrop;

// Two-bone inverse kinematics. A bone with rotation θ (degrees, SVG clockwise)
// points along (−sin θ, cos θ). Returns the world angle of the upper arm and
// the forearm angle relative to it.
export function ik(sx, sy, tx, ty, elbowDown = true) {
  const L1 = GEO.upper, L2 = GEO.fore + GEO.grip;
  const dx = tx - sx, dy = ty - sy;
  const D = Math.max(8, Math.min(Math.hypot(dx, dy), L1 + L2 - 0.5));
  const phi = Math.atan2(-dx, dy);
  const a = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))));
  const b = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2))));
  // For a target in front (dx>0), the elbow hangs below the line with s=+1.
  const s = (elbowDown ? 1 : -1) * (dx >= 0 ? 1 : -1);
  return { u: (phi + s * a) * R2D, f: -s * (Math.PI - b) * R2D };
}

// ------------------------------------------------------------------ drawing
const bone = (cls, jx, jy, inner) => `<g transform="translate(${jx} ${jy})"><g class="${cls}">${inner}</g></g>`;

// Drawing style (v3, owner 2026-09-27: "it must move like real, make it
// better"): every part is outlined in one warm dark line and shaded with a
// light-from-the-window gradient, the way modern 2D animation is painted.
// Gradients live in rigDefs(); ids are prefixed per character.
const L = (C) => `stroke="${C.line}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;

/** Gradient definitions for one character (put once in the stage <defs>). */
export function rigDefs(p, C) {
  return `<radialGradient id="${p}-g-skin" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${C.skinLight || C.skin}"/><stop offset=".6" stop-color="${C.skin}"/><stop offset="1" stop-color="${C.skinShade}"/></radialGradient>
  <linearGradient id="${p}-g-top" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.topShade}"/><stop offset=".45" stop-color="${C.top}"/><stop offset="1" stop-color="${C.topLight || C.top}"/></linearGradient>
  <linearGradient id="${p}-g-sleeve" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.topShade}"/><stop offset=".6" stop-color="${C.top}"/><stop offset="1" stop-color="${C.topShade}"/></linearGradient>
  <linearGradient id="${p}-g-pants" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.pantsShade || C.topShade}"/><stop offset=".55" stop-color="${C.pants || C.top}"/><stop offset="1" stop-color="${C.pantsShade || C.topShade}"/></linearGradient>
  <linearGradient id="${p}-g-hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.hairLight || C.hair}"/><stop offset="1" stop-color="${C.hair}"/></linearGradient>`;
}

function eye(p, C, x, y, rx, ry) {
  return `<g transform="translate(${x} ${y})">
    <ellipse rx="${rx}" ry="${ry}" fill="#FFFFFF" stroke="${C.line}" stroke-width="2.5"/>
    <g class="${p}-sacc"><g class="${p}-pupil">
      <circle cx="${(rx * 0.25).toFixed(1)}" cy="1" r="${(rx * 0.62).toFixed(1)}" fill="${C.iris || C.eye}"/>
      <circle cx="${(rx * 0.25).toFixed(1)}" cy="1" r="${(rx * 0.34).toFixed(1)}" fill="${C.eye}"/>
      <circle cx="${(rx * 0.45).toFixed(1)}" cy="-2.5" r="${(rx * 0.18).toFixed(1)}" fill="#FFFFFF"/>
      <circle cx="${(rx * 0.05).toFixed(1)}" cy="3" r="${(rx * 0.09).toFixed(1)}" fill="#FFFFFF" opacity=".8"/>
    </g></g>
    <rect class="${p}-lid" x="${-rx - 2}" y="${-ry - 2}" width="${rx * 2 + 4}" height="${ry * 2 + 4}" fill="${C.skin}" transform="scale(1 0)"/>
    <path d="M${-rx - 1} ${-ry * 0.2} Q0 ${-ry - 5} ${rx + 2} ${-ry * 0.35}" fill="none" stroke="${C.line}" stroke-width="3.5" stroke-linecap="round"/>
  </g>`;
}

function faceParts(p, C, { glasses = false, stubble = false } = {}) {
  // Head drawn around (10,-58) relative to the neck joint.
  return `
    <path d="M-36 -54 q-16 -2 -16 16 q2 16 18 14" fill="url(#${p}-g-skin)" ${L(C)}/>
    <path d="M-40 -46 q-6 4 -2 10" fill="none" stroke="${C.skinShade}" stroke-width="3"/>
    <path d="M-44 -70 Q-46 -122 12 -124 Q70 -122 70 -62 Q72 -18 48 2 Q28 14 6 10 Q-30 2 -40 -26 Z" fill="url(#${p}-g-skin)" ${L(C)}/>
    ${stubble ? `<path d="M-30 -20 Q-14 8 12 8 Q38 6 56 -8 Q46 4 28 10 Q2 16 -20 4 Z" fill="${C.hair}" opacity=".22"/>` : ""}
    <ellipse cx="48" cy="-28" rx="11" ry="6" fill="${C.blush}" opacity=".45"/>
    <path d="M66 -56 q14 12 6 24 q-4 4 -12 2" fill="${C.skin}" ${L(C)}/>
    <path d="M62 -34 q4 2 8 0" fill="none" stroke="${C.skinShade}" stroke-width="3"/>
    ${eye(p, C, 32, -62, 11, 13)}
    ${eye(p, C, 60, -60, 8, 11.5)}
    <g transform="translate(32 -86)"><path class="${p}-browN" d="M-15 3 Q-2 -6 15 -1 L14 4 Q-1 -1 -14 7 Z" fill="${C.hair}"/></g>
    <g transform="translate(60 -84)"><path class="${p}-browF" d="M-9 2 Q0 -5 10 -1 L9 3 Q0 0 -8 6 Z" fill="${C.hair}"/></g>
    ${glasses ? `<g fill="none" stroke="${C.glasses}" stroke-width="4"><rect x="16" y="-76" width="32" height="26" rx="11"/><rect x="50" y="-73" width="22" height="24" rx="9"/><path d="M48 -64 h2 M16 -66 l-44 8"/></g>` : ""}
    <g transform="translate(46 -22)"><g class="${p}-mouth">
      <path class="${p}-m m-M" d="M-12 0 q12 7 24 0" stroke="${C.lip}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path class="${p}-m m-S" d="M-15 -3 q15 18 30 0 z" fill="${C.mouth}" stroke="${C.lip}" stroke-width="3" opacity="0"/>
      <ellipse class="${p}-m m-E" cx="0" cy="1" rx="10" ry="4.5" fill="${C.mouth}" stroke="${C.lip}" stroke-width="3" opacity="0"/>
      <g class="${p}-m m-A" opacity="0"><ellipse cx="0" cy="4" rx="12" ry="11" fill="${C.mouth}" stroke="${C.lip}" stroke-width="3"/><path d="M-8 -3 h16" stroke="#FFFFFF" stroke-width="3"/><ellipse cx="0" cy="10" rx="7" ry="4" fill="${C.tongue}"/></g>
      <ellipse class="${p}-m m-O" cx="0" cy="3" rx="7" ry="9" fill="${C.mouth}" stroke="${C.lip}" stroke-width="3" opacity="0"/>
      <path class="${p}-m m-W" d="M-12 2 q4 -5 8 0 q4 5 8 0 q4 -5 8 0" stroke="${C.lip}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0"/>
    </g></g>`;
}

const hand = (p, key, C, held = "") => `
  <path d="M-15 0 Q-18 22 -6 30 Q8 36 16 24 Q20 12 14 0 Z" fill="url(#${p}-g-skin)" ${L(C)}/>
  <path d="M12 2 Q26 2 24 16 Q22 22 14 18" fill="${C.skin}" ${L(C)}/>
  <path d="M-8 24 v6 M-1 26 v7 M6 25 v6" stroke="${C.line}" stroke-width="2.5" stroke-linecap="round"/>
  <g class="${p}-held-${key}">${held}</g>`;

function arm(p, side, C, held) {
  const far = side === "F";
  return bone(`${p}-u${side}`, ...(far ? GEO.shoulderF : GEO.shoulderN),
    `<rect x="-18" y="-12" width="36" height="108" rx="18" fill="url(#${p}-g-sleeve)" ${L(C)} ${far ? 'opacity=".92"' : ""}/>`
    + `<path d="M-10 60 q10 6 20 0" fill="none" stroke="${C.topShade}" stroke-width="3"/>`
    + bone(`${p}-f${side}`, 0, GEO.upper,
      `<rect x="-15" y="-10" width="30" height="96" rx="15" fill="url(#${p}-g-sleeve)" ${L(C)}/><rect x="-15" y="70" width="30" height="14" rx="6" fill="${C.cuff}" ${L(C)}/>`
      + bone(`${p}-h${side}`, 0, GEO.fore, hand(p, side, C, held))));
}

function leg(p, side, C) {
  return bone(`${p}-th${side}`, side === "N" ? 8 : -6, 0,
    `<rect x="-21" y="-8" width="42" height="${GEO.thigh + 16}" rx="20" fill="url(#${p}-g-pants)" ${L(C)}/><path d="M6 10 v${GEO.thigh - 10}" stroke="${C.pantsShade}" stroke-width="2.5"/>`
    + bone(`${p}-sh${side}`, 0, GEO.thigh,
      `<rect x="-18" y="-6" width="36" height="${GEO.shin + 8}" rx="17" fill="url(#${p}-g-pants)" ${L(C)}/><path d="M-10 8 q10 6 20 0" fill="none" stroke="${C.pantsShade}" stroke-width="3"/>`
      + bone(`${p}-ft${side}`, 0, GEO.shin,
        `<path d="M-20 -8 h40 q34 0 34 20 v10 h-74 z" fill="${C.shoe}" ${L(C)}/><rect x="-21" y="18" width="76" height="8" rx="4" fill="${C.sole}" ${L(C)}/><path d="M6 -2 l10 6 M14 -3 l10 6" stroke="${C.line}" stroke-width="2.5"/>`)));
}

/** The visitor: a young learner in a hoodie, full body, facing right. */
export function visitorSVG(C, heldN = "", heldF = "") {
  const p = "v";
  const torso = `
    <path d="M-50 16 Q-58 -86 -52 -148 Q-46 -180 0 -182 Q46 -180 54 -148 Q62 -86 52 16 Z" fill="url(#v-g-top)" ${L(C)}/>
    <path d="M-44 -170 Q-2 -130 44 -170 Q30 -194 0 -196 Q-30 -194 -44 -170 Z" fill="${C.topShade}" ${L(C)}/>
    <path d="M2 -150 v162" stroke="${C.topShade}" stroke-width="4"/>
    <path d="M-34 -48 h60 q6 0 6 6 v30 h-72 v-30 q0 -6 6 -6 z" fill="${C.topShade}" opacity=".55" ${L(C)}/>
    <g class="v-strings"><path d="M-8 -160 q-2 20 2 38 M12 -160 q2 22 -2 40" stroke="${C.cuff}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="-6" cy="-120" r="4" fill="${C.cuff}"/><circle cx="10" cy="-118" r="4" fill="${C.cuff}"/></g>
    <rect x="-52" y="-6" width="106" height="24" rx="11" fill="${C.belt}" ${L(C)}/>`;
  const head = bone(`${p}-head`, ...GEO.neck, `<g class="v-talk"><g class="v-idlehead">
      <path d="M-8 -26 h30 v36 h-30 z" fill="${C.skinShade}" ${L(C)}/>
      <path d="M-50 -58 Q-56 -132 14 -130 Q74 -128 70 -78 Q44 -102 -6 -94 Q-30 -82 -34 -36 Z" fill="url(#v-g-hair)" ${L(C)}/>
      ${faceParts(p, C, { stubble: true })}
      <path d="M-48 -74 Q-22 -136 42 -122 Q76 -110 72 -82 Q54 -100 24 -98 Q6 -88 -10 -96 Q-30 -92 -48 -74 Z" fill="url(#v-g-hair)" ${L(C)}/>
      <path d="M-20 -110 Q10 -124 44 -112" fill="none" stroke="${C.hairLight || C.hair}" stroke-width="5" stroke-linecap="round" opacity=".7"/>
    </g></g>`);
  return `<g class="v-move"><ellipse class="v-shadow" cx="12" cy="${HIP_TO_FLOOR + 4}" rx="84" ry="14" fill="#000" opacity=".25"/>
    <g class="v-sway"><g class="v-bob">
      ${arm(p, "F", C, heldF)}
      ${leg(p, "F", C)}
      ${leg(p, "N", C)}
      ${bone(`${p}-torso`, 0, 0, torso + head + arm(p, "N", C, heldN))}
    </g></g></g>`;
}

/** The clerk: seated behind the counter; only the upper body shows. Drawn
 *  facing right and mirrored by the caller so she faces the visitor. */
export function clerkSVG(C, heldN = "", heldF = "") {
  const p = "c";
  const torso = `
    <path d="M-52 16 Q-60 -86 -52 -150 Q-44 -182 0 -184 Q46 -182 56 -150 Q64 -86 52 16 Z" fill="url(#c-g-top)" ${L(C)}/>
    <path d="M-22 -178 L2 -118 L26 -178 Z" fill="${C.shirt}" ${L(C)}/>
    <path d="M-30 -176 L-6 -120 M34 -176 L10 -120" stroke="${C.topShade}" stroke-width="5"/>
    <path d="M-12 -172 Q2 -100 16 -172" stroke="${C.lanyard}" stroke-width="5" fill="none"/>
    <rect x="-8" y="-112" width="30" height="38" rx="5" fill="#FFFFFF" stroke="${C.lanyard}" stroke-width="3"/>
    <rect x="-3" y="-104" width="20" height="5" rx="2" fill="${C.lanyard}"/>`;
  const head = bone(`${p}-head`, ...GEO.neck, `<g class="c-talk"><g class="c-idlehead">
      <path d="M-8 -26 h30 v36 h-30 z" fill="${C.skinShade}" ${L(C)}/>
      <circle cx="-38" cy="-106" r="28" fill="url(#c-g-hair)" ${L(C)}/>
      <path d="M-54 -38 Q-62 -128 12 -130 Q76 -128 72 -70 Q52 -112 0 -106 Q-32 -98 -40 -34 Z" fill="url(#c-g-hair)" ${L(C)}/>
      ${faceParts(p, C, { glasses: true })}
      <path d="M-46 -86 Q-12 -136 52 -118 Q76 -106 70 -76 Q42 -106 -4 -102 Q-30 -98 -46 -86 Z" fill="url(#c-g-hair)" ${L(C)}/>
      <path d="M-18 -112 Q12 -126 46 -112" fill="none" stroke="${C.hairLight || C.hair}" stroke-width="5" stroke-linecap="round" opacity=".6"/>
    </g></g>`);
  return `<g class="c-bob">
      ${arm(p, "F", C, heldF)}
      ${bone(`${p}-torso`, 0, 0, torso + head + arm(p, "N", C, heldN))}
    </g>`;
}

// ------------------------------------------------------------------ acting
/** Timeline author for one character. Collects GSAP calls as strings. */
export class Actor {
  constructor(js, prefix, { x, y, mirror = false }) {
    this.js = js; this.p = prefix; this.x = x; this.y = y; this.mirror = mirror;
    this.pose = { torso: 0, head: 0, uN: 8, fN: -10, hN: 2, uF: -6, fF: -8, hF: 14, thN: 0, shN: 0, ftN: 0, thF: 0, shF: 0, ftF: 0 };
  }
  sel(k) { return `.${this.p}-${k}`; }
  set(t, angles) { this.to(t, 0, angles); }
  /** Rotate bones to `angles` (degrees) over `dur` seconds starting at `t`. */
  to(t, dur, angles, ease = "power2.inOut") {
    for (const [k, v] of Object.entries(angles)) {
      this.pose[k] = v;
      this.js.push(dur > 0
        ? `tl.to("${this.sel(k)}",{rotation:${v.toFixed(2)},svgOrigin:"0 0",duration:${dur.toFixed(3)},ease:"${ease}"},${t.toFixed(3)});`
        : `tl.set("${this.sel(k)}",{rotation:${v.toFixed(2)},svgOrigin:"0 0"},${t.toFixed(3)});`);
    }
  }
  /** Shoulder position in the rig's own (unmirrored) frame, hip at origin. */
  shoulderLocal(side) {
    const [ox, oy] = side === "N" ? GEO.shoulderN : GEO.shoulderF;
    const t = this.pose.torso * D2R;
    return [ox * Math.cos(t) - oy * Math.sin(t), ox * Math.sin(t) + oy * Math.cos(t)];
  }
  /** Solve an arm so its hand grips the stage point (tx,ty); the hand stays
   *  level, so whatever it holds stays upright. Solved in the rig's own
   *  frame, so a mirrored actor (the clerk) reaches the right way. */
  reach(t, dur, side, tx, ty, { elbowDown = true, ease = "power3.inOut", torso } = {}) {
    if (torso !== undefined) this.pose.torso = torso;
    const [sx, sy] = this.shoulderLocal(side);
    const lx = this.mirror ? this.x - tx : tx - this.x;
    const ly = ty - this.y;
    const s = ik(sx, sy, lx, ly, elbowDown);
    const u = s.u - this.pose.torso, f = s.f;
    const h = -(this.pose.torso + u + f);
    const a = { [`u${side}`]: u, [`f${side}`]: f, [`h${side}`]: h };
    if (torso !== undefined) a.torso = torso;
    this.to(t, dur, a, ease);
  }
  rest(t, dur = 0.5, side = "both") {
    if (side !== "F") this.to(t, dur, { uN: 8, fN: -10, hN: 2 });
    if (side !== "N") this.to(t, dur, { uF: -6, fF: -8, hF: 14 });
  }
  /** Show one mouth shape. */
  mouth(t, shape) {
    this.js.push(`tl.set(".${this.p}-m",{opacity:0},${t.toFixed(3)});tl.set(".${this.p}-m.m-${shape}",{opacity:1},${t.toFixed(3)});`);
  }
  /** Lip-sync a spoken sentence: one mouth shape per vowel group, spread over
   *  the clip, with a brief closure between syllables and at word ends. */
  lipSync(t0, dur, text) {
    const groups = String(text).toLowerCase().match(/[aeiouäöüy]+|[\s,.?!]+/g) || [];
    const syl = groups.filter((g) => /[aeiouäöüy]/.test(g));
    if (!syl.length || dur <= 0) return;
    const slot = dur / syl.length;
    let i = 0;
    for (const g of groups) {
      if (!/[aeiouäöüy]/.test(g)) continue;
      const shape = /[aä]/.test(g) ? "A" : /[oöuü]/.test(g) ? "O" : "E";
      const at = t0 + i * slot;
      this.mouth(at, shape);
      if (slot > 0.16) this.mouth(at + slot * 0.72, "M");
      i++;
    }
    this.mouth(t0 + dur, "M");
    this.talk(t0, dur, text);
  }
  /** Blink on a fixed, human-looking rhythm between t0 and t1. */
  blinks(t0, t1, offset = 0) {
    const gaps = [3.1, 3.7, 2.6, 4.2, 3.3, 2.9];
    let t = t0 + 1.2 + offset, k = 0;
    while (t < t1 - 0.3) {
      this.js.push(`tl.fromTo(".${this.p}-lid",{scaleY:0,transformOrigin:"50% 0%"},{scaleY:1,transformOrigin:"50% 0%",duration:.07,ease:"power1.in",immediateRender:false},${t.toFixed(3)});`);
      this.js.push(`tl.to(".${this.p}-lid",{scaleY:0,transformOrigin:"50% 0%",duration:.09,ease:"power1.out"},${(t + 0.08).toFixed(3)});`);
      t += gaps[k++ % gaps.length];
    }
  }
  /** Idle breathing: the torso swells a little, the head floats with it. */
  breathe(t0, t1, period = 1.8) {
    const n = Math.max(1, Math.floor((t1 - t0) / period));
    this.js.push(`tl.fromTo(".${this.p}-bob",{y:0},{y:-3,duration:${(period / 2).toFixed(3)},ease:"sine.inOut",repeat:${n * 2 - 1},yoyo:true},${t0.toFixed(3)});`);
  }
  /** Continuous life between t0 and t1 — the difference between a puppet
   *  and a character: weight shifts from foot to foot, the head drifts, the
   *  eyes make small saccades, the hood strings swing. Each layer has its own
   *  wrapper group, so none of it fights the acting poses. */
  life(t0, t1, { sway = true, strings = true, pivot = "12 252" } = {}) {
    const span = t1 - t0;
    const rep = (period) => Math.max(1, Math.floor(span / period) * 2 - 1);
    if (sway) this.js.push(`tl.fromTo(".${this.p}-sway",{rotation:-1.1,svgOrigin:"${pivot}"},{rotation:1.1,svgOrigin:"${pivot}",duration:1.9,repeat:${rep(3.8)},yoyo:true,ease:"sine.inOut"},${t0.toFixed(3)});`);
    this.js.push(`tl.fromTo(".${this.p}-idlehead",{rotation:-1.8,svgOrigin:"8 -10"},{rotation:1.8,svgOrigin:"8 -10",duration:2.7,repeat:${rep(5.4)},yoyo:true,ease:"sine.inOut"},${(t0 + 0.4).toFixed(3)});`);
    if (strings) this.js.push(`tl.fromTo(".${this.p}-strings",{rotation:-3,svgOrigin:"2 -160"},{rotation:3,svgOrigin:"2 -160",duration:1.3,repeat:${rep(2.6)},yoyo:true,ease:"sine.inOut"},${t0.toFixed(3)});`);
    // Saccades: quick jumps between a few fixation points, held in between.
    const pts = [[0, 0], [1.6, -0.8], [-1.2, 0.6], [0.8, 1.2], [-0.6, -1]];
    let t = t0 + 0.7, k = 0;
    while (t < t1 - 0.2) {
      const [x, y] = pts[k % pts.length];
      this.js.push(`tl.to(".${this.p}-sacc",{x:${x},y:${y},duration:.06,ease:"power2.out"},${t.toFixed(3)});`);
      t += [0.9, 1.4, 0.7, 1.7, 1.1][k++ % 5];
    }
  }
  /** While a line is spoken: the head bobs on the syllables and the brows
   *  lift on the first stressed one — talking is done with the whole face. */
  talk(t0, dur, text) {
    const syl = (String(text).toLowerCase().match(/[aeiouäöüy]+/g) || []).length || 1;
    const beat = dur / syl;
    for (let i = 0; i < syl; i += 2) {
      this.js.push(`tl.to(".${this.p}-talk",{y:-2.5,rotation:-1.5,svgOrigin:"8 -10",duration:${(beat * 0.5).toFixed(3)},ease:"sine.out"},${(t0 + i * beat).toFixed(3)});`);
      this.js.push(`tl.to(".${this.p}-talk",{y:0,rotation:0,svgOrigin:"8 -10",duration:${(beat * 0.6).toFixed(3)},ease:"sine.in"},${(t0 + (i + 0.6) * beat).toFixed(3)});`);
    }
    this.brows(t0, -6, -6, 4, 0.2);
    this.brows(t0 + dur, 0, 0, 0, 0.3);
  }
  look(t, dx, dy, dur = 0.25) {
    this.js.push(`tl.to(".${this.p}-pupil",{x:${dx},y:${dy},duration:${dur},ease:"power2.out"},${t.toFixed(3)});`);
  }
  brows(t, n, f = n, lift = 0, dur = 0.3) {
    this.js.push(`tl.to(".${this.p}-browN",{rotation:${n},y:${-lift},svgOrigin:"0 0",duration:${dur},ease:"power2.out"},${t.toFixed(3)});`);
    this.js.push(`tl.to(".${this.p}-browF",{rotation:${f},y:${-lift},svgOrigin:"0 0",duration:${dur},ease:"power2.out"},${t.toFixed(3)});`);
  }
  nod(t, times = 2, deg = 7) {
    const base = this.pose.head;
    for (let i = 0; i < times; i++) {
      this.to(t + i * 0.36, 0.17, { head: base + deg }, "sine.inOut");
      this.to(t + i * 0.36 + 0.18, 0.17, { head: base }, "sine.inOut");
    }
  }
}
