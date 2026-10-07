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
    const root = g(people); E(root, 4, 6, 118, 18, "#000000", { opacity: 0.2 });
    const body = g(root), phoneLayer = g(root), arms = g(root);
    const skin = cfg.skin, skinD = cfg.skinD, SHD = (d, o = 0.18) => P(body, d, "#25101C", { opacity: o }), HI = (d, o = 0.2) => P(body, d, "#FFFFFF", { opacity: o });
    const legs = [-1, 1].map((sg) => {
      const x = sg * 30, lg = g(body);
      if (cfg.skirt) {
        P(lg, `M ${x - 17} -134 Q ${x - 24} -80 ${x - 15} -42 L ${x - 13} -30 L ${x + 13} -30 L ${x + 15} -42 Q ${x + 24} -80 ${x + 17} -134 Z`, cfg.stocking, ln(5)); P(lg, `M ${x + 4} -128 Q ${x + 14} -80 ${x + 9} -44`, "none", { stroke: "#FFFFFF", "stroke-width": 5, opacity: 0.35, "stroke-linecap": "round" });
        P(lg, `M ${x - 15} -36 L ${x + 15} -36 Q ${x + 28} -22 ${x + 40} -4 L ${x + 36} 0 L ${x - 10} 0 L ${x - 14} -14 Z`, cfg.shoes, ln(5)); R(lg, x - 14, -14, 6, 14, OUT);
      } else {
        P(lg, `M ${x - 27} -266 L ${x + 27} -266 L ${x + 23} -36 L ${x - 23} -36 Z`, cfg.bottom, ln(5)); if (cfg.checks) for (let k = 0; k < 6; k++) R(lg, x - 25 + k * 0, -246 + k * 36, 50 - 4, 12, cfg.checks, { opacity: 0.5 }); P(lg, `M ${x + 8} -260 L ${x + 6} -40`, "none", { stroke: "#FFFFFF", "stroke-width": 5, opacity: 0.2 });
        P(lg, `M ${x - 28} -38 L ${x + 26} -38 Q ${x + 48} -26 ${x + 44} 0 L ${x - 32} 0 Z`, cfg.shoes, ln(5)); P(lg, `M ${x - 28} -10 L ${x + 44} -10`, "none", ln(3, "#FFFFFF"));
      }
      return { n: lg, px: x, py: cfg.skirt ? -140 : -260 };
    });
    if (cfg.skirt) { P(body, "M -78 -268 L 78 -268 Q 90 -190 68 -108 L -68 -108 Q -90 -190 -78 -268 Z", cfg.bottom, ln(6)); P(body, "M 0 -150 L 0 -108", "none", ln(3.5, "#15151B")); SHD("M 30 -268 L 78 -268 Q 90 -190 68 -108 L 40 -108 Q 56 -190 30 -268 Z", 0.28); }
    else { R(body, -52, -284, 104, 40, cfg.bottom, ln(5)); R(body, -52, -270, 104, 10, "#2E2A28"); R(body, -8, -272, 16, 14, "#D9A62E", ln(2.5)); }
    P(body, "M -24 -522 L 24 -522 L 28 -466 L -28 -466 Z", skin, ln(5)); P(body, "M -26 -516 Q 0 -488 26 -516 L 26 -482 Q 0 -462 -26 -482 Z", skinD, { opacity: 0.7 });
    if (cfg.skirt) {
      P(body, "M -92 -448 Q -100 -420 -90 -380 Q -76 -330 -72 -290 Q -94 -270 -98 -240 L 98 -240 Q 94 -270 72 -290 Q 76 -330 90 -380 Q 100 -420 92 -448 Q 0 -500 -92 -448 Z", cfg.top, ln(6));
      P(body, "M -36 -490 Q 0 -440 36 -490 L 4 -320 L -4 -320 Z", cfg.shirt, ln(3.5)); P(body, "M -30 -488 Q -20 -470 -34 -452 M 30 -488 Q 20 -470 34 -452", "none", ln(3, "#D8D0D4"));
      P(body, "M -36 -490 L -4 -318 L -66 -396 L -80 -452 Z", cfg.topD, ln(5)); P(body, "M 36 -490 L 4 -318 L 66 -396 L 80 -452 Z", cfg.topD, ln(5)); C(body, -14, -400, 10, "#F3C84D", ln(3)); P(body, "M -4 -318 L -4 -240 M 4 -318 L 4 -240", "none", ln(3, cfg.topD));
      C(body, 0, -306, 8, "#F3C84D", ln(3)); C(body, 0, -270, 8, "#F3C84D", ln(3)); P(body, "M 42 -330 L 74 -330", "none", ln(5, cfg.topD)); P(body, "M -74 -326 L -42 -326 L -44 -304 L -72 -304 Z", cfg.topD, ln(3.5));
      SHD("M 44 -450 Q 78 -380 66 -290 Q 94 -270 98 -240 L 74 -240 Q 60 -300 50 -330 Z", 0.22); HI("M -72 -440 Q -84 -380 -78 -310 L -64 -310 Q -70 -380 -56 -438 Z", 0.18);
    } else {
      P(body, "M -94 -448 Q -104 -380 -96 -246 L 96 -246 Q 104 -380 94 -448 Q 0 -500 -94 -448 Z", cfg.top, ln(6));
      P(body, "M -30 -486 L 0 -330 L 30 -486 Z", cfg.shirt, ln(3)); P(body, "M 0 -480 L 0 -246", "none", ln(3.5, cfg.topD)); [-410, -360, -310, -260].forEach((y) => { C(body, -22, y, 8, "#8C97A3", ln(3)); C(body, 22, y, 8, "#8C97A3", ln(3)); });
      P(body, "M -44 -482 L 0 -446 L 44 -482 L 28 -500 L -28 -500 Z", "#D63B3B", ln(5)); P(body, "M -60 -330 L -30 -330 L -30 -300 L -60 -300 Z", "none", ln(3, cfg.topD)); R(body, -54, -336, 6, 36, "#2F7A4F");
      SHD("M 44 -450 Q 84 -380 74 -246 L 96 -246 Q 104 -380 94 -448 Z", 0.16); HI("M -76 -440 Q -88 -380 -84 -320 L -70 -320 Q -72 -380 -60 -438 Z", 0.35);
    }
    if (cfg.necklace) { P(body, "M -26 -490 Q 0 -440 26 -490", "none", ln(4, "#D9A62E")); C(body, 0, -452, 8, "#D9A62E", ln(3)); }
    const head = g(root, { transform: "translate(0,-596)" });
    if (cfg.longHair) {
      P(head, "M -104 -10 Q -124 -124 -30 -136 Q 0 -152 36 -136 Q 124 -124 104 -10 Q 130 80 102 160 Q 72 172 42 150 L -42 150 Q -72 172 -102 160 Q -130 80 -104 -10 Z", cfg.hair, ln(6));
      P(head, "M -92 40 Q -112 100 -96 150 M -70 60 Q -86 110 -70 150 M 92 40 Q 112 100 96 150 M 70 60 Q 86 110 70 150", "none", ln(4, cfg.hairD)); P(head, "M -84 -96 Q -40 -138 22 -128", "none", { stroke: "#E58A5A", "stroke-width": 12, opacity: 0.55, "stroke-linecap": "round" });
    }
    E(head, -80, 16, 15, 24, skin, ln(5)); E(head, 80, 16, 15, 24, skin, ln(5)); P(head, "M -82 8 Q -76 16 -82 28 M 82 8 Q 76 16 82 28", "none", ln(3, skinD));
    if (cfg.earring) { C(head, -82, 48, 9, "#F3C84D", ln(3)); C(head, 82, 48, 9, "#F3C84D", ln(3)); }
    P(head, "M -82 -8 Q -84 56 -42 90 Q 0 108 42 90 Q 84 56 82 -8 Q 82 -90 0 -92 Q -82 -90 -82 -8 Z", skin, ln(6));
    P(head, "M -56 70 Q 0 108 56 70 Q 0 96 -56 70 Z", skinD, { opacity: 0.45 }); P(head, "M 52 -40 Q 80 10 60 70 Q 76 20 52 -40 Z", skinD, { opacity: 0.28 }); E(head, -30, -52, 34, 14, "#FFFFFF", { opacity: 0.16 });
    E(head, -48, 40, 19, 12, "#F28C7A", { opacity: 0.6 }); E(head, 48, 40, 19, 12, "#F28C7A", { opacity: 0.6 });
    const eyes = [-1, 1].map((sg) => {
      const eg = g(head, { transform: `translate(${sg * 33},-8)` }), RX = 25, RY = 28, cid = `eyeclip${cfg.id}${sg > 0 ? "r" : "l"}`;
      el("ellipse", { cx: 0, cy: 0, rx: RX, ry: RY }, el("clipPath", { id: cid }, defs));
      E(eg, 0, 0, RX, RY, "#FFFFFF"); const pg = g(eg); C(pg, 0, 0, 13, cfg.iris || "#3A2A22"); C(pg, 0, 0, 7.5, "#0E0A0A"); C(pg, -5, -6, 4.2, "#FFFFFF"); C(pg, 5, 5, 2, "#FFFFFF", { opacity: 0.8 });
      const lid = P(eg, "M 0 0", cfg.skin, { ...ln(5), "clip-path": `url(#${cid})` });
      E(eg, 0, 0, RX, RY, "none", ln(5)); P(eg, `M ${-RX - 1} -4 Q 0 ${-RY * 1.5} ${RX + 1} -4`, "none", ln(cfg.lashes ? 10 : 7));
      if (cfg.lashes) P(eg, `M ${sg * 23} -12 L ${sg * 41} -26 M ${sg * 25} -2 L ${sg * 45} -7`, "none", ln(5));
      return { eg, pg, lid, RX, RY, sg };
    });
    const brows = [-1, 1].map((sg) => P(head, "M 0 0", cfg.browC || cfg.hair, ln(2.5)));
    P(head, "M -3 6 Q -9 26 -4 30 M 3 6 Q 9 26 4 30", "none", ln(3, skinD)); E(head, 0, 30, 9, 6.5, skinD, { opacity: 0.85 }); P(head, "M -10 32 Q 0 38 10 32", "none", ln(3.5, skinD));
    const mouth = g(head, { transform: "translate(0,58)" });
    const mClosed = P(mouth, "M -20 0 Q 0 8 20 0", "none", ln(7, cfg.lips || OUT));
    const mOpen = g(mouth, { opacity: 0 }); const mShape = P(mOpen, "M 0 0", "#7B2C34", ln(5)); const teeth = P(mOpen, "M 0 0", "#FFFFFF"); const tongue = E(mOpen, 0, 10, 13, 6, "#E2706F");
    if (cfg.lips) E(mouth, 0, 14, 11, 4, "#FFFFFF", { opacity: 0.25 });
    if (cfg.stache) { P(head, "M -40 44 Q -22 26 0 38 Q 22 26 40 44 Q 52 36 56 24 Q 48 54 22 50 Q 0 46 -22 50 Q -48 54 -56 24 Q -52 36 -40 44 Z", cfg.hair, ln(4)); P(head, "M -30 70 Q 0 86 30 70", "none", { stroke: cfg.hair, "stroke-width": 3, opacity: 0.35 }); }
    if (cfg.longHair) {
      P(head, "M -88 -16 Q -96 -116 0 -120 Q 94 -116 90 -16 Q 80 -68 38 -78 Q 12 -30 -30 -18 Q -56 -54 -88 -16 Z", cfg.hair, ln(6));
      P(head, "M -60 -98 Q -20 -118 24 -104", "none", { stroke: "#E58A5A", "stroke-width": 10, opacity: 0.6, "stroke-linecap": "round" }); P(head, "M -20 -112 Q -8 -142 -26 -150 M 4 -116 Q 20 -146 8 -156", "none", ln(3, cfg.hair));
    } else if (cfg.hat) {
      P(head, "M -84 -20 Q -82 -78 0 -82 Q 82 -78 84 -20 Q 62 -50 0 -50 Q -62 -50 -84 -20 Z", cfg.hair, ln(5)); R(head, -86, -104, 172, 44, "#FFFFFF", { rx: 10, ...ln(6) });
      [[-50, -156, 44], [0, -178, 50], [50, -156, 44], [-26, -134, 40], [28, -134, 40]].forEach(([x, y, r]) => C(head, x, y, r, "#FFFFFF", ln(6))); R(head, -82, -118, 164, 30, "#FFFFFF");
      P(head, "M -40 -178 Q -34 -150 -40 -124 M 8 -190 Q 14 -150 8 -122 M 54 -176 Q 48 -150 54 -122", "none", ln(3, "#CBD2DC")); P(head, "M -76 -86 L 76 -86", "none", ln(3, "#CBD2DC")); P(head, "M -70 -60 L 70 -60", "none", { stroke: "#000", "stroke-width": 8, opacity: 0.1 });
    }
    const marks = { vein: g(head, { opacity: 0 }), sweat: P(head, "M 0 -12 Q 12 8 0 18 Q -12 8 0 -12 Z", "#8CCBFF", { opacity: 0, ...ln(3.5) }) };
    P(marks.vein, "M 48 -84 L 64 -70 M 64 -84 L 48 -70 M 46 -77 L 66 -77", "none", ln(8, "#E03030"));
    const A = {};
    for (const k of ["R", "L"]) {
      const a = g(arms); A[k] = { u0: el("path", { fill: "none", ...ln(48) }, a), u: el("path", { fill: "none", stroke: cfg.top, "stroke-width": 36, "stroke-linecap": "round" }, a), f0: el("path", { fill: "none", ...ln(42) }, a), f: el("path", { fill: "none", stroke: cfg.top, "stroke-width": 30, "stroke-linecap": "round" }, a), s: el("path", { fill: "none", stroke: "#000", "stroke-width": 8, "stroke-linecap": "round", opacity: 0.12 }, a), h: g(a) };
      const h = A[k].h; R(h, -17, 6, 34, 16, cfg.topD, ln(4)); E(h, 0, -6, 26, 24, "#FFFFFF", ln(5)); [-15, -5, 5, 15].forEach((x, i) => E(h, x, -26 + Math.abs(i - 1.5) * 3, 7, 12, "#FFFFFF", ln(4))); E(h, k === "R" ? 25 : -25, -8, 9, 15, "#FFFFFF", ln(4));
    }
    function ik(k, tx, ty) {
      const [sx, sy] = SH[k]; let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy); const mx = L1 + L2 - 1; if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; tx = sx + dx; ty = sy + dy; }
      const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a)), px = sx + dx * a / d, py = sy + dy * a / d;
      const e1 = [px - dy / d * h, py + dx / d * h], e2 = [px + dy / d * h, py - dx / d * h], out = k === "R" ? -1 : 1, ex = (e1[0] - px) * out > (e2[0] - px) * out ? e1 : e2, n = A[k];
      const up = `M ${sx} ${sy} L ${ex[0]} ${ex[1]}`, fo = `M ${ex[0]} ${ex[1]} L ${tx} ${ty}`; n.u0.setAttribute("d", up); n.u.setAttribute("d", up); n.f0.setAttribute("d", fo); n.f.setAttribute("d", fo); n.s.setAttribute("d", `M ${ex[0] + 6} ${ex[1] + 4} L ${tx + 5} ${ty + 6}`); n.h.setAttribute("transform", `translate(${tx},${ty})`);
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

  // depth: floor perspective, baseboards, light beams, a flame under the pot
  const flames = [];
  {
    const o = rooms.boss, k = rooms.cook;
    for (let x = -600; x <= 1700; x += 150) P(o, `M ${540 + (x - 540) * 0.3} ${FLOOR + 10} L ${x} 1460`, "none", { stroke: "#D99C94", "stroke-width": 3, opacity: 0.5 });
    P(o, "M 0 1290 L 1080 1290", "none", { stroke: "#D99C94", "stroke-width": 3, opacity: 0.5 }); R(o, 0, FLOOR - 26, 1080, 28, "#E8CDC2", ln(4, "#C9A89C"));
    P(o, "M 50 700 L 400 700 L 700 1250 L 150 1250 Z", "#FFFFFF", { opacity: 0.13 }); P(o, "M 60 710 L 140 710 L 330 1250 L 250 1250 Z", "#FFFFFF", { opacity: 0.08 });
    R(o, 470, 380, 130, 90, "#FFFFFF", ln(5, "#C9A89C")); R(o, 480, 390, 110, 70, "#F3C8B8"); P(o, "M 480 450 L 520 410 L 550 440 L 570 420 L 590 450 Z", "#E58A7A");
    R(o, 640, 410, 70, 50, "#FFFFFF", ln(4, "#C9A89C")); P(o, "M 648 452 L 670 424 L 690 444", "none", ln(4, "#7FA6C9"));
    for (let x = 0; x < 1080; x += 90) P(k, `M ${540 + (x - 540) * 0.35} ${FLOOR + 6} L ${x} 1460`, "none", { stroke: "#9AA4AE", "stroke-width": 2, opacity: 0.35 });
    P(k, "M 40 480 L 40 560 M 60 480 L 60 560 M 80 480 L 80 560", "none", ln(6, "#8C97A3")); P(k, "M 520 160 L 520 240 Q 500 280 520 300 M 560 160 L 560 250", "none", ln(5, "#6B7683")); E(k, 520, 310, 18, 30, "#C9D2DA", ln(4));
    E(k, 520, 190, 140, 160, "#FFF1C2", { opacity: 0.12 });
    [-26, 0, 26].forEach((dx) => flames.push(P(k, `M ${170 + dx} 1000 Q ${160 + dx} 980 ${170 + dx} 955 Q ${182 + dx} 980 ${178 + dx} 1000 Z`, "#FF9A3C", { opacity: 0 })));
  }

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
    p.brows.forEach((b, i) => {
      const sg = i ? 1 : -1, dy = (sg > 0 ? raise : 0) - (m > 0.4 ? 3 : 0), thick = p.cfg.hat ? 13 : 9, x0 = sg * 8, y0 = M.bi - 10 + dy, cx = sg * 36, cy = Math.min(M.bi, M.bo) - 20 + dy, x1 = sg * 60, y1 = M.bo - 8 + dy, up = [], lo = [];
      for (let k = 0; k <= 8; k++) { const u2 = k / 8, x = (1 - u2) * (1 - u2) * x0 + 2 * (1 - u2) * u2 * cx + u2 * u2 * x1, y = (1 - u2) * (1 - u2) * y0 + 2 * (1 - u2) * u2 * cy + u2 * u2 * y1, tx = 2 * (1 - u2) * (cx - x0) + 2 * u2 * (x1 - cx), ty = 2 * (1 - u2) * (cy - y0) + 2 * u2 * (y1 - cy), l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l, th = thick * (1 - 0.6 * u2) * (u2 < 0.15 ? 0.7 + u2 * 2 : 1) / 2; up.push([x + nx * th, y + ny * th]); lo.push([x - nx * th, y - ny * th]); }
      b.setAttribute("d", `M ${up.map((q) => q.join(" ")).join(" L ")} L ${lo.reverse().map((q) => q.join(" ")).join(" L ")} Z`);
    });
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
    flames.forEach((f, i) => { const k = 0.8 + 0.3 * Math.sin(t * 14 + i * 2); f.setAttribute("transform", `translate(0,${1000 * (1 - k)}) scale(1,${k})`); show(f, sc.who === "cook" ? 0.9 : 0); });
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
