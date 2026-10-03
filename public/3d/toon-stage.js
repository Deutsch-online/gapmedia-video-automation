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
// every episode looks different (owner, 2026-09-29): staging, light, camera and outfits are
// picked from the episode number; neighbours always differ on every axis (k is coprime to n)
const SEED = Math.abs(Math.round(+((CFG.vary && CFG.vary.seed) || 0)));
const pick = (list, k) => list[(SEED * k) % list.length];
const canvas = document.getElementById("three-stage");
const W = canvas.width || 1080, H = canvas.height || 1080;   // lessons: 1080 × 1080; the showcase: 1920 × 1080
const CLEAR = CFG.setting === "none";          // the character editor: no set, a transparent picture
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: CLEAR });
renderer.setSize(W, H, false); renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // real cast shadows
const scene = new THREE.Scene();
scene.background = CLEAR ? null : new THREE.Color(0xf4e2be);
const camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 40);

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
  if (!mat || mat.isMeshToonMaterial) { m.castShadow = true; m.receiveShadow = true; }
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
// outfits: Lena [top, trousers], Herr Braun [shirt, apron]
const OUTFIT = {
  lena: pick([[0xa9d1ee, 0x3d5a80], [0xf2b6c6, 0x2f3a48], [0xf6e3a1, 0x3d5a80], [0xb9e0c4, 0x5a4a3a], [0xffffff, 0x2a4a6a], [0xd9c2f0, 0x3a3a4a]], 7),
  braun: pick([[0xffffff, 0x3e8a5a], [0xdcebf7, 0x2f4f7a], [0xffffff, 0x8e2f3a], [0xf3ead8, 0x6b4a33], [0xe8f2e4, 0x2b3a4a]], 3),
};
function person(o) {
  const root = G(scene, [o.x, 0, o.z], [0, o.yaw, 0]);
  const body = G(root);
  const s = o.near;                               // the arm nearest the camera: -1 right, +1 left
  // legs on hip and knee joints, so people can walk, sit and shift their weight
  const legs = {};
  for (const sx of [-1, 1]) {
    const hip = G(body, [sx * 0.1, 0.8, 0]);
    M(cap(0.075, 0.26), o.pants, { p: [0, -0.2, 0], parent: hip });
    const knee = G(hip, [0, -0.4, 0]);
    M(cap(0.066, 0.24), o.pants, { p: [0, -0.18, 0], parent: knee });
    const ankle = G(knee, [0, -0.355, 0]);
    M(sph(0.085), o.shoe, { s: [1, 0.6, 1.5], p: [0, 0, 0.06], parent: ankle });
    legs[sx] = { hip, knee, ankle };
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
  const P = { root, body, head, arms, legs, lids, irises, brows, mouth: [m0, m1, m2], s, extra: {}, o };
  if (o.decorate) o.decorate(P);
  return P;
}

function makeLena([lx, lz]) {
  return person({
    x: lx, z: lz, yaw: Math.PI / 2 - 0.95, near: -1, skin: 0xf4c9a4, iris: 0x6b4a2a, browColor: 0x5e3620,
    top: OUTFIT.lena[0], sleeve: OUTFIT.lena[0], pants: OUTFIT.lena[1], shoe: 0xffffff,
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
function makeBraun([bx, bz]) {
  return person({
    x: bx, z: bz, yaw: -Math.PI / 2 + 0.95, near: 1, skin: 0xf0c29a, iris: 0x3e5a7a, browColor: 0x9a9a9a,
    top: OUTFIT.braun[0], sleeve: OUTFIT.braun[0], pants: 0x2f3a48, shoe: 0x2f3a48,
    decorate(P) {
      const { head, body } = P, grey = 0xbdbdbd;
      for (const sx of [-1, 1]) M(sph(0.06), grey, { s: [0.7, 1.2, 0.8], p: [sx * 0.245, 0.33, -0.03], parent: head });
      M(cap(0.026, 0.09), grey, { r: [0, 0, Math.PI / 2], p: [0, 0.19, 0.245], parent: head, ink: 0.006 });
      for (const sx of [-1, 1]) M(new THREE.TorusGeometry(0.068, 0.011, 8, 24), 0x2b1d16, { p: [sx * 0.095, 0.31, 0.268], parent: head, ink: 0 });
      M(new THREE.BoxGeometry(0.03, 0.012, 0.012), 0x2b1d16, { p: [0, 0.315, 0.272], parent: head, ink: 0 });
      M(new THREE.BoxGeometry(0.36, 0.5, 0.03), OUTFIT.braun[1], { p: [0, 1.0, 0.145], parent: body, ink: 0.008 });
      M(new THREE.BoxGeometry(0.2, 0.16, 0.03), OUTFIT.braun[1], { p: [0, 1.28, 0.145], parent: body, ink: 0.008 });
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
function cafeScene() {
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
  return {
    lamps,
    update(t) {
      mh.parent.rotation.z = -(t / 60) * Math.PI * 2 * 12; hh.parent.rotation.z = -(t / 60) * Math.PI * 2;
      bird.position.x = -3.1 + ((t / 7) % 1) * 2.4; wl.rotation.z = Math.sin(t * 22) * 0.6; wr.rotation.z = -Math.sin(t * 22) * 0.6;
    },
  };
}

// ------------------------------------------------------------------ the other sets (one per lesson topic)
const cyl = (rt, rb, h, color, p, o = {}) => M(new THREE.CylinderGeometry(rt, rb, h, 20), color, { p, parent: scene, ink: 0.012, ...o });
const ball = (r, color, p, sc = [1, 1, 1], o = {}) => M(sph(r), color, { p, s: sc, parent: scene, ink: 0.01, ...o });
const flat = (w, h, p, tex, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex })); m.position.set(...p); m.rotation.y = ry; scene.add(m); return m; };
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // deterministic
function shell({ wall, floor, line, wain = null, wainTop = null, sky = null }) {
  box(20, 0.05, 12, floor, [0, 0, 0], { ink: 0 });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), toon(0xffffff, { map: panelTex(512, 256, (g, w, h) => { g.fillStyle = "#" + floor.toString(16).padStart(6, "0"); g.fillRect(0, 0, w, h); g.strokeStyle = "#" + line.toString(16).padStart(6, "0"); g.lineWidth = 5; for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }) }));
  fl.rotation.x = -Math.PI / 2; fl.position.y = 0.03; scene.add(fl);
  box(20, 6, 0.1, wall, [0, 3, -2.2], { ink: 0 });
  if (wain) { box(20, 1.0, 0.14, wain, [0, 0.5, -2.12], { ink: 0.01 }); box(20, 0.09, 0.2, wainTop || wain, [0, 1.02, -2.1], { ink: 0.01 }); }
}
function counterUnit({ front, top, sign }) {
  box(2.3, 0.9, 0.62, front, [1.3, 0.45, -0.1]);
  box(2.5, 0.09, 0.78, top, [1.3, 0.94, -0.1], { ink: 0.012 });
  if (sign) flat(1.0, 0.3, [1.3, 0.5, 0.216], panelTex(400, 120, (g, w, h) => { g.fillStyle = sign.bg; g.fillRect(0, 0, w, h); g.fillStyle = sign.fg; g.font = "bold 70px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(sign.text, w / 2, h / 2 + 4); }));
}
const plant = (x, z, sc = 1) => { cyl(0.13 * sc, 0.1 * sc, 0.22 * sc, 0xd96b4a, [x, 0.15 * sc, z]); for (let i = 0; i < 6; i++) { const a = i * 1.1; ball(0.11 * sc, 0x5fa35a, [x + Math.cos(a) * 0.1 * sc, (0.42 + (i % 3) * 0.1) * sc, z + Math.sin(a) * 0.08 * sc], [0.5, 1.5, 0.35], { ink: 0.008 }); } };
const frame = (x, y, z, w, h, c1, c2) => { box(w + 0.1, h + 0.1, 0.05, 0x8e5a33, [x, y, z], { ink: 0.008 }); box(w, h, 0.06, c1, [x, y, z + 0.01], { ink: 0 }); box(w, h * 0.35, 0.07, c2, [x, y - h * 0.32, z + 0.02], { ink: 0 }); };
const hangLamp = (x, z, c = 0xe8783a) => { const g = G(scene, [x, 2.55, z]); M(new THREE.CylinderGeometry(0.01, 0.01, 1.6, 6), INK, { p: [0, 0.8, 0], parent: g, ink: 0 }); M(new THREE.ConeGeometry(0.26, 0.24, 28, 1, true), c, { parent: g, ink: 0.012, mat: toon(c, { side: THREE.DoubleSide }) }); M(sph(0.07), 0xfff3c4, { p: [0, -0.1, 0], parent: g, ink: 0, mat: new THREE.MeshBasicMaterial({ color: 0xfff3c4 }) }); return g; };
const tree = (x, z, sc = 1, c = 0x3e8a4f) => { cyl(0.1 * sc, 0.14 * sc, 1.6 * sc, 0x6b4a33, [x, 0.8 * sc, z]); [[0, 1.9, 0, 0.75], [0.35, 1.7, 0.1, 0.55], [-0.3, 1.75, -0.1, 0.55], [0.05, 2.35, 0, 0.5]].forEach(([dx, y, dz, r]) => ball(r * sc, c, [x + dx * sc, y * sc, z + dz * sc], [1, 1, 1], { ink: 0.014 })); };
const wallClock = (x, y) => { const g = G(scene, [x, y, -2.12]); M(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 32), 0xffffff, { r: [Math.PI / 2, 0, 0], parent: g }); const h = M(new THREE.BoxGeometry(0.03, 0.13, 0.02), INK, { p: [0, 0.06, 0.04], parent: G(g), ink: 0 }); const m = M(new THREE.BoxGeometry(0.02, 0.19, 0.02), INK, { p: [0, 0.09, 0.055], parent: G(g), ink: 0 }); return (t) => { m.parent.rotation.z = -(t / 60) * Math.PI * 2 * 12; h.parent.rotation.z = -(t / 60) * Math.PI * 2; }; };

const SCENES = {
  cafe: cafeScene,
  home() {
    shell({ wall: 0xeadfcc, floor: 0xb98556, line: 0x9e6f45, wain: 0xd8c7a6, wainTop: 0xb98556 });
    box(1.8, 1.4, 0.06, 0xcdebfa, [-1.6, 1.95, -2.15], { ink: 0.01 }); box(0.08, 1.4, 0.1, 0xffffff, [-1.6, 1.95, -2.1], { ink: 0.008 }); box(1.8, 0.08, 0.1, 0xffffff, [-1.6, 1.95, -2.1], { ink: 0.008 });
    box(0.35, 1.7, 0.1, 0xe7a78c, [-2.7, 1.9, -2.08], { ink: 0.01 }); box(0.35, 1.7, 0.1, 0xe7a78c, [-0.5, 1.9, -2.08], { ink: 0.01 });
    box(2.3, 0.45, 0.85, 0x5e9e8c, [2.0, 0.3, -1.5]); box(2.3, 0.75, 0.22, 0x4c8373, [2.0, 0.75, -1.9]); box(0.22, 0.6, 0.85, 0x4c8373, [0.9, 0.5, -1.5]); box(0.22, 0.6, 0.85, 0x4c8373, [3.1, 0.5, -1.5]);
    [0xe0b25a, 0xe7a78c, 0xffffff].forEach((c, i) => box(0.42, 0.4, 0.14, c, [1.4 + i * 0.6, 0.72, -1.6], { r: [0, 0, 0.15 * (i - 1)], ink: 0.008 }));
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.7, 48), toon(0xe7a78c)); rug.rotation.x = -Math.PI / 2; rug.position.set(0.1, 0.045, 0.3); scene.add(rug);
    frame(2.0, 2.4, -2.15, 1.0, 0.7, 0xbfe3f2, 0x7cb36a); frame(0.9, 2.6, -2.15, 0.5, 0.6, 0xfff3c4, 0xe0b25a);
    cyl(0.03, 0.03, 1.5, 0x4a3a2c, [-2.9, 0.8, -1.2]); M(new THREE.ConeGeometry(0.3, 0.35, 24, 1, true), 0xe0b25a, { p: [-2.9, 1.65, -1.2], parent: scene, mat: toon(0xe0b25a, { side: THREE.DoubleSide }), ink: 0.01 });
    box(1.4, 0.05, 0.3, 0x9e6f45, [-1.6, 1.0, -1.95], { ink: 0.008 }); [0xdd0000, 0x3a7fd0, 0xf2c14e, 0x4f9e5a, 0x833ab4].forEach((c, i) => box(0.1, 0.32, 0.22, c, [-2.1 + i * 0.16, 1.2, -1.95], { ink: 0.006 }));
    plant(3.0, -0.6, 1.3);
    return { lamps: [], update() {} };
  },
  station() {
    shell({ wall: 0xcfd6dc, floor: 0x8a8d90, line: 0x72767a });
    box(20, 0.02, 0.16, 0xffce00, [0, 0.06, 1.4], { ink: 0 });
    box(9, 2.2, 0.9, 0xdd0000, [-0.3, 1.2, -1.55]); box(9, 0.28, 0.92, 0xffffff, [-0.3, 1.55, -1.55], { ink: 0.008 });
    for (let i = 0; i < 6; i++) box(0.9, 0.62, 0.03, 0x9fd8e8, [-3.4 + i * 1.5, 1.95, -1.09], { ink: 0.008 });
    box(1.0, 1.6, 0.04, 0x9c1a1a, [-1.6, 0.9, -1.09], { ink: 0.008 });
    box(2.4, 0.9, 0.16, 0x10161f, [-1.4, 2.95, -1.0]); cyl(0.02, 0.02, 1.2, 0x39424f, [-2.4, 3.6, -1.0], { ink: 0 }); cyl(0.02, 0.02, 1.2, 0x39424f, [-0.4, 3.6, -1.0], { ink: 0 });
    flat(2.3, 0.8, [-1.4, 2.95, -0.91], panelTex(920, 320, (g, w, h) => { g.fillStyle = "#10161F"; g.fillRect(0, 0, w, h); g.fillStyle = "#FFE9A8"; g.font = "bold 56px monospace"; g.textAlign = "left"; [["10:15 Berlin", "Gl. 3"], ["10:32 München", "Gl. 5"], ["10:48 Hamburg", "Gl. 1"]].forEach(([a, b], i) => { g.fillText(a, 40, 90 + i * 90); g.fillStyle = "#9FE3FF"; g.fillText(b, 640, 90 + i * 90); g.fillStyle = "#FFE9A8"; }); }));
    counterUnit({ front: 0x2f4f7a, top: 0x1d2c44, sign: { text: "Fahrkarten", bg: "#1d2c44", fg: "#ffffff" } });
    box(0.5, 0.4, 0.3, 0x39424f, [1.9, 1.2, -0.2], { ink: 0.008 });
    const clk = wallClock(1.9, 3.3);
    return { lamps: [], update: clk };
  },
  shop() {
    shell({ wall: 0xf2ead8, floor: 0xd8c9a8, line: 0xbfa67f, wain: 0xe0503a, wainTop: 0xb03a2a });
    const cols = [0xe0503a, 0x3a7fd0, 0xf2c14e, 0x4f9e5a, 0x833ab4, 0xf77737, 0x3ac0c8];
    for (let sh = 0; sh < 4; sh++) { box(3.2, 0.05, 0.4, 0x9e6f45, [-1.3, 0.75 + sh * 0.55, -1.95], { ink: 0.008 }); for (let k = 0; k < 11; k++) { const h = 0.22 + rnd(sh * 11 + k) * 0.16; box(0.2, h, 0.22, cols[(k + sh * 3) % 7], [-2.75 + k * 0.29, 0.775 + sh * 0.55 + h / 2, -1.95], { ink: 0.006 }); } }
    flat(1.6, 0.5, [1.5, 2.75, -2.09], panelTex(640, 200, (g, w, h) => { g.fillStyle = "#E0503A"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.font = "bold 84px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("SUPERMARKT", w / 2, h / 2); }));
    counterUnit({ front: 0xb98556, top: 0x7a5a3a, sign: { text: "Kasse", bg: "#7a5a3a", fg: "#ffffff" } });
    box(0.45, 0.32, 0.36, 0x2a2433, [0.75, 1.15, -0.1], { ink: 0.008 }); box(0.4, 0.2, 0.02, 0x8fe3a8, [0.75, 1.22, 0.09], { ink: 0 });
    box(0.5, 0.22, 0.36, 0xe0503a, [2.0, 1.07, 0.05], { ink: 0.01 }); [0xf2c14e, 0x4f9e5a].forEach((c, i) => ball(0.09, c, [1.9 + i * 0.16, 1.24, 0.05]));
    return { lamps: [hangLamp(-1.4, -0.3, 0xe0503a), hangLamp(1.6, -0.3, 0xe0503a)], update() {} };
  },
  doctor() {
    shell({ wall: 0xe3f4f2, floor: 0xd8dfe3, line: 0xbcc8ce, wain: 0xb7ddd6, wainTop: 0x8fc4bb });
    box(0.95, 0.95, 0.06, 0xffffff, [-0.6, 2.3, -2.12]); box(0.24, 0.74, 0.07, 0x1fa971, [-0.6, 2.3, -2.08], { ink: 0 }); box(0.74, 0.24, 0.07, 0x1fa971, [-0.6, 2.3, -2.08], { ink: 0 });
    frame(-2.3, 2.3, -2.15, 0.9, 0.7, 0xfff0f0, 0xf29a9a); frame(0.7, 2.4, -2.15, 0.7, 0.5, 0xe3f4f2, 0x7cb3d0);
    box(1.9, 0.45, 0.75, 0xdfe6ea, [-2.3, 0.45, -1.4]); box(0.5, 0.12, 0.4, 0xffffff, [-2.85, 0.75, -1.4], { ink: 0.008 });
    counterUnit({ front: 0xffffff, top: 0x9ab0b6, sign: { text: "Anmeldung", bg: "#1fa971", fg: "#ffffff" } });
    box(0.55, 0.36, 0.05, 0x1a1f26, [1.8, 1.32, -0.15], { ink: 0.008 }); box(0.08, 0.2, 0.08, 0x1a1f26, [1.8, 1.05, -0.15], { ink: 0.005 });
    plant(-0.3, -1.7, 1.4);
    return { lamps: [], update() {} };
  },
  school() {
    shell({ wall: 0xf1e6c8, floor: 0xa98a62, line: 0x8e7350, wain: 0xc9a86a, wainTop: 0x8e5a33 });
    box(3.5, 1.6, 0.06, 0x8e5a33, [-0.1, 2.1, -2.13]);
    flat(3.3, 1.4, [-0.1, 2.1, -2.095], panelTex(990, 420, (g, w, h) => { g.fillStyle = "#2F4A3A"; g.fillRect(0, 0, w, h); g.fillStyle = "#F6F1E4"; g.font = "bold 120px Arial"; g.textAlign = "left"; g.fillText("Deutsch A1", 60, 150); g.font = "bold 80px Arial"; g.fillStyle = "#FFCE00"; g.fillText("der · die · das", 60, 270); g.fillStyle = "#9FE3FF"; g.fillText("ich bin · du bist", 60, 370); }));
    for (const x of [-2.5, -1.5]) { box(0.9, 0.06, 0.55, 0xd9b27a, [x, 0.8, -1.0], { ink: 0.01 }); cyl(0.03, 0.03, 0.78, 0x6b4a33, [x - 0.38, 0.4, -0.85], { ink: 0.006 }); cyl(0.03, 0.03, 0.78, 0x6b4a33, [x + 0.38, 0.4, -1.15], { ink: 0.006 }); box(0.45, 0.06, 0.4, 0x3a7fd0, [x, 0.5, -0.5], { ink: 0.01 }); box(0.45, 0.4, 0.05, 0x3a7fd0, [x, 0.75, -0.28], { ink: 0.01 }); box(0.35, 0.05, 0.25, 0xdd0000, [x, 0.85, -1.0], { ink: 0.006 }); }
    box(1.6, 0.85, 0.7, 0x8e5a3a, [2.3, 0.43, -1.4]); box(1.8, 0.07, 0.8, 0x6b4a33, [2.3, 0.9, -1.4], { ink: 0.01 });
    cyl(0.03, 0.03, 0.2, 0x6b4a33, [2.0, 1.03, -1.4], { ink: 0.004 }); ball(0.17, 0x3a7fd0, [2.0, 1.28, -1.4]);
    [0xdd0000, 0xf2c14e, 0x4f9e5a].forEach((c, i) => box(0.4, 0.06, 0.28, c, [2.7, 0.96 + i * 0.06, -1.4], { ink: 0.005 }));
    wallClock(-2.9, 3.0);
    return { lamps: [], update() {} };
  },
  work() {
    shell({ wall: 0xd8dde3, floor: 0x6f7b87, line: 0x5e6975 });
    box(2.4, 1.7, 0.05, 0xbfe3f2, [-1.6, 2.2, -2.15], { ink: 0.01 }); for (let i = 0; i < 9; i++) box(2.4, 0.07, 0.07, 0xf0f3f6, [-1.6, 1.45 + i * 0.19, -2.08], { ink: 0 });
    for (let sh = 0; sh < 3; sh++) { box(1.6, 0.05, 0.35, 0x4a5561, [2.0, 1.2 + sh * 0.62, -1.95], { ink: 0.008 }); for (let k = 0; k < 8; k++) box(0.14, 0.4, 0.26, [0xdd0000, 0x3a7fd0, 0xf2c14e, 0x4f9e5a][(k + sh) % 4], [1.4 + k * 0.17, 1.42 + sh * 0.62, -1.95], { ink: 0.006 }); }
    counterUnit({ front: 0xe7ebef, top: 0x3a4552 });
    box(0.62, 0.4, 0.04, 0x1a1f26, [1.7, 1.42, -0.2], { ink: 0.008 }); box(0.1, 0.2, 0.1, 0x1a1f26, [1.7, 1.12, -0.2], { ink: 0.005 }); box(0.5, 0.03, 0.18, 0x39424f, [1.7, 1.0, 0.05], { ink: 0.005 });
    plant(-2.9, -1.4, 1.3); const clk = wallClock(0.3, 3.1);
    return { lamps: [hangLamp(-0.6, -0.4, 0x8fa4b8)], update: clk };
  },
  park() {
    scene.background = new THREE.Color(0x9fd3f2); scene.fog = new THREE.Fog(0x9fd3f2, 12, 26);
    box(30, 0.05, 20, 0x6fb35a, [0, 0, -4], { ink: 0 });
    box(30, 0.03, 1.6, 0xd9c193, [0, 0.055, 0.2], { ink: 0 });
    ball(4, 0x5fa35a, [-5, -0.6, -8], [2, 0.6, 0.6], { ink: 0 }); ball(4, 0x4f9a55, [4, -0.8, -9], [2.4, 0.6, 0.6], { ink: 0 });
    tree(-2.7, -2.0, 1.2); tree(2.9, -2.4, 1.4, 0x4f9e5a); tree(0.2, -3.6, 1.1, 0x5fae5a); tree(-4.2, -3.2, 1.0); tree(4.6, -1.6, 0.9);
    box(1.5, 0.07, 0.42, 0x8a5a3a, [2.5, 0.5, -0.9]); box(1.5, 0.45, 0.06, 0x8a5a3a, [2.5, 0.8, -1.1]); cyl(0.04, 0.04, 0.5, 0x39424f, [1.85, 0.25, -0.9], { ink: 0.005 }); cyl(0.04, 0.04, 0.5, 0x39424f, [3.15, 0.25, -0.9], { ink: 0.005 });
    cyl(0.04, 0.05, 2.4, 0x39424f, [-2.9, 1.2, -0.9]); ball(0.16, 0xfff3c4, [-2.9, 2.5, -0.9], [1, 1, 1], { mat: new THREE.MeshBasicMaterial({ color: 0xfff3c4 }) });
    const clouds = []; [[-3, 4.6], [1, 5.2], [4, 4.3]].forEach(([x, y], i) => { const c = G(scene, [x, y, -7]); [[0, 0, 1], [0.7, -0.1, 0.8], [-0.7, -0.1, 0.75]].forEach(([dx, dy, r]) => ball(0.8 * r, 0xffffff, [dx, dy, 0], [1.4, 0.8, 0.8], { parent: c, ink: 0.01 })); c.position.set(x, y, -7); clouds.push(c); });
    ball(0.5, 0xfff3a0, [3.8, 5.6, -8], [1, 1, 0.3], { mat: new THREE.MeshBasicMaterial({ color: 0xfff3a0 }), ink: 0.02 });
    for (let i = 0; i < 26; i++) ball(0.055, [0xff6f8a, 0xffce00, 0xffffff, 0xb46bd6][i % 4], [-3.5 + rnd(i) * 7, 0.08, -1.4 - rnd(i + 40) * 1.4], [1, 1, 1], { ink: 0.005 });
    return { lamps: [], update(t) { clouds.forEach((c, i) => { c.position.x += 0; c.position.y = [4.6, 5.2, 4.3][i] + Math.sin(t * 0.4 + i) * 0.08; }); } };
  },
  bureau() {
    shell({ wall: 0xe6e2d6, floor: 0x9aa3ab, line: 0x858e96, wain: 0xb9b3a3, wainTop: 0x8e8878 });
    flat(1.9, 0.5, [-2.1, 2.85, -2.09], panelTex(760, 200, (g, w, h) => { g.fillStyle = "#1D2C44"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.font = "bold 96px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Bürgeramt", w / 2, h / 2 + 6); }));
    box(1.0, 0.5, 0.08, 0x111111, [-2.1, 2.05, -2.12]); flat(0.9, 0.4, [-2.1, 2.05, -2.07], panelTex(360, 160, (g, w, h) => { g.fillStyle = "#111"; g.fillRect(0, 0, w, h); g.fillStyle = "#FF4D3A"; g.font = "bold 120px monospace"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("042", w / 2, h / 2 + 6); }));
    counterUnit({ front: 0x5c6670, top: 0x3a4552, sign: { text: "Schalter 3", bg: "#3a4552", fg: "#ffffff" } });
    for (const x of [-2.6, -2.05, -1.5]) { box(0.45, 0.06, 0.42, 0x39424f, [x, 0.5, -1.4], { ink: 0.01 }); box(0.45, 0.42, 0.05, 0x39424f, [x, 0.75, -1.6], { ink: 0.01 }); cyl(0.03, 0.03, 0.46, 0x9aa3ab, [x, 0.25, -1.4], { ink: 0.005 }); }
    box(0.3, 1.1, 0.3, 0xd0d4d8, [-0.2, 0.6, -1.85]); plant(2.9, -1.4, 1.3); const clk = wallClock(0.5, 3.1);
    return { lamps: [], update: clk };
  },
};
SCENES.office = SCENES.bureau;
// a seamless studio sweep (character reference pictures) and no set at all (transparent)
SCENES.studio = () => { scene.background = new THREE.Color(0xf3efe8); M(new THREE.CircleGeometry(6, 48), 0xf3efe8, { r: [-Math.PI / 2, 0, 0], parent: scene, ink: 0 }); return { lamps: [], update() {} }; };
SCENES.none = () => ({ lamps: [], update() {} });
const SETTING = SCENES[CFG.setting] ? CFG.setting : "cafe";
const OPEN = new Set(["home", "park", "school"]);
const LESSON = !(SETTING === "none" || SETTING === "studio");
// staging: standing and talking, Lena walking in, both seated at a table, or side by side
const STAGINGS = ["cafe", "home", "park", "school"].includes(SETTING) ? ["stand", "arrive", "sit", "side"] : ["stand", "arrive", "side"];
const STAGING = LESSON && CFG.vary ? pick(STAGINGS, 7) : "stand";
const SEATED = STAGING === "sit";
const LAY = STAGING === "sit" ? { lena: [-0.78, 0.85], braun: [0.78, 0.85] }
  : STAGING === "side" ? { lena: [-0.5, 0.75], braun: [0.52, 0.7] }
  : OPEN.has(SETTING) ? { lena: [-0.9, 0.3], braun: [0.9, -0.1] } : { lena: [-0.85, 0.45], braun: [1.3, -0.75] };
const YAW = STAGING === "sit" ? { lena: Math.PI / 2 - 0.7, braun: -Math.PI / 2 + 0.7 }
  : STAGING === "side" ? { lena: 0.32, braun: -0.32 } : { lena: Math.PI / 2 - 0.95, braun: -Math.PI / 2 + 0.95 };
const HY = SEATED ? -0.33 : 0;                         // head height offset for the camera

// the light of the day: key, fill from the sky, and a rim light that lifts people off the set
const TODS = SETTING === "park" ? ["day", "evening", "morning", "night"] : ["day", "evening", "morning"];
const TOD = LESSON && CFG.vary ? pick(TODS, 5) : "day";
const LIGHT = {
  day: { sky: 0xffffff, ground: 0xd9b48a, hemi: 1.15, sun: 0xfff2d6, sunI: 2.3, pos: [2.5, 4, 3.5], rim: 0xffffff, bg: 0x9fd3f2 },
  morning: { sky: 0xfff6ea, ground: 0xc9ad8a, hemi: 1.1, sun: 0xffe8cc, sunI: 2.2, pos: [-3.2, 2.6, 3.2], rim: 0xffe2b8, bg: 0xbfe0f0 },
  evening: { sky: 0xffe2cc, ground: 0x9a7a6a, hemi: 1.0, sun: 0xffb87a, sunI: 2.0, pos: [4, 1.9, 2.6], rim: 0xffb070, bg: 0xf2a66f },
  night: { sky: 0x9fb4ff, ground: 0x3a3050, hemi: 0.75, sun: 0xbcd0ff, sunI: 1.1, pos: [-2, 4, 3], rim: 0xffc070, bg: 0x1d2b52 },
}[TOD];
scene.add(new THREE.HemisphereLight(LIGHT.sky, LIGHT.ground, LIGHT.hemi));
const sun = new THREE.DirectionalLight(LIGHT.sun, LIGHT.sunI); sun.position.set(...LIGHT.pos); scene.add(sun);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -2.5, near: 0.5, far: 20 });
const rim = new THREE.DirectionalLight(LIGHT.rim, 0.9); rim.position.set(-1.5, 3, -4); scene.add(rim);
if (TOD === "evening" || TOD === "night") { const lampLight = new THREE.PointLight(0xffc070, TOD === "night" ? 2.2 : 1.2, 7, 1.6); lampLight.position.set(0, 2.4, 0.6); scene.add(lampLight); }

const cafe = SCENES[SETTING]();
if (SETTING === "park") { scene.background = new THREE.Color(LIGHT.bg); scene.fog = new THREE.Fog(LIGHT.bg, 12, 26); }
const lena = makeLena(LAY.lena), braun = makeBraun(LAY.braun);
lena.root.rotation.y = YAW.lena; braun.root.rotation.y = YAW.braun;
// people cast shadows on the set but take none on themselves (no dark blotches on faces)
for (const P of [lena, braun]) P.root.traverse((o) => { if (o.isMesh) o.receiveShadow = false; });
// seated: a chair under each, a small round table between them
if (SEATED) {
  for (const P of [lena, braun]) {
    const c = G(scene, [P.root.position.x, 0, P.root.position.z], [0, P.root.rotation.y, 0]);
    M(new THREE.BoxGeometry(0.46, 0.06, 0.44), 0x8e5a33, { p: [0, 0.46, 0.05], parent: c, ink: 0.008 });
    M(new THREE.BoxGeometry(0.46, 0.5, 0.05), 0x8e5a33, { p: [0, 0.74, -0.18], parent: c, ink: 0.008 });
    for (const [x, z] of [[-0.19, -0.13], [0.19, -0.13], [-0.19, 0.22], [0.19, 0.22]]) M(new THREE.CylinderGeometry(0.02, 0.02, 0.44, 8), 0x6b4226, { p: [x, 0.22, z], parent: c, ink: 0.004 });
  }
  const tx = (LAY.lena[0] + LAY.braun[0]) / 2, tz = LAY.lena[1] + 0.12;
  M(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 32), 0xf3ead8, { p: [tx, 0.74, tz], parent: scene, ink: 0.01 });
  M(new THREE.CylinderGeometry(0.04, 0.05, 0.72, 12), 0x39424f, { p: [tx, 0.37, tz], parent: scene, ink: 0.006 });
  M(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 20), 0x39424f, { p: [tx, 0.015, tz], parent: scene, ink: 0.006 });
  M(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 14), 0xffffff, { p: [tx - 0.15, 0.81, tz + 0.05], parent: scene, ink: 0.005 });
  M(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 14), 0xffffff, { p: [tx + 0.16, 0.81, tz - 0.02], parent: scene, ink: 0.005 });
}
// a soft blob under each person, so they stand on the floor
if (!CLEAR && !SEATED && STAGING !== "arrive") for (const P of [lena, braun]) { const sh = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 })); sh.rotation.x = -Math.PI / 2; sh.position.set(P.root.position.x, 0.06, P.root.position.z); scene.add(sh); }
// confetti for the goodbye: a fixed set of pieces, positions are pure functions of time
const CONF = []; for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.1), new THREE.MeshBasicMaterial({ color: [0xffce00, 0xdd0000, 0x2b1d16, 0xffffff, 0x3ac0c8][i % 5], side: THREE.DoubleSide })); m.visible = false; scene.add(m); CONF.push(m); }
const PEOPLE = { lena, braun };

