// EasyDeutsch 2D cartoon (owner, 2026-10-04: "3D does not look good at all — make a proper
// cartoon"). Flat vector characters with adult proportions, in the manner of the dialogue
// shorts the owner sent: expressive brows and eyes, a mouth shape on every syllable,
// acting with the hands (open palms, a hand on the chest, a shrug, a thumbs-up, crossed
// arms, laughing), a table or counter in front, hard cuts between a two-shot and close-ups.
// Everything is drawn in SVG and is a pure function of time: draw(t) sets every transform.
// The lesson comes in window.__toon = { lines, hookDur, outroAt, total, setting, vary }.
(() => {
  const CFG = window.__toon || {};
  const svg = document.getElementById("cartoon-stage");
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; };
  const g = (parent, attrs = {}) => el("g", attrs, parent);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ss = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const win = (t, a, b, f = 0.25) => ss(a, a + f, t) * (1 - ss(b - f, b, t));
  const lerp = (a, b, k) => a + (b - a) * k;
  const SEED = Math.abs(Math.round(+((CFG.vary && CFG.vary.seed) || 0)));
  const pick = (list, k) => list[(SEED * k) % list.length];
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const INK = "#3a2a22";

  // ------------------------------------------------------------------ the set
  const SETTING = CFG.setting === "office" ? "bureau" : CFG.setting || "cafe";
  const TOD = pick(["day", "evening", "morning"], 5);
  const SKY = { day: ["#bfdcef", "#e6f1f8"], morning: ["#f6d9b8", "#fbeedd"], evening: ["#e9a77a", "#f6d0a8"] }[TOD];
  const world = g(svg, { id: "world" });
  const back = g(world), people = g(world), front = g(world);
  const R = (p, x, y, w, h, fill, extra = {}) => el("rect", { x, y, width: w, height: h, fill, ...extra }, p);
  const P = (p, d, fill, extra = {}) => el("path", { d, fill, ...extra }, p);
  const C = (p, cx, cy, r, fill, extra = {}) => el("circle", { cx, cy, r, fill, ...extra }, p);
  const E = (p, cx, cy, rx, ry, fill, extra = {}) => el("ellipse", { cx, cy, rx, ry, fill, ...extra }, p);
  const stroke = (w = 3, c = INK) => ({ stroke: c, "stroke-width": w, "stroke-linejoin": "round", "stroke-linecap": "round" });
  function windowCity(x, y, w, h) {
    const d = el("defs", {}, back), id = `sky${x}`;
    const lg = el("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 }, d);
    el("stop", { offset: 0, "stop-color": SKY[0] }, lg); el("stop", { offset: 1, "stop-color": SKY[1] }, lg);
    R(back, x, y, w, h, `url(#${id})`);
    for (let i = 0; i < 7; i++) { const bw = 40 + rnd(i + x) * 60, bh = 80 + rnd(i + 9 + x) * 160, bx = x + i * (w / 7) + rnd(i) * 10; R(back, bx, y + h - bh, bw, bh, TOD === "evening" ? "#c98c6c" : "#a9bccb", { opacity: 0.85 }); for (let r = 0; r < 4; r++) R(back, bx + 8, y + h - bh + 14 + r * 26, 10, 12, "#eef4f8", { opacity: 0.7 }); }
    R(back, x - 8, y - 8, w + 16, 16, "#e9edf0"); R(back, x - 8, y + h - 8, w + 16, 16, "#e9edf0");
    for (let i = 0; i <= 2; i++) R(back, x - 8 + i * (w / 2), y, 16, h, "#e9edf0");
  }
  function plant(x, y, s = 1) {
    P(back, `M ${x - 30 * s} ${y} L ${x + 30 * s} ${y} L ${x + 22 * s} ${y + 60 * s} L ${x - 22 * s} ${y + 60 * s} Z`, "#c66a43", stroke(3));
    for (let i = 0; i < 7; i++) { const a = -2.6 + i * 0.36; P(back, `M ${x} ${y} Q ${x + Math.cos(a) * 50 * s} ${y + Math.sin(a) * 90 * s - 20} ${x + Math.cos(a) * 80 * s} ${y + Math.sin(a) * 120 * s}`, "none", { ...stroke(10 * s, i % 2 ? "#3f8f55" : "#4fa865") }); }
  }
  function shelf(x, y, w, colors) {
    R(back, x, y, w, 10, "#8a5a3a", stroke(2));
    let cx = x + 8; let i = 0; while (cx < x + w - 30) { const bw = 18 + rnd(i + x) * 16, bh = 46 + rnd(i + y) * 30; R(back, cx, y - bh, bw, bh, colors[i % colors.length], stroke(2)); cx += bw + 4; i++; }
  }
  function sign(x, y, w, h, bg, fg, text, size) {
    R(back, x, y, w, h, bg, { rx: 8, ...stroke(3) });
    el("text", { x: x + w / 2, y: y + h / 2 + size * 0.35, "text-anchor": "middle", "font-family": "EasyFont, Arial, sans-serif", "font-size": size, fill: fg }, back).textContent = text;
  }
  const SETS = {
    cafe() { R(back, 0, 0, 1080, 1080, "#e7d3b8"); R(back, 0, 640, 1080, 440, "#b9875c"); windowCity(60, 170, 420, 330); sign(600, 170, 330, 220, "#2f3d33", "#f6efe0", "Kaffee · Tee", 44); shelf(560, 470, 420, ["#d9a066", "#f6e7c8", "#8e5a3a", "#c66a43"]); },
    home() { R(back, 0, 0, 1080, 1080, "#efe4d2"); R(back, 0, 650, 1080, 430, "#b98556"); windowCity(80, 160, 380, 330); R(back, 560, 200, 180, 130, "#f6e6c8", stroke(4)); R(back, 780, 230, 140, 100, "#cfe5f2", stroke(4)); plant(980, 520, 1.1); shelf(560, 470, 360, ["#dd5a4a", "#3a7fd0", "#f2c14e", "#4f9e5a"]); },
    station() { R(back, 0, 0, 1080, 1080, "#cfd6dc"); R(back, 0, 650, 1080, 430, "#8a8d90"); R(back, 40, 250, 1000, 300, "#c73b33", stroke(4)); for (let i = 0; i < 6; i++) R(back, 70 + i * 160, 290, 120, 90, "#bfe1ee", stroke(3)); R(back, 40, 420, 1000, 26, "#ffffff"); sign(330, 120, 420, 90, "#10161f", "#ffe9a8", "10:15  Berlin  Gl. 3", 40); },
    shop() { R(back, 0, 0, 1080, 1080, "#f2ead8"); R(back, 0, 650, 1080, 430, "#d8c9a8"); for (let s = 0; s < 4; s++) shelf(60, 230 + s * 110, 960, ["#e0503a", "#3a7fd0", "#f2c14e", "#4f9e5a", "#833ab4", "#f77737"]); sign(380, 80, 320, 90, "#e0503a", "#ffffff", "SUPERMARKT", 44); },
    doctor() { R(back, 0, 0, 1080, 1080, "#e3f4f2"); R(back, 0, 650, 1080, 430, "#d8dfe3"); R(back, 120, 170, 170, 170, "#ffffff", stroke(4)); R(back, 185, 195, 40, 120, "#1fa971"); R(back, 145, 235, 120, 40, "#1fa971"); windowCity(520, 170, 420, 300); plant(70, 520, 1); },
    school() { R(back, 0, 0, 1080, 1080, "#f1e6c8"); R(back, 0, 650, 1080, 430, "#a98a62"); R(back, 120, 150, 840, 380, "#2f4a3a", { rx: 6, ...stroke(8, "#8e5a33") }); el("text", { x: 170, y: 270, "font-family": "EasyFont, Arial", "font-size": 76, fill: "#f6f1e4" }, back).textContent = "Deutsch A1"; el("text", { x: 170, y: 380, "font-family": "EasyFont, Arial", "font-size": 54, fill: "#ffce00" }, back).textContent = "der · die · das"; },
    work() { R(back, 0, 0, 1080, 1080, "#d8dde3"); R(back, 0, 650, 1080, 430, "#6f7b87"); windowCity(60, 150, 620, 380); shelf(740, 330, 280, ["#dd0000", "#3a7fd0", "#f2c14e", "#4f9e5a"]); plant(980, 520, 1.1); },
    park() { R(back, 0, 0, 1080, 1080, SKY[0]); R(back, 0, 520, 1080, 560, "#7cb35a"); E(back, 200, 540, 380, 120, "#6aa64f"); E(back, 860, 560, 420, 130, "#62a04a"); for (const [x, s] of [[150, 1.2], [520, 0.9], [900, 1.3]]) { R(back, x - 14 * s, 330, 28 * s, 220, "#6b4a33", stroke(3)); C(back, x, 300, 120 * s, "#4f9e5a", stroke(3)); C(back, x - 60 * s, 340, 80 * s, "#5aa865", stroke(3)); } C(back, 960, 110, 50, "#fff3a0"); },
    bureau() { R(back, 0, 0, 1080, 1080, "#e6e2d6"); R(back, 0, 650, 1080, 430, "#9aa3ab"); sign(100, 120, 380, 100, "#1d2c44", "#ffffff", "Bürgeramt", 54); R(back, 560, 120, 200, 110, "#111111", stroke(3)); el("text", { x: 660, y: 200, "text-anchor": "middle", "font-family": "monospace", "font-size": 70, fill: "#ff4d3a" }, back).textContent = "042"; windowCity(120, 290, 380, 240); plant(980, 520, 1); },
  };
  (SETS[SETTING] || SETS.cafe)();
  const COUNTER = !["cafe", "home", "park", "school"].includes(SETTING);   // a counter, else a table

  // ------------------------------------------------------------------ a character
  // Built in local coordinates: the origin is the middle of the shoulders; y grows down.
  // f = +1 faces right, -1 faces left (the face turns three-quarter towards the other person).
  function makePerson(o) {
    const root = g(people), body = g(root), headPivot = g(body, { transform: "translate(0,-14)" }), head = g(headPivot);
    const arms = {};
    // torso and clothes
    P(body, "M -74 12 C -86 60 -88 150 -80 260 L 80 260 C 88 150 86 60 74 12 C 40 -6 -40 -6 -74 12 Z", o.top, stroke(3));
    P(body, "M -74 12 C -64 40 -60 80 -62 120", "none", { ...stroke(2, "rgba(0,0,0,.18)") });
    o.clothes(body);
    // neck
    P(body, "M -18 -22 L -20 6 C -8 16 8 16 20 6 L 18 -22 Z", o.skinShade, stroke(3));
    // arms: shoulder → upper arm → elbow → forearm → hand
    for (const s of [-1, 1]) {
      const sh = g(body, { transform: `translate(${s * 66},22)` }), shR = g(sh);
      el("rect", { x: -19, y: -14, width: 38, height: 122, rx: 19, fill: o.sleeve, ...stroke(3) }, shR);
      const el1 = g(shR, { transform: "translate(0,98)" }), elR = g(el1);
      el("rect", { x: -16, y: -10, width: 32, height: 100, rx: 16, fill: o.sleeve2 || o.sleeve, ...stroke(3) }, elR);
      el("rect", { x: -15, y: 70, width: 30, height: 12, rx: 5, fill: o.cuff || o.sleeve, ...stroke(2) }, elR);
      const hw = g(elR, { transform: "translate(0,84)" }), hR = g(hw);
      const hands = {};
      hands.open = g(hR); E(hands.open, 0, 18, 17, 20, o.skin, stroke(3)); for (let i = 0; i < 4; i++) el("rect", { x: -15 + i * 8, y: 26, width: 8, height: 22 - Math.abs(i - 1.5) * 3, rx: 4, fill: o.skin, ...stroke(2) }, hands.open); E(hands.open, s * -17, 14, 6, 11, o.skin, { ...stroke(2), transform: `rotate(${s * 30} ${s * -17} 14)` });
      hands.fist = g(hR); el("rect", { x: -17, y: 2, width: 34, height: 34, rx: 13, fill: o.skin, ...stroke(3) }, hands.fist); P(hands.fist, "M -12 24 L 12 24 M -12 15 L 12 15", "none", stroke(1.6));
      hands.point = g(hR); el("rect", { x: -17, y: 2, width: 34, height: 30, rx: 12, fill: o.skin, ...stroke(3) }, hands.point); el("rect", { x: s * 6 - 4, y: 26, width: 9, height: 30, rx: 4.5, fill: o.skin, ...stroke(2) }, hands.point);
      hands.thumbs = g(hR); el("rect", { x: -17, y: 6, width: 34, height: 30, rx: 12, fill: o.skin, ...stroke(3) }, hands.thumbs); el("rect", { x: s * -14 - 5, y: -18, width: 10, height: 30, rx: 5, fill: o.skin, ...stroke(2) }, hands.thumbs);
      arms[s] = { sh: shR, el: elR, hand: hR, hands };
    }
    // head (origin at the top of the neck)
    const hairBack = g(head); o.hairBack(hairBack);
    const ear = E(head, 0, -86, 11, 18, o.skin, stroke(3));
    P(head, "M -58 -100 C -62 -168 -30 -196 0 -196 C 30 -196 62 -168 58 -100 C 58 -60 36 -26 0 -20 C -36 -26 -58 -60 -58 -100 Z", o.skin, stroke(3));
    const shade = P(head, "", o.skinShade, { opacity: 0.55 });
    const blushL = E(head, 0, 0, 12, 6, "#f0a0a0", { opacity: 0.35 }), blushR = E(head, 0, 0, 12, 6, "#f0a0a0", { opacity: 0.35 });
    const face = g(head);
    const eyes = [-1, 1].map(() => {
      const eg = g(face);
      const white = E(eg, 0, 0, 13, 10, "#ffffff", stroke(2.5));
      const iris = g(eg); C(iris, 0, 1, 6.5, o.iris); C(iris, 0, 1, 3.6, "#1a1210"); C(iris, 2, -1.5, 1.6, "#ffffff");
      const lid = P(eg, "", o.skin, {});
      const lash = P(eg, "", "none", stroke(3.2));
      const happy = P(eg, "M -12 3 Q 0 -9 12 3", "none", { ...stroke(4), opacity: 0 });
      return { eg, white, iris, lid, lash, happy };
    });
    const brows = [-1, 1].map(() => P(face, "", "none", { ...stroke(7, o.brow) }));
    const nose = P(face, "", "none", stroke(3));
    const mouth = g(face);
    const mOuter = P(mouth, "", "#5a1d1d", stroke(3)), mTeeth = P(mouth, "", "#ffffff", {}), mTongue = P(mouth, "", "#d9696f", {}), mLine = P(mouth, "", "none", stroke(3.4));
    const hairFront = g(head); o.hairFront(hairFront);
    const extra = g(face); if (o.faceExtra) o.faceExtra(extra);
    body.appendChild(headPivot);                   // the head is drawn over the torso
    return { o, root, body, headPivot, head, arms, ear, shade, blushL, blushR, eyes, brows, nose, mouth, mOuter, mTeeth, mTongue, mLine, hairFront, extra, face };
  }

  const LENA = makePerson({
    skin: "#f3c9a6", skinShade: "#e2ab86", iris: "#5b3a22", brow: "#4a2e1e",
    top: pick(["#4f7cb5", "#c95a6a", "#3e8a6a", "#8a5ab0", "#d98c3a"], 7), sleeve: null,
    clothes(b) { P(b, "M -30 -2 L 0 52 L 30 -2", "#f7f2ea", stroke(3)); P(b, "M -30 -2 L -8 40 M 30 -2 L 8 40", "none", stroke(2)); C(b, 0, 80, 4, "#ffffff", stroke(1.5)); C(b, 0, 120, 4, "#ffffff", stroke(1.5)); },
    hairBack(h) { P(h, "M -70 -120 C -84 -70 -82 -20 -74 6 C -66 22 -50 26 -40 18 L 40 18 C 50 26 66 22 74 6 C 82 -20 84 -70 70 -120 C 62 -190 -62 -190 -70 -120 Z", "#4a2c1d", stroke(3)); },
    hairFront(h) {
      P(h, "M -64 -104 C -72 -170 -36 -210 6 -208 C 52 -206 74 -170 66 -104 C 60 -134 46 -150 30 -158 C 20 -140 -6 -128 -36 -124 C -46 -122 -56 -114 -64 -104 Z", "#5a3524", stroke(3));
      P(h, "M -64 -104 C -70 -70 -68 -36 -58 -14 C -66 -40 -66 -76 -58 -104 Z", "#5a3524", stroke(2.5));
      P(h, "M 66 -104 C 72 -70 70 -36 60 -14 C 68 -40 68 -76 60 -104 Z", "#5a3524", stroke(2.5));
      for (const d of ["M 30 -158 C 10 -150 -14 -140 -36 -126", "M 22 -190 C 40 -184 54 -168 60 -146", "M -10 -200 C -34 -190 -52 -168 -58 -140"]) P(h, d, "none", { ...stroke(2.5, "#7a4a32") });
    },
    faceExtra(x) { C(x, 0, 0, 0, "none"); },
  });
  LENA.o.sleeve = LENA.o.top;
  LENA.arms[-1].sh.querySelector("rect").setAttribute("fill", LENA.o.top); LENA.arms[1].sh.querySelector("rect").setAttribute("fill", LENA.o.top);
  for (const s of [-1, 1]) { LENA.arms[s].el.querySelectorAll("rect")[0].setAttribute("fill", LENA.o.top); LENA.arms[s].el.querySelectorAll("rect")[1].setAttribute("fill", LENA.o.top); }
  const earrings = [C(LENA.head, 0, 0, 5, "#f2c14e", stroke(1.5))];

  const BRAUN = makePerson({
    skin: "#e8b48c", skinShade: "#cf9670", iris: "#3e5a7a", brow: "#6b5a4a",
    top: "#f4f1ea", sleeve: pick(["#7a5a3a", "#3f5a7a", "#5a6b4a", "#7a3f3f"], 3),
    clothes(b) { const v = BRAUN_VEST; P(b, "M -74 12 C -86 60 -88 150 -80 260 L -14 260 L -14 60 L -34 -2 C -50 0 -64 4 -74 12 Z", v, stroke(3)); P(b, "M 74 12 C 86 60 88 150 80 260 L 14 260 L 14 60 L 34 -2 C 50 0 64 4 74 12 Z", v, stroke(3)); P(b, "M -26 -4 L 0 40 L 26 -4", "none", stroke(3)); for (const y of [90, 140, 190]) C(b, 0, y, 5, "#d9d2c4", stroke(1.5)); },
    hairBack(h) { },
    hairFront(h) { P(h, "M -60 -98 C -64 -130 -58 -150 -48 -160 C -44 -140 -42 -120 -40 -104 Z", "#7d6a5a", stroke(2.5)); P(h, "M 60 -98 C 64 -130 58 -150 48 -160 C 44 -140 42 -120 40 -104 Z", "#7d6a5a", stroke(2.5)); P(h, "M -30 -190 C -10 -198 14 -198 30 -190", "none", { ...stroke(3, "rgba(255,255,255,.55)") }); },
    faceExtra(x) { },
  });
  var BRAUN_VEST;
  // (the vest colour is picked once; set after the fact because clothes() ran inside makePerson)
  BRAUN_VEST = BRAUN.o.sleeve;
  BRAUN.body.innerHTML = ""; // rebuild his torso with the vest colour known
  // a tiny rebuild: torso, vest, neck, arms are drawn again in the right order
  (function rebuildBraun() {
    const o = BRAUN.o, b = BRAUN.body;
    P(b, "M -74 12 C -86 60 -88 150 -80 260 L 80 260 C 88 150 86 60 74 12 C 40 -6 -40 -6 -74 12 Z", o.top, stroke(3));
    o.clothes(b);
    P(b, "M -18 -22 L -20 6 C -8 16 8 16 20 6 L 18 -22 Z", o.skinShade, stroke(3));
    for (const s of [-1, 1]) {
      const sh = g(b, { transform: `translate(${s * 66},22)` }), shR = g(sh);
      el("rect", { x: -19, y: -14, width: 38, height: 122, rx: 19, fill: o.sleeve, ...stroke(3) }, shR);
      const el1 = g(shR, { transform: "translate(0,98)" }), elR = g(el1);
      el("rect", { x: -16, y: -10, width: 32, height: 100, rx: 16, fill: o.sleeve, ...stroke(3) }, elR);
      el("rect", { x: -15, y: 70, width: 30, height: 12, rx: 5, fill: "#f4f1ea", ...stroke(2) }, elR);
      const hw = g(elR, { transform: "translate(0,84)" }), hR = g(hw);
      const hands = {};
      hands.open = g(hR); E(hands.open, 0, 18, 17, 20, o.skin, stroke(3)); for (let i = 0; i < 4; i++) el("rect", { x: -15 + i * 8, y: 26, width: 8, height: 22 - Math.abs(i - 1.5) * 3, rx: 4, fill: o.skin, ...stroke(2) }, hands.open); E(hands.open, s * -17, 14, 6, 11, o.skin, { ...stroke(2), transform: `rotate(${s * 30} ${s * -17} 14)` });
      hands.fist = g(hR); el("rect", { x: -17, y: 2, width: 34, height: 34, rx: 13, fill: o.skin, ...stroke(3) }, hands.fist); P(hands.fist, "M -12 24 L 12 24 M -12 15 L 12 15", "none", stroke(1.6));
      hands.point = g(hR); el("rect", { x: -17, y: 2, width: 34, height: 30, rx: 12, fill: o.skin, ...stroke(3) }, hands.point); el("rect", { x: s * 6 - 4, y: 26, width: 9, height: 30, rx: 4.5, fill: o.skin, ...stroke(2) }, hands.point);
      hands.thumbs = g(hR); el("rect", { x: -17, y: 6, width: 34, height: 30, rx: 12, fill: o.skin, ...stroke(3) }, hands.thumbs); el("rect", { x: s * -14 - 5, y: -18, width: 10, height: 30, rx: 5, fill: o.skin, ...stroke(2) }, hands.thumbs);
      BRAUN.arms[s] = { sh: shR, el: elR, hand: hR, hands };
    }
    b.appendChild(BRAUN.headPivot);
  })();
  // his beard, moustache and glasses sit on the face
  const beard = P(BRAUN.head, "", "#7d6a5a", { ...stroke(2.5), opacity: 0.95 });
  BRAUN.head.insertBefore(beard, BRAUN.face);     // the beard sits under the eyes, nose and mouth
  const stache = P(BRAUN.face, "", "#6b5848", stroke(2.5));
  const glasses = g(BRAUN.face);
  BRAUN.face.appendChild(BRAUN.mouth);           // the mouth draws over the beard
  BRAUN.face.appendChild(stache); BRAUN.face.appendChild(glasses);

  // ------------------------------------------------------------------ the foreground: table or counter
  if (COUNTER) {
    R(front, 0, 760, 1080, 320, "#8e5a3a", stroke(4)); R(front, 0, 740, 1080, 36, "#6b4226", stroke(4));
  } else {
    P(front, "M -20 760 L 1100 760 L 1100 1100 L -20 1100 Z", "#a8794f", stroke(4)); R(front, -20, 742, 1120, 30, "#c9965f", stroke(4));
    const cup = g(front, { transform: "translate(470,700)" }); P(cup, "M -26 0 L 26 0 L 20 46 L -20 46 Z", "#ffffff", stroke(3)); P(cup, "M 24 10 C 42 10 42 32 22 32", "none", stroke(3)); E(cup, 0, 0, 26, 6, "#6b3e22", stroke(2));
  }

  // ------------------------------------------------------------------ layout
  const SC = 1.2;                                   // people scale in the world
  const POS = { lena: { x: 300, y: 600, f: 1 }, braun: { x: 790, y: 592, f: -1 } };
  const PEOPLE = { lena: LENA, braun: BRAUN };

  // ------------------------------------------------------------------ the lesson as time windows
  const L = (CFG.lines || []).filter((l) => l.who === "lena" || l.who === "braun");
  const HOOK = CFG.hookDur || 3, OUTRO = CFG.outroAt || 10, TOTAL = CFG.total || 12;
  const talk = { lena: [], braun: [] };
  L.forEach((l, i) => talk[l.who].push({ t0: l.t, t1: l.t + l.dur, text: l.de || "", i, key: !!l.key, item: l.item }));
  talk.lena.push({ t0: OUTRO + 0.4, t1: OUTRO + 1.9, text: "Bis morgen, tschüss!", i: 999, bye: true });
  // the last line of each scene is the joke: the listener laughs at it
  const lastOfScene = new Set();
  L.forEach((l, i) => { const n = L[i + 1]; if (!l.key && (!n || n.item !== l.item || n.key)) lastOfScene.add(i); });
  const GEST = (text) => /\?\s*$/.test(text) ? "shrug" : /\b(super|gut|abgemacht|perfekt|respekt|danke|genau|toll)\b/i.test(text) ? "thumbs" : /^(ich|mein|mir)\b/i.test(text) ? "chest" : /^(du|dich|dir)\b/i.test(text) ? "point" : "open";

  // poses: [outward shoulder°, inward elbow°, hand]
  const POSE = {
    table: [8, 104, "open"], open: [30, 122, "open"], chest: [10, 140, "open"], point: [62, 14, "point"],
    shrug: [34, 112, "open"], thumbs: [16, 140, "thumbs"], cross: [8, 158, "fist"], chin: [12, 166, "fist"],
    wave: [64, 118, "open"], laugh: [8, 126, "fist"],
  };
  function setArm(p, s, pose, wobble = 0) {
    const [so, ei, hand] = pose;
    const a = p.arms[s];
    a.sh.setAttribute("transform", `rotate(${-s * so + wobble})`);
    a.el.setAttribute("transform", `rotate(${s * ei})`);
    for (const [k, h] of Object.entries(a.hands)) h.setAttribute("display", k === hand ? "inline" : "none");
  }
  const blendPose = (A, B, k) => [lerp(A[0], B[0], k), lerp(A[1], B[1], k), k > 0.5 ? B[2] : A[2]];

  // mouth shapes for a vowel: [width, open, round]
  const VIS = { a: [36, 1, 0], e: [42, 0.55, 0], i: [44, 0.35, 0], o: [26, 0.85, 1], u: [20, 0.5, 1], m: [34, 0, 0] };
  const visOf = (v) => (/[äe]/.test(v) ? "e" : /[iy]/.test(v) ? "i" : /[oö]/.test(v) ? "o" : /[uü]/.test(v) ? "u" : "a");
  function mouthAt(who, t) {
    for (const x of talk[who]) {
      if (t < x.t0 || t > x.t1) continue;
      const vowels = String(x.text).toLowerCase().match(/[aeiouäöüy]+/g) || ["a"], step = (x.t1 - x.t0) / vowels.length;
      const k = Math.min(vowels.length - 1, Math.floor((t - x.t0) / step)), ph = ((t - x.t0) / step) % 1;
      const amt = Math.sin(Math.PI * clamp(ph * 1.2, 0, 1)) * win(t, x.t0, x.t1, 0.05);
      return { shape: VIS[visOf(vowels[k])], amt, line: x };
    }
    return { shape: VIS.m, amt: 0, line: null };
  }
  const BLINK = [2.9, 4.1, 3.4, 2.2, 5.0, 3.6];
  function blinkAt(t, off) { let b = off, i = 0, v = 0; while (b < t + 0.2) { const d = Math.abs(t - b); if (d < 0.07) v = Math.max(v, 1 - d / 0.07); b += BLINK[i++ % BLINK.length]; } return v; }

  // ------------------------------------------------------------------ the face, drawn from expression values
  function drawFace(p, who, t, ex) {
    const f = ex.facing;                                  // -1 .. 1: where the face points
    const fx = f * 12;
    // ear on the far side
    p.ear.setAttribute("cx", -f * 56); p.ear.setAttribute("cy", -96);
    p.shade.setAttribute("d", `M ${-f * 58} -100 C ${-f * 58} -60 ${-f * 36} -26 ${-f * 6} -21 C ${-f * 26} -36 ${-f * 44} -62 ${-f * 46} -98 Z`);
    p.blushL.setAttribute("cx", fx - 34); p.blushL.setAttribute("cy", -72); p.blushR.setAttribute("cx", fx + 34); p.blushR.setAttribute("cy", -72);
    const op = 0.25 + 0.35 * ex.smile; p.blushL.setAttribute("opacity", op); p.blushR.setAttribute("opacity", op);
    // eyes
    p.eyes.forEach((e, i) => {
      const side = i === 0 ? -1 : 1, far = side === -Math.sign(f || 1) ? 0.88 : 1;
      const ex0 = fx + side * 24 * (1 - Math.abs(f) * 0.12), ey0 = -112;
      e.eg.setAttribute("transform", `translate(${ex0},${ey0}) scale(${far},1)`);
      const wide = 1 + 0.25 * ex.wide;
      e.white.setAttribute("ry", 10 * wide);
      e.iris.setAttribute("transform", `translate(${ex.look * 4 + f * 2},${ex.lookY * 2})`);
      const close = clamp(Math.max(ex.blink, ex.lid), 0, 1);          // 0 open, 1 closed
      const top = -10 * wide, yl = lerp(top - 1, 10, close);
      e.lid.setAttribute("d", `M -15 ${top - 6} L 15 ${top - 6} L 15 ${yl} Q 0 ${yl + 3 - close * 2} -15 ${yl} Z`);
      e.lash.setAttribute("d", `M -14 ${yl + 0.5} Q 0 ${yl - 5 + close * 6} 14 ${yl + 0.5}`);
      const happy = ex.happy;
      e.white.setAttribute("opacity", 1 - happy); e.iris.setAttribute("opacity", 1 - happy); e.lid.setAttribute("opacity", 1 - happy); e.lash.setAttribute("opacity", 1 - happy);
      e.happy.setAttribute("opacity", happy);
    });
    // brows: raise, angry (inner down), worried (inner up)
    p.brows.forEach((b, i) => {
      const side = i === 0 ? -1 : 1, bx = fx + side * 24, by = -136 - 7 * ex.raise + 3 * ex.angry;
      const inner = -side * 15, outer = side * 15;
      const yi = by + 7 * ex.angry - 8 * ex.worry, yo = by - 3 * ex.angry + 2 * ex.worry;
      b.setAttribute("d", `M ${bx + inner} ${yi} Q ${bx} ${by - 6} ${bx + outer} ${yo}`);
    });
    // nose
    p.nose.setAttribute("d", `M ${fx + f * 2} -104 C ${fx + f * 10} -88 ${fx + f * 14} -78 ${fx + f * 4} -72 C ${fx} -70 ${fx - f * 6} -72 ${fx - f * 8} -75`);
    // mouth: width, open, round, smile
    const w = ex.mw, o = ex.mo, sm = ex.smile - ex.frown * 0.8, cx = fx + f * 3, cy = -52;
    const yc = cy - sm * 7, top = cy - o * 4 - sm * 1, bot = cy + o * 24 + sm * 6;
    if (o < 0.06) {
      for (const e of [p.mOuter, p.mTeeth, p.mTongue]) e.setAttribute("d", "");
      p.mLine.setAttribute("d", `M ${cx - w / 2} ${yc} Q ${cx} ${cy + sm * 9} ${cx + w / 2} ${yc}`);
    } else {
      p.mLine.setAttribute("d", "");
      p.mOuter.setAttribute("d", `M ${cx - w / 2} ${yc} C ${cx - w / 4} ${top} ${cx + w / 4} ${top} ${cx + w / 2} ${yc} C ${cx + w / 3} ${bot} ${cx - w / 3} ${bot} ${cx - w / 2} ${yc} Z`);
      const tb = top + 2 + o * 5;
      p.mTeeth.setAttribute("d", o > 0.25 ? `M ${cx - w / 2 + 6} ${yc + 1} C ${cx - w / 4} ${top + 3} ${cx + w / 4} ${top + 3} ${cx + w / 2 - 6} ${yc + 1} L ${cx + w / 2 - 8} ${tb} L ${cx - w / 2 + 8} ${tb} Z` : "");
      p.mTongue.setAttribute("d", o > 0.4 ? `M ${cx - w / 4} ${bot - 4} Q ${cx} ${bot - 14 * o} ${cx + w / 4} ${bot - 4} Z` : "");
    }
    if (p === BRAUN) {
      // a short beard along the jaw and round the chin, below the mouth
      beard.setAttribute("d", `M ${-55 + fx * 0.2} -88 C ${-56 + fx * 0.2} -54 ${-36 + fx * 0.4} -16 ${fx * 0.6} -12 C ${36 + fx * 0.4} -16 ${56 + fx * 0.2} -54 ${55 + fx * 0.2} -88 C ${47 + fx * 0.6} -66 ${34 + fx} ${-36 + o * 16} ${fx} ${-32 + o * 20} C ${-34 + fx} ${-36 + o * 16} ${-47 + fx * 0.6} -66 ${-55 + fx * 0.2} -88 Z`);
      stache.setAttribute("d", `M ${cx - 24} ${yc - 4} C ${cx - 14} ${-70} ${cx + 14} ${-70} ${cx + 24} ${yc - 4} C ${cx + 12} ${yc - 10} ${cx - 12} ${yc - 10} ${cx - 24} ${yc - 4} Z`);
      glasses.innerHTML = "";
      for (const side of [-1, 1]) el("rect", { x: fx + side * 24 - 19, y: -126, width: 38, height: 28, rx: 9, fill: "rgba(255,255,255,.12)", ...stroke(4, "#2a2220") }, glasses);
      el("path", { d: `M ${fx - 5} -114 Q ${fx} -118 ${fx + 5} -114`, fill: "none", ...stroke(4, "#2a2220") }, glasses);
    } else {
      earrings[0].setAttribute("cx", -f * 56); earrings[0].setAttribute("cy", -70);
    }
  }

  // ------------------------------------------------------------------ acting
  function act(who, t) {
    const p = PEOPLE[who], other = who === "lena" ? "braun" : "lena", pos = POS[who];
    const s = pos.f;                                           // the arm nearest the other person is s
    const { shape, amt, line } = mouthAt(who, t);
    const speaking = Math.max(0, ...talk[who].map((x) => win(t, x.t0 - 0.1, x.t1 + 0.2, 0.2)));
    const listening = Math.max(0, ...talk[other].map((x) => win(t, x.t0 - 0.1, x.t1 + 0.3, 0.25)));
    // the joke: whoever did not say the last line of a scene laughs at it
    let laugh = 0, smirk = 0;
    L.forEach((l, i) => { if (!lastOfScene.has(i)) return; const w = win(t, l.t + l.dur * 0.7, l.t + l.dur + 1.6, 0.3); if (l.who === other) laugh = Math.max(laugh, w); else smirk = Math.max(smirk, w); });
    // a question raises the brows; "nicht / kein" shakes the head and worries the brows
    let q = 0, neg = 0, keyW = 0, bang = 0;
    for (const x of talk[who]) {
      const w = win(t, x.t0 - 0.1, x.t1 + 0.3, 0.2);
      if (/\?\s*$/.test(x.text)) q = Math.max(q, w);
      if (/\b(nicht|kein|keine|nein)\b/i.test(x.text)) neg = Math.max(neg, w);
      if (/!\s*$/.test(x.text)) bang = Math.max(bang, w);
      if (x.key) keyW = Math.max(keyW, win(t, x.t0 - 0.2, x.t1 + 1.6, 0.3));
    }
    // hello and goodbye
    const hello = who === "braun" ? win(t, 0.2, Math.min(HOOK, 2.6), 0.3) : win(t, 0.5, Math.min(HOOK + 0.3, 2.9), 0.3);
    const bye = win(t, OUTRO + 0.2, TOTAL - 0.2, 0.3);
    // facing: towards the other person; to the camera for the key phrase and the goodbye
    const facing = lerp(pos.f, 0, Math.max(keyW, bye * 0.7));
    // body: breathing, a lean towards the other person while talking, laughing shakes
    const breathe = Math.sin(t * 2 * Math.PI / (who === "lena" ? 3.4 : 3.9)) * 2;
    const shake = laugh * Math.sin(t * 38) * 3;
    const lean = s * (speaking * 4 + bang * 3) - s * laugh * 4;
    p.root.setAttribute("transform", `translate(${pos.x},${pos.y + breathe * 0.4 + shake * 0.5}) scale(${SC})`);
    p.body.setAttribute("transform", `rotate(${lean} 0 240)`);
    const nod = Math.sin(t * 7.2) * 3 * speaking + (laugh ? Math.sin(t * 20) * 3 * laugh : 0);
    const shakeHead = neg * Math.sin(t * 11) * 6;
    const tilt = q * s * 6 + listening * s * 3 - laugh * s * 6;
    p.headPivot.setAttribute("transform", `translate(${shakeHead * 0.6},${-14 + nod * 0.5}) rotate(${tilt + nod * 0.4})`);
    // arms: the near arm gestures while talking, the far one rests; poses blend in and out
    const g0 = line ? GEST(line.text) : "open";
    let near = POSE.table, far = POSE.table;
    if (speaking > 0) {
      const gp = POSE[g0];
      const beat = Math.sin(t * 6.2) * 6 * speaking;
      near = blendPose(POSE.table, [gp[0], gp[1] + beat, gp[2]], speaking);
      if (g0 === "shrug") far = blendPose(POSE.table, POSE.shrug, speaking);
    }
    if (laugh > 0) { near = blendPose(near, POSE.laugh, laugh); far = blendPose(far, POSE.laugh, laugh); }
    if (keyW > 0 && speaking > 0) near = blendPose(near, [30, 120, "open"], keyW);
    const hb = Math.max(hello, bye);
    if (hb > 0) near = blendPose(near, [POSE.wave[0], POSE.wave[1] + Math.sin(t * 13) * 14, "open"], hb);
    // the listener crosses the arms sometimes (every other scene), Herr Braun rests his chin
    const crossW = listening * (1 - laugh) * (who === "braun" ? 0 : 0.0);
    setArm(p, s, near); setArm(p, -s, crossW > 0.5 ? POSE.cross : far);
    // face
    const blink = blinkAt(t, who === "lena" ? 0.4 : 1.7);
    const happy = laugh * 0.95;
    drawFace(p, who, t, {
      facing, blink, lid: 0.12 + 0.25 * smirk * 0 + 0.1 * listening, wide: q * 0.6 + bang * 0.4, look: s * 0.6 * listening + s * 0.3 * speaking, lookY: 0,
      raise: q + bang * 0.6 + laugh * 0.3, angry: 0, worry: neg * 0.9,
      smile: Math.max(0.15, smirk * 0.8, laugh * 0.9, hello * 0.7, bye * 0.8, listening * 0.25) * (1 - neg * 0.7), frown: neg * 0.5,
      happy,
      mw: lerp(lerp(36, shape[0], amt), 44, laugh), mo: Math.max(amt * shape[1] * 1.1, laugh * (0.55 + 0.25 * Math.abs(Math.sin(t * 19)))), round: shape[2],
    });
  }

  // ------------------------------------------------------------------ camera: hard cuts, a slow push in on every shot
  const CU = (who) => { const p = POS[who]; return { s: 1.9, x: p.x + (who === "lena" ? 45 : -45), y: p.y - 120 * SC }; };
  const SHOTS = [];
  SHOTS.push({ t: 0, k: { s: 1.22, x: 545, y: 500 } });
  L.forEach((l) => SHOTS.push({ t: l.t - 0.25, k: CU(l.who) }));
  // explanations come between lines: back to the two-shot while nobody on stage speaks
  for (let i = 0; i < L.length - 1; i++) { const gap = L[i + 1].t - (L[i].t + L[i].dur); if (gap > 2.2) SHOTS.push({ t: L[i].t + L[i].dur + 0.35, k: { s: 1.2, x: 545, y: 520 } }); }
  SHOTS.push({ t: OUTRO, k: { s: 1.1, x: 540, y: 520 } });
  SHOTS.sort((a, b) => a.t - b.t);
  function cameraAt(t) {
    let cur = SHOTS[0], since = t;
    for (const s of SHOTS) if (t >= s.t) { cur = s; since = t - s.t; }
    const z = cur.k.s * (1 + Math.min(0.06, since * 0.012));
    const dx = Math.sin(t * 0.6) * 3, dy = Math.sin(t * 0.43) * 2;
    world.setAttribute("transform", `translate(540,540) scale(${z}) translate(${-cur.k.x + dx},${-cur.k.y + dy})`);
  }

  function draw(t) {
    act("lena", t); act("braun", t);
    cameraAt(t);
  }
  window.__cartoonDraw = draw;
  draw(window.__hfThreeTime || 0);
  window.addEventListener("hf-seek", (ev) => draw(ev.detail.time));
})();
