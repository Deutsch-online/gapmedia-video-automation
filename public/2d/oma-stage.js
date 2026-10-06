// «Oma sagt …» — a hand-built 2D cartoon (owner, 2026-10-05: "make a video like this one" — the grandma who gives orders and the
// granddaughter who does them). Everything is SVG and a pure function of time: draw(t) sets every transform. Ten rooms/actions,
// each ~6 s: Oma says the order (her mouth follows the real voice), points, the girl does it, the result stays visible.
// Config: window.__oma = { scenes: [{t0, t1}], mouth: [0..1 every 1/25 s] }.
(() => {
  const CFG = window.__oma || {};
  const svg = document.getElementById("oma-stage");
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; };
  const g = (p, a = {}) => el("g", a, p);
  const R = (p, x, y, w, h, fill, ex = {}) => el("rect", { x, y, width: w, height: h, fill, ...ex }, p);
  const P = (p, d, fill, ex = {}) => el("path", { d, fill, ...ex }, p);
  const C = (p, cx, cy, r, fill, ex = {}) => el("circle", { cx, cy, r, fill, ...ex }, p);
  const E = (p, cx, cy, rx, ry, fill, ex = {}) => el("ellipse", { cx, cy, rx, ry, fill, ...ex }, p);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ss = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const INK = "#3b2a24", FLOOR = 1250;
  const line = (w = 4, c = INK) => ({ stroke: c, "stroke-width": w, "stroke-linejoin": "round", "stroke-linecap": "round" });
  const show = (n, v) => n.setAttribute("opacity", v);
  const place = (n, x, y, rot = 0, sx = 1, sy = sx) => n.setAttribute("transform", `translate(${x},${y}) rotate(${rot}) scale(${sx},${sy})`);
  const wob = (t, f, a, ph = 0) => Math.sin(t * f * Math.PI * 2 + ph) * a;
  const SKIN = "#F7CFAE", SKIN_D = "#E5AB85";
  const defs = el("defs", {}, svg);
  const rad = (id, stops) => { const r = el("radialGradient", { id, cx: 0.5, cy: 0.5, r: 0.5 }, defs); stops.forEach(([o, c, a = 1]) => el("stop", { offset: o, "stop-color": c, "stop-opacity": a }, r)); return `url(#${id})`; };

  // hand-drawn "boil": the lines of people and props tremble a little, re-posed 8 times a second (seek-safe: the seed is a function of time)
  const boil = el("filter", { id: "boil", x: "-5%", y: "-5%", width: "110%", height: "110%" }, defs);
  const boilNoise = el("feTurbulence", { type: "fractalNoise", baseFrequency: "0.011", numOctaves: "2", seed: "1", result: "n" }, boil);
  el("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: "5", xChannelSelector: "R", yChannelSelector: "G" }, boil);
  // ------------------------------------------------------------------ layers: room, back props, people, front props, effects
  const room = g(svg), backProps = g(svg, { filter: "url(#boil)" }), people = g(svg, { filter: "url(#boil)" }), frontProps = g(svg, { filter: "url(#boil)" }), fx = g(svg);
  const rooms = { living: g(room), kitchen: g(room), hall: g(room), bed: g(room) };
  const floor = (p, c, c2) => { R(p, 0, FLOOR, 1080, 420, c); R(p, 0, FLOOR, 1080, 8, c2); };
  const frame = (p, x, y, w, h, c = "#B8855A") => { R(p, x, y, w, h, "#F3E6C9", line(4)); R(p, x + 12, y + 12, w - 24, h - 24, c, { opacity: 0.55 }); };

  // --- living room: window, curtains, pictures, rug, floor lamp
  const win = { sash: null, curtL: null, curtR: null };
  {
    const p = rooms.living; R(p, 0, 0, 1080, FLOOR, "#F8E3BC"); for (let x = 0; x < 1080; x += 120) R(p, x, 0, 60, FLOOR, "#F5DDB0", { opacity: 0.6 }); floor(p, "#DDA46A", "#C58850");
    E(p, 420, 1330, 380, 70, "#E7B2A0", { opacity: 0.8 });
    R(p, 680, 380, 280, 380, "#FFFFFF", line(5)); R(p, 692, 392, 256, 356, "#A9DCFF"); E(p, 880, 470, 60, 60, rad("sunL", [[0, "#FFF4B0"], [1, "#FFF4B0", 0]])); R(p, 692, 600, 256, 148, "#9AD6A0"); C(p, 740, 620, 44, "#7FC789"); C(p, 900, 640, 50, "#8ED496");
    win.sash = g(p); R(win.sash, 0, 0, 130, 356, "#FFFFFF", { opacity: 0.0 }); R(win.sash, 2, 2, 126, 352, "#CFEBFF", { opacity: 0.85, ...line(6, "#FFFFFF") }); R(win.sash, 60, 150, 8, 40, "#B4BEC8", { rx: 3 });
    R(p, 818, 392, 6, 356, "#FFFFFF"); R(p, 692, 560, 256, 6, "#FFFFFF"); R(p, 668, 756, 304, 22, "#FFFFFF", line(4));
    frame(p, 90, 430, 120, 150); frame(p, 240, 470, 90, 110, "#8FB9A0");
    // floor lamp (pole + shade; the glow is drawn when it is on)
    R(p, 511, 740, 10, 500, "#8A6A4E"); P(p, "M 455 1250 L 575 1250 L 545 1230 L 485 1230 Z", "#8A6A4E", line(3));
  }
  win.curtL = P(rooms.living, "M 640 360 L 740 360 Q 700 560 740 770 L 640 770 Z", "#F2A98A", line(4)); win.curtR = P(rooms.living, "M 1000 360 L 900 360 Q 940 560 900 770 L 1000 770 Z", "#F2A98A", line(4));
  const lampShade = P(rooms.living, "M 456 740 L 576 740 L 546 650 L 486 650 Z", "#CFC6B0", line(4)); const lampGlow = E(rooms.living, 516, 710, 210, 200, rad("lampG", [[0, "#FFF0A0", 0.9], [1, "#FFF0A0", 0]]));
  // --- kitchen: green cabinets, window, shelf; table / counter come with their scene
  {
    const p = rooms.kitchen; R(p, 0, 0, 1080, FLOOR, "#E4EFCF"); floor(p, "#EAD8B4", "#CDB88F"); for (let x = 0; x < 1080; x += 90) R(p, x, FLOOR, 3, 300, "#D7C39C");
    R(p, 40, 380, 360, 300, "#7FB77E", line(4)); R(p, 40, 380, 180, 300, "#8CC48B", line(4)); [[120, 540], [300, 540]].forEach(([x, y]) => C(p, x, y, 8, "#F6E7B0"));
    R(p, 520, 340, 320, 300, "#FFFFFF", line(5)); R(p, 532, 352, 296, 276, "#BFE6FF"); R(p, 676, 352, 8, 276, "#FFFFFF"); R(p, 532, 484, 296, 8, "#FFFFFF");
    R(p, 880, 420, 160, 18, "#B8855A", line(3)); [[920, "#E9724C"], [980, "#F3A64F"]].forEach(([x, c]) => { R(p, x - 20, 370, 40, 50, "#FFFFFF", { rx: 8, opacity: 0.8, ...line(3) }); R(p, x - 16, 388, 32, 30, c, { rx: 6 }); });
    R(p, 40, 700, 360, 18, "#B8855A", line(3)); R(p, 60, 730, 80, 6, "#E9724C"); R(p, 60, 750, 80, 6, "#7FB77E");
  }
  // --- hall: stripes, door, coat rack, mat
  const door = { leaf: null, out: null };
  {
    const p = rooms.hall; R(p, 0, 0, 1080, FLOOR, "#F5E3C6"); for (let x = 30; x < 1080; x += 100) R(p, x, 0, 34, FLOOR, "#EFD7B1", { opacity: 0.7 }); floor(p, "#C98F55", "#A8713D");
    R(p, 900, 300, 190, 950, "#E6F4FF", line(5)); door.out = g(p); R(door.out, 912, 312, 166, 938, "#BFE6FF"); R(door.out, 912, 900, 166, 350, "#9AD6A0"); C(door.out, 1000, 840, 70, "#7FC789");
    door.leaf = g(p); R(door.leaf, 0, 0, 170, 940, "#B8855A", line(5)); R(door.leaf, 20, 40, 130, 380, "#C99A6B", line(3)); R(door.leaf, 20, 460, 130, 440, "#C99A6B", line(3)); C(door.leaf, 24, 520, 12, "#F6E7B0", line(3));
    frame(p, 120, 420, 110, 140, "#C98F55"); R(p, 540, 640, 240, 22, "#8A6A4E", line(4)); [570, 640, 710, 760].forEach((x) => { C(p, x, 700, 12, "#6E4B36"); R(p, x - 3, 662, 6, 36, "#6E4B36"); });
    R(p, 640, 1236, 260, 24, "#C95F4A", { rx: 8, ...line(3) });
  }
  // --- bedroom: wardrobe, window with curtain, rug
  const ward = { doorL: null, doorR: null, inside: null };
  {
    const p = rooms.bed; R(p, 0, 0, 1080, FLOOR, "#E7EEF7"); for (let y = 0; y < FLOOR; y += 130) R(p, 0, y, 1080, 6, "#D7E2F0"); floor(p, "#E3B98A", "#C99A63");
    R(p, 60, 400, 260, 330, "#FFFFFF", line(5)); R(p, 72, 412, 236, 306, "#CFEBFF"); R(p, 186, 412, 8, 306, "#FFFFFF"); P(p, "M 30 380 L 110 380 Q 80 560 110 740 L 30 740 Z", "#9DB8E8", line(4)); P(p, "M 350 380 L 270 380 Q 300 560 270 740 L 350 740 Z", "#9DB8E8", line(4));
    R(p, 700, 420, 340, 830, "#8D5F3E", line(5)); ward.inside = R(p, 712, 432, 316, 806, "#4A3022"); [[740, 460, "#E9724C"], [840, 470, "#4DB6FF"], [930, 460, "#F3C84D"]].forEach(([x, y, c]) => R(p, x, y + 380, 70, 36, c, { rx: 6, opacity: 0.9 }));
    ward.doorL = g(p); R(ward.doorL, 0, 0, 170, 806, "#A06E48", line(4)); R(ward.doorL, 16, 16, 138, 774, "#B27F57", line(3)); C(ward.doorL, 150, 400, 9, "#F6E7B0", line(3));
    ward.doorR = g(p); R(ward.doorR, -170, 0, 170, 806, "#A06E48", line(4)); R(ward.doorR, -154, 16, 138, 774, "#B27F57", line(3)); C(ward.doorR, -150, 400, 9, "#F6E7B0", line(3));
  }
  // ------------------------------------------------------------------ people (full-body, drawn in local coordinates, feet at 0)
  const SH = { R: [-62, -438], L: [62, -438] }, L1 = 98, L2 = 92;
  function person(cfg) {
    const root = g(people), body = g(root), arms = g(root);
    const mk = (node) => node;
    // legs: one group each, so that they can swing from the hip when the person walks
    const legs = [-1, 1].map((sg) => {
      const x = sg * (cfg.skirt ? 26 : 24), lg = g(body);
      if (cfg.skirt) { R(lg, x - 11, -140, 22, 112, cfg.stocking, line(3.5)); P(lg, `M ${x - 20} -28 L ${x + 22} -28 L ${x + 26} 0 L ${x - 24} 0 Z`, cfg.shoes, line(3.5)); }
      else { R(lg, x - 21, -250, 42, 224, cfg.bottom, line(4.5)); P(lg, `M ${x - 26} -30 L ${x + 26} -30 L ${x + 34} 0 L ${x - 30} 0 Z`, cfg.shoes, line(4)); }
      return { n: lg, px: x, py: cfg.skirt ? -110 : -240 };
    });
    if (cfg.skirt) P(body, "M -74 -262 L 74 -262 L 96 -92 L -96 -92 Z", cfg.bottom, line(5));
    else R(body, -45, -258, 90, 30, cfg.bottom, line(4.5));
    R(body, -17, -498, 34, 54, SKIN, line(4));
    P(body, "M -68 -450 Q 0 -484 68 -450 L 80 -228 L -80 -228 Z", cfg.top, line(5));
    if (cfg.cardigan) { P(body, "M -22 -468 L 0 -300 L 22 -468 Z", "#FFFFFF", line(3)); [-390, -340, -290].forEach((y) => C(body, 0, y, 5, "#F6E7B0", line(2.5))); P(body, "M 0 -462 L 0 -228", "none", line(3)); }
    else P(body, "M -26 -466 Q 0 -440 26 -466", "none", line(5, cfg.topD));
    // head
    const head = g(root, { transform: "translate(0,-548)" });
    E(head, -63, 6, 11, 17, SKIN, line(3.5)); E(head, 63, 6, 11, 17, SKIN, line(3.5));
    if (cfg.bun) { C(head, cfg.bunX || 0, -92, cfg.bunR, cfg.hair, line(4)); if (cfg.tie) R(head, (cfg.bunX || 0) - 22, -72, 44, 10, cfg.tie, { rx: 4, ...line(2.5) }); }
    E(head, 0, 0, 62, 66, SKIN, line(4.5));
    P(head, `M -66 -6 Q -76 -84 0 -86 Q 76 -84 66 -6 Q 54 -52 8 -50 Q -40 -56 -66 -6 Z`, cfg.hair, line(4.5));
    if (cfg.curls) [[-66, 8], [66, 8], [-62, 34], [62, 34]].forEach(([x, y]) => C(head, x, y, 15, cfg.hair, line(3.5)));
    E(head, -36, 30, 15, 9, "#F28C7A", { opacity: 0.5 }); E(head, 36, 30, 15, 9, "#F28C7A", { opacity: 0.5 });
    const eyes = [-26, 26].map((x) => { const eg = g(head, { transform: `translate(${x},-4)` }); E(eg, 0, 0, 14, 17, "#FFFFFF", line(2.8)); const pupil = C(eg, 0, 0, 8.5, cfg.iris || "#3A2A22"); C(eg, -3, -4, 3, "#FFFFFF"); const lid = P(eg, "M -16 -2 Q 0 -24 16 -2 L 16 -22 L -16 -22 Z", SKIN, { opacity: 0 }); return { pupil, lid }; });
    const brows = [P(head, "M -42 -30 Q -26 -42 -10 -32", "none", line(5.5, cfg.browC || cfg.hair)), P(head, "M 10 -32 Q 26 -42 42 -30", "none", line(5.5, cfg.browC || cfg.hair))];
    if (cfg.glasses) { C(head, -26, -4, 22, "none", line(4.5, cfg.glasses)); C(head, 26, -4, 22, "none", line(4.5, cfg.glasses)); P(head, "M -4 -6 Q 0 -12 4 -6", "none", line(4, cfg.glasses)); }
    E(head, 0, 16, 6, 5, SKIN_D);
    const mouth = g(head, { transform: "translate(0,38)" });
    const mClosed = P(mouth, "M -16 0 Q 0 10 16 0", "none", line(3.8)), mOpen = P(mouth, "M -14 0 Q 0 2 14 0 Q 12 18 0 19 Q -12 18 -14 0 Z", "#7B2C34", { opacity: 0, ...line(3) }), tongue = E(mouth, 0, 13, 8, 4, "#E2706F", { opacity: 0 });
    // arms (two-bone IK in local coordinates)
    const A = {};
    for (const k of ["R", "L"]) {
      const a = g(arms); A[k] = { u0: el("path", { fill: "none", ...line(40, INK) }, a), u: el("path", { fill: "none", stroke: cfg.top, "stroke-width": 32, "stroke-linecap": "round" }, a), f0: el("path", { fill: "none", ...line(34, INK) }, a), f: el("path", { fill: "none", stroke: SKIN, "stroke-width": 26, "stroke-linecap": "round" }, a), h: C(a, 0, 0, 19, SKIN, line(3.5)) };
    }
    function ik(k, tx, ty) {
      const [sx, sy] = SH[k]; let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy); const mx = L1 + L2 - 1; if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; tx = sx + dx; ty = sy + dy; }
      const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a)), px = sx + dx * a / d, py = sy + dy * a / d;
      const e1 = [px - dy / d * h, py + dx / d * h], e2 = [px + dy / d * h, py - dx / d * h], out = k === "R" ? -1 : 1, ex = (e1[0] - px) * out > (e2[0] - px) * out ? e1 : e2, n = A[k];
      const up = `M ${sx} ${sy} L ${ex[0]} ${ex[1]}`, fo = `M ${ex[0]} ${ex[1]} L ${tx} ${ty}`; n.u0.setAttribute("d", up); n.u.setAttribute("d", up); n.f0.setAttribute("d", fo); n.f.setAttribute("d", fo); n.h.setAttribute("cx", tx); n.h.setAttribute("cy", ty);
    }
    return { root, head, eyes, brows, mClosed, mOpen, tongue, ik, legs, cfg, x: 0, s: 1, dy: 0 };
  }
  const oma = person({ skirt: true, bottom: "#3D4F73", stocking: "#CFCFD6", shoes: "#6E4B36", top: "#8FA77A", topD: "#6F8A5C", cardigan: true, hair: "#C9C9D2", browC: "#9A9AA6", glasses: "#D93B4A", bun: true, bunR: 30, iris: "#4F7F8F" });
  const girl = person({ bottom: "#F1E3C6", shoes: "#F7F7F7", top: "#D8554A", topD: "#B8403A", hair: "#F2C14E", bun: true, bunR: 30, bunX: 22, tie: "#D8554A", curls: true, iris: "#3F8FD0" });
  oma.s = 1.32; girl.s = 1.2; oma.x = 250;
  const world = (p, wx, wy) => [(wx - p.x) / p.s, (wy - FLOOR - p.dy) / p.s];

  // ------------------------------------------------------------------ props
  const mkG = (parent) => g(parent, { opacity: 0 });
  const S = Array.from({ length: 10 }, () => ({ back: mkG(backProps), front: mkG(frontProps) }));
  // 3 sofa
  { R(S[2].back, 560, 940, 480, 200, "#7E9C86", line(5)); R(S[2].back, 540, 980, 40, 220, "#6F8A78", { rx: 16, ...line(4) }); R(S[2].back, 1020, 980, 40, 220, "#6F8A78", { rx: 16, ...line(4) }); R(S[2].front, 560, 1130, 480, 230, "#8FB09A", line(5)); R(S[2].front, 560, 1124, 480, 18, "#A5C4AE", line(3)); }
  // 4 table with a plate
  { R(S[3].front, 580, 1100, 470, 30, "#B8855A", line(5)); [[600, 1130], [1010, 1130]].forEach(([x, y]) => R(S[3].front, x, y, 26, 120, "#9C6F47", line(4))); }
  const plate = g(frontProps, { opacity: 0 }); E(plate, 0, 0, 56, 14, "#FFFFFF", line(3.5)); E(plate, 0, -2, 38, 8, "#EDEFF2");
  // 5 coat rack uses the room; the jacket
  const jacket = g(frontProps, { opacity: 0 }); P(jacket, "M -36 -40 L 36 -40 L 54 30 L 30 36 L 24 70 L -24 70 L -30 36 L -54 30 Z", "#4F9A6A", line(4)); R(jacket, -6, -30, 12, 90, "#3C7A52", { opacity: 0.6 });
  // 6 broom + dust
  const broom = g(frontProps, { opacity: 0 }); R(broom, -5, -330, 10, 330, "#B8855A", line(3)); P(broom, "M -34 0 L 34 0 L 50 54 L -50 54 Z", "#E3B64F", line(3.5)); for (let i = -3; i <= 3; i++) P(broom, `M ${i * 14} 0 L ${i * 16} 54`, "none", line(2, "#B8903A"));
  const dust = Array.from({ length: 8 }, () => C(frontProps, 0, 0, 9, "#CDBBA0", { opacity: 0 }));
  const pile = E(frontProps, 540, 1244, 10, 6, "#CDBBA0", { opacity: 0 });
  // 7 trash bin + bag
  const bin = g(S[6].back); P(bin, "M 560 1090 L 690 1090 L 676 1244 L 574 1244 Z", "#7FA8B8", line(4.5)); R(bin, 552, 1076, 146, 20, "#8FB6C6", { rx: 6, ...line(4) });
  const bag = g(frontProps, { opacity: 0 }); P(bag, "M -42 40 Q -62 -10 -26 -34 L -12 -52 L 12 -52 L 26 -34 Q 62 -10 42 40 Q 0 58 -42 40 Z", "#2E3138", line(4)); P(bag, "M -14 -52 Q 0 -80 14 -52", "none", line(5, "#2E3138")); E(bag, -14, -6, 10, 18, "#FFFFFF", { opacity: 0.18 });
  // 8 counter with a sink, tap, apples in a bowl
  { const f = S[7].front; R(f, 540, 1090, 520, 34, "#C98F55", line(5)); R(f, 556, 1124, 488, 126, "#8CC48B", line(5)); E(f, 800, 1096, 100, 14, "#B8C2CC", line(4)); }
  R(S[7].back, 788, 940, 14, 150, "#B4BEC8", line(3)); P(S[7].back, "M 795 944 Q 795 904 850 904 Q 890 904 890 940", "none", { stroke: INK, "stroke-width": 20, "stroke-linecap": "round" }); P(S[7].back, "M 795 944 Q 795 904 850 904 Q 890 904 890 940", "none", { stroke: "#B4BEC8", "stroke-width": 13, "stroke-linecap": "round" });
  const water = el("path", { d: "M 886 950 L 886 1090", stroke: "#8CCBFF", "stroke-width": 12, "stroke-linecap": "round", "stroke-dasharray": "26 18", fill: "none", opacity: 0 }, frontProps);
  const apples = [0, 1, 2].map(() => { const a = g(frontProps, { opacity: 0 }); C(a, 0, 0, 24, "#E0412F", line(3.5)); R(a, -2, -34, 4, 14, "#6E4B36"); E(a, -8, -8, 6, 9, "#F4806A", { opacity: 0.7 }); return a; });
  // 9 clothes (a pile) and the wardrobe
  const clothes = g(frontProps, { opacity: 0 }); R(clothes, -44, -16, 88, 32, "#4DB6FF", { rx: 8, ...line(3.5) }); R(clothes, -40, -34, 80, 26, "#F3C84D", { rx: 8, ...line(3.5) }); R(clothes, -36, -50, 72, 24, "#E9724C", { rx: 8, ...line(3.5) });
  // 10 bed with a blanket that is pulled flat
  { const f = S[9].front; R(f, 540, 1130, 520, 120, "#B8855A", line(5)); R(f, 556, 1070, 488, 70, "#FFFFFF", line(4)); E(f, 600, 1066, 70, 26, "#FFFFFF", line(4)); }
  R(S[9].back, 520, 820, 540, 260, "#9E7650", line(5));
  const blanket = P(frontProps, "M 0 0", "#6FA8DC", line(4.5)); const blanketHi = P(frontProps, "M 0 0", "none", { stroke: "#9CC6EC", "stroke-width": 6, "stroke-linecap": "round" });
  const sparks = Array.from({ length: 6 }, () => P(fx, "M 0 -22 Q 3 -3 22 0 Q 3 3 0 22 Q -3 3 -22 0 Q -3 -3 0 -22 Z", "#FFD54A", { opacity: 0, ...line(2.5) }));
  const dim = R(fx, 0, 0, 1080, 1450, "#14102A", { opacity: 0 });

  // ------------------------------------------------------------------ the ten scenes. Each returns what the girl and Oma do at time u (seconds into the scene).
  const T0 = 1.9, T1 = 4.2;                              // the girl starts after Oma has said the order and is done when T1
  const sparkle = (x, y, u, at) => sparks.forEach((s, i) => { const k = clamp((u - at - i * 0.02) / 0.6, 0, 1), a = (i / 6) * Math.PI * 2; place(s, x + Math.cos(a) * 90 * k, y + Math.sin(a) * 70 * k, k * 120, 0.5 + k * 0.5); show(s, k > 0 && k < 1 ? 1 - k * 0.8 : 0); });
  const rest = (gx) => ({ R: [gx - 80, 1040], L: [gx + 80, 1040] });
  const SC = [
    // 1 Mach das Fenster zu!
    (u) => { const k = ss(T0, T1, u), sx = lerp(0.18, 1, k), gx = 770; rooms.living; win.sash.setAttribute("transform", `translate(948,392) scale(${-sx},1)`);
      win.curtL.setAttribute("transform", `translate(${wob(u, 0.8, 5 * (1 - k))},0)`); win.curtR.setAttribute("transform", `translate(${wob(u, 0.8, -5 * (1 - k))},0)`);
      const hx = 948 - 130 * sx, r = rest(gx); sparkle(820, 560, u, T1 + 0.1);
      return { room: "living", gx, R: r.R, L: k > 0 && k < 1 ? [hx, 600] : k >= 1 ? [920, 640] : r.L, point: [820, 560] }; },
    // 2 Mach das Licht an!
    (u) => { const on = u > 3.2, gx = 680, r = rest(gx); show(lampGlow, on ? 1 : 0); lampShade.setAttribute("fill", on ? "#FFE58A" : "#CFC6B0"); dim.setAttribute("opacity", on ? 0 : 0.34); sparkle(516, 690, u, 3.2);
      const k = ss(T0, 3.0, u); return { room: "living", gx, R: [lerp(gx - 80, 560, k), lerp(1040, 800, k)], L: r.L, point: [520, 720] }; },
    // 3 Setz dich hin!
    (u) => { const k = ss(T0, T1 - 0.4, u), gx = 800; show(S[2].back, 1); return { room: "living", gx, dy: 80 * k, R: [gx - 85, lerp(1040, 1010, k)], L: [gx + 85, lerp(1040, 1010, k)], point: [800, 1100], sit: k }; },
    // 4 Stell den Teller auf den Tisch!
    (u) => { const k = ss(T0, 3.4, u), rel = ss(3.4, 4.2, u), gx = lerp(660, 770, k); const px = lerp(700, 860, k), py = lerp(960, 1092, k); place(plate, px, py); show(plate, 1);
      const hr = lerp(1, 0, rel), r = rest(gx); sparkle(860, 1050, u, 4.2);
      return { room: "kitchen", gx, R: [lerp(px - 52, gx - 80, rel), lerp(py + 10, 1040, rel)], L: [lerp(px + 52, gx + 80, rel), lerp(py + 10, 1040, rel)], point: [860, 1100], rr: hr, walk: k > 0.02 && k < 0.98 }; },
    // 5 Häng die Jacke auf!
    (u) => { const k = ss(T0, 3.4, u), gx = lerp(780, 690, k); const jx = lerp(720, 616, k), jy = lerp(930, 760, k), hang = ss(3.4, 4.0, u); place(jacket, jx, jy + 36 * hang, 0, 1); show(jacket, 1);
      const r = rest(gx), r2 = hang; sparkle(610, 800, u, 4.0);
      return { room: "hall", gx, R: [lerp(jx + 10, gx - 80, r2), lerp(jy - 30, 1040, r2)], L: [lerp(jx + 60, gx + 80, r2), lerp(jy - 20, 1040, r2)], point: [600, 740], walk: k > 0.02 && k < 0.98 }; },
    // 6 Feg den Boden!
    (u) => { const gx = 770, sw = u > T0 ? wob(u - T0, 0.9, 85) : 0, on = u > T0 - 0.3 ? 1 : 0; place(broom, gx - 150 + sw, FLOOR - 6, wob(u - T0, 0.9, 6)); show(broom, 1);
      const n = clamp((u - T0) / 2.3, 0, 1); dust.forEach((d, i) => { const k = ((u * 1.4 + i / 8) % 1); place(d, gx - 150 + sw + (i - 4) * 12, FLOOR - 10 - k * 40, 0, 1 - k * 0.4); show(d, u > T0 && u < T1 + 0.4 ? 0.7 * (1 - k) : 0); });
      place(pile, 540 - n * 60, 1244, 0, 1 + n * 7, 1 + n * 3); show(pile, n > 0 ? 1 : 0); sparkle(500, 1190, u, T1 + 0.2);
      const hy = 900; return { room: "hall", gx, R: [gx - 150 + sw - 6, hy + 170], L: [gx - 150 + sw - 8, hy + 40], point: [520, 1200], walk: u > T0 && u < T1 + 0.4, shuffle: true }; },
    // 7 Bring den Müll raus!
    (u) => { const k = ss(T0, 3.8, u), gx = lerp(660, 860, k), open = ss(T0 + 1.2, T0 + 2.3, u); door.leaf.setAttribute("transform", `translate(912,312) scale(${lerp(1, 0.12, open)},1)`); show(S[6].back, 1);
      const bx = gx + 70, by = lerp(1090, 1130, 0) + 0; place(bag, bx, 1150 + 0, wob(u, 1.2, 3 * k)); show(bag, 1);
      sparkle(900, 1000, u, 3.9); return { room: "hall", gx, R: [bx - 14, 1120], L: [gx + 80, 1040], point: [980, 1000], walk: k > 0.02 && k < 0.98 }; },
    // 8 Wasch die Äpfel!
    (u) => { const k = ss(T0, 2.6, u), A = u > T0 && u < T1, gx = 740, r = rest(gx); apples.forEach((a, i) => { place(a, 600 + i * 56, 1074); show(a, i === 0 && A ? 0 : 1); }); const hx = lerp(880, 850, 0) + wob(u, 1.6, A ? 10 : 0), hy = 1060;
      if (A) { place(apples[0], hx + 4, hy - 20); show(apples[0], 1); } show(water, A ? 1 : 0); water.setAttribute("stroke-dashoffset", -u * 330); sparkle(840, 1000, u, T1 + 0.1);
      return { room: "kitchen", gx, R: A ? [hx - 20, hy] : r.R, L: A ? [hx + 22, hy] : r.L, point: [840, 1000] }; },
    // 9 Leg die Kleidung in den Schrank!
    (u) => { const o = ss(T0 - 0.2, T0 + 0.8, u), k = ss(T0 + 0.6, 3.5, u), gx = lerp(560, 650, k); ward.doorL.setAttribute("transform", `translate(712,432) scale(${lerp(1, 0.12, o)},1)`); ward.doorR.setAttribute("transform", `translate(1028,432) scale(${lerp(1, 0.12, o)},1)`);
      const cx = lerp(gx + 40, 840, k), cy = lerp(930, 1020, k); place(clothes, cx, cy, 0, lerp(1, 0.9, k)); show(clothes, u < T1 ? 1 : 0); sparkle(860, 820, u, T1);
      return { room: "bed", gx, R: [cx - 36, cy + 10], L: [cx + 36, cy + 10], point: [860, 820], walk: k > 0.02 && k < 0.98 }; },
    // 10 Mach dein Bett!
    (u) => { const k = ss(T0, T1, u), gx = 800, y0 = lerp(1010, 1058, k), amp = (1 - k) * 34; show(S[9].back, 1);
      const pts = []; for (let i = 0; i <= 12; i++) { const x = 560 + (i / 12) * 470; pts.push([x, y0 - amp * Math.sin((i / 12) * Math.PI * 2.5 + 0.8) * (1 - i / 14)]); }
      blanket.setAttribute("d", `M ${pts.map((p) => p.join(" ")).join(" L ")} L 1030 1140 L 560 1140 Z`); show(blanket, 1); blanketHi.setAttribute("d", `M ${pts.slice(1, 9).map((p) => `${p[0]} ${p[1] + 14}`).join(" L ")}`); show(blanketHi, 1);
      sparkle(800, 1010, u, T1 + 0.1);
      return { room: "bed", gx, R: [lerp(640, 600, k), y0 - 10], L: [lerp(780, 740, k), y0 - 6], point: [700, 1040] }; },
  ];

  // ------------------------------------------------------------------ the frame
  const MOUTH = CFG.mouth || [];
  const mouthAt = (t) => { const f = t * 25, i = Math.floor(f), k = f - i; return lerp(MOUTH[i] || 0, MOUTH[i + 1] || 0, k); };
  const sceneOf = (t) => { const S2 = CFG.scenes || []; for (let i = S2.length - 1; i >= 0; i--) if (t >= S2[i].t0) return i; return 0; };
  function face(p, t, m, look, smile) {
    p.mOpen.setAttribute("opacity", m > 0.06 ? 1 : 0); p.tongue.setAttribute("opacity", m > 0.3 ? 0.9 : 0); p.mClosed.setAttribute("opacity", m > 0.06 ? 0 : 1);
    const h = 3 + 17 * m; p.mOpen.setAttribute("d", `M -14 0 Q 0 2 14 0 Q 12 ${h} 0 ${h + 1} Q -12 ${h} -14 0 Z`); p.tongue.setAttribute("cy", 4 + h * 0.7);
    p.mClosed.setAttribute("d", `M -16 ${-smile} Q 0 ${7 + smile * 6} 16 ${-smile}`);
    const blink = Math.max(0, 1 - Math.abs(((t + p.cfg.top.length) % 3.7 - 1.8) / 0.07)); p.eyes.forEach((e) => { e.lid.setAttribute("opacity", blink > 0.5 ? 1 : 0); e.pupil.setAttribute("cx", look[0]); e.pupil.setAttribute("cy", look[1]); });
    p.brows.forEach((b) => b.setAttribute("transform", `translate(0,${-3 * smile - (m > 0.4 ? 2 : 0)})`));
  }
  function draw(t) {
    const si = Math.min(sceneOf(t), SC.length - 1), sc = (CFG.scenes || [])[si] || { t0: 0 }, u = Math.max(0, t - sc.t0);
    door.leaf.setAttribute("transform", "translate(912,312)"); ward.doorL.setAttribute("transform", "translate(712,432)"); ward.doorR.setAttribute("transform", "translate(1028,432)");
    for (const n of Object.values(rooms)) show(n, 0); S.forEach((s) => { show(s.back, 0); show(s.front, 0); });
    [plate, jacket, broom, bag, clothes, blanket, blanketHi, pile, water].forEach((n) => show(n, 0)); dust.forEach((d) => show(d, 0)); apples.forEach((a) => show(a, 0)); sparks.forEach((s) => show(s, 0)); show(dim, 0);
    show(lampGlow, 0); lampShade.setAttribute("fill", si > 1 ? "#FFE58A" : "#CFC6B0");
    const o = SC[si](u); show(rooms[o.room], 1); show(S[si].back, 1); show(S[si].front, 1);
    // people
    const hopT = (u - T1 - 0.15) / 0.7, hop = !o.sit && hopT > 0 && hopT < 1 ? Math.abs(Math.sin(hopT * Math.PI * 2)) * 28 : 0;   // a little jump of joy when the job is done
    const ph = o.shuffle ? t * 4.5 : o.gx / 34, amp = o.walk ? (o.shuffle ? 0.35 : 1) : 0;
    girl.legs.forEach((l, i) => { const a = Math.sin(ph + i * Math.PI) * 20 * amp, lift = Math.max(0, Math.cos(ph + i * Math.PI)) * 12 * amp; l.n.setAttribute("transform", `translate(0,${-lift}) rotate(${a} ${l.px} ${l.py})`); });
    oma.legs.forEach((l, i) => l.n.setAttribute("transform", `rotate(${(i ? 1 : -1) * wob(t, 0.35, 1.2)} ${l.px} ${l.py})`));   // Oma shifts her weight
    const bobW = Math.abs(Math.sin(ph)) * 8 * amp;
    boilNoise.setAttribute("seed", 1 + (Math.floor(t * 8) % 7));
    const mv = clamp(mouthAt(t), 0, 1), ant = ss(T0 - 0.35, T0, u) * (1 - ss(T0, T0 + 0.25, u));            // a small crouch before the girl acts (anticipation)
    girl.x = o.gx; girl.dy = (o.dy || 0) - hop - bobW; place(girl.root, girl.x, FLOOR + girl.dy, wob(ph, 1 / (2 * Math.PI), 2.5 * amp), girl.s * (1 + 0.03 * ant), girl.s * (1 - 0.05 * ant + wob(t, 0.9, 0.006)));
    place(oma.root, oma.x, FLOOR, 0, oma.s * (1 - 0.012 * mv), oma.s * (1 + 0.016 * mv + wob(t, 0.8, 0.005)));
    const sw = amp * 30, gr = world(girl, o.R[0] + (o.shuffle ? 0 : Math.sin(ph) * sw * 0), o.R[1]), gl = world(girl, o.L[0], o.L[1]); girl.ik("R", gr[0], gr[1]); girl.ik("L", gl[0], gl[1]);
    // Oma: says the order and points at what has to be done; her free hand talks along with the voice
    const pt = ss(0.15, 0.6, u) - ss(2.5, 3.0, u), speak = ss(0.3, 0.5, u) * (1 - ss(2.4, 2.7, u)), tgt = world(oma, o.point[0], o.point[1]), dirx = tgt[0] - SH.L[0], diry = tgt[1] - SH.L[1], dl = Math.hypot(dirx, diry) || 1;
    oma.ik("L", lerp(78, SH.L[0] + dirx / dl * 175, pt), lerp(-250, SH.L[1] + diry / dl * 175 * 0.6 - 10, pt) + wob(t, 2.4, 3 * pt));
    oma.ik("R", -92 - Math.sin(t * 5.5) * 16 * speak, -255 - (0.5 + 0.5 * Math.sin(t * 5.5 + 1)) * 75 * speak);
    const m = clamp(mouthAt(t), 0, 1), bob = Math.sin(t * 1.9) * 2, glad = hop > 0 || (u > T1 && u < T1 + 1.2) ? 1 : 0;
    const gz = [clamp((o.point[0] - o.gx) / 140, -1, 1) * 4, o.point[1] > 1000 ? 4 : o.point[1] > 800 ? 2 : -1];                 // the girl looks at the thing she works on
    face(oma, t, m, [4 * (1 - pt) + 2 * pt * (o.point[0] > oma.x ? 1 : -1), 2], pt > 0.5 ? 0.6 : 0.9 + glad * 0.6);
    face(girl, t, 0, u < T0 - 0.4 ? [clamp((oma.x - o.gx) / 300, -1, 1) * 4, 2] : gz, glad ? 2.6 : u > T0 - 0.4 ? 0.4 : 0.9);
    oma.head.setAttribute("transform", `translate(0,${-548 + bob}) rotate(${wob(t, 0.8, 1.2) + 4 * speak * Math.sin(t * 3.1) + (m > 0.2 ? Math.sin(t * 12) * 1.2 : 0) + 3 * pt})`);
    girl.head.setAttribute("transform", `translate(0,${-548 + Math.sin(t * 1.7 + 1) * 2 + (o.sit ? 4 * o.sit : 0)}) rotate(${wob(t, 0.7, 1.4, 1) + (glad ? Math.sin(t * 9) * 3 : 0) - 4 * (u > T0 - 0.4 && u < T1 ? 1 : 0) * Math.sign(o.point[0] - o.gx)})`);
  }
  window.__omaDraw = draw; draw(0); window.addEventListener("hf-seek", (ev) => draw(ev.detail.time));
})();