// the approved looks (public/3d/characters.json, made with tools/character-editor): head size,
// body shape, height, and a colour light that keeps the toon shading (a multiply on each colour)
const LOOK_DEFAULT = { head: 1, body: 1, height: 1, tint: "#ffffff", tintAmt: 0 };
function applyLook(P, look) {
  const k = { ...LOOK_DEFAULT, ...(look || {}) };
  const hd = clamp(+k.head, 0.8, 1.35), bd = clamp(+k.body, 0.8, 1.25), ht = clamp(+k.height, 0.85, 1.15);
  P.root.scale.set(bd, ht, bd);
  P.head.scale.set(hd / bd, hd / ht, hd / bd);
  const light = new THREE.Color(1, 1, 1).lerp(new THREE.Color(k.tint), clamp(+k.tintAmt, 0, 0.6));
  P.root.traverse((o) => {
    const m = o.material; if (!m || !m.isMeshToonMaterial) return;
    if (!m.userData.base) m.userData.base = m.color.clone();
    m.color.copy(m.userData.base).multiply(light);
  });
}
for (const w of ["lena", "braun"]) if (CFG.looks && CFG.looks[w]) applyLook(PEOPLE[w], CFG.looks[w]);

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
const ARRIVE = STAGING === "arrive" ? [0.15, Math.min(2.3, HOOK - 1.2)] : null;   // Lena walks in
const HELLO = { braun: [0.6, HOOK - 0.2], lena: ARRIVE ? [ARRIVE[1] + 0.1, HOOK + 0.4] : [1.0, HOOK] }, BYE = { lena: [OUTRO + 0.3, TOTAL - 0.4], braun: [OUTRO + 0.5, TOTAL - 0.4] };
for (const w of ["lena", "braun"]) { acts[w].push({ t0: HELLO[w][0], t1: HELLO[w][1], type: "wave" }, { t0: BYE[w][0], t1: BYE[w][1], type: "wave" }); }
// the drill lessons say a silent hello; a dialogue lesson's first line is its own hello
if (!CFG.dialogue) {
  talk.braun.push({ t0: 0.9, dur: 0.7, text: "Hallo" }, { t0: OUTRO + 1.0, dur: 0.8, text: "Tschüss" });
  talk.lena.push({ t0: ARRIVE ? ARRIVE[1] + 0.3 : 1.5, dur: 0.7, text: "Hallo" }, { t0: OUTRO + 0.5, dur: 0.8, text: "Tschüss" });
} else talk.lena.push({ t0: OUTRO + 0.4, dur: 1.4, text: "Bis morgen tschüss" });

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

