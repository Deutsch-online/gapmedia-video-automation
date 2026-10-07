// «Oma sagt …» — a hand-built 2D cartoon (owner, 2026-10-05: "make a video like this one" — the grandma who gives orders and the
// granddaughter who does them). Everything is SVG and a pure function of time: draw(t) sets every transform. Ten rooms/actions,
// each ~6 s: Oma says the order (her mouth follows the real voice), points, the girl does it, the result stays visible.
// Config: window.__anruf = { scenes: [{t0, t1}], mouth: [0..1 every 1/25 s] }.
(() => {
  const CFG = window.__anruf || {};
  const svg = document.getElementById("anruf-stage");
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

  // ------------------------------------------------------------------ layers
  const room = g(svg), backProps = g(svg, { filter: "url(#boil)" }), people = g(svg, { filter: "url(#boil)" }), frontProps = g(svg, { filter: "url(#boil)" }), fx = g(svg);
  const rooms = { boss: g(room), cook: g(room) };
  const OUT = "#1E1A1C";
  const ln = (w = 6, c = OUT) => ({ stroke: c, "stroke-width": w, "stroke-linejoin": "round", "stroke-linecap": "round" });
  const SH = { R: [-66, -440], L: [66, -440] }, L1 = 100, L2 = 96;

  // ------------------------------------------------------------------ a bold cartoon person: big head, thick outline, glove hands, a face that acts
  function person(cfg) {
    const root = g(people), body = g(root), phoneLayer = g(root), arms = g(root);
    const skin = cfg.skin, skinD = cfg.skinD;
    const legs = [-1, 1].map((sg) => {
      const x = sg * 28, lg = g(body);
      if (cfg.skirt) { R(lg, x - 14, -170, 28, 140, cfg.stocking, ln(5)); P(lg, `M ${x - 22} -34 L ${x + 24} -34 L ${x + 34} -6 L ${x - 34} -6 L ${x - 30} 0 L ${x + 30} 0 L ${x + 36} -6 Z`, cfg.shoes, ln(5)); }
      else { R(lg, x - 24, -270, 48, 244, cfg.bottom, ln(5)); if (cfg.checks) for (let k = 0; k < 6; k++) R(lg, x - 24, -250 + k * 38, 48, 14, cfg.checks, { opacity: 0.55 }); P(lg, `M ${x - 30} -34 L ${x + 30} -34 L ${x + 40} 0 L ${x - 34} 0 Z`, cfg.shoes, ln(5)); }
      return { n: lg, px: x, py: cfg.skirt ? -140 : -260 };
    });
    if (cfg.skirt) P(body, "M -84 -276 L 84 -276 L 72 -110 L -72 -110 Z", cfg.bottom, ln(6));
    else R(body, -50, -282, 100, 34, cfg.bottom, ln(5));
    R(body, -22, -520, 44, 70, skin, ln(5));
    P(body, "M -86 -450 Q 0 -500 86 -450 L 98 -250 L -98 -250 Z", cfg.top, ln(6));
    if (cfg.chef) { P(body, "M -30 -478 L 0 -330 L 30 -478 Z", cfg.shirt, ln(3)); [-410, -360, -310].forEach((y) => { C(body, -20, y, 7, cfg.topD, ln(3)); C(body, 20, y, 7, cfg.topD, ln(3)); }); P(body, "M 0 -486 L 0 -250", "none", ln(3, cfg.topD)); P(body, "M -40 -482 L 0 -452 L 40 -482 L 24 -494 L -24 -494 Z", "#D63B3B", ln(5)); }
    else { P(body, "M -34 -480 L 0 -318 L 34 -480 Z", cfg.shirt, ln(3)); P(body, "M -34 -480 L 0 -318 L -64 -430 Z", cfg.topD, ln(5)); P(body, "M 34 -480 L 0 -318 L 64 -430 Z", cfg.topD, ln(5)); P(body, "M 0 -318 L 0 -250", "none", ln(4, cfg.topD)); C(body, -6, -298, 7, "#F3C84D", ln(3)); }
    if (cfg.necklace) { P(body, "M -26 -486 Q 0 -440 26 -486", "none", ln(4, "#D9A62E")); C(body, 0, -450, 8, "#D9A62E", ln(3)); }
    const head = g(root, { transform: "translate(0,-596)" });
    if (cfg.longHair) { P(head, "M -100 -20 Q -112 -130 0 -128 Q 112 -130 100 -20 Q 118 70 96 150 L -96 150 Q -118 70 -100 -20 Z", cfg.hair, ln(6)); P(head, "M -80 40 Q -94 90 -84 140 M 80 40 Q 94 90 84 140", "none", ln(4, cfg.hairD)); }
    E(head, -78, 14, 14, 22, skin, ln(5)); E(head, 78, 14, 14, 22, skin, ln(5));
    if (cfg.earring) { C(head, -80, 44, 8, "#F3C84D", ln(3)); C(head, 80, 44, 8, "#F3C84D", ln(3)); }
    E(head, 0, 0, 80, 86, skin, ln(6)); P(head, "M -60 60 Q 0 104 60 60 Q 0 90 -60 60 Z", skinD, { opacity: 0.35 });
    E(head, -46, 38, 18, 11, "#F28C7A", { opacity: 0.55 }); E(head, 46, 38, 18, 11, "#F28C7A", { opacity: 0.55 });
    // eyes: white, outlined, a pupil that looks, a lid that frowns or droops, lashes
    const eyes = [-1, 1].map((sg) => {
      const eg = g(head, { transform: `translate(${sg * 32},-10)` }), RX = 24, RY = 27, cid = `eyeclip${cfg.id}${sg > 0 ? "r" : "l"}`;
      el("ellipse", { cx: 0, cy: 0, rx: RX, ry: RY }, el("clipPath", { id: cid }, defs));
      E(eg, 0, 0, RX, RY, "#FFFFFF"); const pg = g(eg); C(pg, 0, 0, 12, cfg.iris || "#3A2A22"); C(pg, 0, 0, 6.5, "#0E0A0A"); C(pg, -4, -5, 3.5, "#FFFFFF");
      const lid = P(eg, "M 0 0", cfg.skin, { ...ln(5), "clip-path": `url(#${cid})` });
      E(eg, 0, 0, RX, RY, "none", ln(5)); if (cfg.lashes) P(eg, `M ${sg * 22} -14 L ${sg * 38} -24 M ${sg * 24} -4 L ${sg * 42} -6`, "none", ln(5));
      return { eg, pg, lid, RX, RY, sg };
    });
    const brows = [-1, 1].map((sg) => P(head, "M 0 0", "none", ln(10, cfg.browC || cfg.hair)));
    E(head, 0, 28, 7, 6, skinD, { opacity: 0.9 }); P(head, "M -6 22 Q 0 32 8 24", "none", ln(3.5, skinD));
    const mouth = g(head, { transform: "translate(0,56)" });
    const mClosed = P(mouth, "M -20 0 Q 0 8 20 0", "none", ln(6, cfg.lips || OUT));
    const mOpen = g(mouth, { opacity: 0 }); const mShape = P(mOpen, "M 0 0", "#7B2C34", ln(5)); const teeth = P(mOpen, "M 0 0", "#FFFFFF"); const tongue = E(mOpen, 0, 10, 12, 6, "#E2706F");
    if (cfg.stache) P(head, "M -34 40 Q -18 28 0 38 Q 18 28 34 40 Q 18 48 0 44 Q -18 48 -34 40 Z", cfg.hair, ln(4));
    // hair in front: fringe / hat
    if (cfg.longHair) { P(head, "M -84 -20 Q -80 -100 0 -104 Q 90 -100 82 -10 Q 66 -58 14 -62 Q -40 -64 -84 -20 Z", cfg.hair, ln(6)); P(head, "M -40 -90 Q -10 -70 20 -92 M 10 -98 Q 40 -78 62 -88", "none", ln(4, cfg.hairD)); }
    else if (cfg.hat) { P(head, "M -82 -22 Q -80 -72 0 -76 Q 80 -72 82 -22 Q 60 -46 0 -46 Q -60 -46 -82 -22 Z", cfg.hair, ln(5)); R(head, -84, -98, 168, 38, "#FFFFFF", { rx: 10, ...ln(6) }); [[-46, -150], [0, -170], [46, -150]].forEach(([x, y]) => C(head, x, y, 46, "#FFFFFF", ln(6))); R(head, -80, -110, 160, 30, "#FFFFFF", { rx: 6 }); P(head, "M -70 -92 L 70 -92", "none", ln(3, "#D8DEE8")); }
    const marks = { vein: g(head, { opacity: 0 }), sweat: P(head, "M 0 -12 Q 12 8 0 18 Q -12 8 0 -12 Z", "#8CCBFF", { opacity: 0, ...ln(3.5) }) };
    P(marks.vein, "M 48 -78 L 62 -66 M 62 -78 L 48 -66 M 46 -72 L 64 -72", "none", ln(7, "#E03030"));
    // arms (two-bone IK, long sleeves, glove hands)
    const A = {};
    for (const k of ["R", "L"]) {
      const a = g(arms); A[k] = { u0: el("path", { fill: "none", ...ln(46) }, a), u: el("path", { fill: "none", stroke: cfg.top, "stroke-width": 34, "stroke-linecap": "round" }, a), f0: el("path", { fill: "none", ...ln(40) }, a), f: el("path", { fill: "none", stroke: cfg.top, "stroke-width": 28, "stroke-linecap": "round" }, a), h: g(a) };
      const h = A[k].h; E(h, 0, 6, 25, 23, "#FFFFFF", ln(5)); [-14, 0, 14].forEach((x, i) => E(h, x, -14 + (i === 1 ? -3 : 0), 8, 11, "#FFFFFF", ln(4))); E(h, k === "R" ? 24 : -24, 4, 9, 14, "#FFFFFF", ln(4));
    }
    function ik(k, tx, ty) {
      const [sx, sy] = SH[k]; let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy); const mx = L1 + L2 - 1; if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; tx = sx + dx; ty = sy + dy; }
      const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a)), px = sx + dx * a / d, py = sy + dy * a / d;
      const e1 = [px - dy / d * h, py + dx / d * h], e2 = [px + dy / d * h, py - dx / d * h], out = k === "R" ? -1 : 1, ex = (e1[0] - px) * out > (e2[0] - px) * out ? e1 : e2, n = A[k];
      const up = `M ${sx} ${sy} L ${ex[0]} ${ex[1]}`, fo = `M ${ex[0]} ${ex[1]} L ${tx} ${ty}`; n.u0.setAttribute("d", up); n.u.setAttribute("d", up); n.f0.setAttribute("d", fo); n.f.setAttribute("d", fo); n.h.setAttribute("transform", `translate(${tx},${ty})`);
    }
    return { root, head, eyes, brows, mClosed, mOpen, mShape, teeth, tongue, marks, phoneLayer, ik, legs, cfg };
  }

  // ------------------------------------------------------------------ the two places
  let clockHands = null, steam = [];
  {
    const p = rooms.boss; R(p, 0, 100, 1080, FLOOR - 100, "#FBE3D3"); R(p, 0, 100, 1080, 76, "#F2EDE8"); [[110, 340], [420, 660], [740, 960]].forEach(([a, b]) => P(p, `M ${a} 110 L ${b} 110 L ${b - 30} 160 L ${a + 30} 160 Z`, "#FFFFFF", ln(4, "#D8D0C8")));
    R(p, 0, FLOOR, 1080, 420, "#F1BDB4"); R(p, 0, FLOOR, 1080, 10, "#D99C94"); P(p, "M 0 1330 L 1080 1330 L 1080 1345 L 0 1345 Z", "#FFFFFF", { opacity: 0.25 });
    R(p, 30, 250, 380, 470, "#8FA9C4", ln(6)); R(p, 42, 262, 356, 446, "#BFE3F5"); [[60, 480, 70, 210], [140, 420, 90, 270], [250, 520, 60, 170], [320, 450, 70, 240]].forEach(([x, y, w, h]) => R(p, x, y, w, h, "#8FB0CC", { opacity: 0.8 })); R(p, 214, 262, 8, 446, "#8FA9C4"); R(p, 42, 480, 356, 8, "#8FA9C4");
    R(p, 730, 300, 250, 640, "#D9B58F", ln(6)); R(p, 750, 320, 210, 600, "#E5C7A5", ln(4)); R(p, 790, 360, 130, 46, "#FFFFFF", { rx: 8, ...ln(4) }); const t1 = el("text", { x: 855, y: 396, "text-anchor": "middle", "font-family": "EasyFont, Arial, sans-serif", "font-weight": 900, "font-size": 30, fill: OUT }, p); t1.textContent = "CHEFIN"; C(p, 940, 640, 12, "#F3C84D", ln(3));
    C(p, 855, 215, 52, "#FFFFFF", ln(6)); [0, 3, 6, 9].forEach((i) => P(p, `M ${855 + Math.sin(i * 0.5236) * 40} ${215 - Math.cos(i * 0.5236) * 40} L ${855 + Math.sin(i * 0.5236) * 47} ${215 - Math.cos(i * 0.5236) * 47}`, "none", ln(4)));
    clockHands = [P(p, "M 0 0", "none", ln(6)), P(p, "M 0 0", "none", ln(4, "#D63B3B"))];
    R(p, 470, 1018, 140, 14, "#8A6A4E");
    P(p, "M 80 1250 L 170 1250 L 160 1130 L 90 1130 Z", "#C9704A", ln(5)); [-2, -1, 0, 1, 2].forEach((i) => P(p, `M 125 1130 Q ${125 + i * 40} ${1030 - Math.abs(i) * 20} ${125 + i * 56} ${1010 + Math.abs(i) * 30} Q ${125 + i * 20} 1070 125 1130 Z`, i % 2 ? "#4FA35B" : "#6CC07A", ln(4)));
  }
  {
    const p = rooms.cook; R(p, 0, 100, 1080, FLOOR - 100, "#EEF3F6"); for (let x = 0; x < 1080; x += 90) R(p, x, 100, 3, FLOOR - 100, "#D5DEE4"); for (let y = 100; y < FLOOR; y += 90) R(p, 0, y, 1080, 3, "#D5DEE4");
    for (let i = 0; i < 24; i++) for (let j = 0; j < 3; j++) R(p, i * 45, FLOOR + j * 45, 45, 45, (i + j) % 2 ? "#2E3138" : "#F4F4F4");
    R(p, 0, FLOOR - 6, 1080, 8, "#9AA4AE");
    R(p, 640, 150, 400, 150, "#B8C2CC", ln(6)); R(p, 660, 300, 360, 30, "#9AA4AE", ln(5)); [0, 1, 2, 3].forEach((i) => { P(p, `M ${700 + i * 90} 150 L ${700 + i * 90} 110`, "none", ln(6)); });
    [[120, "#9AA4AE", 46], [260, "#C98F55", 38], [380, "#9AA4AE", 52]].forEach(([x, c, r]) => { P(p, `M ${x} 140 L ${x} 210`, "none", ln(5)); C(p, x, 250, r, c, ln(5)); C(p, x, 250, r - 12, "#6B7683", { opacity: 0.4 }); });
    R(p, 20, 1010, 1040, 24, "#9AA4AE", ln(6)); R(p, 20, 1034, 1040, 216, "#C9D2DA", ln(6)); [250, 540, 830].forEach((x) => R(p, x - 90, 1070, 180, 150, "#B7C1CA", { rx: 8, ...ln(4) }));
    R(p, 70, 940, 200, 74, "#6B7683", ln(6)); R(p, 60, 918, 220, 26, "#8C97A3", { rx: 10, ...ln(5) }); P(p, "M 280 940 Q 340 940 340 910", "none", ln(9));
    steam = [0, 1, 2].map(() => C(p, 0, 0, 16, "#FFFFFF", { opacity: 0 }));
    const sign = R(p, 40, 380, 190, 70, "#2F7A4F", { rx: 12, ...ln(5) }); const t2 = el("text", { x: 135, y: 432, "text-anchor": "middle", "font-family": "EasyFont, Arial, sans-serif", "font-weight": 900, "font-size": 46, fill: "#FFFFFF" }, p); t2.textContent = "KÜCHE";
    R(p, 860, 520, 190, 12, "#8A6A4E", ln(4)); [[890, "#E0412F"], [940, "#F3C84D"], [1000, "#6CC07A"]].forEach(([x, c]) => { R(p, x - 22, 450, 44, 70, "#FFFFFF", { rx: 8, opacity: 0.85, ...ln(3) }); R(p, x - 18, 480, 36, 36, c, { rx: 6 }); });
  }
  const MOUTH = CFG.mouth || [];
  const mouthAt = (t) => { const f = t * 25, i = Math.floor(f), k = f - i; return lerp(MOUTH[i] || 0, MOUTH[i + 1] || 0, k); };
  const sceneOf = (t) => { const S2 = CFG.scenes || []; for (let i = S2.length - 1; i >= 0; i--) if (t >= S2[i].t0) return i; return 0; };

  const boss = person({ id: "b", skirt: true, bottom: "#2F2F3A", stocking: "#EBCDB8", shoes: "#B2253A", top: "#9E2A4B", topD: "#7A1F39", shirt: "#FFFFFF", hair: "#B5472B", hairD: "#8E3320", longHair: true, skin: "#F7CFAE", skinD: "#E5AB85", iris: "#3F7F5A", lashes: true, lips: "#C62F4B", earring: true, necklace: true });
  const cook = person({ id: "c", bottom: "#4A5A78", checks: "#FFFFFF", shoes: "#2E2A28", top: "#FFFFFF", topD: "#C3CBD8", shirt: "#FFFFFF", chef: true, hair: "#2E2A28", hat: true, stache: true, skin: "#E8B58C", skinD: "#C98F68", iris: "#5A3B22" });
  boss.s = 1.36; cook.s = 1.28;
  for (const p of [boss, cook]) {
    p.phone = g(p.phoneLayer); R(p.phone, -15, -38, 30, 74, "#23232B", { rx: 8, ...ln(4) }); R(p.phone, -11, -32, 22, 58, "#7FD1FF", { rx: 5 }); E(p.phone, 0, 31, 4, 2.5, "#4A4F57");
    p.arcs = [0, 1].map((i) => P(p.root, `M ${-122 - i * 24} ${-640 + i * 6} Q ${-142 - i * 30} ${-590} ${-122 - i * 24} ${-540 + i * 6}`, "none", { stroke: "#FFFFFF", "stroke-width": 8, "stroke-linecap": "round", opacity: 0 }));
  }
  // props: the bowl of soup (Koch), the ladle
  const bowl = g(cook.root, { opacity: 0 }); P(bowl, "M -42 -26 L 42 -26 Q 38 24 0 28 Q -38 24 -42 -26 Z", "#FFFFFF", ln(5)); E(bowl, 0, -26, 42, 11, "#D63B3B", ln(4)); E(bowl, -12, -28, 8, 3, "#FFFFFF", { opacity: 0.5 });
  const tablet = g(boss.root, { opacity: 0 }); R(tablet, -34, -48, 68, 92, "#2E3138", { rx: 8, ...ln(5) }); R(tablet, -28, -42, 56, 80, "#FFFFFF", { rx: 4 }); [-22, -8, 6, 20].forEach((y) => P(tablet, `M -20 ${y} L 20 ${y}`, "none", ln(3, "#B8B0A6")));
  const MOUTH_ = null;

  // ------------------------------------------------------------------ faces that act
  const MOODS = {
    calm: { bi: -52, bo: -54, lid: [0, 0], s: 0.5 }, happy: { bi: -66, bo: -64, lid: [0.12, 0.2], s: 2.4 }, worry: { bi: -72, bo: -46, lid: [0, 0.22], s: -0.4 },
    angry: { bi: -34, bo: -68, lid: [0.5, 0.12], s: -1.2 }, smug: { bi: -52, bo: -54, lid: [0.3, 0.3], s: 1.4 }, shock: { bi: -82, bo: -80, lid: [0, 0], s: -0.2 }, sour: { bi: -44, bo: -56, lid: [0.3, 0.25], s: -1 },
  };
  const lerpMood = (a, b, k) => ({ bi: lerp(a.bi, b.bi, k), bo: lerp(a.bo, b.bo, k), lid: [lerp(a.lid[0], b.lid[0], k), lerp(a.lid[1], b.lid[1], k)], s: lerp(a.s, b.s, k) });
  function setFace(p, M, m, t, look, extra = {}) {
    p.eyes.forEach((e) => {
      const inner = -e.sg, yI = -e.RY + M.lid[0] * e.RY * 2, yO = -e.RY + M.lid[1] * e.RY * 2, xi = inner * (e.RX + 3), xo = -inner * (e.RX + 3), blink = Math.max(0, 1 - Math.abs(((t + p.cfg.id.length * 1.3) % 3.9 - 2) / 0.07)) > 0.5 ? 1 : 0;
      const yI2 = blink ? e.RY : yI, yO2 = blink ? e.RY : yO;
      e.lid.setAttribute("d", `M ${xi} ${-e.RY - 8} L ${xo} ${-e.RY - 8} L ${xo} ${yO2} Q 0 ${(yO2 + yI2) / 2 + (M.lid[0] + M.lid[1] > 0.1 ? 3 : -8)} ${xi} ${yI2} Z`);
      e.pg.setAttribute("transform", `translate(${look[0] * 8},${look[1] * 6})`);
    });
    const raise = extra.raise || 0;
    p.brows.forEach((b, i) => { const sg = i ? 1 : -1, dy = (sg > 0 ? raise : 0) - (m > 0.4 ? 3 : 0); b.setAttribute("d", `M ${sg * 8} ${M.bi - 10 + dy} Q ${sg * 36} ${Math.min(M.bi, M.bo) - 20 + dy} ${sg * 60} ${M.bo - 8 + dy}`); });
    const s = M.s, w = 22 + 10 * Math.max(0, s) / 2.4, h = 3 + 34 * m;
    if (m > 0.07) {
      p.mClosed.setAttribute("opacity", 0); p.mOpen.setAttribute("opacity", 1);
      p.mShape.setAttribute("d", `M ${-w} ${-s * 5} Q 0 -4 ${w} ${-s * 5} Q ${w * 0.9} ${h} 0 ${h + 4} Q ${-w * 0.9} ${h} ${-w} ${-s * 5} Z`);
      const th = Math.min(12, h * 0.5); p.teeth.setAttribute("d", `M ${-w + 5} ${-s * 5 + 1} Q 0 -2 ${w - 5} ${-s * 5 + 1} L ${w - 7} ${-s * 5 + 1 + th} Q 0 ${th - 2} ${-w + 7} ${-s * 5 + 1 + th} Z`); p.teeth.setAttribute("opacity", h > 9 ? 1 : 0);
      p.tongue.setAttribute("cy", h * 0.72 + 2); p.tongue.setAttribute("opacity", h > 15 ? 1 : 0);
    } else { p.mClosed.setAttribute("opacity", 1); p.mOpen.setAttribute("opacity", 0); p.mClosed.setAttribute("d", `M -22 ${-s * 7} Q 0 ${8 + s * 10} 22 ${-s * 7}`); }
  }
  const FALLBACK = { who: "boss", ex: "talk", mood: "calm", prop: "" };
  const talkAt = (t) => { let s = 0; for (let i = -4; i <= 4; i++) s += mouthAt(t + i * 0.05); return clamp(s / 9 * 2.4, 0, 1); };
  function gesture(ex, t, talk, u) {
    const idle = [96, -266]; let g2;
    switch (ex) {
      case "point": g2 = [190 + wob(t, 2.2, 8), -440 + wob(t, 3, 6)]; break;
      case "shrug": g2 = [136 + wob(t, 3, 6), -400 + wob(t, 1.6, 5) - 24 * Math.abs(Math.sin(u * 3))]; break;
      case "fist": g2 = [128 + wob(t, 9, 6), -420 + wob(t, 8, 12)]; break;
      case "palm": g2 = [150, -470 + wob(t, 2, 6)]; break;
      case "chop": g2 = [124, -360 + 62 * Math.sin(t * 6.5)]; break;
      case "bowl": g2 = [130, -330 + wob(t, 1.4, 6)]; break;
      default: g2 = [146 + 28 * Math.sin(t * 5.5), -340 - 66 * (0.5 + 0.5 * Math.sin(t * 5.5 + 1))];
    }
    const k = ex === "bowl" || ex === "point" || ex === "palm" ? Math.max(talk, 0.85) : talk;
    return [lerp(idle[0], g2[0], k), lerp(idle[1], g2[1], k)];
  }

  function draw(t) {
    const scs = CFG.scenes || [], si = Math.max(0, Math.min(sceneOf(t), scs.length - 1)), sc = { ...FALLBACK, ...(scs[si] || {}) }, u = Math.max(0, t - (scs[si] ? scs[si].t0 : 0));
    const sp = sc.who === "cook" ? cook : boss, other = sp === cook ? boss : cook, talk = talkAt(t), m = clamp(mouthAt(t), 0, 1), angry = sc.mood === "angry";
    show(rooms.boss, sc.who === "boss" ? 1 : 0); show(rooms.cook, sc.who === "cook" ? 1 : 0); show(other.root, 0); show(sp.root, 1);
    boilNoise.setAttribute("seed", 1 + (Math.floor(t * 8) % 7));
    if (clockHands) { const a = t * (angry ? 6 : 0.4), b = a / 12; clockHands[0].setAttribute("d", `M 855 215 L ${855 + Math.sin(b) * 28} ${215 - Math.cos(b) * 28}`); clockHands[1].setAttribute("d", `M 855 215 L ${855 + Math.sin(a) * 39} ${215 - Math.cos(a) * 39}`); }
    const pop = ss(0, 0.26, u), over = 1 + 0.07 * Math.sin(pop * Math.PI) - 0.05 * (1 - pop), shake = angry ? wob(t, 11, 2.2 * talk) : 0, lean = angry ? 1.05 : 1;
    place(sp.root, 540 + shake + wob(t, 0.45, 5), FLOOR, wob(t, 0.5, 1.2) + 1.8 * talk * Math.sin(t * 3.3), sp.s * over * lean * (1 - 0.012 * m), sp.s * over * lean * (1 + 0.02 * m + wob(t, 0.8, 0.006)));
    sp.legs.forEach((l, i) => l.n.setAttribute("transform", `rotate(${(i ? 1 : -1) * wob(t, 0.42, 1.6)} ${l.px} ${l.py})`));
    sp.ik("R", -108 + wob(t, 0.9, 1.5), -566 + wob(t, 1.3, 2));
    const gp = gesture(sc.ex, t, angry ? Math.max(talk, 0.5 * talk + 0.2) : talk, u); sp.ik("L", gp[0], gp[1]);
    place(sp.phone, -100, -584, -8); sp.arcs.forEach((a, i) => a.setAttribute("opacity", talk > 0.15 ? 0.35 + 0.65 * Math.max(0, Math.sin(t * 9 - i * 1.4)) : 0));
    show(bowl, 0); show(tablet, 0);
    if (sc.prop === "bowl" && sp === cook) { place(bowl, gp[0] + 4, gp[1] - 6, wob(t, 2, 6) * talk); show(bowl, 1); }
    if (sc.prop === "tablet" && sp === boss) { place(tablet, gp[0] + 4, gp[1] - 14, wob(t, 2, 5) * talk); show(tablet, 1); }
    steam.forEach((s, i) => { const k = ((t * 0.7 + i / 3) % 1); s.setAttribute("cx", 170 + (i - 1) * 26 + Math.sin(k * 6 + i) * 12); s.setAttribute("cy", 900 - k * 150); s.setAttribute("r", 14 + k * 22); show(s, sc.who === "cook" ? 0.6 * (1 - k) : 0); });
    // the face: eases from the last line's mood into this one
    const prev = scs[si - 1] ? { ...FALLBACK, ...scs[si - 1] } : sc, K = ss(0, 0.3, u), M = lerpMood(MOODS[prev.who === sc.who ? prev.mood : sc.mood] || MOODS.calm, MOODS[sc.mood] || MOODS.calm, K);
    const bounce = Math.sin(t * 7) * 0.5, M2 = { ...M, s: M.s + 0.5 * talk }, look = [wob(t, 0.35, 0.4) + (sc.look || 0), wob(t, 0.5, 0.2)];
    setFace(sp, M2, m, t, look, { raise: sc.mood === "smug" ? -14 : 0 });
    sp.marks.vein.setAttribute("opacity", angry && talk > 0.25 ? 0.6 + 0.4 * Math.sin(t * 10) : 0);
    const sw = sc.mood === "worry" ? ((t * 0.9) % 1) : 0; sp.marks.sweat.setAttribute("opacity", sc.mood === "worry" ? 0.9 * (1 - sw) : 0); sp.marks.sweat.setAttribute("transform", `translate(${-92},${-50 + sw * 70})`);
    sp.head.setAttribute("transform", `translate(0,${-596 + Math.sin(t * 1.9) * 2}) rotate(${-6 + wob(t, 0.8, 1.2) + 5 * talk * Math.sin(t * 3.1) + (m > 0.2 ? Math.sin(t * 12) * 1.2 : 0) + (angry ? 3 : 0)})`);
  }
  window.__anrufDraw = draw; draw(0); window.addEventListener("hf-seek", (ev) => draw(ev.detail.time));
})();
