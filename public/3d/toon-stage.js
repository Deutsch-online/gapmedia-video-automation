// The EasyDeutsch café in 3D, cartoon style: the same Lena and Herr Braun as the
// drawn film (lib/easy-cartoon.mjs), built from primitives with three-tone toon
// shading and an ink outline (inverted hull), and acted by the same rules:
// blinks, breathing, a mouth shape on every syllable, a nod while talking, the
// free arm explaining, gestures picked from the sentence, the listener looking
// and nodding, waves at shoulder height, and a camera that frames the speaker.
//
// A pure function of composition time (HyperFrames Three.js adapter: hf-seek +
// window.__hfThreeTime). The lesson comes in window.__toon = {lines, hookDur, outroAt, total}.
import * as THREE from "three";

const CFG = window.__toon;
const W = 1080, H = 1080;
const canvas = document.getElementById("three-stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false); renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf4e2be);
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ss = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const win = (t, a, b, f = 0.3) => ss(a, a + f, t) * (1 - ss(b - f, b, t));
const D = Math.PI / 180;

// ------------------------------------------------------------------ toon look
const ramp = (() => {
  const t = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
})();
const INK = 0x2b1d16;
const toon = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...o });
const inkCache = {};
function inkMat(w) {
  const k = w.toFixed(4);
  if (!inkCache[k]) {
    const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
    m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n transformed += normalize(normal) * ${k};`); };
    m.customProgramCacheKey = () => `ink${k}`;
    inkCache[k] = m;
  }
  return inkCache[k];
}
// a mesh with its ink outline; `s` scales it, the outline is thickened to match
function M(geo, color, { s = [1, 1, 1], p = [0, 0, 0], r = [0, 0, 0], ink = 0.012, mat = null, parent = null } = {}) {
  const m = new THREE.Mesh(geo, mat || toon(color));
  m.scale.set(...s); m.position.set(...p); m.rotation.set(...r);
  if (ink) { const avg = (s[0] + s[1] + s[2]) / 3; m.add(new THREE.Mesh(geo, inkMat(ink / avg))); }
  if (parent) parent.add(m);
  return m;
}
const G = (parent, p = [0, 0, 0], r = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...p); g.rotation.set(...r); if (parent) parent.add(g); return g; };
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14);
const sph = (r) => new THREE.SphereGeometry(r, 28, 20);

// ------------------------------------------------------------------ hands
// Hand poses are finger curls in radians (0 = straight, 1.5 = fist) plus a thumb
// angle: inward-positive, or straight up. Hands hang down the arm, so a curl is
// a rotation about z toward the palm side (toward the body: -sx).
function buildHand(parent, skin, sx, cuffColor) {
  const h = G(parent, [0, -0.3, 0]);
  M(new THREE.CylinderGeometry(0.056, 0.058, 0.035, 16), cuffColor, { p: [0, 0.01, 0], parent: h, ink: 0.006 });
  M(sph(0.055), skin, { s: [0.95, 1.05, 0.6], p: [0, -0.05, 0], parent: h, ink: 0.006 });
  const fingers = [];
  [[-0.03, 0.05], [-0.01, 0.06], [0.01, 0.055], [0.03, 0.042]].forEach(([x, len]) => {
    const f1 = G(h, [x, -0.09, 0]);
    M(cap(0.0125, len * 0.5), skin, { p: [0, -len * 0.3, 0], parent: f1, ink: 0.004 });
    const f2 = G(f1, [0, -len * 0.6, 0]);
    M(cap(0.0115, len * 0.4), skin, { p: [0, -len * 0.25, 0], parent: f2, ink: 0.004 });
    fingers.push({ f1, f2 });
  });
  const t1 = G(h, [-sx * 0.05, -0.05, 0.014]);
  M(cap(0.015, 0.03), skin, { p: [0, -0.03, 0], parent: t1, ink: 0.004 });
  const t2 = G(t1, [0, -0.06, 0]);
  M(cap(0.013, 0.026), skin, { p: [0, -0.02, 0], parent: t2, ink: 0.004 });
  return { h, fingers, t1, t2, sx };
}
const inward = (a) => (sx) => -sx * a;
const HAND = {
  relaxed: { c: [0.3, 0.38, 0.46, 0.55], thumb: inward(0.5), t2: 0.3 },
  open: { c: [0.04, 0.04, 0.07, 0.1], thumb: inward(0.9), t2: 0.05 },
  flat: { c: [0.1, 0.1, 0.12, 0.15], thumb: inward(0.35), t2: 0.1 },
  grip: { c: [0.85, 0.9, 0.95, 1.0], thumb: inward(1.0), t2: 0.5 },
  fist: { c: [1.45, 1.5, 1.55, 1.6], thumb: inward(1.1), t2: 0.7 },
  point: { c: [0.04, 1.5, 1.55, 1.6], thumb: inward(1.0), t2: 0.6 },
  thumbs: { c: [1.45, 1.5, 1.55, 1.6], thumb: () => Math.PI * 0.97, t2: 0.05 },
  beat: { c: [0.12, 0.18, 0.24, 0.3], thumb: inward(0.6), t2: 0.15 },
};
function poseHand(rig, parts, t, flutter = 0) {
  // parts: [[poseName, weight], ...] blended over "relaxed"
  const base = HAND.relaxed, sx = rig.sx, c = base.c.slice(), th = base.thumb(sx); let t2 = base.t2, thv = th;
  for (const [name, w] of parts) {
    const p = HAND[name]; if (!p || w <= 0) continue;
    p.c.forEach((v, i) => { c[i] += (v - base.c[i]) * w; });
    thv += (p.thumb(sx) - th) * w; t2 += (p.t2 - base.t2) * w;
  }
  rig.fingers.forEach((f, i) => {
    const cv = c[i] + flutter * 0.18 * Math.sin(t * 15 + i * 0.9);
    f.f1.rotation.z = -sx * cv; f.f2.rotation.z = -sx * cv * 0.95;
  });
  rig.t1.rotation.z = thv; rig.t2.rotation.z = -sx * t2;
}

// ------------------------------------------------------------------ people
function person(o) {
  const root = G(scene, [o.x, 0, o.z], [0, o.yaw, 0]);
  const body = G(root);
  const s = o.near;                               // the arm nearest the camera: -1 right, +1 left
  if (!o.seated) for (const sx of [-1, 1]) {
    M(new THREE.CylinderGeometry(0.075, 0.065, 0.78, 16), o.pants, { p: [sx * 0.1, 0.4, 0], parent: body });
    M(sph(0.085), o.shoe, { s: [1, 0.6, 1.5], p: [sx * 0.1, 0.045, 0.06], parent: body });
  }
  M(cap(0.18, 0.34), o.top, { s: [1, 1, 0.78], p: [0, 1.08, 0], parent: body });
  M(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 12), o.skin, { p: [0, 1.42, 0], parent: body });
  const arms = {};
  for (const sx of [-1, 1]) {
    const sh = G(body, [sx * 0.235, 1.33, 0]);
    M(sph(0.068), o.sleeve, { parent: sh, ink: 0.008 });
    M(cap(0.058, 0.2), o.sleeve, { p: [0, -0.16, 0], parent: sh });
    const el = G(sh, [0, -0.32, 0]);
    M(sph(0.056), o.sleeve, { parent: el, ink: 0.008 });
    M(cap(0.052, 0.18), o.sleeve, { p: [0, -0.14, 0], parent: el });
    const hand = buildHand(el, o.skin, sx, o.sleeve);
    arms[sx] = { sh, el, hand };
  }
  const head = G(body, [0, 1.46, 0]);
  const skull = M(sph(0.26), o.skin, { s: [1, 1.05, 0.97], p: [0, 0.28, 0], parent: head });
  for (const sx of [-1, 1]) M(sph(0.045), o.skin, { s: [0.6, 1, 0.8], p: [sx * 0.255, 0.28, 0], parent: head });
  M(sph(0.028), o.skin, { s: [1, 0.9, 1.1], p: [0.0, 0.245, 0.255], parent: head, ink: 0.006 });
  const lids = [], irises = [], brows = G(head);
  for (const sx of [-1, 1]) {
    const ex = sx * 0.095, ey = 0.31;
    M(sph(0.05), 0xffffff, { s: [1, 1.25, 0.5], p: [ex, ey, 0.238], parent: head, ink: 0.006 });
    const ir = M(sph(0.028), o.iris, { s: [1, 1, 0.5], p: [ex, ey, 0.262], parent: head, ink: 0 });
    M(sph(0.013), 0x1c1410, { p: [0, 0, 0.012], parent: ir, ink: 0 });
    M(sph(0.006), 0xffffff, { p: [0.008, 0.01, 0.024], parent: ir, ink: 0 });
    irises.push(ir);
    const lid = G(head, [ex, ey + 0.062, 0.243]);
    M(sph(0.056), o.skin, { s: [1, 1.15, 0.6], p: [0, -0.062, 0], parent: lid, ink: 0.004 });
    lid.scale.y = 0.001; lids.push(lid);
    M(cap(0.011, 0.07), o.browColor, { r: [0, 0, Math.PI / 2 + sx * 0.12], p: [ex, ey + 0.085, 0.243], parent: brows, ink: 0 });
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.036, 20), new THREE.MeshBasicMaterial({ color: 0xf29a9a, transparent: true, opacity: 0.55 }));
    blush.position.set(sx * 0.155, 0.21, 0.222); blush.rotation.y = sx * 0.6; head.add(blush);
  }
  const mouth = G(head, [0, 0.155, 0.243]);
  const m0 = M(new THREE.TorusGeometry(0.048, 0.009, 8, 20, Math.PI), INK, { r: [0, 0, Math.PI], p: [0, 0.015, 0], parent: mouth, ink: 0 });
  const m1 = M(sph(0.045), 0x8e2f2f, { s: [1, 0.85, 0.45], parent: mouth, ink: 0.005 });
  const m2 = M(sph(0.03), 0x8e2f2f, { s: [1, 1.25, 0.45], p: [0, -0.005, 0], parent: mouth, ink: 0.005 });
  m1.visible = m2.visible = false;
  const P = { root, body, head, arms, lids, irises, brows, mouth: [m0, m1, m2], s, extra: {}, o };
  if (o.decorate) o.decorate(P);
  return P;
}

function makeLena() {
  return person({
    x: -0.85, z: 0.45, yaw: Math.PI / 2 - 0.95, near: -1, skin: 0xf4c9a4, iris: 0x6b4a2a, browColor: 0x5e3620,
    top: 0xa9d1ee, sleeve: 0xa9d1ee, pants: 0x3d5a80, shoe: 0xffffff,
    decorate(P) {
      const { head, body } = P, hair = 0x7a4a2a;
      M(new THREE.SphereGeometry(0.275, 30, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, { p: [0, 0.3, -0.035], r: [-0.55, 0, 0], parent: head });
      M(sph(0.11), hair, { s: [1.7, 0.42, 0.7], p: [0, 0.535, 0.13], r: [0.5, 0, 0], parent: head });
      // long side locks, a pink clip, lashes: she reads as a young woman from the front too
      for (const sx of [-1, 1]) {
        M(cap(0.055, 0.32), hair, { s: [1, 1, 0.9], p: [sx * 0.235, 0.12, -0.02], r: [0, 0, sx * 0.08], parent: head });
        M(cap(0.007, 0.032), 0x1c1410, { p: [sx * 0.135, 0.335, 0.262], r: [0, 0, sx * -0.9], parent: head, ink: 0 });
        M(cap(0.007, 0.03), 0x1c1410, { p: [sx * 0.14, 0.31, 0.262], r: [0, 0, sx * -1.3], parent: head, ink: 0 });
      }
      M(sph(0.04), 0xe86a7a, { s: [1.3, 0.8, 0.5], p: [0.17, 0.5, 0.15], r: [0, 0, -0.5], parent: head, ink: 0.005 });
      const pony = G(head, [0, 0.42, -0.25]);
      M(sph(0.045), 0xe86a7a, { parent: pony });
      const tail = G(pony, [0, -0.02, -0.02], [0.5, 0, 0]);
      M(cap(0.075, 0.3), hair, { s: [1, 1, 0.8], p: [0, -0.2, 0], parent: tail });
      P.extra.pony = tail;
      for (const y of [1.2, 1.1, 1.0, 0.9]) M(sph(0.014), 0xffffff, { p: [0, y, 0.145], parent: body, ink: 0 });
      M(new THREE.BoxGeometry(0.05, 0.85, 0.02), 0x8e4a2a, { p: [0.03, 1.05, 0.14], r: [0, 0, 0.55], parent: body, ink: 0.006 });
      M(new THREE.BoxGeometry(0.2, 0.16, 0.07), 0x8e4a2a, { p: [-0.26, 0.82, 0.0], parent: body, ink: 0.008 });
      // her wallet, in the near hand
      const w = G(P.arms[P.s].el, [0, -0.36, 0.06]);
      M(new THREE.BoxGeometry(0.15, 0.1, 0.03), 0x8e4a2a, { parent: w, ink: 0.006 });
      M(new THREE.BoxGeometry(0.15, 0.04, 0.032), 0xa95c35, { p: [0, 0.03, 0], parent: w, ink: 0 });
      w.visible = false; P.extra.wallet = w;
    },
  });
}
function makeBraun() {
  return person({
    x: 1.3, z: -0.75, yaw: -Math.PI / 2 + 0.95, near: 1, skin: 0xf0c29a, iris: 0x3e5a7a, browColor: 0x9a9a9a,
    top: 0xffffff, sleeve: 0xffffff, pants: 0x2f3a48, shoe: 0x2f3a48,
    decorate(P) {
      const { head, body } = P, grey = 0xbdbdbd;
      for (const sx of [-1, 1]) M(sph(0.06), grey, { s: [0.7, 1.2, 0.8], p: [sx * 0.245, 0.33, -0.03], parent: head });
      M(cap(0.026, 0.09), grey, { r: [0, 0, Math.PI / 2], p: [0, 0.19, 0.245], parent: head, ink: 0.006 });
      for (const sx of [-1, 1]) M(new THREE.TorusGeometry(0.068, 0.011, 8, 24), 0x2b1d16, { p: [sx * 0.095, 0.31, 0.268], parent: head, ink: 0 });
      M(new THREE.BoxGeometry(0.03, 0.012, 0.012), 0x2b1d16, { p: [0, 0.315, 0.272], parent: head, ink: 0 });
      M(new THREE.BoxGeometry(0.36, 0.5, 0.03), 0x3e8a5a, { p: [0, 1.0, 0.145], parent: body, ink: 0.008 });
      M(new THREE.BoxGeometry(0.2, 0.16, 0.03), 0x3e8a5a, { p: [0, 1.28, 0.145], parent: body, ink: 0.008 });
      M(new THREE.BoxGeometry(0.09, 0.05, 0.03), 0xc23b3b, { p: [0, 1.41, 0.15], parent: body, ink: 0.004 });
      const el = P.arms[P.s].el;
      const watch = G(el, [0, -0.27, 0]);
      M(new THREE.CylinderGeometry(0.06, 0.06, 0.035, 20), 0x2f3a48, { parent: watch, ink: 0.005 });
      M(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 20), 0xffffff, { parent: watch, ink: 0 });
      watch.visible = false; P.extra.watch = watch;
    },
  });
}

// ------------------------------------------------------------------ the café
function panelTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const box = (w, h, d, color, p, o = {}) => M(new THREE.BoxGeometry(w, h, d), color, { p, parent: scene, ink: 0.014, ...o });
function buildCafe() {
  box(20, 0.05, 12, 0xd29a5e, [0, 0, 0], { ink: 0 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), toon(0xffffff, { map: panelTex(512, 256, (g, w, h) => { g.fillStyle = "#D29A5E"; g.fillRect(0, 0, w, h); g.strokeStyle = "#A8703F"; g.lineWidth = 5; for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } }) }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.03; scene.add(floor);
  box(20, 6, 0.1, 0xf4e2be, [0, 3, -2.2], { ink: 0 });
  box(20, 1.0, 0.14, 0xb7794a, [0, 0.5, -2.12], { ink: 0.01 });
  box(20, 0.09, 0.2, 0x8e5a33, [0, 1.02, -2.1], { ink: 0.01 });
  // window with a street outside
  box(1.9, 1.7, 0.06, 0xbfe6f5, [-1.9, 1.95, -2.15], { ink: 0.01 });
  box(1.9, 0.5, 0.07, 0x9fd18b, [-1.9, 1.35, -2.13], { ink: 0 });
  box(0.09, 1.7, 0.1, 0xffffff, [-1.9, 1.95, -2.1], { ink: 0.008 }); box(1.9, 0.09, 0.1, 0xffffff, [-1.9, 1.95, -2.1], { ink: 0.008 });
  for (const [x, y, w, h] of [[-1.9, 2.85, 2.1, 0.09], [-1.9, 1.07, 2.1, 0.09], [-2.9, 1.95, 0.09, 1.9], [-0.9, 1.95, 0.09, 1.9]]) box(w, h, 0.12, 0xffffff, [x, y, -2.08], { ink: 0.008 });
  box(2.3, 0.08, 0.3, 0xffffff, [-1.9, 1.02, -1.98], { ink: 0.008 });
  const pot = M(new THREE.CylinderGeometry(0.11, 0.09, 0.17, 16), 0xd96b4a, { p: [-2.5, 1.15, -1.98], parent: scene });
  for (let i = 0; i < 5; i++) { const a = i * 1.3; M(sph(0.09), 0x5fa35a, { s: [0.5, 1.4, 0.3], p: [-2.5 + Math.cos(a) * 0.08, 1.4 + (i % 2) * 0.05, -1.98 + Math.sin(a) * 0.05], r: [0, a, Math.cos(a) * 0.5], parent: scene, ink: 0.008 }); }
  // chalkboard
  const cb = box(2.1, 1.2, 0.06, 0x8e5a33, [1.15, 2.2, -2.13]);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.0), new THREE.MeshBasicMaterial({ map: panelTex(760, 400, (g, w, h) => { g.fillStyle = "#2F4A3A"; g.fillRect(0, 0, w, h); g.fillStyle = "#F6F1E4"; g.font = "bold 84px Arial"; g.textAlign = "center"; g.fillText("Kaffee · Tee", w / 2, 130); g.strokeStyle = "rgba(246,241,228,.6)"; g.lineWidth = 9; g.setLineDash([26, 18]); for (const y of [200, 270, 340]) { g.beginPath(); g.moveTo(90, y); g.lineTo(w - 90 - (y - 200) * 0.6, y); g.stroke(); } }) }));
  face.position.set(1.15, 2.2, -2.095); scene.add(face);
  // shelf and jars
  box(1.9, 0.06, 0.32, 0x8e5a33, [1.45, 1.42, -1.95], { ink: 0.01 });
  [0xc8783a, 0xe0b25a, 0x8e5a3a, 0xd96b4a].forEach((c, i) => { M(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 16), 0xf6e7c8, { p: [0.85 + i * 0.4, 1.57, -1.95], parent: scene, ink: 0.008 }); M(new THREE.CylinderGeometry(0.1, 0.1, 0.13, 16), c, { p: [0.85 + i * 0.4, 1.52, -1.95], parent: scene, ink: 0 }); });
  // clock
  const clock = G(scene, [-0.25, 2.3, -2.12]);
  M(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 32), 0xffffff, { r: [Math.PI / 2, 0, 0], parent: clock });
  const hh = M(new THREE.BoxGeometry(0.03, 0.13, 0.02), INK, { p: [0, 0.06, 0.04], parent: G(clock), ink: 0 });
  const mh = M(new THREE.BoxGeometry(0.02, 0.19, 0.02), INK, { p: [0, 0.09, 0.055], parent: G(clock), ink: 0 });
  // pendant lamps
  const lamps = [];
  for (const x of [-1.6, 0.3, 1.9]) {
    const g = G(scene, [x, 2.55, -0.3]);
    M(new THREE.CylinderGeometry(0.01, 0.01, 1.6, 6), INK, { p: [0, 0.8, 0], parent: g, ink: 0 });
    M(new THREE.ConeGeometry(0.26, 0.24, 28, 1, true), 0xe8783a, { p: [0, 0, 0], parent: g, ink: 0.012, mat: toon(0xe8783a, { side: THREE.DoubleSide }) });
    M(sph(0.07), 0xfff3c4, { p: [0, -0.1, 0], parent: g, ink: 0, mat: new THREE.MeshBasicMaterial({ color: 0xfff3c4 }) });
    lamps.push(g);
  }
  // counter, pastry case, cup
  box(2.3, 0.9, 0.62, 0x9c6238, [1.3, 0.45, -0.1]);
  for (let i = 0; i < 5; i++) box(0.05, 0.86, 0.02, 0x7e4c2a, [0.5 + i * 0.4, 0.45, 0.22], { ink: 0 });
  box(2.5, 0.09, 0.78, 0x6e4226, [1.3, 0.94, -0.1], { ink: 0.012 });
  box(0.9, 0.34, 0.4, 0xdff3f8, [1.9, 1.16, -0.05], { mat: toon(0xdff3f8, { transparent: true, opacity: 0.55 }), ink: 0.01 });
  [1.65, 1.9, 2.15].forEach((x) => M(sph(0.09), 0xe8a04a, { s: [1.4, 0.7, 1], p: [x, 1.05, -0.05], parent: scene, ink: 0.008 }));
  M(new THREE.CylinderGeometry(0.075, 0.06, 0.13, 16), 0xffffff, { p: [0.55, 1.05, 0.12], parent: scene, ink: 0.008 });
  M(new THREE.TorusGeometry(0.04, 0.012, 8, 14, Math.PI * 1.5), 0xffffff, { p: [0.62, 1.05, 0.12], parent: scene, ink: 0.004 });
  // a bird crossing the window
  const bird = G(scene, [0, 2.6, -2.05]);
  const wing = (sx) => { const w = G(bird); M(sph(0.05), INK, { s: [2, 0.25, 0.7], p: [sx * 0.09, 0, 0], parent: w, ink: 0 }); return w; };
  const wl = wing(-1), wr = wing(1);
  return { lamps, hh, mh, bird, wl, wr, clock };
}

scene.add(new THREE.HemisphereLight(0xffffff, 0xd9b48a, 1.25));
const sun = new THREE.DirectionalLight(0xfff2d6, 2.4); sun.position.set(2.5, 4, 3.5); scene.add(sun);

const cafe = buildCafe();
const lena = makeLena(), braun = makeBraun();
const PEOPLE = { lena, braun };

// ------------------------------------------------------------------ the lesson as time windows
const L = CFG.lines, HOOK = CFG.hookDur, OUTRO = CFG.outroAt, TOTAL = CFG.total;
const NEAR_POSE = {                         // degrees: shoulder x / z, elbow x / z (x forward = negative)
  wallet: { sx: -48, sz: 0, ex: -40, ez: 0 }, watch: { sx: -32, sz: 0, ex: -128, ez: 0 }, thumbs: { sx: -28, sz: 0, ex: -98, ez: 0 },
  chest: { sx: -22, sz: 0, ex: -140, ez: 0 }, point: { sx: -78, sz: 0, ex: -10, ez: 0 },
};
const talk = { lena: [], braun: [] }, acts = { lena: [], braun: [] };
L.forEach((l) => {
  talk[l.who].push({ t0: l.t, dur: l.dur, text: l.de });
  const again = l.again ? l.again.gap + l.again.dur : 0;
  if (l.again) talk[l.who].push({ t0: l.t + l.dur + l.again.gap, dur: l.again.dur, text: l.de });
  if (NEAR_POSE[l.action]) acts[l.who].push({ t0: l.t - 0.2, t1: l.t + l.dur + again + 0.5, type: l.action });
});
const HELLO = { braun: [0.6, HOOK - 0.2], lena: [1.0, HOOK] }, BYE = { lena: [OUTRO + 0.3, TOTAL - 0.4], braun: [OUTRO + 0.5, TOTAL - 0.4] };
for (const w of ["lena", "braun"]) { acts[w].push({ t0: HELLO[w][0], t1: HELLO[w][1], type: "wave" }, { t0: BYE[w][0], t1: BYE[w][1], type: "wave" }); }
talk.braun.push({ t0: 0.9, dur: 0.7, text: "Hallo" }, { t0: OUTRO + 1.0, dur: 0.8, text: "Tschüss" });
talk.lena.push({ t0: 1.5, dur: 0.7, text: "Hallo" }, { t0: OUTRO + 0.5, dur: 0.8, text: "Tschüss" });

function blinkAmt(t, off) {
  let b = 0.8 + off, v = 0;
  while (b < t + 0.2) { const d = Math.abs(t - (b + 0.07)); if (d < 0.07) v = Math.max(v, 1 - d / 0.07); b += 2.6 + ((b * 7) % 1.4); }
  return v;
}
function mouthShape(w, t) {
  for (const x of talk[w]) {
    if (t < x.t0 || t > x.t0 + x.dur) continue;
    const vowels = String(x.text).toLowerCase().match(/[aeiouäöü]+/g) || ["a"], step = x.dur / vowels.length;
    const k = Math.min(vowels.length - 1, Math.floor((t - x.t0) / step)), ph = ((t - x.t0) / step) % 1;
    return ph < 0.62 ? (/[ouöü]/.test(vowels[k]) ? 2 : 1) : 0;
  }
  return 0;
}
const isTalking = (w, t) => talk[w].some((x) => t >= x.t0 - 0.05 && t <= x.t0 + x.dur);
const rot = (o, x, y, z) => o.rotation.set(x * D, y * D, z * D);

function act(w, P, t) {
  const other = w === "lena" ? "braun" : "lena", s = P.s;
  // near arm: the gesture of the sentence, or a wave
  let sx = 0, sz = 0, ex = 0, ez = 0, wave = 0;
  const wts = {};
  for (const a of acts[w]) {
    const wt = win(t, a.t0, a.t1, 0.4); if (wt <= 0) continue;
    if (a.type === "wave") { wave = Math.max(wave, wt); continue; }
    const p = NEAR_POSE[a.type]; sx += p.sx * wt; ex += p.ex * wt; wts[a.type] = wt;
  }
  if (wave > 0) { sz += s * 62 * wave; ez += s * (95 + 24 * Math.sin(t * 13)) * wave; ex += 0; }
  if (wts.thumbs) ex += Math.sin(t * 9) * 6 * wts.thumbs;
  if (wts.wallet) sz += Math.sin(t * 7) * 4 * wts.wallet;
  const near = P.arms[s];
  rot(near.sh, sx, 0, sz + s * 3); rot(near.el, ex, 0, ez);
  const HANDOF = { wallet: "grip", watch: "flat", thumbs: "thumbs", chest: "flat", point: "point" };
  poseHand(near.hand, [...Object.entries(wts).map(([k, v]) => [HANDOF[k], v]), ["open", wave]], t, wave);
  rot(near.hand.h, wts.watch ? -25 * wts.watch : 0, 0, wave ? s * 10 * Math.sin(t * 13 + 1) * wave : 0);
  // far arm: explains along with the words
  const tw = isTalking(w, t) ? Math.max(...talk[w].map((x) => win(t, x.t0 - 0.1, x.t0 + x.dur + 0.15, 0.25))) : 0;
  const far = P.arms[-s];
  rot(far.sh, -(20 + 14 * Math.sin(t * 7.4)) * tw, 0, -s * (3 + 5 * tw)); rot(far.el, -(14 + 10 * Math.sin(t * 7.4 + 1)) * tw, 0, 0);
  poseHand(far.hand, [["beat", tw]], t);
  rot(far.hand.h, -22 * tw * (0.5 + 0.5 * Math.sin(t * 7.4 + 2)), 0, 0);
  if (P.extra.wallet) { P.extra.wallet.visible = (wts.wallet || 0) > 0.5; }
  if (P.extra.watch) { P.extra.watch.visible = (wts.watch || 0) > 0.5; }
  // head: nods on the beat of the words; nods once when the other one finishes a sentence
  let nod = 0, react = 0;
  for (const x of talk[other]) react = Math.max(react, win(t, x.t0 + x.dur * 0.5, x.t0 + x.dur * 0.5 + 0.6, 0.25));
  nod = 0.035 * Math.sin(t * 8) * tw + 0.09 * react + (wts.chest ? 0.08 * wts.chest : 0);
  // "kein / nicht": a small shake of the head and a shrug while the sentence is said
  let neg = 0; for (const x of talk[w]) if (/\b(kein|keine|nicht)\b/i.test(x.text)) neg = Math.max(neg, win(t, x.t0 + 0.3, x.t0 + x.dur + 0.1, 0.25));
  rot(P.head, nod / D, neg * 16 * Math.sin(t * 9), (wts.chest ? -6 * wts.chest : 0) + neg * 3 * Math.sin(t * 9));
  P.body.rotation.y = 0.05 * Math.sin(t * 1.3 + (w === "lena" ? 0 : 2)) * 1 + 0.07 * tw * Math.sin(t * 2.6);
  P.body.rotation.x = 0.035 * tw + 0.05 * neg;
  // brows raise while talking or listening
  P.brows.position.y = 0.012 * Math.max(tw, react * 0.6);
  // face: blink, mouth
  const b = blinkAmt(t, w === "lena" ? 0 : 1.1);
  for (const lid of P.lids) lid.scale.y = Math.max(0.001, b);
  const shape = mouthShape(w, t);
  P.mouth[0].visible = shape === 0; P.mouth[1].visible = shape === 1; P.mouth[2].visible = shape === 2;
  P.body.position.y = 0.006 * Math.sin((t * 2 * Math.PI) / (w === "lena" ? 1.7 : 2.1));
  if (P.extra.pony) P.extra.pony.rotation.x = (0.5 + 0.12 * Math.sin(t * 2.4)) ;
}

// camera: wide in the hook, then each speaker framed in turn, wide again for the goodbye
const SH = {
  wide: { p: [0.3, 1.5, 5.4], l: [0.2, 1.1, 0] },
  lena: { p: [-0.1, 1.6, 2.7], l: [-0.8, 1.42, 0.45] },
  braun: { p: [0.8, 1.6, 2.5], l: [1.3, 1.5, -0.7] },
};
const mix = (A, B, k) => ({ p: A.p.map((v, i) => v + (B.p[i] - v) * k), l: A.l.map((v, i) => v + (B.l[i] - v) * k) });
function cameraAt(t) {
  let c = SH.wide;
  for (const l of L) c = mix(c, SH[l.who], ss(l.t - 0.5, l.t + 0.1, t));
  c = mix(c, SH.wide, ss(OUTRO, OUTRO + 0.6, t));
  camera.position.set(c.p[0] + Math.sin(t * 0.5) * 0.03, c.p[1] + Math.sin(t * 0.37) * 0.02, c.p[2]);
  camera.lookAt(c.l[0], c.l[1], c.l[2]);
}

function renderAt(t) {
  act("lena", lena, t); act("braun", braun, t);
  cafe.lamps.forEach((g, i) => { g.rotation.z = Math.sin(t * 0.9 + i) * 0.03; });
  cafe.mh.parent.rotation.z = -(t / 60) * Math.PI * 2 * 12; cafe.hh.parent.rotation.z = -(t / 60) * Math.PI * 2;
  cafe.bird.position.x = -3.1 + ((t / 7) % 1) * 2.4;
  cafe.wl.rotation.z = Math.sin(t * 22) * 0.6; cafe.wr.rotation.z = -Math.sin(t * 22) * 0.6;
  cameraAt(t);
  renderer.render(scene, camera);
}
window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady.toon = Promise.resolve();
window.addEventListener("hf-seek", (ev) => renderAt(ev.detail.time));
renderAt(window.__hfThreeTime || 0);