// Lena's walk in: position along the path, and how much she is walking (0..1)
function walkState(t) {
  if (!ARRIVE) return { k: 1, wk: 0 };
  const k = ss(ARRIVE[0], ARRIVE[1], t);
  return { k, wk: win(t, ARRIVE[0] - 0.05, ARRIVE[1] + 0.05, 0.25) };
}
function legs(w, P, t, wk, walkedDist) {
  const off = w === "lena" ? 0 : 1.7;
  for (const sx of [-1, 1]) {
    const L2 = P.legs[sx];
    if (SEATED) { rot(L2.hip, -86, sx * 4, sx * 3); rot(L2.knee, 84, 0, 0); rot(L2.ankle, 0, 0, 0); continue; }
    // standing: the weight moves slowly from one leg to the other, the free knee softens
    const shift = Math.sin(t * 0.45 + off);
    const free = Math.max(0, sx * shift);
    let hx = -3 * free, kx = 9 * free;
    // walking: the legs swing in opposite phase, the knee bends on the swing
    const ph = walkedDist * 5.4 + (sx > 0 ? Math.PI : 0);
    hx = hx * (1 - wk) + (-24 * Math.sin(ph)) * wk;
    kx = kx * (1 - wk) + (Math.max(0, Math.cos(ph)) * 42 + 4) * wk;
    rot(L2.hip, hx, 0, 0); rot(L2.knee, kx, 0, 0); rot(L2.ankle, -kx * 0.35, 0, 0);
  }
  if (!SEATED) P.body.position.x = 0.012 * Math.sin(t * 0.45 + off) * (1 - wk);
}
function act(w, P, t) {
  const other = w === "lena" ? "braun" : "lena", s = P.s;
  // where she is: the walk in (Lena, "arrive"), or seated
  let wk = 0, walked = 0;
  if (w === "lena" && ARRIVE) {
    const st = walkState(t), from = [LAY.lena[0] - 2.7, LAY.lena[1] + 0.35];
    P.root.position.x = from[0] + (LAY.lena[0] - from[0]) * st.k; P.root.position.z = from[1] + (LAY.lena[1] - from[1]) * st.k;
    wk = st.wk; walked = st.k * 2.72;
    P.root.rotation.y = YAW.lena + (Math.PI / 2 - 0.12 - YAW.lena) * (1 - ss(ARRIVE[1] - 0.35, ARRIVE[1] + 0.25, t));
  }
  P.root.position.y = SEATED ? -0.33 : 0;
  legs(w, P, t, wk, walked);
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
  const swing = 22 * wk * Math.sin(walked * 5.4);                  // arms swing against the legs
  rot(near.sh, sx + swing * s, 0, sz + s * 3); rot(near.el, ex - 12 * wk, 0, ez);
  const HANDOF = { wallet: "grip", watch: "flat", thumbs: "thumbs", chest: "flat", point: "point" };
  poseHand(near.hand, [...Object.entries(wts).map(([k, v]) => [HANDOF[k], v]), ["open", wave]], t, wave);
  rot(near.hand.h, wts.watch ? -25 * wts.watch : 0, 0, wave ? s * 10 * Math.sin(t * 13 + 1) * wave : 0);
  // far arm: explains along with the words
  const tw = isTalking(w, t) ? Math.max(...talk[w].map((x) => win(t, x.t0 - 0.1, x.t0 + x.dur + 0.15, 0.25))) : 0;
  const far = P.arms[-s];
  rot(far.sh, -(20 + 14 * Math.sin(t * 7.4)) * tw - swing * s + (SEATED ? -18 : 0), 0, -s * (3 + 5 * tw)); rot(far.el, -(14 + 10 * Math.sin(t * 7.4 + 1)) * tw - 12 * wk + (SEATED ? -40 : 0), 0, 0);
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
  // side by side: heads turn to whoever is talking; a slow drift keeps the head alive
  const turn = STAGING === "side" ? (w === "lena" ? 24 : -24) * Math.max(0, Math.max(...talk[other].map((x) => win(t, x.t0 - 0.2, x.t0 + x.dur + 0.3, 0.3))), 0) : 0;
  const drift = 2.5 * Math.sin(t * 0.63 + (w === "lena" ? 0 : 1.4)) + 1.5 * Math.sin(t * 1.37);
  rot(P.head, nod / D + 1.2 * Math.sin(t * 0.8), neg * 16 * Math.sin(t * 9) + turn + drift, (wts.chest ? -6 * wts.chest : 0) + neg * 3 * Math.sin(t * 9) + 1.5 * Math.sin(t * 0.52));
  P.body.rotation.y = 0.05 * Math.sin(t * 1.3 + (w === "lena" ? 0 : 2)) * 1 + 0.07 * tw * Math.sin(t * 2.6);
  P.body.rotation.x = 0.035 * tw + 0.05 * neg;
  // brows raise while talking or listening; one brow goes up on a question (the showcase face)
  P.brows.position.y = 0.012 * Math.max(tw, react * 0.6);
  let q = 0; for (const x of talk[w]) if (/\?\s*$/.test(x.text)) q = Math.max(q, win(t, x.t0, x.t0 + x.dur + 0.3, 0.2));
  if (!P.brow0) P.brow0 = P.brows.children.map((b) => b.position.y);
  P.brows.children.forEach((b, i) => { b.position.y = P.brow0[i] + (i === 1 ? 0.03 * q : -0.004 * q) - 0.008 * neg; });
  // a side glance at the speaker while listening
  if (!P.iris0) P.iris0 = P.irises.map((ir) => ir.position.x);
  let listen = 0; for (const x of talk[other]) listen = Math.max(listen, win(t, x.t0 - 0.1, x.t0 + x.dur + 0.2, 0.25));
  // small eye jumps (saccades) every second or two, like a real gaze
  const beat = Math.floor((t + (w === "lena" ? 0 : 0.7)) / 1.35), sac = [rnd(beat * 3 + 1) - 0.5, rnd(beat * 3 + 2) - 0.5];
  P.irises.forEach((ir, i) => { ir.position.x = P.iris0[i] + (w === "lena" ? 0.012 : -0.012) * listen * (1 - tw) + 0.008 * sac[0]; ir.position.y = 0.31 + 0.006 * sac[1]; });
  // face: blink, mouth
  const b = blinkAmt(t, w === "lena" ? 0 : 1.1);
  for (const lid of P.lids) lid.scale.y = Math.max(0.001, b);
  const shape = mouthShape(w, t);
  P.mouth[0].visible = shape === 0; P.mouth[1].visible = shape === 1; P.mouth[2].visible = shape === 2;
  // a small smirk right after each own sentence
  let smirk = 0; for (const x of talk[w]) smirk = Math.max(smirk, win(t, x.t0 + x.dur + 0.05, x.t0 + x.dur + 0.9, 0.2));
  P.mouth[0].rotation.z = Math.PI - 0.24 * smirk; P.mouth[0].position.x = 0.014 * smirk;
  P.body.position.y = 0.006 * Math.sin((t * 2 * Math.PI) / (w === "lena" ? 1.7 : 2.1)) + 0.022 * wk * Math.abs(Math.sin(walked * 5.4));
  if (P.extra.pony) P.extra.pony.rotation.x = (0.5 + 0.12 * Math.sin(t * 2.4)) ;
}

