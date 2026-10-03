// EasyDeutsch dialogue lessons with real-looking people (owner, 2026-10-03: "3D, but it
// looks very fake now"). Two Ready Player Me avatars, each playing the Ready Player Me
// animation library's own motion capture on its own skeleton (no retargeting, so no robot
// look): Lena = brunette.glb (met4citizen/TalkingHead, created at Ready Player Me,
// CC BY-NC 4.0), Herr Braun = readyplayer.me.glb (three.js examples). Faces: visemes on
// every vowel, blinks, smiles, brows; heads turn to whoever talks. Sets with physically
// based materials and film lighting (ACES). Everything is a pure function of time
// (HyperFrames Three.js adapter: hf-seek, mixers seeked and never played).
// The lesson comes in window.__toon = { lines, hookDur, outroAt, total, setting, vary }.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const CFG = window.__toon;
const MODELS = "public/3d/models/";
const canvas = document.getElementById("three-stage");
const W = canvas.width || 1080, H = canvas.height || 1080;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 60);

// ------------------------------------------------------------------ helpers
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ss = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const win = (t, a, b, f = 0.3) => ss(a, a + f, t) * (1 - ss(b - f, b, t));
const SEED = Math.abs(Math.round(+((CFG.vary && CFG.vary.seed) || 0)));
const pick = (list, k) => list[(SEED * k) % list.length];
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });
function box(w, h, d, color, x, y, z, o) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), color && color.isMaterial ? color : mat(color, o));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
}
function cyl(rt, rb, h, color, x, y, z, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
}
function panel(w, h, x, y, z, draw, rotY = 0) {
  const c = document.createElement("canvas"); c.width = Math.round(512 * w / h); c.height = 512;
  draw(c.getContext("2d"), c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
  m.position.set(x, y, z); m.rotation.y = rotY; scene.add(m); return m;
}
const board = (bg, frame) => (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = frame; g.lineWidth = 26; g.strokeRect(0, 0, w, h); };
function rows(g, w, title, lines, { color = "#F6EBD0", accent = "#FFD27A", font = "bold 40px sans-serif" } = {}) {
  g.fillStyle = "#FFFFFF"; g.font = "bold 54px sans-serif"; g.textAlign = "center"; g.fillText(title, w / 2, 84);
  g.font = font;
  lines.forEach(([a, b], i) => { g.textAlign = "left"; g.fillStyle = color; g.fillText(a, 48, 170 + i * 76); if (b) { g.textAlign = "right"; g.fillStyle = accent; g.fillText(b, w - 48, 170 + i * 76); } });
}
function plant(x, z, s = 1) {
  cyl(0.16 * s, 0.12 * s, 0.34 * s, 0xb0603a, x, 0.17 * s, z);
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9, r = 0.12 * s;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 12, 10), mat(0x3f8f55));
    leaf.scale.set(0.6, 1.25, 0.35); leaf.position.set(x + Math.cos(a) * r, 0.52 * s + (i % 3) * 0.12 * s, z + Math.sin(a) * r);
    leaf.rotation.set(Math.sin(a) * 0.5, a, Math.cos(a) * 0.5); leaf.castShadow = true; scene.add(leaf);
  }
}
function tree(x, z, s = 1) {
  cyl(0.09 * s, 0.13 * s, 1.6 * s, 0x6b4a33, x, 0.8 * s, z, 12);
  [[0, 1.9, 0, 0.75], [0.35, 1.7, 0.1, 0.55], [-0.3, 1.75, -0.1, 0.55], [0.05, 2.3, 0, 0.5]].forEach(([dx, y, dz, r]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r * s, 16, 12), mat(0x3e8a4f, { roughness: 0.9 }));
    m.position.set(x + dx * s, y * s, z + dz * s); m.castShadow = true; scene.add(m);
  });
}
const lamps = [];
function pendant(x, z, shade = 0xffb02e) {
  const g = new THREE.Group();
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.4, 6), mat(0x111111)); cord.position.y = 0.7; g.add(cord);
  g.add(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 32, 1, true), mat(shade, { side: THREE.DoubleSide, roughness: 0.5 })));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c4 })); bulb.position.y = -0.08; g.add(bulb);
  const light = new THREE.PointLight(0xffc27a, 2.4, 5, 1.6); light.position.y = -0.12; g.add(light);
  g.position.set(x, 3.0, z); scene.add(g); lamps.push(g);
}
function room(wall, floor, trim) {
  scene.background = new THREE.Color(wall).multiplyScalar(0.55);
  scene.fog = new THREE.Fog(scene.background, 8, 15);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), mat(floor, { roughness: 0.7 })); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f);
  const w = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), mat(wall, { roughness: 0.92 })); w.position.set(0, 4, -2.2); w.receiveShadow = true; scene.add(w);
  box(20, 0.12, 0.04, trim, 0, 0.06, -2.18);
}
function counter(front, top, sign) {
  box(2.2, 1.05, 0.7, front, 1.15, 0.525, 0.05);
  box(2.3, 0.06, 0.8, top, 1.15, 1.08, 0.05, { roughness: 0.3 });
  if (sign) panel(1.2, 0.3, 1.15, 0.7, 0.405, (g, w, h) => { g.fillStyle = sign.bg; g.fillRect(0, 0, w, h); g.fillStyle = sign.fg; g.font = "bold 300px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(sign.text, w / 2, h / 2 + 10); });
}

// ------------------------------------------------------------------ the sets (one per lesson topic)
const SETS = {
  cafe() {
    room(0x8a6450, 0x6b4630, 0x3b2e2a);
    panel(1.5, 1.125, -1.3, 2.35, -2.17, (g, w, h) => { board("#26312c", "#8a5a3c")(g, w, h); rows(g, w, "SPEISEKARTE", [["Kaffee", "2,50 €"], ["Tee", "2,00 €"], ["Kuchen", "3,50 €"], ["Wasser", "1,80 €"]]); });
    counter(0x7a4a2c, 0x3a2418);
    box(0.5, 0.42, 0.34, 0xb8c0cc, 1.95, 1.32, -0.05, { metalness: 0.7, roughness: 0.3 });
    cyl(0.05, 0.04, 0.1, 0xffffff, 0.55, 1.16, 0.2);
    pendant(-0.6, 0.1); pendant(1.2, 0.1);
  },
  station() {
    room(0x3d4a5c, 0x8a8d90, 0x2a3340);
    panel(2.2, 1.0, -1.1, 2.4, -2.17, (g, w, h) => { board("#10161f", "#39424f")(g, w, h); rows(g, w, "ABFAHRT", [["10:15  Berlin Hbf", "Gl. 3"], ["10:32  München", "Gl. 5"], ["10:48  Hamburg", "Gl. 1"], ["11:05  Köln", "Gl. 4"]], { color: "#FFE9A8", accent: "#9FE3FF", font: "bold 42px monospace" }); });
    counter(0x2f4f7a, 0x1d2c44, { text: "Fahrkarten", bg: "#1d2c44", fg: "#ffffff" });
    const clock = cyl(0.3, 0.3, 0.05, 0xffffff, 1.4, 2.6, -2.12, 40); clock.rotation.x = Math.PI / 2;
  },
  shop() {
    room(0xe9e2d0, 0xbfa67f, 0x9e6f45);
    const colors = [0xe0503a, 0x3a7fd0, 0xf2c14e, 0x4f9e5a, 0x833ab4, 0xf77737];
    for (let s = 0; s < 3; s++) { box(2.6, 0.05, 0.4, 0x9e6f45, -1.2, 0.9 + s * 0.6, -1.95); for (let k = 0; k < 9; k++) box(0.2, 0.36, 0.22, colors[(k + s * 2) % colors.length], -2.35 + k * 0.28, 1.11 + s * 0.6, -1.9); }
    counter(0xb98556, 0x7a5a3a, { text: "Kasse", bg: "#7a5a3a", fg: "#ffffff" });
    box(0.36, 0.26, 0.3, 0x2a2433, 1.7, 1.24, 0.05);
  },
  doctor() {
    room(0xdfeef0, 0xcfd8dc, 0x9ab0b6);
    panel(1.0, 0.5, -1.2, 2.3, -2.17, (g, w, h) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); g.fillStyle = "#1fa971"; g.fillRect(w / 2 - 170, 70, 110, 340); g.fillRect(w / 2 - 280, 185, 330, 110); g.fillStyle = "#1d2c44"; g.font = "bold 110px sans-serif"; g.textAlign = "left"; g.fillText("Praxis", w / 2 + 80, 290); });
    counter(0xffffff, 0x9ab0b6, { text: "Anmeldung", bg: "#1fa971", fg: "#ffffff" });
    plant(-2.3, -1.6, 1.3);
  },
  school() {
    room(0xf1e6c8, 0xa98a62, 0x6b4a33);
    panel(2.4, 1.2, -0.9, 2.3, -2.17, (g, w, h) => { g.fillStyle = "#f7f9fb"; g.fillRect(0, 0, w, h); g.strokeStyle = "#8a96a3"; g.lineWidth = 20; g.strokeRect(0, 0, w, h); g.fillStyle = "#1d4fa0"; g.font = "bold 90px sans-serif"; g.textAlign = "left"; g.fillText("Deutsch A1", 60, 130); g.fillStyle = "#333"; g.font = "60px sans-serif"; g.fillText("der · die · das", 60, 250); g.fillText("ich bin · du bist", 60, 350); });
    counter(0x8e5a3a, 0x6b4a33);
  },
  work() {
    room(0xd8dde3, 0x6f7b87, 0x4a5561);
    for (let i = 0; i < 6; i++) box(0.08, 1.4, 0.02, 0xf0f3f6, -2.2 + i * 0.3, 2.1, -2.16);
    box(1.9, 1.5, 0.02, 0xbfe3f2, -1.45, 2.1, -2.18);
    counter(0xe7ebef, 0x3a4552);
    box(0.6, 0.38, 0.04, 0x1a1f26, 1.5, 1.35, -0.1); box(0.08, 0.2, 0.08, 0x1a1f26, 1.5, 1.15, -0.1);
    plant(-2.4, -1.5, 1.2);
  },
  park() {
    scene.background = new THREE.Color(0x9fd3f2); scene.fog = new THREE.Fog(0x9fd3f2, 9, 20);
    const g = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), mat(0x5e9e4a, { roughness: 1 })); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(30, 1.6), mat(0xc9b28a, { roughness: 1 })); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.005, 0.4); path.receiveShadow = true; scene.add(path);
    tree(-2.4, -2.2, 1.2); tree(1.9, -2.8, 1.4); tree(-0.4, -3.6, 1.1); tree(3.2, -1.6, 1);
    box(1.4, 0.06, 0.4, 0x8a5a3a, 2.2, 0.45, -0.9); box(1.4, 0.4, 0.05, 0x8a5a3a, 2.2, 0.7, -1.08);
  },
  bureau() {
    room(0xe6e2d6, 0x9aa3ab, 0x5c6670);
    panel(1.6, 0.45, -1.2, 2.6, -2.17, (g, w, h) => { g.fillStyle = "#1d2c44"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.font = "bold 190px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Bürgeramt", w / 2, h / 2 + 8); });
    counter(0x5c6670, 0x3a4552, { text: "Schalter 3", bg: "#3a4552", fg: "#ffffff" });
    box(0.3, 1.2, 0.3, 0xd0d4d8, -2.4, 0.6, -1.4);
  },
  home() {
    room(0xeadfcc, 0xb98556, 0x9e6f45);
    box(1.8, 1.3, 0.02, 0xcdebfa, -1.2, 2.0, -2.18);
    box(1.9, 0.08, 0.1, 0xffffff, -1.2, 1.33, -2.14); box(0.06, 1.3, 0.04, 0xffffff, -1.2, 2.0, -2.15);
    box(2.2, 0.45, 0.8, 0x5e9e8c, 2.0, 0.35, -1.5); box(2.2, 0.6, 0.2, 0x4c8373, 2.0, 0.75, -1.85);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), mat(0xe7a78c, { roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(0.2, 0.004, 0.3); rug.receiveShadow = true; scene.add(rug);
    plant(-2.5, -1.4, 1.3); pendant(0.3, 0.2, 0xe0b25a);
  },
};
SETS.office = SETS.bureau;
const SETTING = SETS[CFG.setting] ? CFG.setting : "cafe";
SETS[SETTING]();
const OPEN = new Set(["home", "park"]);              // no counter: he stands facing her
const HIM = OPEN.has(SETTING) ? { x: 0.75, z: -0.05, rotY: -Math.PI / 2 + 0.6 } : { x: 1.2, z: -0.55, rotY: -Math.PI / 2 + 0.8 };
const HER = { x: -0.6, z: 0.6, rotY: Math.PI / 2 - 0.55 };

