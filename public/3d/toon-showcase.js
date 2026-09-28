// "Character Builder" showcase: Lena reacts to the editor's controls in six shots
// (bored → head inflates → legs stretch → colour light → backdrop beats → close-up
// smirk). Uses the lesson stage (toon-stage.js, setting "none") and drives Lena
// itself. A pure function of time; the shot times come in window.__show.
const K = window.__toonKit, S = window.__show;
const { THREE, scene, camera, renderer, PEOPLE, LAY, applyLook, poseHand, rot, M, sph, clamp, ss, win, D, blinkAmt } = K;
const lena = PEOPLE.lena, braun = PEOPLE.braun;
braun.root.visible = false;
const X = LAY.lena[0], Z = LAY.lena[1];
lena.root.rotation.y = 0.28;                       // nearly facing the camera

// puffed cheeks for the balloon head
const cheeks = [-1, 1].map((sx) => { const c = M(sph(0.085), 0xf4c9a4, { p: [sx * 0.16, 0.2, 0.15], parent: lena.head, ink: 0.006 }); c.scale.setScalar(0.001); return c; });
// a soft shadow under the feet
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 }));
shadow.rotation.x = -Math.PI / 2; shadow.position.set(X, 0.01, Z); scene.add(shadow);

const iris0 = lena.irises.map((ir) => ir.position.x), brow0 = lena.brows.children.map((b) => b.position.y);
const elastic = (x) => (x <= 0 ? 0 : 1 - Math.exp(-5.5 * x) * Math.cos(11 * x));
const env = (t, a, b, f = 0.35) => win(t, a, b, f);
const lerp = (a, b, k) => a + (b - a) * k;
const T = S.t;                                       // shot starts, seconds

// arm poses in degrees: [shoulder x, shoulder z (outward +), elbow x, elbow z (inward +)]
const POSE = {
  hang: [4, 6, -6, 0],
  cheeks: [-104, 58, -128, 22],
  shade: [-40, 12, -150, 0],
  hips: [8, 34, -20, 105],
  up: [-12, 150, -10, 0],
  thumbs: [-44, 14, -95, 0],
  wide: [-10, 55, -30, 10],
};
function setArm(sx, p, hand, t, flutter = 0) {
  const a = lena.arms[sx];
  rot(a.sh, p[0], 0, sx * p[1]); rot(a.el, p[2], 0, -sx * p[3]);
  poseHand(a.hand, hand, t, flutter);
}
const blend = (list) => {                            // [[pose, weight], ...] over "hang"
  const r = POSE.hang.slice();
  for (const [name, w] of list) if (w > 0) POSE[name].forEach((v, i) => { r[i] += (v - POSE.hang[i]) * w; });
  return r;
};

function lightAt(t) {                                // colour light: orange → violet → electric blue
  const c = S.tints; let col = "#ffffff", amt = 0;
  for (let i = 0; i < c.length; i++) if (t >= c[i].t) { col = c[i].c; amt = c[i].a; }
  const on = ss(c[0].t - 0.05, c[0].t + 0.25, t) * (1 - ss(S.tintOff - 0.2, S.tintOff + 0.3, t));
  return { tint: col, tintAmt: amt * on };
}

