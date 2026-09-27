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

function faceParts(p, C, { glasses = false } = {}) {
  // Head drawn around (10,-58) relative to the neck joint.
  return `
    <ellipse cx="-30" cy="-54" rx="13" ry="18" fill="${C.skinShade}"/>
    <ellipse cx="10" cy="-58" rx="60" ry="64" fill="${C.skin}"/>
    <ellipse cx="46" cy="-30" rx="12" ry="7" fill="${C.blush}" opacity=".55"/>
    <path d="M64 -52 q16 10 2 18" stroke="${C.skinShade}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <g transform="translate(32 -62)"><ellipse rx="11" ry="13" fill="#FFFFFF"/><g class="${p}-pupil"><circle cx="3" cy="1" r="6.5" fill="${C.eye}"/><circle cx="5" cy="-2" r="2" fill="#FFFFFF"/></g><rect class="${p}-lid" x="-13" y="-15" width="26" height="30" fill="${C.skin}" transform="scale(1 0)"/></g>
    <g transform="translate(58 -60)"><ellipse rx="8" ry="12" fill="#FFFFFF"/><g class="${p}-pupil"><circle cx="2" cy="1" r="5.5" fill="${C.eye}"/><circle cx="3.5" cy="-2" r="1.6" fill="#FFFFFF"/></g><rect class="${p}-lid" x="-10" y="-14" width="20" height="28" fill="${C.skin}" transform="scale(1 0)"/></g>
    <g transform="translate(32 -84)"><rect class="${p}-browN" x="-14" y="-4" width="28" height="7" rx="3.5" fill="${C.hair}"/></g>
    <g transform="translate(59 -82)"><rect class="${p}-browF" x="-9" y="-3.5" width="18" height="6" rx="3" fill="${C.hair}"/></g>
    ${glasses ? `<g fill="none" stroke="${C.glasses}" stroke-width="4"><circle cx="32" cy="-62" r="17"/><circle cx="60" cy="-60" r="13"/><path d="M49 -62 h-2 M15 -64 l-40 6"/></g>` : ""}
    <g transform="translate(46 -24)" class="${p}-mouth">
      <path class="${p}-m m-M" d="M-12 0 q12 7 24 0" stroke="${C.lip}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path class="${p}-m m-S" d="M-15 -3 q15 18 30 0 z" fill="${C.mouth}" stroke="${C.lip}" stroke-width="3" opacity="0"/>
      <ellipse class="${p}-m m-E" cx="0" cy="1" rx="10" ry="4.5" fill="${C.mouth}" stroke="${C.lip}" stroke-width="3" opacity="0"/>
      <g class="${p}-m m-A" opacity="0"><ellipse cx="0" cy="4" rx="12" ry="11" fill="${C.mouth}" stroke="${C.lip}" stroke-width="3"/><ellipse cx="0" cy="10" rx="7" ry="4" fill="${C.tongue}"/></g>
      <ellipse class="${p}-m m-O" cx="0" cy="3" rx="7" ry="9" fill="${C.mouth}" stroke="${C.lip}" stroke-width="3" opacity="0"/>
      <path class="${p}-m m-W" d="M-12 2 q4 -5 8 0 q4 5 8 0 q4 -5 8 0" stroke="${C.lip}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0"/>
    </g>`;
}

const hand = (p, key, C, held = "") => `<circle cx="0" cy="10" r="15" fill="${C.skin}"/><ellipse cx="11" cy="4" rx="6" ry="9" fill="${C.skin}" stroke="${C.skinShade}" stroke-width="2"/><g class="${p}-held-${key}">${held}</g>`;

function arm(p, side, C, held) {
  const sleeve = side === "N" ? C.top : C.topShade;
  return bone(`${p}-u${side}`, ...(side === "N" ? GEO.shoulderN : GEO.shoulderF),
    `<rect x="-16" y="-10" width="32" height="104" rx="16" fill="${sleeve}"/>`
    + bone(`${p}-f${side}`, 0, GEO.upper,
      `<rect x="-14" y="-8" width="28" height="96" rx="14" fill="${sleeve}"/><rect x="-14" y="72" width="28" height="12" rx="5" fill="${C.cuff}"/>`
      + bone(`${p}-h${side}`, 0, GEO.fore, hand(p, side, C, held))));
}