// the light of the day (neighbouring episodes always differ)
const TOD = pick(SETTING === "park" ? ["day", "evening", "morning"] : ["day", "evening", "morning"], 5);
const LIGHT = {
  day: { sky: 0xfff4e6, ground: 0x3a2a22, hemi: 1.1, key: 0xfff0dc, keyI: 2.3, pos: [-2.5, 4.5, 3.5], rim: 0x9fc4ff },
  morning: { sky: 0xfff6ea, ground: 0x4a3a2e, hemi: 1.0, key: 0xffe6c4, keyI: 2.4, pos: [-3.5, 2.8, 3.2], rim: 0xffd9a8 },
  evening: { sky: 0xffdcc0, ground: 0x2e2220, hemi: 0.85, key: 0xffb27a, keyI: 2.1, pos: [3.5, 2.2, 2.8], rim: 0xffa060 },
}[TOD];
scene.add(new THREE.HemisphereLight(LIGHT.sky, LIGHT.ground, SETTING === "park" ? LIGHT.hemi * 1.35 : LIGHT.hemi));
const key = new THREE.DirectionalLight(LIGHT.key, LIGHT.keyI); key.position.set(...LIGHT.pos); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -2, near: 0.5, far: 20 });
scene.add(key);
const rim = new THREE.DirectionalLight(LIGHT.rim, 1.0); rim.position.set(2.5, 3.2, -3.5); scene.add(rim);
const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(0, 1.6, 4); scene.add(fill);   // soft light on the faces