// camera: wide in the hook, then each speaker framed in turn, wide again for the goodbye
// camera language: classic (moves between speakers), over the shoulder, hard cuts, or a slow dolly
const CAM = LESSON && CFG.vary ? pick(["classic", "ots", "cuts", "dolly"], 3) : "classic";
const over = (sp, li) => {                               // behind the listener's shoulder, looking at the speaker
  const dx = li[0] - sp[0], dz = li[1] - sp[1], n = Math.hypot(dx, dz) || 1;
  return { p: [li[0] + (dx / n) * 0.75 + (dz / n) * 0.3, 1.62 + HY, li[1] + (dz / n) * 0.75 + 1.1], l: [sp[0], 1.5 + HY, sp[1]] };
};
const SH = CAM === "ots"
  ? { wide: { p: [0.3, 1.5 + HY, 5.4], l: [0.2, 1.1 + HY, 0] }, lena: over(LAY.lena, LAY.braun), braun: over(LAY.braun, LAY.lena) }
  : {
    wide: { p: [0.3, 1.5 + HY, 5.4], l: [0.2, 1.1 + HY, 0] },
    lena: { p: [LAY.lena[0] + 0.75, 1.6 + HY, LAY.lena[1] + 2.25], l: [LAY.lena[0] + 0.05, 1.42 + HY, LAY.lena[1]] },
    braun: { p: [LAY.braun[0] - 0.5, 1.6 + HY, Math.max(LAY.braun[1] + 2.4, 1.7)], l: [LAY.braun[0], 1.5 + HY, LAY.braun[1]] },
  };
