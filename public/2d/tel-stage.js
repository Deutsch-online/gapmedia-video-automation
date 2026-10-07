// «Oma sagt …» — a hand-built 2D cartoon (owner, 2026-10-05: "make a video like this one" — the grandma who gives orders and the
// granddaughter who does them). Everything is SVG and a pure function of time: draw(t) sets every transform. Ten rooms/actions,
// each ~6 s: Oma says the order (her mouth follows the real voice), points, the girl does it, the result stays visible.
// Config: window.__tel = { scenes: [{t0, t1}], mouth: [0..1 every 1/25 s] }.
(() => {
  const CFG = window.__tel || {};
  const svg = document.getElementById("tel-stage");
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
  const rooms = { mama: g(room), ben: g(room) };
  // --- Mama's kitchen: cream wall, green cabinets, window with a curtain, stove with a pot, counter, fruit bowl
  let steam = [];
  {
    const p = rooms.mama; R(p, 0, 100, 1080, FLOOR - 100, "#FBE6C0"); for (let x = 0; x < 1080; x += 120) R(p, x, 100, 60, FLOOR - 100, "#F8DFB0", { opacity: 0.6 });
    R(p, 0, FLOOR, 1080, 420, "#EAD8B4"); R(p, 0, FLOOR, 1080, 8, "#CDB88F"); for (let x = 0; x < 1080; x += 90) R(p, x, FLOOR, 3, 300, "#D7C39C");
    R(p, 40, 290, 330, 280, "#7FB77E", line(4)); R(p, 40, 290, 165, 280, "#8CC48B", line(4)); [[150, 470], [260, 470]].forEach(([x, y]) => C(p, x, y, 9, "#F6E7B0", line(2.5)));
    R(p, 690, 250, 330, 330, "#FFFFFF", line(5)); R(p, 702, 262, 306, 306, "#BFE6FF"); R(p, 846, 262, 8, 306, "#FFFFFF"); R(p, 702, 410, 306, 8, "#FFFFFF"); E(p, 940, 330, 40, 40, rad("sunK", [[0, "#FFF4B0"], [1, "#FFF4B0", 0]]));
    P(p, "M 660 240 L 760 240 Q 720 420 760 590 L 660 590 Z", "#F2A98A", line(4)); P(p, "M 1050 240 L 950 240 Q 990 420 950 590 L 1050 590 Z", "#F2A98A", line(4));
    R(p, 0, 1010, 1080, 240, "#8CC48B", line(5)); R(p, 0, 996, 1080, 24, "#C98F55", line(4)); [180, 540, 900].forEach((x) => R(p, x - 60, 1050, 120, 150, "#7FB77E", { rx: 8, ...line(3.5) }));
    R(p, 70, 940, 200, 56, "#9AA4AE", line(4)); R(p, 62, 920, 216, 24, "#B8C2CC", { rx: 8, ...line(4) }); P(p, "M 276 944 Q 330 944 330 920", "none", line(8));  // pot on the stove
    steam = [0, 1, 2].map(() => { const s = C(p, 0, 0, 16, "#FFFFFF", { opacity: 0 }); return s; });
    E(p, 880, 980, 90, 20, "#FFFFFF", line(4)); [[850, "#E0412F"], [900, "#F3A64F"], [940, "#6CC07A"]].forEach(([x, c]) => { C(p, x, 950, 26, c, line(3.5)); });
  }
  // --- the supermarket: light wall, red sign, shelves full of colourful boxes, price tags, cart
  {
    const p = rooms.ben; R(p, 0, 100, 1080, FLOOR - 100, "#E4EDF5"); R(p, 0, FLOOR, 1080, 420, "#DCE1E6"); R(p, 0, FLOOR, 1080, 8, "#BFC7CF"); for (let x = 0; x < 1080; x += 120) R(p, x, FLOOR, 3, 300, "#C9D0D6");
    R(p, 150, 150, 780, 110, "#D63B3B", { rx: 18, ...line(5) }); const sign = el("text", { x: 540, y: 232, "text-anchor": "middle", "font-family": "EasyFont, Arial, sans-serif", "font-weight": 900, "font-size": 82, fill: "#FFFFFF" }, p); sign.textContent = "SUPERMARKT";
    const COLS = ["#E0412F", "#F3C84D", "#4DB6FF", "#6CC07A", "#F28CB0", "#FF9A3C", "#9B7FE6", "#FFFFFF"];
    [[300, "left"], [740, "right"]].forEach(([x0]) => { R(p, x0 - 270, 330, 420, 700, "#B8855A", line(5)); for (let r = 0; r < 4; r++) { R(p, x0 - 262, 340 + r * 170, 404, 14 + 156, "#F1E8D6"); R(p, x0 - 262, 340 + r * 170 + 156, 404, 14, "#9C6F47", line(3)); for (let k = 0; k < 8; k++) { const h = 70 + ((k * 37 + r * 23) % 60); R(p, x0 - 252 + k * 49, 340 + r * 170 + 156 - h, 40, h, COLS[(k + r * 3) % COLS.length], { rx: 5, ...line(3) }); } } });
    [[130, "#F3C84D"], [540, "#4DB6FF"], [950, "#6CC07A"]].forEach(([x, c]) => { R(p, x - 4, 262, 8, 50, "#8A6A4E"); R(p, x - 60, 300, 120, 50, c, { rx: 8, ...line(3.5) }); });
  }
  const cart = g(frontProps); { R(cart, 0, 0, 10, 10, "none", { opacity: 0 }); P(cart, "M 640 1060 L 1040 1060 L 1000 1190 L 690 1190 Z", "#C9D0D6", { "fill-opacity": 0.55, ...line(5, "#6B7683") }); for (let i = 1; i < 6; i++) P(cart, `M ${640 + i * 60} 1060 L ${690 + i * 52} 1190`, "none", line(2.5, "#6B7683")); P(cart, "M 640 1060 L 600 990 L 560 990", "none", line(8, "#6B7683")); C(cart, 720, 1226, 20, "#4A4F57", line(3)); C(cart, 980, 1226, 20, "#4A4F57", line(3)); }
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

  // ------------------------------------------------------------------ the two people
  const mama = person({ bottom: "#3D4F73", shoes: "#6E4B36", top: "#E9724C", topD: "#C9563A", hair: "#5B3A2A", bun: true, bunR: 32, bunX: 0, iris: "#4F7F8F", curls: false });
  const ben = person({ bottom: "#3D4F73", shoes: "#F7F7F7", top: "#4DB6FF", topD: "#2F93DB", hair: "#2E2A28", iris: "#3A2A22" });
  mama.s = 1.5; ben.s = 1.5;
  // the phone (behind the hand, beside the ear) and its signal arcs
  for (const p of [mama, ben]) {
    p.phone = g(p.root); R(p.phone, -13, -34, 26, 66, "#2E3138", { rx: 7, ...line(3.5) }); R(p.phone, -9, -28, 18, 50, "#7FD1FF", { rx: 4 }); p.root.insertBefore(p.phone, p.root.children[1]);
    p.arcs = [0, 1].map((i) => P(p.root, `M ${-100 - i * 22} ${-600 + i * 4} Q ${-118 - i * 26} ${-548} ${-100 - i * 22} ${-496}`, "none", { stroke: "#FFFFFF", "stroke-width": 7, "stroke-linecap": "round", opacity: 0 }));
  }
  // free-hand props: spoon (Mama), milk carton, chocolate bar (Ben)
  const spoon = g(mama.root, { opacity: 0 }); R(spoon, -4, -70, 8, 76, "#B8855A", line(3)); E(spoon, 0, -78, 15, 20, "#C99A6B", line(3));
  const carton = g(ben.root, { opacity: 0 }); P(carton, "M -22 -50 L 22 -50 L 22 40 L -22 40 Z", "#FFFFFF", line(3.5)); P(carton, "M -22 -50 L 0 -72 L 22 -50 Z", "#4DB6FF", line(3.5)); R(carton, -16, -22, 32, 26, "#4DB6FF", { rx: 5 });
  const choc = g(ben.root, { opacity: 0 }); R(choc, -18, -52, 36, 92, "#7A4A2B", { rx: 5, ...line(3.5) }); for (let i = 0; i < 4; i++) P(choc, `M -18 ${-30 + i * 22} L 18 ${-30 + i * 22}`, "none", line(2, "#5A3419")); const wrap = R(choc, -20, 6, 40, 40, "#D63B3B", { rx: 4, ...line(3) }); const bite = C(choc, 16, -50, 15, "#FFFFFF", { opacity: 0 });
  const crumbs = Array.from({ length: 4 }, () => C(fx, 0, 0, 8, "#7A4A2B", { opacity: 0 }));
  const bagBorder = null;

  // ------------------------------------------------------------------ the call: one line = one scene, the speaker is the person on the screen
  const FALLBACK = { who: "mama", ex: "talk", mood: "calm", prop: "" };
  const MOOD = { calm: 0.9, happy: 2.2, worry: 0.2, angry: 0.0, proud: 2.6 };
  const talkAt = (t) => { let s = 0; for (let i = -4; i <= 4; i++) s += mouthAt(t + i * 0.05); return clamp(s / 9 * 2.4, 0, 1); };
  const SHAKE = (t, a) => wob(t, 11, a);
  function gesture(ex, t, talk, u) {
    const idle = [92, -262];
    let g2;
    switch (ex) {
      case "point": g2 = [178 + wob(t, 2.2, 8), -430 + wob(t, 3, 6)]; break;
      case "shrug": g2 = [128 + wob(t, 3, 6), -392 + wob(t, 1.6, 5) - 22 * Math.abs(Math.sin(u * 3))]; break;
      case "chop": g2 = [118, -352 + 60 * Math.sin(t * 6.5)]; break;
      case "hold": g2 = [112, -318 + wob(t, 1.4, 6)]; break;
      case "eat": { const k = 0.5 + 0.5 * Math.sin(t * 4.2); g2 = [lerp(120, 14, k), lerp(-330, -508, k)]; break; }
      default: g2 = [138 + 26 * Math.sin(t * 5.5), -332 - 62 * (0.5 + 0.5 * Math.sin(t * 5.5 + 1))];
    }
    const k = ex === "hold" || ex === "eat" || ex === "point" ? Math.max(talk, 0.85) : talk;
    return [lerp(idle[0], g2[0], k), lerp(idle[1], g2[1], k)];
  }
  const MOUTH = CFG.mouth || [];
  const mouthAt = (t) => { const f = t * 25, i = Math.floor(f), k = f - i; return lerp(MOUTH[i] || 0, MOUTH[i + 1] || 0, k); };

  const sceneOf = (t) => { const S = CFG.scenes || []; for (let i = S.length - 1; i >= 0; i--) if (t >= S[i].t0) return i; return 0; };
  function face(p, t, m, look, smile) {
    p.mOpen.setAttribute("opacity", m > 0.06 ? 1 : 0); p.tongue.setAttribute("opacity", m > 0.3 ? 0.9 : 0); p.mClosed.setAttribute("opacity", m > 0.06 ? 0 : 1);
    const h = 3 + 17 * m; p.mOpen.setAttribute("d", `M -14 0 Q 0 2 14 0 Q 12 ${h} 0 ${h + 1} Q -12 ${h} -14 0 Z`); p.tongue.setAttribute("cy", 4 + h * 0.7);
    p.mClosed.setAttribute("d", `M -16 ${-smile} Q 0 ${7 + smile * 6} 16 ${-smile}`);
    const blink = Math.max(0, 1 - Math.abs(((t + p.cfg.top.length) % 3.7 - 1.8) / 0.07)); p.eyes.forEach((e) => { e.lid.setAttribute("opacity", blink > 0.5 ? 1 : 0); e.pupil.setAttribute("cx", look[0]); e.pupil.setAttribute("cy", look[1]); });
    p.brows.forEach((b) => b.setAttribute("transform", `translate(0,${-3 * smile - (m > 0.4 ? 2 : 0)})`));
  }

  function draw(t) {
    const scs = CFG.scenes || [], si = Math.max(0, Math.min(sceneOf(t), scs.length - 1)), sc = { ...FALLBACK, ...(scs[si] || {}) }, u = Math.max(0, t - (scs[si] ? scs[si].t0 : 0));
    const sp = sc.who === "ben" ? ben : mama, other = sp === ben ? mama : ben, talk = talkAt(t), m = clamp(mouthAt(t), 0, 1);
    show(rooms.mama, sc.who === "mama" ? 1 : 0); show(rooms.ben, sc.who === "ben" ? 1 : 0); show(cart, sc.who === "ben" ? 1 : 0);
    show(other.root, 0); show(sp.root, 1);
    boilNoise.setAttribute("seed", 1 + (Math.floor(t * 8) % 7));
    // the speaker: pops in, sways, squashes with the voice, leans into the sentence
    const pop = ss(0, 0.28, u), over = 1 + 0.06 * Math.sin(pop * Math.PI) - 0.06 * (1 - pop), angry = sc.mood === "angry" ? SHAKE(t, 1.4 * talk) : 0;
    place(sp.root, 540 + angry + wob(t, 0.45, 5), FLOOR, wob(t, 0.5, 1.1) + 1.5 * talk * Math.sin(t * 3.3), sp.s * over * (1 - 0.012 * m), sp.s * over * (1 + 0.018 * m + wob(t, 0.8, 0.005)));
    sp.legs.forEach((l, i) => l.n.setAttribute("transform", `rotate(${(i ? 1 : -1) * wob(t, 0.42, 1.6)} ${l.px} ${l.py})`));
    // phone hand at the ear, free hand gestures with the voice
    sp.ik("R", -92 + wob(t, 0.9, 1.5), -520 + wob(t, 1.3, 2));
    const ph = gesture(sc.ex, t, talk, u); sp.ik("L", ph[0], ph[1]);
    place(sp.phone, -86, -532, -8); sp.phone.setAttribute("opacity", 1);
    sp.arcs.forEach((a, i) => a.setAttribute("opacity", talk > 0.15 ? 0.35 + 0.65 * Math.max(0, Math.sin(t * 9 - i * 1.4)) : 0));
    // props
    const hand = [ph[0], ph[1]];
    show(spoon, 0); show(carton, 0); show(choc, 0);
    steam.forEach((s, i) => { const k = ((t * 0.7 + i / 3) % 1); s.setAttribute("cx", 170 + (i - 1) * 24 + Math.sin(k * 6 + i) * 10); s.setAttribute("cy", 900 - k * 140); s.setAttribute("r", 14 + k * 20); show(s, sc.who === "mama" ? 0.55 * (1 - k) : 0); });
    crumbs.forEach((c) => show(c, 0));
    if (sc.who === "mama" && (sc.prop === "spoon")) { place(spoon, hand[0], hand[1], wob(t, 2.5, 14) * talk); show(spoon, 1); }
    if (sc.who === "ben" && sc.prop === "milk") { place(carton, hand[0] + 4, hand[1] - 6, wob(t, 2, 8) * talk); show(carton, 1); }
    if (sc.who === "ben" && sc.prop === "choc") {
      const eating = sc.ex === "eat", k = eating ? 0.5 + 0.5 * Math.sin(t * 4.2) : 0, n = eating ? ss(0.6, 3.2, u) : 0;
      place(choc, hand[0] + 6, hand[1] - 10, eating ? 180 - 10 : 12 + wob(t, 2, 6) * talk, 1, 1); show(choc, 1); bite.setAttribute("opacity", n > 0.1 ? 1 : 0); bite.setAttribute("r", 8 + 22 * n);
      if (eating && k > 0.9) crumbs.forEach((c, i) => { place(c, 540 + (i - 1.5) * 18 + 10, 760 + ((t * 3 + i) % 1) * 130, 0, 1); show(c, 0.9); });
    }
    // faces: the speaker talks, the look follows the mood; the other person is hidden
    const sm = MOOD[sc.mood] ?? 0.9, wide = sc.mood === "worry" ? 0.5 : 0;
    face(sp, t, m, [wob(t, 0.35, 3) + 1, wob(t, 0.5, 1.5) + 1], sm + 0.35 * talk);
    sp.head.setAttribute("transform", `translate(0,${-548 + Math.sin(t * 1.9) * 2}) rotate(${-5 + wob(t, 0.8, 1.2) + 4 * talk * Math.sin(t * 3.1) + (m > 0.2 ? Math.sin(t * 12) * 1.2 : 0)})`);
    sp.eyes.forEach((e) => e.pupil.setAttribute("r", 8.5 + (sc.mood === "worry" ? 1.8 : 0) * wide));
  }
  window.__telDraw = draw; draw(0); window.addEventListener("hf-seek", (ev) => draw(ev.detail.time));
})();
