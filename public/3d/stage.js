// The 3D lesson stage: two human characters in a set that fits the topic.
//
// Owner, 2026-09-28: the characters must look and move like real people — a
// well-dressed woman and a classy receptionist, not robots; the hello must be
// a natural gesture, not an arm over the head. So:
//
//   her  avaturn.glb (black suit, white shirt). Her body plays motion-captured
//        Mixamo clips from a hidden Xbot rig, retargeted every frame by bone
//        direction (the rigs have different rest poses). Face: ARKit and
//        viseme blend shapes (lips, blinks, brows, smile).
//   him  a Ready Player Me avatar in a charcoal suit (the hat and the pink
//        suit of the stock model replaced), playing the Ready Player Me
//        library's own mocap: an idle, a hand-on-the-chest greeting with a
//        slight bow, and calm talking gestures.
//
// Everything is a pure function of composition time (HyperFrames Three.js
// adapter: hf-seek + window.__hfThreeTime, mixers seeked, never played).
// The builder (lib/build-3d.mjs) passes the lesson in window.__stage3d.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const CFG = window.__stage3d;
const M = "public/3d/models/";
const canvas = document.getElementById("three-stage");
const W = canvas.width, H = canvas.height;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 60);

// ------------------------------------------------------------------ helpers
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ss = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const win = (t, a, b, f = 0.3) => ss(a, a + f, t) * (1 - ss(b - f, b, t));
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });
function box(w, h, d, color, x, y, z, o) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), color.isMaterial ? color : mat(color, o));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
}
function cyl(rt, rb, h, color, x, y, z, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
}
// a flat panel with real text on it (a canvas texture, drawn once)
function panel(w, h, x, y, z, draw, rotY = 0) {
  const c = document.createElement("canvas"); c.width = Math.round(512 * w / h); c.height = 512;
  const g = c.getContext("2d"); draw(g, c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
  m.position.set(x, y, z); m.rotation.y = rotY; scene.add(m); return m;
}
const board = (bg, frame) => (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = frame; g.lineWidth = 26; g.strokeRect(0, 0, w, h); };
function rows(g, w, title, lines, { color = "#F6EBD0", accent = "#FFD27A", font = "bold 40px sans-serif" } = {}) {
  g.fillStyle = "#FFFFFF"; g.font = "bold 54px sans-serif"; g.textAlign = "center"; g.fillText(title, w / 2, 84);
  g.font = font;
  lines.forEach(([a, b], i) => {
    g.textAlign = "left"; g.fillStyle = color; g.fillText(a, 48, 170 + i * 76);
    if (b) { g.textAlign = "right"; g.fillStyle = accent; g.fillText(b, w - 48, 170 + i * 76); }
  });
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
  const sh = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 32, 1, true), mat(shade, { side: THREE.DoubleSide, roughness: 0.5 })); g.add(sh);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c4 })); bulb.position.y = -0.08; g.add(bulb);
  const light = new THREE.PointLight(0xffc27a, 2.6, 5, 1.6); light.position.y = -0.12; g.add(light);
  g.position.set(x, 3.0, z); scene.add(g); lamps.push(g);
}
function room(wall, floor, trim) {
  scene.background = new THREE.Color(wall).multiplyScalar(0.55);
  scene.fog = new THREE.Fog(scene.background, 8, 15);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), mat(floor, { roughness: 0.75 })); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f);
  const w = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), mat(wall, { roughness: 0.9 })); w.position.set(0, 4, -2.2); w.receiveShadow = true; scene.add(w);
  box(20, 0.12, 0.04, trim, 0, 0.06, -2.18);
}
function counter(front, top, sign) {
  box(2.2, 1.05, 0.7, front, 1.15, 0.525, 0.05);
  box(2.3, 0.06, 0.8, top, 1.15, 1.08, 0.05, { roughness: 0.3 });
  if (sign) panel(1.2, 0.3, 1.15, 0.7, 0.405, (g, w, h) => { g.fillStyle = sign.bg; g.fillRect(0, 0, w, h); g.fillStyle = sign.fg; g.font = "bold 300px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(sign.text, w / 2, h / 2 + 10); });
}

// ------------------------------------------------------------------ the sets
// Every set keeps the same bones: she stops at the left, he waits on the
// right (behind a counter or desk where the topic has one).
const SETS = {
  cafe() {
    room(0x5a3b33, 0x6b4630, 0x3b2e2a);
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
    box(2.2, 0.9, 0.02, new THREE.MeshStandardMaterial({ color: 0x9fd8e8, transparent: true, opacity: 0.18, roughness: 0.1 }), 1.15, 1.6, 0.3);
    const clock = cyl(0.3, 0.3, 0.05, 0xffffff, 1.4, 2.6, -2.12, 40); clock.rotation.x = Math.PI / 2;
    box(0.2, 0.2, 0.05, 0x2a3340, 1.4, 2.6, -2.1);
  },
  shop() {
    room(0xe9e2d0, 0xbfa67f, 0x9e6f45);
    const colors = [0xe0503a, 0x3a7fd0, 0xf2c14e, 0x4f9e5a, 0x833ab4, 0xf77737];
    for (let s = 0; s < 3; s++) {
      box(2.6, 0.05, 0.4, 0x9e6f45, -1.2, 0.9 + s * 0.6, -1.95);
      for (let k = 0; k < 9; k++) box(0.2, 0.36, 0.22, colors[(k + s * 2) % colors.length], -2.35 + k * 0.28, 1.11 + s * 0.6, -1.9);
    }
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
    box(0.5, 0.08, 0.36, 0x2e6f8e, 0.6, 1.15, 0.1);
  },
  work() {
    room(0xd8dde3, 0x6f7b87, 0x4a5561);
    for (let i = 0; i < 6; i++) box(0.08, 1.4, 0.02, 0xf0f3f6, -2.2 + i * 0.3, 2.1, -2.16);
    box(1.9, 1.5, 0.02, 0xbfe3f2, -1.45, 2.1, -2.18);
    counter(0xe7ebef, 0x3a4552);
    box(0.6, 0.38, 0.04, 0x1a1f26, 1.5, 1.35, -0.1);
    box(0.08, 0.2, 0.08, 0x1a1f26, 1.5, 1.15, -0.1);
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
    panel(0.8, 0.4, -1.2, 1.9, -2.17, (g, w, h) => { g.fillStyle = "#111"; g.fillRect(0, 0, w, h); g.fillStyle = "#ff4d3a"; g.font = "bold 260px monospace"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("042", w / 2, h / 2 + 10); });
    counter(0x5c6670, 0x3a4552, { text: "Schalter 3", bg: "#3a4552", fg: "#ffffff" });
    box(0.3, 1.2, 0.3, 0xd0d4d8, -2.4, 0.6, -1.4);
  },
  office() { SETS.bureau(); },
  home() {
    room(0xeadfcc, 0xb98556, 0x9e6f45);
    box(1.8, 1.3, 0.02, 0xcdebfa, -1.2, 2.0, -2.18);
    box(1.9, 0.08, 0.1, 0xffffff, -1.2, 1.33, -2.14); box(0.06, 1.3, 0.04, 0xffffff, -1.2, 2.0, -2.15);
    box(2.2, 0.45, 0.8, 0x5e9e8c, 2.0, 0.35, -1.5); box(2.2, 0.6, 0.2, 0x4c8373, 2.0, 0.75, -1.85);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), mat(0xe7a78c, { roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(0.2, 0.004, 0.3); rug.receiveShadow = true; scene.add(rug);
    plant(-2.5, -1.4, 1.3);
    pendant(0.3, 0.2, 0xe0b25a);
  },
};
const OPEN = new Set(["home", "park"]);            // no counter: he stands facing her
const setting = SETS[CFG.setting] ? CFG.setting : "cafe";
SETS[setting]();
const HIM = OPEN.has(setting) ? { x: 0.8, z: -0.15, rotY: -Math.PI / 2 + 0.55 } : { x: 1.2, z: -0.62, rotY: -Math.PI / 2 + 0.75 };
const HER = { x0: -2.6, x: -0.55, z: 0.6, rotY: Math.PI / 2 - 0.5 };

scene.add(new THREE.HemisphereLight(0xfff1dc, 0x3a2a22, setting === "park" ? 1.6 : 1.15));
const key = new THREE.DirectionalLight(0xffe2b8, 2.2); key.position.set(-2.5, 4.5, 3.5); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -2 }); key.shadow.bias = -0.0005;
scene.add(key);
const rim = new THREE.DirectionalLight(0x9fc4ff, 0.8); rim.position.set(3, 3, -3); scene.add(rim);

// ------------------------------------------------------------------ people
const MAP = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head",
  "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand", "RightShoulder", "RightArm", "RightForeArm", "RightHand",
  "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase", "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase"];