const EASE = CAM === "cuts" ? 0.04 : 0.6;
const mix = (A, B, k) => ({ p: A.p.map((v, i) => v + (B.p[i] - v) * k), l: A.l.map((v, i) => v + (B.l[i] - v) * k) });
let VIEW = null;                              // the editor: a fixed full-body shot of one person
function cameraAt(t) {
  if (VIEW) {
    const who = VIEW.who === "braun" ? LAY.braun : VIEW.who === "lena" ? LAY.lena : null, z = VIEW.zoom || 1;
    const at = who ? [who[0], 1.08, who[1]] : [0.2, 1.08, 0];
    camera.position.set(at[0] + (who ? 0.15 : 0.1), 1.25, at[2] + (who ? 4.9 : 6.2) / z); camera.lookAt(...at); return;
  }
  let c = SH.wide;
  for (const l of L) c = mix(c, SH[l.who], ss(l.t - EASE + 0.1, l.t + 0.1, t));
  c = mix(c, SH.wide, ss(OUTRO, OUTRO + EASE, t));
  if (CAM === "dolly") c = { p: [c.p[0] + 0.45 * Math.sin(t * 0.22), c.p[1] + 0.08 * Math.sin(t * 0.17), c.p[2] + 0.2 * Math.cos(t * 0.22)], l: c.l };
  // a slow push in while a sentence is spoken
  let push = 0; for (const l of L) { const end = l.t + l.dur + (l.again ? l.again.gap + l.again.dur : 0) + 0.4; push = Math.max(push, ss(l.t - 0.3, end, t) * (1 - ss(end, end + 0.35, t))); }
  c = { p: [c.p[0], c.p[1], c.p[2] - 0.32 * push], l: c.l };
  camera.position.set(c.p[0] + Math.sin(t * 0.5) * 0.03, c.p[1] + Math.sin(t * 0.37) * 0.02, c.p[2]);
  camera.lookAt(c.l[0], c.l[1], c.l[2]);
}

