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
  // light, shading and depth: gradients, a depth-of-field blur on the set, a soft vignette
  const DEFS = el("defs", {}, svg);
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const tone = (c, k) => "#" + hex(c).map((v) => Math.round(clamp(k > 0 ? v + (255 - v) * k : v * (1 + k), 0, 255)).toString(16).padStart(2, "0")).join("");
  function lin(id, stops, x2 = 0, y2 = 1) {
    const lg = el("linearGradient", { id, x1: 0, y1: 0, x2, y2 }, DEFS);
    stops.forEach(([o, c, a = 1]) => el("stop", { offset: o, "stop-color": c, "stop-opacity": a }, lg));
    return `url(#${id})`;
  }
  function rad(id, stops, cx = 0.5, cy = 0.5, r = 0.5) {
    const rg = el("radialGradient", { id, cx, cy, r }, DEFS);
    stops.forEach(([o, c, a = 1]) => el("stop", { offset: o, "stop-color": c, "stop-opacity": a }, rg));
    return `url(#${id})`;
  }
  const dof = el("filter", { id: "dof", x: "-5%", y: "-5%", width: "110%", height: "110%" }, DEFS);
  const dofBlur = el("feGaussianBlur", { stdDeviation: 1.5 }, dof);
  const soft = el("filter", { id: "soft", x: "-20%", y: "-20%", width: "140%", height: "140%" }, DEFS);
  el("feGaussianBlur", { stdDeviation: 9 }, soft);
  const world = g(svg, { id: "world" });
  const back = g(world, { filter: "url(#dof)" }), ambient = g(world), people = g(world), light = g(world), front = g(world);
  const R = (p, x, y, w, h, fill, extra = {}) => el("rect", { x, y, width: w, height: h, fill, ...extra }, p);
  const P = (p, d, fill, extra = {}) => el("path", { d, fill, ...extra }, p);
  const C = (p, cx, cy, r, fill, extra = {}) => el("circle", { cx, cy, r, fill, ...extra }, p);
  const E = (p, cx, cy, rx, ry, fill, extra = {}) => el("ellipse", { cx, cy, rx, ry, fill, ...extra }, p);
  const stroke = (w = 3, c = INK) => ({ stroke: c, "stroke-width": w, "stroke-linejoin": "round", "stroke-linecap": "round" });
  const WALKERS = [], WINDOWS = [];
  function windowCity(x, y, w, h) {
    WINDOWS.push({ x, y, w, h });
    const d = el("defs", {}, back), id = `sky${x}`;
    const lg = el("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 }, d);
    el("stop", { offset: 0, "stop-color": SKY[0] }, lg); el("stop", { offset: 1, "stop-color": SKY[1] }, lg);
    R(back, x, y, w, h, `url(#${id})`);
    for (let i = 0; i < 7; i++) { const bw = 40 + rnd(i + x) * 60, bh = 80 + rnd(i + 9 + x) * 160, bx = x + i * (w / 7) + rnd(i) * 10; R(back, bx, y + h - bh, bw, bh, TOD === "evening" ? "#c98c6c" : "#a9bccb", { opacity: 0.85 }); for (let r = 0; r < 4; r++) R(back, bx + 8, y + h - bh + 14 + r * 26, 10, 12, "#eef4f8", { opacity: 0.7 }); }
    const cp = el("clipPath", { id: `glass${x}` }, d); R(cp, x, y, w, h, "#000");
    const street = g(back, { "clip-path": `url(#glass${x})` });
    for (let i = 0; i < 3; i++) {
      const walker = g(street), col = ["#5a6b8a", "#8a5a5a", "#4f6b55"][i];
      E(walker, 0, -88, 13, 15, "#3a3030"); P(walker, "M -16 -72 C -20 -40 -18 -10 -14 0 L 14 0 C 18 -10 20 -40 16 -72 Z", col);
      R(walker, -12, 0, 9, 34, "#2e2a2a"); R(walker, 3, 0, 9, 34, "#2e2a2a");
      WALKERS.push({ g: walker, x0: x - 40, w: w + 80, y: y + h - 6, speed: 34 + i * 17, phase: rnd(i + x) * (w + 80), dir: i % 2 ? -1 : 1 });
    }
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
  // The two people are drawn from the owner's reference portraits (2026-10-04): Lena with long
  // wavy dark hair, big lashed eyes, hoop earrings and a pink hoodie; Herr Braun with short
  // dark hair, a broad face, a small chin beard and a blue crew-neck sweatshirt.
  const FACE_SOFT = "M -58 -100 C -62 -168 -30 -196 0 -196 C 30 -196 62 -168 58 -100 C 58 -60 36 -26 0 -20 C -36 -26 -58 -60 -58 -100 Z";
  const FACE_BROAD = "M -63 -102 C -66 -170 -32 -198 0 -198 C 32 -198 66 -170 63 -102 C 63 -62 48 -30 22 -20 C 8 -15 -8 -15 -22 -20 C -48 -30 -63 -62 -63 -102 Z";
  function makePerson(o) {
    const root = g(people), body = g(root), headPivot = g(body, { transform: "translate(0,-14)" }), head = g(headPivot);
    const arms = {};
    // torso and clothes
    const TOP = lin(`top-${o.id}`, [[0, tone(o.top, 0.16)], [1, tone(o.top, -0.2)]]);
    const SLV = lin(`slv-${o.id}`, [[0, tone(o.top, 0.18)], [0.6, o.top], [1, tone(o.top, -0.22)]], 1, 0);
    const SKIN = lin(`skin-${o.id}`, [[0, tone(o.skin, 0.14)], [0.55, o.skin], [1, tone(o.skin, -0.1)]], 1, 0.35);
    P(body, "M -74 12 C -86 60 -88 150 -80 260 L 80 260 C 88 150 86 60 74 12 C 40 -6 -40 -6 -74 12 Z", TOP, stroke(3));
    P(body, "M -74 12 C -64 40 -60 80 -62 120", "none", { ...stroke(2, "rgba(0,0,0,.18)") });
    P(body, "M 74 12 C 64 40 60 80 62 120", "none", { ...stroke(2, "rgba(0,0,0,.12)") });
    // neck
    P(body, "M -18 -22 L -20 6 C -8 16 8 16 20 6 L 18 -22 Z", o.skinShade, stroke(3));
    o.clothes(body);
    // arms: shoulder → upper arm → elbow → forearm → hand
    for (const s of [-1, 1]) {
      const sh = g(body, { transform: `translate(${s * 66},22)` }), shR = g(sh);
      el("rect", { x: -19, y: -14, width: 38, height: 122, rx: 19, fill: SLV, ...stroke(3) }, shR);
      const el1 = g(shR, { transform: "translate(0,98)" }), elR = g(el1);
      el("rect", { x: -16, y: -10, width: 32, height: 100, rx: 16, fill: SLV, ...stroke(3) }, elR);
      el("rect", { x: -16, y: 66, width: 32, height: 16, rx: 6, fill: o.cuff, ...stroke(2) }, elR);
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
    P(head, o.face, SKIN, stroke(3));
    P(head, "M -50 -150 C -40 -176 -18 -188 4 -190", "none", { ...stroke(5, "#ffffff"), opacity: 0.18 });
    const shade = P(head, "", o.skinShade, { opacity: 0.55 });
    const stubble = o.stubble ? P(head, "", o.stubble, { opacity: 0.16 }) : null;
    const blushL = E(head, 0, 0, 12, 6, "#f0a0a0", { opacity: 0.35 }), blushR = E(head, 0, 0, 12, 6, "#f0a0a0", { opacity: 0.35 });
    const face = g(head);
    const ew = o.eyeW || 13, eh = o.eyeH || 10, ir = o.irisR || 6.5;
    const eyes = [-1, 1].map(() => {
      const eg = g(face);
      const white = E(eg, 0, 0, ew, eh, "#ffffff", stroke(2.5));
      const iris = g(eg); C(iris, 0, 1, ir, rad(`iris-${o.id}`, [[0, tone(o.iris, 0.45)], [0.65, o.iris], [1, tone(o.iris, -0.45)]])); C(iris, 0, 1, ir * 0.5, "#140c08");
      C(iris, ir * 0.32, -ir * 0.25, ir * 0.3, "#ffffff"); C(iris, -ir * 0.3, ir * 0.4, ir * 0.13, "#ffffff", { opacity: 0.8 });
      const lid = P(eg, "", o.skin, {});
      const lash = P(eg, "", "none", stroke(o.lashW || 3.2));
      const wing = P(eg, "", "none", stroke(3, INK));
      const happy = P(eg, `M ${-ew + 1} 3 Q 0 -9 ${ew - 1} 3`, "none", { ...stroke(4), opacity: 0 });
      return { eg, white, iris, lid, lash, wing, happy };
    });
    const brows = [-1, 1].map(() => P(face, "", "none", { ...stroke(o.browW || 7, o.brow) }));
    const nose = P(face, "", "none", stroke(3));
    const chin = o.chinBeard ? P(face, "", o.hair, stroke(1.5, o.hair)) : null;
    const mouth = g(face);
    const mOuter = P(mouth, "", "#5a1d1d", stroke(3)), mTeeth = P(mouth, "", "#ffffff", {}), mTongue = P(mouth, "", "#d9696f", {}), mLine = P(mouth, "", "none", stroke(3.4, o.lip || INK));
    const hairFront = g(head); o.hairFront(hairFront);
    const hoops = o.hoops ? [C(head, 0, 0, 8, "none", stroke(2.6, "#c9ccd2"))] : [];
    body.appendChild(headPivot);                   // the head is drawn over the torso
    return { o, root, body, headPivot, head, arms, ear, shade, stubble, hairBack, hairFront, blushL, blushR, eyes, brows, nose, chin, mouth, mOuter, mTeeth, mTongue, mLine, hoops, face };
  }

  const HAIR_L = lin("hair-l", [[0, "#5e3d2c"], [0.3, "#2e1d16"], [1, "#1c110c"]]);
  const HAIR_B = lin("hair-b", [[0, "#4a3a30"], [0.35, "#1f1713"], [1, "#140e0b"]]);
  const gloss = (h, d) => P(h, d, "none", { ...stroke(6, "#ffffff"), opacity: 0.2 });
  const LENA = makePerson({ id: "lena",
    skin: "#f6d3bd", skinShade: "#e8b49a", iris: "#6b4630", brow: "#3a2418", hair: "#2e1d16", lip: "#c4566a",
    face: FACE_SOFT, eyeW: 15, eyeH: 12.5, irisR: 8.5, lashW: 4.2, lashes: true, browW: 5.5, browUp: 6, lidBase: 0.02, smileBase: 0.38, hoops: true,
    top: "#f4b9c9", cuff: "#eaa5b8",
    clothes(b) {
      // the hood lies round the neck, two drawstrings and a small heart
      P(b, "M -58 8 C -50 -14 -24 -22 0 -22 C 24 -22 50 -14 58 8 C 40 28 -40 28 -58 8 Z", "#eaa5b8", stroke(3));
      P(b, "M -34 2 C -20 14 20 14 34 2", "none", stroke(2.5));
      for (const x of [-14, 14]) { P(b, `M ${x} 12 L ${x * 1.2} 96`, "none", stroke(3, "#f9e6ec")); P(b, `M ${x} 12 L ${x * 1.2} 96`, "none", stroke(1, "rgba(0,0,0,.25)")); E(b, x * 1.2, 100, 3.5, 6, "#f9e6ec", stroke(1.5)); }
      P(b, "M 40 150 C 40 142 50 140 52 148 C 54 140 64 142 64 150 C 64 158 56 162 52 168 C 48 162 40 158 40 150 Z", "none", stroke(2, "#ffffff"));
    },
    hairBack(h) {
      // long, full and wavy, past the shoulders
      P(h, "M -64 -140 C -92 -110 -100 -70 -90 -40 C -110 -14 -96 14 -108 40 C -124 70 -100 96 -114 124 C -110 150 -82 164 -60 150 C -70 128 -52 110 -60 86 C -66 60 -46 40 -50 16 C -44 -4 -38 -20 -30 -30 L 30 -30 C 38 -20 44 -4 50 16 C 46 40 66 60 60 86 C 52 110 70 128 60 150 C 82 164 110 150 114 124 C 100 96 124 70 108 40 C 96 14 110 -14 90 -40 C 100 -70 92 -110 64 -140 C 50 -206 -50 -206 -64 -140 Z", HAIR_L, stroke(3));
      for (const d of ["M -84 -30 C -98 0 -86 30 -100 60 C -110 84 -96 104 -104 128", "M 84 -30 C 98 0 86 30 100 60 C 110 84 96 104 104 128", "M -60 30 C -70 60 -56 90 -72 120", "M 60 30 C 70 60 56 90 72 120"]) P(h, d, "none", { ...stroke(2.4, "#5e3e2e") });
    },
    hairFront(h) {
      // a middle part; soft waves frame the face down to the cheeks
      P(h, "M 0 -206 C -44 -206 -74 -176 -74 -128 C -76 -100 -66 -78 -72 -56 C -60 -70 -60 -96 -56 -112 C -46 -150 -24 -180 0 -190 Z", HAIR_L, stroke(3));
      P(h, "M 0 -206 C 44 -206 74 -176 74 -128 C 76 -100 66 -78 72 -56 C 60 -70 60 -96 56 -112 C 46 -150 24 -180 0 -190 Z", HAIR_L, stroke(3));
      gloss(h, "M -14 -192 C -36 -184 -50 -166 -56 -146"); gloss(h, "M 14 -192 C 36 -184 50 -166 56 -146");
      for (const d of ["M -6 -198 C -34 -190 -54 -166 -62 -132", "M 6 -198 C 34 -190 54 -166 62 -132", "M -66 -120 C -70 -100 -64 -84 -68 -66"]) P(h, d, "none", { ...stroke(2.2, "#6a4634") });
    },
  });
  const BRAUN = makePerson({ id: "braun",
    skin: "#efc3a0", skinShade: "#d9a27e", iris: "#4a3020", brow: "#1f1612", hair: "#1f1713", lip: "#a8574e", stubble: "#3a2a22",
    face: FACE_BROAD, eyeW: 12, eyeH: 8.5, irisR: 6, lashW: 3, browW: 8.5, chinBeard: true,
    top: "#4e78b4", cuff: "#41679d",
    clothes(b) {
      // a ribbed crew neck
      P(b, "M -40 -6 C -26 18 26 18 40 -6 C 34 -12 28 -14 22 -14 C 12 0 -12 0 -22 -14 C -28 -14 -34 -12 -40 -6 Z", "#41679d", stroke(3));
      P(b, "M -34 -4 C -20 12 20 12 34 -4", "none", stroke(1.5, "rgba(0,0,0,.25)"));
      P(b, "M -70 40 C -40 50 -20 46 -10 40", "none", stroke(2, "rgba(0,0,0,.14)")); P(b, "M 70 40 C 40 50 20 46 10 40", "none", stroke(2, "rgba(0,0,0,.14)"));
    },
    hairBack(h) { },
    hairFront(h) {
      // short dark hair, a little higher at the temples, textured on top
      P(h, "M -61 -122 C -68 -168 -44 -212 0 -214 C 44 -216 68 -170 61 -122 C 58 -138 54 -148 47 -156 L 40 -149 L 33 -160 L 22 -151 L 12 -163 L 1 -153 L -10 -164 L -20 -153 L -31 -162 L -40 -151 L -47 -158 C -53 -148 -58 -136 -61 -122 Z", HAIR_B, stroke(3));
      gloss(h, "M -30 -196 C -10 -204 14 -204 32 -194");
      for (const d of ["M -40 -196 L -30 -206", "M -16 -204 L -4 -212", "M 12 -206 L 24 -212", "M 34 -196 L 46 -200", "M -50 -170 L -40 -180"]) P(h, d, "none", { ...stroke(3, "#3a2c24") });
      for (const s of [-1, 1]) P(h, `M ${s * 61} -124 L ${s * 61} -98 L ${s * 57} -98 L ${s * 55} -122 Z`, HAIR_B, stroke(1.5));
    },
  });
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
  const VIS = { a: [36, 1, 0], e: [42, 0.55, 0], i: [44, 0.35, 0], o: [26, 0.85, 1], u: [20, 0.5, 1], m: [34, 0, 0], f: [36, 0.25, 0] };
  const visOf = (v) => (/[äe]/.test(v) ? "e" : /[iy]/.test(v) ? "i" : /[oö]/.test(v) ? "o" : /[uü]/.test(v) ? "u" : "a");
  // lip sync: every letter gets a slice of the line (vowels longer); m/b/p close the lips,
  // f/v/w bring the lower lip to the teeth, other consonants anticipate the next vowel
  const VOW = /[aeiouäöüy]/;
  function segsOf(x) {
    if (x.segs) return x.segs;
    const letters = String(x.text).toLowerCase().replace(/[^a-zäöüß]/g, "") || "a";
    let acc = 0; const segs = [];
    for (let i = 0; i < letters.length; i++) { const ch = letters[i], w = VOW.test(ch) ? 2.2 : 1; segs.push({ ch, i, a: acc, w }); acc += w; }
    segs.forEach((sg) => { sg.a /= acc; sg.w /= acc; let j = sg.i; while (j < letters.length && !VOW.test(letters[j])) j++; sg.next = letters[j] || "a"; });
    return (x.segs = segs);
  }
  function mouthAt(who, t) {
    for (const x of talk[who]) {
      if (t < x.t0 || t > x.t1) continue;
      const segs = segsOf(x), u = clamp((t - x.t0) / (x.t1 - x.t0), 0, 0.9999);
      let sg = segs[0]; for (const c of segs) if (u >= c.a) sg = c;
      const q = clamp((u - sg.a) / sg.w, 0, 1), env = win(t, x.t0, x.t1, 0.05);
      let shape, amt;
      if (VOW.test(sg.ch)) { shape = VIS[visOf(sg.ch)]; amt = 0.45 + 0.55 * Math.sin(Math.PI * q); }
      else if (/[mbp]/.test(sg.ch)) { shape = VIS.m; amt = 0; }
      else if (/[fvw]/.test(sg.ch)) { shape = VIS.f; amt = 0.22; }
      else { shape = VIS[visOf(sg.next)]; amt = 0.3; }
      return { shape, amt: amt * env, line: x };
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
      const ew = p.o.eyeW || 13, eh = p.o.eyeH || 10;
      e.white.setAttribute("ry", eh * wide);
      e.iris.setAttribute("transform", `translate(${ex.look * 4 + f * 2},${ex.lookY * 2})`);
      const close = clamp(Math.max(ex.blink, ex.lid), 0, 1);          // 0 open, 1 closed
      const top = -eh * wide, yl = lerp(top - 1, eh, close), lw = ew + 2;
      e.lid.setAttribute("d", `M ${-lw} ${top - 6} L ${lw} ${top - 6} L ${lw} ${yl} Q 0 ${yl + 3 - close * 2} ${-lw} ${yl} Z`);
      e.lash.setAttribute("d", `M ${-lw + 1} ${yl + 0.5} Q 0 ${yl - 5 + close * 6} ${lw - 1} ${yl + 0.5}`);
      e.wing.setAttribute("d", p.o.lashes ? `M ${side * (lw - 2)} ${yl + 1} L ${side * (lw + 5)} ${yl - 5}` : "");
      if (p.o.lashes) e.wing.setAttribute("opacity", 1 - ex.happy);
      const happy = ex.happy;
      e.white.setAttribute("opacity", 1 - happy); e.iris.setAttribute("opacity", 1 - happy); e.lid.setAttribute("opacity", 1 - happy); e.lash.setAttribute("opacity", 1 - happy);
      e.happy.setAttribute("opacity", happy);
    });
    // brows: raise, angry (inner down), worried (inner up)
    p.brows.forEach((b, i) => {
      const side = i === 0 ? -1 : 1, bx = fx + side * 25, by = -136 - (p.o.browUp || 0) - 7 * ex.raise + 3 * ex.angry;
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
    if (p.chin) {
      // a small beard under the lower lip, and a light shadow of stubble on the jaw
      const y0 = (o < 0.06 ? cy + 7 : bot + 3) - sm * 2;
      p.chin.setAttribute("d", `M ${cx - 6} ${y0} C ${cx - 4} ${y0 + 14} ${cx + 4} ${y0 + 14} ${cx + 6} ${y0} C ${cx + 2} ${y0 + 2} ${cx - 2} ${y0 + 2} ${cx - 6} ${y0} Z`);
    }
    if (p.stubble) p.stubble.setAttribute("d", `M ${-60 + fx * 0.2} -84 C ${-58 + fx * 0.2} -50 ${-40 + fx * 0.4} -24 ${fx * 0.6} -17 C ${40 + fx * 0.4} -24 ${58 + fx * 0.2} -50 ${60 + fx * 0.2} -84 C ${46 + fx * 0.5} -60 ${30 + fx} -64 ${fx} -64 C ${-30 + fx} -64 ${-46 + fx * 0.5} -60 ${-60 + fx * 0.2} -84 Z`);
    for (const h of p.hoops) { h.setAttribute("cx", -f * 58); h.setAttribute("cy", -62); }
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
    // the hair follows the head a moment late and drifts a little on its own
    const sway = -(tilt + nod * 0.4) * 0.45 - shakeHead * 0.25 + Math.sin(t * 1.7 + (who === "lena" ? 0 : 2)) * 0.9 + speaking * Math.sin(t * 6.2 - 0.6) * 0.5;
    p.hairBack.setAttribute("transform", `rotate(${sway} 0 -170)`);
    p.hairFront.setAttribute("transform", `rotate(${sway * 0.35} 0 -170)`);
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
      facing, blink, lid: (p.o.lidBase ?? 0.12) + 0.1 * listening, wide: q * 0.6 + bang * 0.4, look: s * 0.6 * listening + s * 0.3 * speaking, lookY: 0,
      raise: q + bang * 0.6 + laugh * 0.3, angry: 0, worry: neg * 0.9,
      smile: Math.max(p.o.smileBase || 0.15, smirk * 0.8, laugh * 0.9, hello * 0.7, bye * 0.8, listening * 0.25) * (1 - neg * 0.7), frown: neg * 0.5,
      happy,
      mw: lerp(lerp(36, shape[0], amt), 44, laugh), mo: Math.max(amt * shape[1] * 1.1, laugh * (0.55 + 0.25 * Math.abs(Math.sin(t * 19)))), round: shape[2],
    });
  }

  // ------------------------------------------------------------------ light and life in the room
  const beam = WINDOWS[0];
  const dust = [];
  if (beam) {
    const bx = beam.x, by = beam.y, bw = beam.w;
    P(light, `M ${bx + bw * 0.2} ${by} L ${bx + bw} ${by} L ${bx + bw + 520} 1080 L ${bx + bw * 0.2 + 260} 1080 Z`, lin("beam", [[0, "#fff6dc", 0.22], [1, "#fff6dc", 0]]), { "pointer-events": "none" });
    for (let i = 0; i < 14; i++) dust.push({ c: C(light, 0, 0, 1.6 + rnd(i) * 1.8, "#fffbe8", { opacity: 0.5 }), x0: bx + bw * (0.3 + rnd(i + 3) * 0.7) + rnd(i + 5) * 300, y0: by + rnd(i + 7) * 500, sp: 6 + rnd(i + 9) * 10, ph: rnd(i + 11) * 6 });
  }
  const steam = [];
  if (!COUNTER) for (let i = 0; i < 3; i++) steam.push(P(front, "", "none", { ...stroke(5, "#ffffff"), opacity: 0, filter: "url(#soft)" }));
  // the listener's shoulder and head in the foreground for over-the-shoulder shots (screen space)
  const otsLayer = g(svg, { filter: "url(#soft)" });
  const OTS = {
    lena: (() => { const o = g(otsLayer, { opacity: 0 }); E(o, 30, 1080, 330, 210, "#e9a8b9"); P(o, "M -60 1080 C -80 900 -60 760 -20 600 C 20 470 150 430 230 520 C 290 600 280 800 250 1080 Z", "#2a1912"); return o; })(),
    braun: (() => { const o = g(otsLayer, { opacity: 0 }); E(o, 1060, 1080, 330, 200, "#46699e"); R(o, 930, 820, 90, 160, "#d9a27e"); E(o, 990, 690, 150, 190, "#e5b893"); P(o, "M 840 690 C 830 560 930 480 1020 490 C 1110 500 1150 600 1140 700 C 1100 640 1020 620 960 640 C 900 660 860 690 840 690 Z", "#1f1713"); E(o, 845, 720, 22, 34, "#e5b893"); return o; })(),
  };
  // the vignette frames every shot
  R(svg, 0, 0, 1080, 1080, rad("vig", [[0.55, "#000000", 0], [1, "#1a0f08", 0.42]]), { "pointer-events": "none" });

  // ------------------------------------------------------------------ camera: cuts between a two-shot, close-ups and over-the-shoulder shots
  const CU = (who) => { const p = POS[who]; return { s: 1.9, x: p.x + (who === "lena" ? 45 : -45), y: p.y - 120 * SC, kind: "cu", dof: 3.2 }; };
  const OS = (who) => { const p = POS[who]; return { s: 1.6, x: p.x + (who === "lena" ? 110 : -110), y: p.y - 105 * SC, kind: "ots", who, dof: 2.4 }; };
  const TWO = (s, y) => ({ s, x: 545, y, kind: "two", dof: 1 });
  const SHOTS = [];
  SHOTS.push({ t: 0, k: TWO(1.22, 500) });
  let n = 0;
  L.forEach((l) => SHOTS.push({ t: l.t - 0.25, k: l.key ? CU(l.who) : (n++ % 2 ? OS(l.who) : CU(l.who)) }));
  // explanations come between lines: back to the two-shot while nobody on stage speaks
  for (let i = 0; i < L.length - 1; i++) { const gap = L[i + 1].t - (L[i].t + L[i].dur); if (gap > 2.2) SHOTS.push({ t: L[i].t + L[i].dur + 0.35, k: TWO(1.2, 520) }); }
  SHOTS.push({ t: OUTRO, k: TWO(1.1, 520) });
  SHOTS.sort((a, b) => a.t - b.t);
  function cameraAt(t) {
    let cur = SHOTS[0], since = t;
    for (const s of SHOTS) if (t >= s.t) { cur = s; since = t - s.t; }
    const k = cur.k;
    const z = k.s * (1 + Math.min(0.06, since * 0.012));
    const dx = Math.sin(t * 0.6) * 3 + (k.kind === "ots" ? Math.sin(since * 0.5) * 6 : 0), dy = Math.sin(t * 0.43) * 2;
    world.setAttribute("transform", `translate(540,540) scale(${z}) translate(${-k.x + dx},${-k.y + dy})`);
    dofBlur.setAttribute("stdDeviation", k.dof);
    const listener = k.kind === "ots" ? (k.who === "lena" ? "braun" : "lena") : null;
    for (const w of ["lena", "braun"]) { OTS[w].setAttribute("opacity", w === listener ? 1 : 0); PEOPLE[w].root.setAttribute("opacity", w === listener ? 0 : 1); }
    otsLayer.setAttribute("transform", listener ? `translate(${Math.sin(t * 0.7) * 4},${Math.sin(t * 0.9) * 3})` : "");
  }
  function ambientAt(t) {
    for (const w of WALKERS) { const u = ((w.phase + t * w.speed) % w.w + w.w) % w.w; const x = w.dir > 0 ? w.x0 + u : w.x0 + w.w - u; w.g.setAttribute("transform", `translate(${x},${w.y - Math.abs(Math.sin(t * 6 + w.phase)) * 3})`); }
    for (const d of dust) { const y = d.y0 + ((t * d.sp) % 400); d.c.setAttribute("cx", d.x0 + Math.sin(t * 0.6 + d.ph) * 14 + (y - d.y0) * 0.5); d.c.setAttribute("cy", y); d.c.setAttribute("opacity", 0.25 + 0.35 * Math.abs(Math.sin(t * 0.8 + d.ph))); }
    steam.forEach((sp, i) => {
      const u = ((t * 0.45 + i / 3) % 1), x0 = 470 + (i - 1) * 12, y0 = 690 - u * 70;
      sp.setAttribute("d", `M ${x0} ${y0} C ${x0 + 14 * Math.sin(t * 2 + i)} ${y0 - 20} ${x0 - 14 * Math.sin(t * 2 + i)} ${y0 - 40} ${x0 + 6} ${y0 - 60}`);
      sp.setAttribute("opacity", 0.55 * Math.sin(Math.PI * u));
    });
  }

  function draw(t) {
    act("lena", t); act("braun", t);
    ambientAt(t);
    cameraAt(t);
  }
  window.__cartoonDraw = draw;
  draw(window.__hfThreeTime || 0);
  window.addEventListener("hf-seek", (ev) => draw(ev.detail.time));
})();