const CHILD = { Hips: "Spine", Spine: "Spine1", Spine1: "Spine2", Spine2: "Neck", Neck: "Head", Head: "HeadTop_End",
  LeftShoulder: "LeftArm", LeftArm: "LeftForeArm", LeftForeArm: "LeftHand", LeftHand: "LeftHandMiddle1",
  RightShoulder: "RightArm", RightArm: "RightForeArm", RightForeArm: "RightHand", RightHand: "RightHandMiddle1",
  LeftUpLeg: "LeftLeg", LeftLeg: "LeftFoot", LeftFoot: "LeftToeBase", LeftToeBase: "LeftToe_End",
  RightUpLeg: "RightLeg", RightLeg: "RightFoot", RightFoot: "RightToeBase", RightToeBase: "RightToe_End" };
const boneMap = (root) => { const b = {}; root.traverse((o) => { if (o.isBone) b[o.name.replace(/^mixamorig:?/, "")] = o; }); return b; };
const wq = (o) => o.getWorldQuaternion(new THREE.Quaternion());
const wp = (o) => o.getWorldPosition(new THREE.Vector3());
function rigPair(srcRoot, tgtRoot) {
  srcRoot.updateMatrixWorld(true); tgtRoot.updateMatrixWorld(true);
  const S = boneMap(srcRoot), T = boneMap(tgtRoot), pairs = [];
  const dir = (B, k) => (B[CHILD[k]] ? wp(B[CHILD[k]]).sub(wp(B[k])) : wp(B[k]).sub(wp(B[k].parent))).normalize();
  for (const n of MAP) {
    if (!S[n] || !T[n]) continue;
    const C = new THREE.Quaternion().setFromUnitVectors(dir(T, n), dir(S, n));
    pairs.push({ s: S[n], t: T[n], qS0inv: wq(S[n]).invert(), CqT0: C.multiply(wq(T[n])) });
  }
  return { S, pairs, hipY0: wp(S.Hips).y, hRatio: wp(T.Head).y / wp(S.Head).y };
}
const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _rq = new THREE.Quaternion();
function retarget(p) {
  p.src.updateMatrixWorld(true); p.root.updateMatrixWorld(true); p.root.getWorldQuaternion(_rq);
  for (const b of p.rig.pairs) {
    _q.copy(wq(b.s)).multiply(b.qS0inv).multiply(b.CqT0).premultiply(_rq);
    b.t.parent.getWorldQuaternion(_pq);
    b.t.quaternion.copy(_pq.invert().multiply(_q));
    b.t.updateMatrixWorld(true);
  }
  return (wp(p.rig.S.Hips).y - p.rig.hipY0) * p.rig.hRatio;
}
const faces = (root) => { const f = []; root.traverse((o) => { if (o.morphTargetDictionary) f.push(o); }); return f; };
const shadows = (root) => root.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; } });
function actions(mixer, clips, additive = []) {
  const out = {};
  for (const [k, c0] of Object.entries(clips)) {
    const c = c0.clone(); const add = additive.includes(k);
    if (add) THREE.AnimationUtils.makeClipAdditive(c);
    const a = mixer.clipAction(c); if (add) a.blendMode = THREE.AdditiveAnimationBlendMode;
    a.play(); a.setEffectiveWeight(0); out[k] = a;
  }
  return out;
}
function suit(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (/Headwear|Beard/.test(o.name)) o.visible = false;             // clean-shaven, no hat
    if (/Outfit_(Top|Bottom)/.test(o.name)) {
      o.material = o.material.clone();
      o.material.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
          float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          vec3 cloth = mix(vec3(0.030, 0.034, 0.045), vec3(0.085, 0.095, 0.12), smoothstep(0.05, 0.35, lum));
          diffuseColor.rgb = mix(cloth, vec3(0.93), smoothstep(0.55, 0.8, lum));`);
      };
    }
  });
}
const people = {};
const loader = new GLTFLoader();
const load = (u) => loader.loadAsync(M + u);
window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady.people = Promise.all([
  load("Xbot.glb"), load("avaturn.glb"), load("readyplayer.me.glb"),
  load("anim/M_Standing_Idle_001.glb"), load("anim/M_Standing_Expressions_011.glb"), load("anim/M_Talking_Variations_005.glb"),
]).then(([xb, av, rp, idle, greet, talk]) => {
  // her: the retargeted mocap
  const src = SkeletonUtils.clone(xb.scene);
  shadows(av.scene);
  const rig = rigPair(src, av.scene);
  av.scene.position.set(HER.x0, 0, HER.z); av.scene.rotation.y = HER.rotY; scene.add(av.scene);
  const hm = new THREE.AnimationMixer(src);
  const clips = Object.fromEntries(xb.animations.map((c) => { const k = c.clone(); k.tracks = k.tracks.filter((t) => !/Hips\.position/.test(t.name)); return [k.name, k]; }));
  people.her = { root: av.scene, src, rig, mixer: hm, a: actions(hm, clips, ["agree", "headShake"]), faces: faces(av.scene), bones: boneMap(src) };
  // him: his own library's mocap on his own skeleton
  suit(rp.scene); shadows(rp.scene);
  rp.scene.position.set(HIM.x, 0, HIM.z); rp.scene.rotation.y = HIM.rotY; scene.add(rp.scene);
  const mm = new THREE.AnimationMixer(rp.scene);
  people.him = { root: rp.scene, mixer: mm, a: actions(mm, { idle: idle.animations[0], greet: greet.animations[0], talk: talk.animations[0] }), faces: faces(rp.scene), bones: boneMap(rp.scene) };
  renderAt(window.__hfThreeTime || 0);
});

// ------------------------------------------------------------------ acting
const set = (p, k, w, time) => { const a = p.a[k]; if (!a) return; a.setEffectiveWeight(w); a.time = Math.max(0, time); };
const eul = new THREE.Euler(), qq = new THREE.Quaternion();
const turn = (bone, x, y, z) => { if (!bone) return; eul.set(x, y, z, "XYZ"); qq.setFromEuler(eul); bone.quaternion.multiply(qq); };
const BLINK_GAP = [3.1, 4.3, 2.6, 5.2, 3.7];
function blinkAt(t, shift) {
  let b = shift, i = 0, v = 0;
  while (b < t + 0.2) { const d = Math.abs(t - b); if (d < 0.09) v = Math.max(v, 1 - d / 0.09); b += BLINK_GAP[i++ % BLINK_GAP.length]; }
  return v;
}
function face(p, t, { lines = [], smile = 0, worry = 0, blinkShift = 0 }) {
  let open = 0, vis = 0;
  for (const [a, b] of lines) if (t > a && t < b) {
    const ph = (t - a) * 5.2;
    open = Math.max(open, win(t, a, b, 0.08) * (0.3 + 0.7 * Math.abs(Math.sin(ph * Math.PI))));
    vis = Math.floor(ph) % 3;
  }
  const blink = blinkAt(t, blinkShift);
  const put = (m, n, v) => { const i = m.morphTargetDictionary[n]; if (i != null) m.morphTargetInfluences[i] = v; };
  for (const m of p.faces) {
    if (m.morphTargetDictionary.jawOpen != null) {
      put(m, "jawOpen", open * 0.45);
      put(m, "viseme_aa", vis === 0 ? open * 0.7 : 0); put(m, "viseme_E", vis === 1 ? open * 0.7 : 0); put(m, "viseme_O", vis === 2 ? open * 0.7 : 0);
      put(m, "mouthSmileLeft", smile); put(m, "mouthSmileRight", smile);
      put(m, "eyeBlinkLeft", blink); put(m, "eyeBlinkRight", blink);
      put(m, "browInnerUp", worry * 0.6); put(m, "mouthFrownLeft", worry * 0.3); put(m, "mouthFrownRight", worry * 0.3);
    } else {
      put(m, "mouthOpen", open * 0.9); put(m, "mouthSmile", smile);
    }
  }
}

// the lesson, as time windows
const HOOK = CFG.hook, OUTRO_AT = CFG.outroAt, TOTAL = CFG.total;
const WALK = Math.min(3.1, HOOK * 0.45);
const P = CFG.phrases.map((x) => ({ ...x, de0: x.t0 + x.de, de1: x.t0 + x.de + x.deDur, ex0: x.t0 + x.ex, ex1: x.t0 + x.ex + x.exDur, fa0: x.t0 + x.fa, end: x.t0 + x.dur }));
const G1 = Math.min(WALK * 0.6, HOOK - 3.6);                   // his greeting starts while she arrives
const G2 = OUTRO_AT + 0.3;                                      // and again to say goodbye
// who speaks when: she says the phrase, he answers with the example
// EasyDeutsch says each sentence twice (listen, then repeat): she says it both times
const herLines = P.flatMap((x) => (x.again != null ? [[x.de0, x.de1], [x.t0 + x.again, x.t0 + x.again + x.deDur]] : [[x.de0, x.de1]]));
const hisLines = P.filter((x) => x.hasEx).map((x) => [x.ex0, x.ex1]);

// camera: shots eased one into the next
const SH = {
  wide: { p: [0.1, 1.55, 5.0], l: [0.25, 1.2, 0] },
  her: { p: [0.75, 1.6, 2.7], l: [HER.x, 1.42, HER.z] },
  herMed: { p: [0.4, 1.5, 3.4], l: [HER.x + 0.25, 1.25, HER.z - 0.1] },
  him: { p: [HIM.x - 1.45, 1.68, HIM.z + 2.8], l: [HIM.x, 1.5, HIM.z] },
  two: { p: [-0.3, 1.5, 4.4], l: [0.25, 1.25, 0] },
};
const KEYS = [[WALK + 0.3, "two"]];
P.forEach((x, i) => {
  KEYS.push([x.de0 - 0.15, i % 2 ? "herMed" : "her"]);
  if (x.hasEx) KEYS.push([x.ex0 - 0.15, "him"]);
  KEYS.push([x.fa0 - 0.1, "two"]);
});
KEYS.push([OUTRO_AT, "wide"]);
function cameraAt(t) {
  let c = SH.wide;
  const mix = (A, B, k) => ({ p: A.p.map((v, i) => v + (B.p[i] - v) * k), l: A.l.map((v, i) => v + (B.l[i] - v) * k) });
  for (const [at, s] of KEYS) c = mix(c, SH[s], ss(at, at + 0.6, t));
  camera.position.set(c.p[0] + Math.sin(t * 0.5) * 0.04, c.p[1] + Math.sin(t * 0.37) * 0.025, c.p[2]);
  camera.lookAt(c.l[0], c.l[1], c.l[2]);
}

// bubbles (DOM, placed over the heads every frame)
const $ = (id) => document.getElementById(id);
const v3 = new THREE.Vector3();
function place(el, obj, dy, dx = 0, opacity = 1) {
  if (!el) return;
  if (!obj || opacity <= 0.001) { el.style.opacity = "0"; return; }
  obj.getWorldPosition(v3); v3.y += dy; v3.project(camera);
  if (Math.abs(v3.x) > 0.9 || Math.abs(v3.y) > 1.2 || v3.z > 1) { el.style.opacity = "0"; return; }   // that head is out of shot
  // kept inside the frame: a close-up puts the head near the top edge
  const r = el.getBoundingClientRect(), bw = r.width || 200, bh = r.height || 90;
  const x = clamp(((v3.x + 1) / 2) * W + dx, bw / 2 + 16, W - bw / 2 - 16), y = clamp(((1 - v3.y) / 2) * H, bh + 16, H - 16);
  el.style.left = `${x}px`; el.style.top = `${y}px`;
  el.style.opacity = String(opacity); el.style.transform = `translate(-50%,-100%) scale(${0.85 + 0.15 * Math.min(1, opacity * 1.5)})`;
}

function renderAt(t) {
  const her = people.her, him = people.him;
  if (her && him) {
    // --- her
    const walkLen = her.a.walk.getClip().duration, idleLen = her.a.idle.getClip().duration;
    const walkW = 1 - ss(WALK - 0.35, WALK + 0.15, t);
    set(her, "walk", walkW, t % walkLen);
    set(her, "idle", 1 - walkW, t % idleLen);
    her.root.position.x = HER.x0 + (HER.x - HER.x0) * ss(0, WALK, t);
    let shake = 0, nod = 0, nodT = 0, shakeT = 0;
    for (const x of P) {
      if (x.negation) { const w = win(t, x.de0, x.de1 + 0.6, 0.3); if (w > shake) { shake = w; shakeT = t - x.de0; } }
      const n = Math.max(win(t, x.fa0, x.fa0 + 1.3, 0.3) * 0.7, x.negation ? 0 : win(t, x.de1 - 0.2, x.de1 + 1.0, 0.25) * 0.5);
      if (n > nod) { nod = n; nodT = t < x.fa0 ? t - x.de1 + 0.2 : t - x.fa0; }
    }
    const hello = win(t, WALK + 0.1, WALK + 1.4, 0.3) * 0.7, bye = win(t, OUTRO_AT + 0.6, OUTRO_AT + 2.0, 0.3) * 0.7;
    if (hello > nod) { nod = hello; nodT = t - WALK - 0.1; }
    if (bye > nod) { nod = bye; nodT = t - OUTRO_AT - 0.6; }
    set(her, "headShake", shake, shakeT % her.a.headShake.getClip().duration);
    set(her, "agree", nod, nodT % her.a.agree.getClip().duration);
    her.mixer.update(0);
    // a question tilts her head a little, as people do
    let tilt = 0; for (const x of P) if (x.question) tilt = Math.max(tilt, win(t, x.de0, x.de1 + 0.5, 0.3));
    turn(her.bones.Head, 0, 0, -0.14 * tilt);
    her.root.position.y = retarget(her);
    const herSmile = Math.max(win(t, WALK, WALK + 2.2, 0.3), ...P.map((x) => win(t, x.fa0 + 0.2, x.end - 0.3, 0.4)), ss(OUTRO_AT + 0.4, OUTRO_AT + 0.8, t)) * 0.7;
    const worry = Math.max(0, ...P.filter((x) => x.negation).map((x) => win(t, x.de0 - 0.2, x.fa0 + 0.2, 0.3)));
    face(her, t, { lines: herLines, smile: herSmile * (1 - worry), worry });
    // --- him
    const g = Math.max(win(t, G1, G1 + 3.6, 0.35), win(t, G2, G2 + 3.6, 0.35));
    const gT = t < OUTRO_AT ? t - G1 : t - G2;
    let k = 0, kT = 0;
    P.forEach((x, i) => { if (x.hasEx) { const w = win(t, x.ex0 - 0.2, x.ex1 + 0.4, 0.35); if (w > k) { k = w; kT = (t - x.ex0 + 1.0 + i * 2.1) % 7.2; } } });
    set(him, "greet", g, clamp(gT, 0, 3.99));
    set(him, "talk", k, kT);
    set(him, "idle", 1 - Math.max(g, k), (t + 0.8) % him.a.idle.getClip().duration);
    him.mixer.update(0);
    // he nods while she answers in Persian (no nod clip in his library: a small head bend)
    let hn = 0; for (const x of P) hn = Math.max(hn, win(t, x.fa0 + 0.1, x.fa0 + 1.0, 0.25));
    turn(him.bones.Head, 0.12 * hn * Math.sin(Math.PI * clamp((t % 1) * 1.0, 0, 1)), 0, 0);
    const hisSmile = Math.max(win(t, G1 + 0.3, G1 + 3.4, 0.3), ...P.map((x) => win(t, x.ex1, x.end - 0.4, 0.4)), ss(OUTRO_AT + 0.2, OUTRO_AT + 0.6, t)) * 0.75;
    face(him, t, { lines: hisLines, smile: hisSmile, blinkShift: 1.3 });
  }
  cameraAt(t);
  lamps.forEach((l, i) => { l.rotation.z = Math.sin(t * 0.9 + i) * 0.03; });
  renderer.render(scene, camera);
  if (her && him) {
    place($("b-her"), her.bones.Head && people.her.root.getObjectByName("Head"), 0.34, -30, win(t, WALK + 0.1, WALK + 1.7, 0.2));
    place($("b-him"), him.root.getObjectByName("Head"), 0.36, 20, win(t, G1 + 0.5, G1 + 2.2, 0.2));
    place($("b-bye"), him.root.getObjectByName("Head"), 0.36, 20, win(t, G2 + 0.4, G2 + 2.4, 0.2));
    // the pictured thing floats beside her face, like a thought
    P.forEach((x, i) => place($(`b-ic${i}`), x.icon ? people.her.root.getObjectByName("Head") : null, 0.12, 190, x.icon ? win(t, x.de0, x.fa0 + 1.0, 0.25) : 0));
  }
}
window.addEventListener("hf-seek", (ev) => renderAt(ev.detail.time));
renderAt(window.__hfThreeTime || 0);