// ------------------------------------------------------------------ people
const boneMap = (root) => { const b = {}; root.traverse((o) => { if (o.isBone) b[o.name] = o; }); return b; };
const faces = (root) => { const f = []; root.traverse((o) => { if (o.morphTargetDictionary) f.push(o); }); return f; };
const prep = (root) => root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
function dress(root) {                       // Herr Braun: no hat, a dark suit instead of the stock pink one
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (/Headwear/.test(o.name)) o.visible = false;
    if (/Outfit_(Top|Bottom)/.test(o.name)) {
      o.material = o.material.clone();
      o.material.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
          float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          vec3 cloth = mix(vec3(0.035, 0.04, 0.055), vec3(0.11, 0.12, 0.15), smoothstep(0.05, 0.35, lum));
          diffuseColor.rgb = mix(cloth, vec3(0.93), smoothstep(0.55, 0.8, lum));`);
      };
    }
  });
}
const FEM = ["F_Standing_Idle_001", "F_Talking_Variations_001", "F_Talking_Variations_002", "F_Talking_Variations_003", "F_Talking_Variations_004", "F_Talking_Variations_005", "F_Talking_Variations_006"];
const MASC = ["M_Standing_Idle_001", "M_Standing_Expressions_011", "M_Talking_Variations_001", "M_Talking_Variations_002", "M_Talking_Variations_003", "M_Talking_Variations_004", "M_Talking_Variations_005", "M_Talking_Variations_006"];
const people = {};
const loader = new GLTFLoader();
const load = (u) => loader.loadAsync(MODELS + u);
function cast(gltf, clips, where) {
  const root = gltf.scene; prep(root);
  root.position.set(where.x, 0, where.z); root.rotation.y = where.rotY; scene.add(root);
  const mixer = new THREE.AnimationMixer(root), a = {};
  clips.forEach((g, i) => { const act = mixer.clipAction(g.animations[0]); act.play(); act.setEffectiveWeight(i === 0 ? 1 : 0); a[i] = act; });
  const bones = boneMap(root);
  return { root, mixer, a, n: clips.length, faces: faces(root), bones, eyes: [root.getObjectByName("EyeLeft"), root.getObjectByName("EyeRight")], where };
}
window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady.people = Promise.all([
  load("brunette.glb"), load("readyplayer.me.glb"),
  ...FEM.map((n) => load(`anim/fem/${n}.glb`)), ...MASC.map((n) => load(`anim/masc/${n}.glb`)),
]).then(([her, him, ...clips]) => {
  dress(him.scene);
  people.lena = cast(her, clips.slice(0, FEM.length), HER);
  people.braun = cast(him, clips.slice(FEM.length), HIM);
  people.braun.greet = 1; people.braun.talk0 = 2; people.lena.talk0 = 1;
  renderAt(window.__hfThreeTime || 0);
});

// ------------------------------------------------------------------ the lesson as time windows
const L = (CFG.lines || []).filter((l) => l.who === "lena" || l.who === "braun");
const HOOK = CFG.hookDur || 3, OUTRO = CFG.outroAt || 10, TOTAL = CFG.total || 12;
const talkOf = { lena: [], braun: [] };
L.forEach((l, i) => talkOf[l.who].push({ t0: l.t, t1: l.t + l.dur, text: l.de || "", q: /\?\s*$/.test(l.de || ""), i }));
talkOf.lena.push({ t0: OUTRO + 0.4, t1: OUTRO + 1.8, text: "Bis morgen, tschüss", i: 99 });
const BLINK_GAP = [3.1, 4.3, 2.6, 5.2, 3.7, 2.9];
function blinkAt(t, shift) {
  let b = shift, i = 0, v = 0;
  while (b < t + 0.2) { const d = Math.abs(t - b); if (d < 0.08) v = Math.max(v, 1 - d / 0.08); b += BLINK_GAP[i++ % BLINK_GAP.length]; }
  return v;
}
// a viseme for each vowel group of the line, the mouth closing a little between syllables
const VIS = (v) => (/[ou]/.test(v) && !/[ie]/.test(v) ? (/u/.test(v) ? "viseme_U" : "viseme_O") : /[iü]/.test(v) ? "viseme_I" : /[eä]/.test(v) ? "viseme_E" : "viseme_aa");
function mouthAt(who, t) {
  for (const x of talkOf[who]) {
    if (t < x.t0 || t > x.t1) continue;
    const vowels = String(x.text).toLowerCase().match(/[aeiouäöü]+/g) || ["a"], step = (x.t1 - x.t0) / vowels.length;
    const k = Math.min(vowels.length - 1, Math.floor((t - x.t0) / step)), ph = ((t - x.t0) / step) % 1;
    const open = Math.sin(Math.PI * clamp(ph * 1.15, 0, 1)) * win(t, x.t0, x.t1, 0.06);
    return { open, vis: VIS(vowels[k]) };
  }
  return { open: 0, vis: null };
}
const tw = (who, t, pre = 0.15, post = 0.25) => Math.max(0, ...talkOf[who].map((x) => win(t, x.t0 - pre, x.t1 + post, 0.3)));
const put = (m, n, v) => { const i = m.morphTargetDictionary[n]; if (i != null) m.morphTargetInfluences[i] = v; };
const VISEMES = ["viseme_aa", "viseme_E", "viseme_I", "viseme_O", "viseme_U", "viseme_PP"];

function act(who, p, t) {
  const other = who === "lena" ? "braun" : "lena";
  // body: idle, a talking variation per line (they change from line to line), his greeting
  const lines = talkOf[who];
  let talkW = 0, talkK = p.talk0, talkT = 0;
  for (const x of lines) { const w = win(t, x.t0 - 0.25, x.t1 + 0.45, 0.4); if (w > talkW) { talkW = w; talkK = p.talk0 + (x.i % (p.n - p.talk0)); talkT = t - x.t0 + 0.4 + (x.i % 3) * 0.7; } }
  const greet = p.greet ? Math.max(win(t, 0.3, Math.max(1.5, HOOK - 0.2), 0.4), win(t, OUTRO + 0.4, TOTAL - 0.3, 0.4)) : 0;
  for (let i = 0; i < p.n; i++) p.a[i].setEffectiveWeight(0);
  const g = Math.min(greet, 1 - talkW);
  if (p.greet) { p.a[p.greet].setEffectiveWeight(g); p.a[p.greet].time = clamp(t < OUTRO ? t - 0.3 : t - OUTRO - 0.4, 0, p.a[p.greet].getClip().duration - 0.01); }
  // the talking mocap is mixed with the idle (0.65 / 0.35): calmer, everyday gestures
  const tk = talkW * 0.65;
  p.a[talkK].setEffectiveWeight(tk); p.a[talkK].time = talkT % p.a[talkK].getClip().duration;
  p.a[0].setEffectiveWeight(Math.max(0, 1 - tk - g)); p.a[0].time = (t + (who === "lena" ? 0 : 1.7)) % p.a[0].getClip().duration;
  p.mixer.update(0);
  // the head turns a little more to whoever speaks, and nods when the other one finishes
  const listen = tw(other, t, 0.2, 0.4) * (1 - tw(who, t));
  let react = 0; for (const x of talkOf[other]) react = Math.max(react, win(t, x.t1 - 0.2, x.t1 + 0.7, 0.25));
  const head = p.bones.Head, neck = p.bones.Neck;
  if (head) head.rotateY((who === "lena" ? 0.12 : -0.12) * listen);
  if (neck) neck.rotateX(0.08 * react * Math.sin(Math.PI * clamp((t % 1) * 1.3, 0, 1)));
  // face
  const { open, vis } = mouthAt(who, t);
  const blink = blinkAt(t, who === "lena" ? 0.6 : 1.9);
  let smile = 0; for (const x of lines) smile = Math.max(smile, win(t, x.t1 + 0.05, x.t1 + 1.1, 0.25));
  smile = Math.max(smile * 0.55, react * 0.35, greet * 0.6, ss(OUTRO, OUTRO + 0.6, t) * 0.6);
  let q = 0; for (const x of lines) if (x.q) q = Math.max(q, win(t, x.t0, x.t1 + 0.3, 0.2));
  const talking = tw(who, t, 0, 0.1);
  for (const m of p.faces) {
    if (m.morphTargetDictionary.viseme_aa != null) {
      for (const v of VISEMES) put(m, v, 0);
      if (vis) put(m, vis, open * 0.75);
      put(m, "viseme_PP", talking * (1 - open) * 0.25);
      put(m, "jawOpen", open * 0.22);
      put(m, "mouthSmileLeft", smile * 0.55); put(m, "mouthSmileRight", smile * 0.55);
      put(m, "cheekSquintLeft", smile * 0.3); put(m, "cheekSquintRight", smile * 0.3);
      put(m, "eyeBlinkLeft", blink); put(m, "eyeBlinkRight", blink);
      put(m, "browInnerUp", 0.35 * q + 0.15 * talking); put(m, "browOuterUpLeft", 0.3 * q); put(m, "browOuterUpRight", 0.3 * q);
      put(m, "eyeLookOutLeft", who === "lena" ? 0 : 0.18 * listen); put(m, "eyeLookInRight", who === "lena" ? 0 : 0.18 * listen);
      put(m, "eyeLookInLeft", who === "lena" ? 0.18 * listen : 0); put(m, "eyeLookOutRight", who === "lena" ? 0.18 * listen : 0);
    } else {
      put(m, "mouthOpen", open * 0.8); put(m, "mouthSmile", smile * 0.7);
    }
  }
  // his avatar has no blink shape: the eyes close by squashing them for the blink
  if (who === "braun") for (const e of p.eyes) if (e) e.scale.y = 1 - 0.9 * blink;
}

// ------------------------------------------------------------------ camera: hard cuts between real shots
const CAM = pick(["cuts", "ots", "glide"], 3);
const headPos = (who) => (who === "lena" ? [HER.x, 1.58, HER.z] : [HIM.x, 1.66, HIM.z]);
const SH = {
  wide: { p: [0.15, 1.55, 4.8], l: [0.3, 1.2, 0] },
  two: { p: [-0.1, 1.5, 3.6], l: [0.3, 1.3, 0.1] },
  lena: CAM === "ots" ? { p: [HIM.x + 0.55, 1.68, HIM.z + 0.9], l: headPos("lena") } : { p: [HER.x + 0.95, 1.62, HER.z + 1.75], l: [HER.x + 0.05, 1.5, HER.z] },
  braun: CAM === "ots" ? { p: [HER.x - 0.5, 1.66, HER.z + 0.95], l: headPos("braun") } : { p: [HIM.x - 0.95, 1.7, HIM.z + 1.85], l: [HIM.x, 1.56, HIM.z] },
};
const mix = (A, B, k) => ({ p: A.p.map((v, i) => v + (B.p[i] - v) * k), l: A.l.map((v, i) => v + (B.l[i] - v) * k) });
function cameraAt(t) {
  const ease = CAM === "glide" ? 0.6 : 0.04;
  let c = SH.wide;
  c = mix(c, SH.two, ss(HOOK - 0.6, HOOK - 0.6 + ease, t));
  for (const l of L) c = mix(c, SH[l.who], ss(l.t - 0.35, l.t - 0.35 + ease, t));
  c = mix(c, SH.wide, ss(OUTRO, OUTRO + ease, t));
  // a slow push in on every shot, and a breath of hand-held movement
  let since = t; for (const l of L) if (t >= l.t - 0.35) since = t - (l.t - 0.35);
  const push = Math.min(0.25, since * 0.05);
  const dir = new THREE.Vector3(c.l[0] - c.p[0], c.l[1] - c.p[1], c.l[2] - c.p[2]).normalize();
  camera.position.set(c.p[0] + dir.x * push + Math.sin(t * 0.7) * 0.012, c.p[1] + dir.y * push + Math.sin(t * 0.53) * 0.008, c.p[2] + dir.z * push);
  camera.lookAt(c.l[0], c.l[1], c.l[2]);
}

function renderAt(t) {
  if (people.lena && people.braun) { act("lena", people.lena, t); act("braun", people.braun, t); }
  lamps.forEach((l, i) => { l.rotation.z = Math.sin(t * 0.9 + i) * 0.02; });
  cameraAt(t);
  renderer.render(scene, camera);
}
window.addEventListener("hf-seek", (ev) => renderAt(ev.detail.time));
window.__humanStage = { render: renderAt, people };
renderAt(window.__hfThreeTime || 0);