function renderAt(t) {
  act("lena", lena, t); act("braun", braun, t);
  cafe.lamps.forEach((g, i) => { g.rotation.z = Math.sin(t * 0.9 + i) * 0.03; });
  cafe.update(t);
  const ct = t - (OUTRO + 0.3);
  CONF.forEach((m, i) => {
    const on = ct > 0 && ct < 3.2; m.visible = on; if (!on) return;
    const sp = 0.9 + rnd(i) * 0.7; m.position.set(-2.6 + rnd(i + 90) * 5.6 + Math.sin(ct * 2 + i) * 0.15, 3.9 - ct * sp - rnd(i + 200) * 0.6, -0.4 + rnd(i + 300) * 2.2);
    m.rotation.set(ct * (2 + rnd(i + 5) * 3), ct * (1 + rnd(i + 9) * 2), 0);
  });
  cameraAt(t);
  renderer.render(scene, camera);
}
window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady.toon = Promise.resolve();
// a film with its own acting (public/3d/toon-showcase.js) sets window.__toonDriver
window.addEventListener("hf-seek", (ev) => (window.__toonDriver || renderAt)(ev.detail.time));
window.__toonKit = { THREE, scene, camera, renderer, PEOPLE, LAY, applyLook, poseHand, rot, M, G, sph, cap, clamp, ss, win, D, blinkAmt };
// hooks for tools/character-editor (never used by a lesson render)
window.__toonEditor = { applyLook: (w, look) => applyLook(PEOPLE[w], look), view: (v) => { VIEW = v; }, render: renderAt };
renderAt(window.__hfThreeTime || 0);