function leg(p, side, C) {
  const pants = side === "N" ? C.pants : C.pantsShade;
  return bone(`${p}-th${side}`, side === "N" ? 8 : -6, 0,
    `<rect x="-20" y="-8" width="40" height="${GEO.thigh + 14}" rx="19" fill="${pants}"/>`
    + bone(`${p}-sh${side}`, 0, GEO.thigh,
      `<rect x="-17" y="-6" width="34" height="${GEO.shin + 8}" rx="16" fill="${pants}"/>`
      + bone(`${p}-ft${side}`, 0, GEO.shin,
        `<path d="M-18 -6 h40 q30 0 30 18 v8 h-70 z" fill="${C.shoe}"/><rect x="-18" y="16" width="70" height="6" rx="3" fill="${C.sole}"/>`)));
}

/** The visitor: a young learner in a hoodie, full body, facing right. */
export function visitorSVG(C, heldN = "", heldF = "") {
  const p = "v";
  const torso = `
    <path d="M-44 14 Q-52 -90 -44 -150 Q-38 -176 0 -178 Q40 -176 48 -150 Q56 -90 46 14 Z" fill="${C.top}"/>
    <path d="M-2 -172 v180" stroke="${C.topShade}" stroke-width="4"/>
    <path d="M-30 -40 h52 v34 h-52 z" fill="${C.topShade}" opacity=".6" rx="8"/>
    <path d="M-40 -176 q40 34 84 0" stroke="${C.topShade}" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M10 -170 v34 M22 -168 v30" stroke="${C.cuff}" stroke-width="4" stroke-linecap="round"/>
    <rect x="-48" y="-6" width="98" height="22" rx="10" fill="${C.belt}"/>`;
  const head = bone(`${p}-head`, ...GEO.neck, `
      <rect x="-8" y="-24" width="30" height="34" rx="10" fill="${C.skinShade}"/>
      <path d="M-50 -60 Q-52 -128 12 -126 Q70 -124 66 -80 Q40 -104 -8 -96 Q-30 -84 -34 -40 Z" fill="${C.hair}"/>
      ${faceParts(p, C)}
      <path d="M-46 -76 Q-20 -130 40 -118 Q72 -108 70 -84 Q52 -100 22 -98 Q4 -90 -10 -96 Q-30 -94 -46 -76 Z" fill="${C.hair}"/>`);
  return `<g class="v-move"><ellipse class="v-shadow" cx="12" cy="${HIP_TO_FLOOR}" rx="78" ry="13" fill="#000" opacity=".22"/>
    <g class="v-bob">
      ${arm(p, "F", C, heldF)}
      ${leg(p, "F", C)}
      ${leg(p, "N", C)}
      ${bone(`${p}-torso`, 0, 0, torso + head + arm(p, "N", C, heldN))}
    </g></g>`;
}

/** The clerk: seated behind the counter; only the upper body shows. Drawn
 *  facing right and mirrored by the caller so she faces the visitor. */
export function clerkSVG(C, heldN = "", heldF = "") {
  const p = "c";
  const torso = `
    <path d="M-46 14 Q-54 -90 -46 -150 Q-38 -178 0 -180 Q42 -178 50 -150 Q58 -90 48 14 Z" fill="${C.top}"/>
    <path d="M-20 -176 L2 -120 L24 -176" fill="${C.shirt}"/>
    <path d="M2 -120 v130" stroke="${C.topShade}" stroke-width="4"/>
    <path d="M-12 -172 Q2 -100 16 -172" stroke="${C.lanyard}" stroke-width="5" fill="none"/>
    <rect x="-8" y="-112" width="30" height="38" rx="5" fill="#FFFFFF" stroke="${C.lanyard}" stroke-width="3"/>
    <rect x="-3" y="-104" width="20" height="5" rx="2" fill="${C.lanyard}"/>`;
  const head = bone(`${p}-head`, ...GEO.neck, `
      <rect x="-8" y="-24" width="30" height="34" rx="10" fill="${C.skinShade}"/>
      <circle cx="-36" cy="-104" r="26" fill="${C.hair}"/>
      <path d="M-52 -40 Q-60 -126 12 -128 Q74 -126 70 -70 Q50 -110 0 -104 Q-30 -96 -38 -36 Z" fill="${C.hair}"/>
      ${faceParts(p, C, { glasses: true })}
      <path d="M-44 -86 Q-10 -134 52 -116 Q74 -104 68 -76 Q40 -104 -4 -100 Q-28 -96 -44 -86 Z" fill="${C.hair}"/>`);
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