function drive(t) {
  // shape: height (legs), head (balloon); body stays
  const grow = env(t, T.legs + 0.5, T.color - 0.2, 0.6);
  const balloon = elastic(clamp((t - (T.head + 0.55)) / 1.4, 0, 1)) * (1 - ss(T.head + 3.0, T.head + 3.5, t));
  applyLook(lena, { head: 1, body: 1, height: 1, ...lightAt(t) });
  const hScale = 1 + 0.3 * grow;
  lena.root.scale.set(1, hScale, 1);
  const hs = 1 + 0.75 * balloon;
  lena.head.scale.set(hs, hs / hScale, hs);
  cheeks.forEach((c) => c.scale.setScalar(Math.max(0.001, 1.25 * balloon)));

  // acting per shot
  const bored = env(t, -1, T.head + 0.3), cheek = env(t, T.head + 1.2, T.head + 3.0, 0.3);
  const wobble = env(t, T.legs + 0.8, T.color - 0.3, 0.4), shade = env(t, T.color + 0.3, T.bg - 0.2, 0.35);
  const beats = S.bgs.map((b, i) => env(t, b.t, (S.bgs[i + 1] ? S.bgs[i + 1].t : T.close) - 0.05, 0.18));
  const close = ss(T.close, T.close + 0.6, t);

  // arms
  const nearArm = blend([["cheeks", cheek], ["hips", beats[0]], ["up", beats[1]], ["thumbs", beats[2]], ["wide", wobble * 0.7]]);
  const farArm = blend([["cheeks", cheek], ["shade", shade], ["hips", beats[0] + beats[2]], ["wide", wobble * 0.7 + beats[1] * 0.5]]);
  const pat = cheek * 6 * Math.max(0, Math.sin(t * 16));
  nearArm[2] += pat; farArm[2] += pat;
  setArm(-1, nearArm, [["flat", cheek], ["point", beats[1]], ["thumbs", beats[2]], ["open", wobble]], t);
  setArm(1, farArm, [["flat", cheek + shade], ["open", wobble + beats[1] * 0.6]], t);

  // head and body
  const sway = 0.04 * Math.sin(t * 1.4);
  const lookDown = env(t, T.legs + 1.0, T.color - 0.4, 0.4);
  const toCam = close;
  rot(lena.head, lookDown * 22 + bored * 4 - cheek * 6, (bored * -10 + toCam * -14) + 4 * Math.sin(t * 0.9) * (1 - toCam), sway * 20 + beats[1] * 6 - beats[2] * 5);
  lena.body.rotation.z = wobble * 0.07 * Math.sin(t * 5.2) + beats[0] * -0.04 + beats[1] * 0.05;
  lena.body.rotation.x = -0.02 * bored + 0.05 * lookDown;
  lena.body.rotation.y = -0.18 * toCam + beats[1] * 0.2 - beats[2] * 0.15;
  lena.body.position.y = 0.008 * Math.sin(t * 3.4) + 0.05 * elastic(clamp((t - T.head - 0.55) / 1.4, 0, 1)) * (1 - ss(T.head + 3.0, T.head + 3.5, t)) * 0.4;

  // face: side-eye while bored, wide eyes on the balloon, heavy lids when unimpressed, a brow and a smirk at the end
  const side = bored * (0.5 + 0.5 * ss(1.0, 1.6, t)) * (1 - ss(2.6, 2.9, t) * 0.6);
  lena.irises.forEach((ir, i) => { ir.position.x = iris0[i] + 0.02 * side - 0.012 * toCam; ir.position.y = 0.31 - 0.012 * lookDown; });
  const heavy = Math.max(0.42 * bored, 0.5 * lookDown, 0.38 * close);
  const blink = blinkAmt(t, 0.3);
  lena.lids.forEach((lid) => { lid.scale.y = Math.max(0.001, Math.max(blink, heavy * (1 - cheek))); });
  const brow = ss(T.close + 1.1, T.close + 1.5, t);
  lena.brows.children.forEach((b, i) => { b.position.y = brow0[i] + (i === 1 ? 0.035 * brow : -0.005 * brow) + 0.02 * cheek; });
  const smirk = ss(T.close + 1.8, T.close + 2.3, t);
  const [m0, m1, m2] = lena.mouth;
  m0.visible = !(balloon > 0.35); m2.visible = balloon > 0.35; m1.visible = false;
  m2.scale.set(0.6, 0.7, 0.45);
  m0.rotation.z = Math.PI - 0.28 * smirk; m0.position.x = 0.016 * smirk; m0.scale.set(1 - 0.25 * smirk + 0.1 * bored, 1, 1);
  if (lena.extra.pony) lena.extra.pony.rotation.x = 0.5 + 0.12 * Math.sin(t * 2.4) + 0.25 * wobble * Math.sin(t * 5.2);

  // camera: full body on the left of the frame (the editor panel is on the right), push in for the head, close-up at the end
  const headPush = env(t, T.head + 0.2, T.legs - 0.2, 0.5);
  const legsWide = env(t, T.legs, T.color, 0.5);
  const dist = lerp(lerp(lerp(5.0, 3.6, headPush), 5.9, legsWide), 2.05, close) - 0.35 * (t / S.total);
  const lookY = lerp(lerp(lerp(1.05, 1.62, headPush), 1.2, legsWide), 1.62, close);
  const off = lerp(0.62, 0.3, close) * dist / 5;      // frame the character left of centre
  camera.position.set(X + 0.1 + off + 0.02 * Math.sin(t * 0.5), lookY + 0.12, Z + dist);
  camera.lookAt(X + off, lookY, Z);
  renderer.render(scene, camera);
}
window.__toonDriver = drive;
drive(0);
