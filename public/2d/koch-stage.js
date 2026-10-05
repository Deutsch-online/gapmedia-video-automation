// «Ich koche» — a hand-built 2D cartoon (owner, 2026-10-05: "build it without Hugging Face"; the AI clips had no clear action, a
// chubby character and lips that did not follow the voice). Everything is drawn in SVG and is a pure function of time:
// draw(t) sets every transform. One slim man in one bright kitchen behind a counter, six actions with clear props
// (washing, cutting, peeling, onion into the pan, stirring, soup). The mouth follows the REAL voice: window.__koch.mouth holds
// the loudness of the voice file at 25 values a second, so the lips open exactly when the sentence is spoken and no more.
// Config: window.__koch = { total, scenes: [{t0, t1}], mouth: [0..1 every 1/25 s], endAt }.
(() => {
  const CFG = window.__koch || {};
  const svg = document.getElementById("koch-stage");
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; };
  const g = (parent, attrs = {}) => el("g", attrs, parent);
  const R = (p, x, y, w, h, fill, extra = {}) => el("rect", { x, y, width: w, height: h, fill, ...extra }, p);
  const P = (p, d, fill, extra = {}) => el("path", { d, fill, ...extra }, p);
  const C = (p, cx, cy, r, fill, extra = {}) => el("circle", { cx, cy, r, fill, ...extra }, p);
  const E = (p, cx, cy, rx, ry, fill, extra = {}) => el("ellipse", { cx, cy, rx, ry, fill, ...extra }, p);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ss = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const INK = "#3b2a24";
  const line = (w = 4, c = INK) => ({ stroke: c, "stroke-width": w, "stroke-linejoin": "round", "stroke-linecap": "round" });
  const SKIN = "#F5CBA7", SKIN_D = "#E6AE86", HAIR = "#4A3126", SWEATER = "#2F6DAA", SWEATER_D = "#245B90", APRON = "#9AA2AB", APRON_D = "#7C858F";
  const COUNTER_Y = 1250;

  const defs = el("defs", {}, svg);
  const lin = (id, stops, x2 = 0, y2 = 1) => { const lg = el("linearGradient", { id, x1: 0, y1: 0, x2, y2 }, defs); stops.forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, lg)); return `url(#${id})`; };
  const rad = (id, stops) => { const rg = el("radialGradient", { id, cx: 0.5, cy: 0.5, r: 0.5 }, defs); stops.forEach(([o, c, a = 1]) => el("stop", { offset: o, "stop-color": c, "stop-opacity": a }, rg)); return `url(#${id})`; };

  // ------------------------------------------------------------------ the kitchen (always there)
  const back = g(svg), bodyLayer = g(svg), counterLayer = g(svg), propsLayer = g(svg), armsLayer = g(svg), fxLayer = g(svg);
  R(back, 0, 0, 1080, 1300, lin("wall", [[0, "#FFF3D9"], [1, "#FBE2B4"]]));
  // window with a sunny street
  const wx = 640, wy = 230, ww = 340, wh = 480;
  R(back, wx - 14, wy - 14, ww + 28, wh + 28, "#FFFFFF", { rx: 14, ...line(4, "#E7D3AF") });
  R(back, wx, wy, ww, wh, lin("sky", [[0, "#9ED8FF"], [1, "#E4F5FF"]]));
  E(back, wx + 250, wy + 90, 90, 90, rad("sun", [[0, "#FFF6B0"], [1, "#FFF6B0", 0]]));
  for (const [x, y, w, h, c] of [[wx + 10, wy + 300, 70, 180, "#F4B9A0"], [wx + 90, wy + 340, 90, 140, "#F7D68F"], [wx + 190, wy + 310, 80, 170, "#B9D8F2"], [wx + 275, wy + 350, 60, 130, "#F1C2D7"]]) R(back, x, y, w, h, c);
  C(back, wx + 60, wy + 300, 56, "#7CC47A"); C(back, wx + 280, wy + 320, 62, "#8ED08A");
  R(back, wx + ww / 2 - 4, wy, 8, wh, "#FFFFFF"); R(back, wx, wy + wh / 2 - 4, ww, 8, "#FFFFFF");
  // curtains
  P(back, `M ${wx - 24} ${wy - 24} L ${wx + 50} ${wy - 24} Q ${wx + 20} ${wy + 240} ${wx + 54} ${wy + wh + 10} L ${wx - 24} ${wy + wh + 10} Z`, "#FFD9C2");
  P(back, `M ${wx + ww + 24} ${wy - 24} L ${wx + ww - 50} ${wy - 24} Q ${wx + ww - 20} ${wy + 240} ${wx + ww - 54} ${wy + wh + 10} L ${wx + ww + 24} ${wy + wh + 10} Z`, "#FFD9C2");
  // pendant lamp
  R(back, 536, 0, 8, 150, INK); P(back, "M 440 220 Q 440 150 540 150 Q 640 150 640 220 Z", "#FFC94D", line(4)); E(back, 540, 224, 106, 16, "#FFE79A", line(3));
  E(back, 540, 262, 190, 70, rad("lamp", [[0, "#FFF2B0", 0.55], [1, "#FFF2B0", 0]]));
  // hanging pans on a rail
  R(back, 70, 300, 420, 8, "#8A6A4E", { rx: 4 });
  [[130, "#D4875A", 54], [260, "#B8C2CC", 60], [390, "#D4875A", 50]].forEach(([x, c, r]) => {
    R(back, x - 2, 308, 4, 40, INK);
    C(back, x, 348 + r, r, c, line(4)); C(back, x, 348 + r, r - 14, "none", { stroke: "#FFFFFF", "stroke-opacity": 0.45, "stroke-width": 5 });
    R(back, x - 7, 348 + 2 * r - 4, 14, 52, "#6E4B36", { rx: 7 });
  });
  // shelf with plants and jars
  R(back, 60, 610, 380, 22, "#C98F55", { rx: 6, ...line(3) });
  const plant = (x, y, c) => { P(back, `M ${x - 26} ${y} L ${x + 26} ${y} L ${x + 18} ${y + 52} L ${x - 18} ${y + 52} Z`, "#D4875A", line(3)); for (let i = -2; i <= 2; i++) P(back, `M ${x} ${y} Q ${x + i * 24} ${y - 44} ${x + i * 34} ${y - 70 + Math.abs(i) * 8} Q ${x + i * 12} ${y - 30} ${x} ${y} Z`, c, line(2.5)); };
  plant(130, 558, "#5FB36A"); plant(360, 558, "#6CC07A");
  [[230, "#F3A64F"], [290, "#E9724C"]].forEach(([x, c]) => { R(back, x - 24, 548, 48, 62, "#FFFFFF", { rx: 10, "fill-opacity": 0.75, ...line(3) }); R(back, x - 20, 566, 40, 40, c, { rx: 8 }); R(back, x - 20, 538, 40, 14, "#8A6A4E", { rx: 5 }); });
  // wall tiles behind the counter
  R(back, 0, 1000, 1080, 250, "#F9F5EC");
  for (let x = 0; x <= 1080; x += 90) R(back, x, 1000, 3, 250, "#E9E2D2");
  for (let y = 1000; y <= 1250; y += 62) R(back, 0, y, 1080, 3, "#E9E2D2");
  // counter
  const counter = g(counterLayer);
  R(counter, 0, COUNTER_Y, 1080, 44, lin("wood", [[0, "#EDB877"], [1, "#D9A060"]]));
  R(counter, 0, COUNTER_Y, 1080, 6, "#F7D2A0");
  R(counter, 0, COUNTER_Y + 44, 1080, 700, "#BBD8C2");
  for (const x of [30, 560]) R(counter, x, COUNTER_Y + 80, 490, 560, "none", { rx: 22, ...line(4, "#9BBFA6") });
  C(counter, 500, COUNTER_Y + 140, 12, "#8A6A4E"); C(counter, 580, COUNTER_Y + 140, 12, "#8A6A4E");

  // ------------------------------------------------------------------ the man
  const body = g(bodyLayer);
  P(body, "M 372 800 Q 540 735 708 800 L 742 1262 L 338 1262 Z", SWEATER, line(5));
  P(body, "M 380 840 Q 540 790 700 840", "none", { stroke: SWEATER_D, "stroke-width": 6, "stroke-opacity": 0.5, "stroke-linecap": "round" });
  P(body, "M 500 650 L 500 790 Q 540 836 580 790 L 580 650 Z", SKIN, line(4));
  P(body, "M 478 780 Q 540 850 602 780 L 616 800 Q 540 880 464 800 Z", SWEATER_D, line(3));
  const apron = g(body, { opacity: 0 });
  P(apron, "M 440 812 L 640 812 L 676 1262 L 404 1262 Z", APRON, line(4));
  P(apron, "M 440 812 L 466 784 M 640 812 L 614 784", "none", line(7, APRON_D));
  R(apron, 478, 1010, 124, 110, APRON_D, { rx: 12, "fill-opacity": 0.45 });
  const head = g(bodyLayer, { transform: "translate(540,566)" });
  E(head, -98, 8, 17, 28, SKIN, line(4)); E(head, 98, 8, 17, 28, SKIN, line(4));
  E(head, 0, 0, 96, 116, SKIN, line(5));
  E(head, -60, 44, 22, 14, "#F29C8A", { opacity: 0.45 }); E(head, 60, 44, 22, 14, "#F29C8A", { opacity: 0.45 });
  P(head, "M -102 -22 C -112 -128 -42 -150 6 -140 C 70 -148 118 -98 102 -14 C 92 -58 48 -86 -4 -78 C -58 -74 -92 -56 -102 -22 Z", HAIR, line(5));
  P(head, "M -20 -82 C 10 -112 60 -112 84 -78", "none", { stroke: "#6A4A39", "stroke-width": 6, "stroke-linecap": "round", opacity: 0.8 });
  const eyes = [-40, 40].map((x) => {
    const eg = g(head, { transform: `translate(${x},-8)` });
    E(eg, 0, 0, 21, 24, "#FFFFFF", line(3.5));
    const pupil = C(eg, 0, 0, 11, "#3A2A22"); C(eg, -4, -5, 3.4, "#FFFFFF");
    const lid = P(eg, "M -23 -4 Q 0 -34 23 -4 L 23 -30 L -23 -30 Z", SKIN, { opacity: 0 });
    return { eg, pupil, lid };
  });
  const brows = [P(head, "M -66 -46 Q -40 -62 -14 -48", "none", line(7, HAIR)), P(head, "M 14 -48 Q 40 -62 66 -46", "none", line(7, HAIR))];
  P(head, "M -3 6 Q -14 30 -3 34 Q 6 36 10 32", "none", line(4, SKIN_D));
  const mouth = g(head, { transform: "translate(0,66)" });
  const mouthShape = P(mouth, "M -28 0 Q 0 14 28 0", "none", line(5));
  const mouthIn = P(mouth, "M -26 0 Q 0 2 26 0 Q 22 30 0 32 Q -22 30 -26 0 Z", "#7B2C34", { opacity: 0, ...line(4) });
  const teeth = R(mouth, -20, 1, 40, 9, "#FFFFFF", { opacity: 0, rx: 3 });
  const tongue = E(mouth, 0, 24, 13, 7, "#E2706F", { opacity: 0 });

  // ------------------------------------------------------------------ props on the counter (one set per scene)
  const sets = { wash: g(propsLayer), cut: g(propsLayer), peel: g(propsLayer), stove: g(propsLayer) };
  // washing: a basin, a tap, running water
  {
    const s = sets.wash;
    E(s, 540, 1246, 250, 40, "#C9D2DB", line(5)); E(s, 540, 1240, 226, 28, "#7DB7E6"); E(s, 540, 1238, 226, 26, "#A5D2F2", { opacity: 0.6 });
    R(s, 516, 1010, 16, 230, "#B4BEC8", line(4)); P(s, "M 524 1010 Q 524 962 584 962 Q 640 962 640 1010", "none", { stroke: INK, "stroke-width": 24, "stroke-linecap": "round" });
    P(s, "M 524 1010 Q 524 962 584 962 Q 640 962 640 1010", "none", { stroke: "#B4BEC8", "stroke-width": 16, "stroke-linecap": "round" });
    R(s, 628, 1008, 24, 34, "#B4BEC8", line(4));
  }
  const water = el("path", { d: "M 640 1040 L 640 1236", stroke: "#8CCBFF", "stroke-width": 16, "stroke-linecap": "round", "stroke-dasharray": "34 22", fill: "none", opacity: 0 }, propsLayer);
  const waterGlow = el("path", { d: "M 640 1040 L 640 1236", stroke: "#DDF1FF", "stroke-width": 6, "stroke-linecap": "round", "stroke-dasharray": "20 36", fill: "none", opacity: 0 }, propsLayer);
  const ripples = [0, 1, 2].map(() => E(propsLayer, 640, 1238, 10, 4, "none", { stroke: "#FFFFFF", "stroke-width": 3, opacity: 0 }));
  // cutting board
  {
    const s = sets.cut;
    P(s, "M 330 1226 L 760 1226 L 790 1262 L 300 1262 Z", "#E8B77D", line(5)); R(s, 336, 1230, 420, 5, "#F6D6A7");
  }
  const slices = Array.from({ length: 8 }, (_, i) => { const e = E(sets.cut, 600 + i * 20, 1220, 11, 22, "#E0412F", line(3)); E(sets.cut, 600 + i * 20, 1222, 5, 12, "#F27A62", { opacity: 0.8 }); return e; });
  const tomato = g(sets.cut); C(tomato, 0, 0, 40, "#E0412F", line(4.5)); P(tomato, "M -14 -36 L 0 -24 L 14 -36 L 6 -46 L -6 -46 Z", "#4FA35B", line(3)); E(tomato, -12, -10, 9, 14, "#F4806A", { opacity: 0.7 });
  // peeling: the pile of peels on the board is part of the cut set
  const peels = Array.from({ length: 6 }, (_, i) => P(sets.peel, `M ${470 + i * 34} 1226 q 14 -22 30 -4 q 10 12 -4 22`, "none", { stroke: "#B98A44", "stroke-width": 7, "stroke-linecap": "round", opacity: 0 }));
  P(sets.peel, "M 330 1226 L 760 1226 L 790 1262 L 300 1262 Z", "#E8B77D", line(5), );
  sets.peel.insertBefore(sets.peel.lastChild, sets.peel.firstChild);
  // stove top with the pan and the pot
  {
    const s = sets.stove;
    R(s, 250, 1226, 600, 24, "#4A4F57", { rx: 6, ...line(4) }); E(s, 400, 1228, 70, 10, "#2D3036"); E(s, 700, 1228, 70, 10, "#2D3036");
  }
  const pan = g(sets.stove); E(pan, 0, 0, 190, 36, "#2E3138", line(5)); E(pan, 0, 0, 168, 28, "#44484F"); R(pan, 180, -8, 150, 16, "#2E3138", { rx: 8 });
  const panFill = g(pan);
  const pot = g(sets.stove); R(pot, -180, -140, 360, 160, "#C8D0D8", line(5)); E(pot, 0, -140, 180, 30, "#E3E8ED", line(5)); E(pot, 0, -140, 158, 22, "#F29B3C"); R(pot, -210, -112, 40, 16, "#8D969F", { rx: 8 }); R(pot, 170, -112, 40, 16, "#8D969F", { rx: 8 });
  const potBits = [[-70, -140], [20, -144], [80, -138], [-20, -136]].map(([x, y]) => C(pot, x, y, 9, ["#6BBE5B", "#F7C948", "#E0412F", "#6BBE5B"][(x + 100) % 4], line(2)));
  // onion bits and the board that is tipped
  const onionBoard = g(sets.stove); P(onionBoard, "M -110 -8 L 110 -8 L 124 8 L -124 8 Z", "#E8B77D", line(4)); const onionOn = Array.from({ length: 9 }, (_, i) => C(onionBoard, -80 + i * 20, -16 - (i % 2) * 6, 9, "#F6E7C2", line(2.5)));
  const panBits = Array.from({ length: 12 }, (_, i) => C(panFill, -110 + i * 20, -4 + ((i * 7) % 5) * 4, 8, ["#F6E7C2", "#E0412F", "#6BBE5B", "#F7C948"][i % 4], line(2.2), { opacity: 0 }));
  // tools in the hands
  const knife = g(propsLayer); R(knife, -7, -150, 14, 100, "#8A6A4E", { rx: 6, ...line(3) }); P(knife, "M -9 -52 L 9 -52 L 9 86 Q 4 100 -9 90 Z", "#E6EBF0", line(3));
  const peeler = g(propsLayer); R(peeler, -6, -60, 12, 80, "#C0643D", { rx: 6, ...line(3) }); P(peeler, "M -22 22 L 22 22 L 22 50 L -22 50 Z", "#C9D2DB", line(3)); R(peeler, -4, 30, 8, 14, "#2E3138");
  const potato = g(propsLayer); E(potato, 0, 0, 62, 48, "#C69A55", line(4.5)); const potatoPale = E(potato, 0, 0, 62, 48, "#F2DDA2", { opacity: 0, ...line(4.5) });
  [[-20, -12], [22, 10], [-4, 20], [26, -18]].forEach(([x, y]) => C(potato, x, y, 3.2, "#8C6A36"));
  const spoon = g(propsLayer); R(spoon, -6, -150, 12, 130, "#C98F55", { rx: 6, ...line(3) }); E(spoon, 0, 12, 22, 30, "#C98F55", line(3));
  const ladle = g(propsLayer); R(ladle, -5, -160, 10, 150, "#8D969F", { rx: 5, ...line(3) }); P(ladle, "M -34 -6 L 34 -6 Q 34 40 0 46 Q -34 40 -34 -6 Z", "#C8D0D8", line(3.5)); const ladleSoup = E(ladle, 0, -4, 30, 8, "#F29B3C");
  const lettuce = g(propsLayer);
  for (let i = -3; i <= 3; i++) P(lettuce, `M 0 40 Q ${i * 28} -10 ${i * 36} -60 Q ${i * 12} -30 0 40 Z`, i % 2 ? "#5FB36A" : "#76C97C", line(3));
  const pepper = g(propsLayer); P(pepper, "M -24 -20 Q -34 30 0 42 Q 34 30 24 -20 Q 0 -34 -24 -20 Z", "#E0412F", line(3.5)); R(pepper, -4, -34, 8, 16, "#4FA35B", { rx: 3 });
  const drops = Array.from({ length: 6 }, () => P(fxLayer, "M 0 -8 Q 7 4 0 10 Q -7 4 0 -8 Z", "#8CCBFF", { opacity: 0 }));
  const steam = Array.from({ length: 6 }, () => P(fxLayer, "M 0 0", "none", { stroke: "#FFFFFF", "stroke-width": 11, "stroke-linecap": "round", opacity: 0 }));
  const fallBits = Array.from({ length: 9 }, () => C(fxLayer, 0, 0, 8, "#F6E7C2", { opacity: 0, ...line(2.2) }));

  // ------------------------------------------------------------------ arms (two-bone IK, drawn in front of everything)
  const SH = { R: [392, 836], L: [688, 836] }, L1 = 215, L2 = 205;
  const armNodes = {};
  for (const k of ["R", "L"]) {
    const a = g(armsLayer);
    armNodes[k] = { up0: el("path", { fill: "none", ...line(60, INK) }, a), up: el("path", { fill: "none", stroke: SWEATER, "stroke-width": 50, "stroke-linecap": "round" }, a),
      fo0: el("path", { fill: "none", ...line(48, INK) }, a), fo: el("path", { fill: "none", stroke: SKIN, "stroke-width": 38, "stroke-linecap": "round" }, a),
      cuff: el("path", { fill: "none", stroke: SWEATER_D, "stroke-width": 54, "stroke-linecap": "round" }, a), hand: C(a, 0, 0, 29, SKIN, line(4.5)), thumb: C(a, 0, 0, 12, SKIN, line(3.5)) };
  }
  function arm(k, tx, ty, curl = 1) {
    const [sx, sy] = SH[k];
    let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
    const maxd = L1 + L2 - 2; if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; tx = sx + dx; ty = sy + dy; }
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const px = sx + (dx * a) / d, py = sy + (dy * a) / d;
    const e1 = [px + (-dy / d) * h, py + (dx / d) * h], e2 = [px - (-dy / d) * h, py - (dx / d) * h];
    const out = k === "R" ? -1 : 1;                       // the elbow points outwards
    const ex = (e1[0] - px) * out > (e2[0] - px) * out ? e1 : e2;
    const n = armNodes[k];
    const up = `M ${sx} ${sy} L ${ex[0]} ${ex[1]}`, fo = `M ${ex[0]} ${ex[1]} L ${tx} ${ty}`;
    n.up0.setAttribute("d", up); n.up.setAttribute("d", up); n.fo0.setAttribute("d", fo); n.fo.setAttribute("d", fo);
    const cx = ex[0] + (tx - ex[0]) * 0.13, cy = ex[1] + (ty - ex[1]) * 0.13;
    n.cuff.setAttribute("d", `M ${ex[0]} ${ex[1]} L ${cx} ${cy}`);
    n.hand.setAttribute("cx", tx); n.hand.setAttribute("cy", ty); n.thumb.setAttribute("cx", tx + 18 * out * -1 * curl); n.thumb.setAttribute("cy", ty - 14);
    return [tx, ty];
  }
  const place = (node, x, y, rot = 0, sc = 1) => node.setAttribute("transform", `translate(${x},${y}) rotate(${rot}) scale(${sc})`);
  const show = (node, v) => node.setAttribute("opacity", v);
  const wob = (t, f, a, ph = 0) => Math.sin(t * f * Math.PI * 2 + ph) * a;

  // ------------------------------------------------------------------ the six scenes
  const SPLIT = 5.15;                                     // seconds into a scene: the action ends and the result is shown
  const hide = (...ns) => ns.forEach((n) => show(n, 0));
  function steamAt(x, y, t, n, spread = 26, rise = 150, speed = 0.5, alpha = 0.7) {
    steam.forEach((sp, i) => {
      if (i >= n) { show(sp, 0); return; }
      const u = (t * speed + i / n) % 1, x0 = x + (i - (n - 1) / 2) * spread, y0 = y - u * rise, w = Math.sin((t * 2 + i) * 1.3) * 16;
      sp.setAttribute("d", `M ${x0} ${y0} C ${x0 + w} ${y0 - 26} ${x0 - w} ${y0 - 52} ${x0 + w * 0.4} ${y0 - 80}`);
      show(sp, alpha * Math.sin(Math.PI * u));
    });
  }
  function dropsFrom(x, y, t, n, fall = 130) {
    drops.forEach((d, i) => {
      if (i >= n) { show(d, 0); return; }
      const u = (t * 0.9 + i / n) % 1;
      place(d, x + (i - (n - 1) / 2) * 34 + wob(t, 0.7, 6, i), y + u * fall, 0, 1 + 0.2 * (1 - u));
      show(d, 0.9 * (1 - u));
    });
  }
  const SCENES = [
    // 1 — Ich wasche das Gemüse.
    (u, T) => {
      show(sets.wash, 1);
      const A = u < SPLIT, up = ss(SPLIT, SPLIT + 0.9, u);
      const hx = lerp(0, 0, up), r = [lerp(605, 610, up), lerp(1168 + wob(u, 2.2, 5), 1010, up)], l = [lerp(500, 470, up), lerp(1168 + wob(u, 2.2, 5, 1), 1010, up)];
      const lx = (r[0] + l[0]) / 2, ly = (r[1] + l[1]) / 2 - 8;
      show(water, A ? 1 : 0); show(waterGlow, A ? 0.9 : 0);
      water.setAttribute("stroke-dashoffset", -u * 420); waterGlow.setAttribute("stroke-dashoffset", -u * 520);
      ripples.forEach((rp, i) => { const k = (u * 1.6 + i / 3) % 1; rp.setAttribute("rx", 10 + k * 70); rp.setAttribute("ry", 4 + k * 14); show(rp, A ? 0.8 * (1 - k) : 0); });
      place(lettuce, lx + wob(u, 3, A ? 4 : 1), ly + (A ? 0 : 0), wob(u, 2.4, A ? 5 : 1.5), 0.9); place(pepper, lx + 70, ly + 26, 14, 0.8);
      show(lettuce, 1); show(pepper, 1);
      dropsFrom(lx, ly + 40, u, A ? 0 : 5, 150);
      steam.forEach((s) => show(s, 0));
      return { R: r, L: l, gaze: A ? 0.8 : 0, smile: A ? 0.35 : 0.9 };
    },
    // 2 — Ich schneide die Tomate.
    (u, T) => {
      show(sets.cut, 1);
      const A = u < SPLIT, n = A ? clamp(Math.floor(u / 0.62), 0, 8) : 8;
      slices.forEach((s, i) => show(s, i < n ? 1 : 0));
      const chop = A ? Math.max(0, Math.sin((u / 0.62) * Math.PI * 2)) : 0;
      const kx = 568 + Math.min(n, 7) * 20, rest = ss(SPLIT, SPLIT + 0.8, u);
      const r = [lerp(kx + 16, 640, rest), lerp(1128 - chop * 62, 1040, rest)], l = [lerp(520, 470, rest), lerp(1190, 1180, rest)];
      show(tomato, n < 8 ? 1 : 0); place(tomato, 520 - n * 3, 1196, 0, 1 - n * 0.02);
      place(knife, r[0], r[1] + 36, 0, 1); show(knife, 1);
      return { R: r, L: l, gaze: A ? 0.8 : 0, smile: A ? 0.3 : 0.9 };
    },
    // 3 — Ich schäle die Kartoffel.
    (u, T) => {
      show(sets.peel, 1);
      const A = u < SPLIT, k = A ? ss(0.4, SPLIT - 0.4, u) : 1, rest = ss(SPLIT, SPLIT + 0.8, u);
      const stroke = A ? wob(u, 1.1, 1) : 0;
      const l = [lerp(500, 540, rest), lerp(1062, 990, rest)], r = [lerp(548, 600, rest), lerp(1030 + 34 * Math.sin(u * Math.PI * 2 * 1.1), 1000, rest)];
      place(potato, lerp(520, 540, rest), lerp(1050, 984, rest), wob(u, 0.55, 10), 1);
      show(potatoPale, k); show(potato, 1);
      place(peeler, r[0] + 18, r[1] + 14, 18, 0.95); show(peeler, A ? 1 : 0);
      peels.forEach((pl, i) => show(pl, clamp((k * 6 - i), 0, 1)));
      return { R: r, L: l, gaze: A ? 0.8 : 0, smile: A ? 0.3 : 0.9 };
    },
    // 4 — Ich lege die Zwiebel in die Pfanne.
    (u, T) => {
      show(sets.stove, 1); show(pot, 0); show(pan, 1); place(pan, 540, 1226, 0, 1);
      const tip = ss(1.0, 2.0, u), rest = ss(SPLIT, SPLIT + 0.7, u), fall = ss(1.6, 2.8, u);
      place(onionBoard, 540 + 60 * tip, lerp(1080, 1110, tip) , -34 * tip, 1); show(onionBoard, 1);
      onionOn.forEach((o, i) => show(o, fall < 0.02 ? 1 : 0));
      fallBits.forEach((f, i) => { const k = clamp(fall * 1.3 - i * 0.07, 0, 1); place(f, lerp(520 + i * 12, 520 + (i - 4) * 20, k), lerp(1088, 1232, k * k), 0, 1); show(f, k > 0 && k < 1 ? 1 : 0); });
      panBits.forEach((b, i) => show(b, i < 9 && fall > 0.95 ? 1 : 0));
      steamAt(540, 1180, u, fall > 0.95 ? 4 : 0, 30, 130, 0.45, 0.6);
      const r = [lerp(620 + 40 * tip, 640, rest), lerp(1088, 1060, rest)], l = [lerp(460, 470, rest), lerp(1090, 1070, rest)];
      show(knife, 0); show(spoon, 0); show(ladle, 0); show(peeler, 0); show(potato, 0); show(lettuce, 0); show(pepper, 0);
      return { R: r, L: l, gaze: A4(u), smile: u < SPLIT ? 0.3 : 0.9, apron: 1 };
    },
    // 5 — Ich rühre das Essen um.
    (u, T) => {
      show(sets.stove, 1); show(pot, 0); show(pan, 1); place(pan, 540, 1226, 0, 1); show(onionBoard, 0);
      panBits.forEach((b, i) => show(b, 1));
      const A = u < SPLIT, rest = ss(SPLIT, SPLIT + 0.8, u), ang = u * Math.PI * 2 * 0.9;
      const cx = 540 + Math.cos(ang) * 64 * (A ? 1 : 0), cy = 1218 + Math.sin(ang) * 12 * (A ? 1 : 0);
      const hand = [lerp(cx + 70, 640, rest), lerp(1090 + Math.sin(ang) * 6, 1030, rest)];
      const dx = cx - hand[0], dy = cy - hand[1];
      place(spoon, lerp(cx, 600, rest), lerp(cy + 6, 1040, rest), (Math.atan2(dy, dx) * 180) / Math.PI + 90 - 180, 0.95); show(spoon, 1);
      panBits.forEach((b, i) => { const a2 = ang * 0.6 + i; b.setAttribute("cx", -110 + i * 20 + (A ? Math.cos(a2) * 8 : 0)); b.setAttribute("cy", -4 + ((i * 7) % 5) * 4 + (A ? Math.sin(a2) * 3 : 0)); });
      steamAt(540, 1180, u, 5, 30, 150, 0.5, 0.65);
      show(knife, 0); show(ladle, 0); show(peeler, 0); show(potato, 0); show(lettuce, 0); show(pepper, 0);
      return { R: hand, L: [330, 1236], gaze: A ? 0.8 : 0, smile: A ? 0.3 : 0.9, apron: 1 };
    },
    // 6 — Ich koche die Suppe.
    (u, T) => {
      show(sets.stove, 1); show(pot, 1); place(pot, 540, 1252, 0, 1); show(pan, 0); show(onionBoard, 0);
      const A = u < SPLIT, rest = ss(SPLIT, SPLIT + 0.9, u), ang = u * Math.PI * 2 * 0.7;
      const cx = 540 + Math.cos(ang) * 56 * (A ? 1 : 0), cy = 1106 + Math.sin(ang) * 10 * (A ? 1 : 0);
      const hand = [lerp(cx + 60, 640, rest), lerp(990, 900, rest)];
      place(ladle, lerp(cx, 620, rest), lerp(cy - 30, 960, rest), lerp(-12, 4, rest), 1); show(ladle, 1);
      potBits.forEach((b, i) => { b.setAttribute("cx", [-70, 20, 80, -20][i] + (A ? Math.cos(ang + i) * 10 : 0)); });
      steamAt(540, 1090, u, 6, 36, 190, 0.5, 0.7);
      dropsFrom(620, 1010, u, A ? 0 : 3, 80);
      drops.forEach((d) => d.setAttribute("fill", "#F29B3C"));
      show(knife, 0); show(spoon, 0); show(peeler, 0); show(potato, 0); show(lettuce, 0); show(pepper, 0);
      return { R: hand, L: [450, 1190], gaze: A ? 0.8 : 0, smile: A ? 0.4 : 1, apron: 1 };
    },
  ];
  function A4(u) { return u < SPLIT ? 0.8 : 0; }

  // ------------------------------------------------------------------ the frame
  const MOUTH = CFG.mouth || [];
  function mouthAt(t) {
    const f = t * 25, i = Math.floor(f), k = f - i;
    return lerp(MOUTH[i] || 0, MOUTH[i + 1] || 0, k);
  }
  const sceneOf = (t) => { const S = CFG.scenes || []; for (let i = S.length - 1; i >= 0; i--) if (t >= S[i].t0) return i; return 0; };
  function draw(t) {
    const si = sceneOf(t), sc = (CFG.scenes || [])[si] || { t0: 0 }, u = Math.max(0, t - sc.t0);
    for (const s of Object.values(sets)) show(s, 0);
    show(water, 0); show(waterGlow, 0); ripples.forEach((r) => show(r, 0)); drops.forEach((d) => { show(d, 0); d.setAttribute("fill", "#8CCBFF"); }); fallBits.forEach((f) => show(f, 0));
    steam.forEach((s) => show(s, 0));
    [knife, peeler, potato, spoon, ladle, lettuce, pepper, tomato, onionBoard, pan, pot].forEach((n) => show(n, 0));   // each scene shows only its own things
    const pose = SCENES[Math.min(si, SCENES.length - 1)](u, t);
    show(apron, pose.apron ? ss(0, 0.2, u) : 0);
    arm("L", pose.R[0], pose.R[1]); arm("R", pose.L[0], pose.L[1], -1);   // the working hand is on the right of the picture, the holding hand on the left: the arms never cross
    // the face: the voice opens the mouth; a smile between the sentences; a blink every few seconds; a tiny breath
    const m = clamp(mouthAt(t), 0, 1), smile = pose.smile;
    mouthIn.setAttribute("opacity", m > 0.06 ? 1 : 0); teeth.setAttribute("opacity", m > 0.25 ? 1 : 0); tongue.setAttribute("opacity", m > 0.3 ? 0.9 : 0);
    const mh = 4 + 30 * m, mw = 26 + 6 * m * 0 - m * 4;
    mouthIn.setAttribute("d", `M -${mw} 0 Q 0 ${2 + smile * 6} ${mw} 0 Q ${mw - 3} ${mh} 0 ${mh + 2} Q -${mw - 3} ${mh} -${mw} 0 Z`);
    tongue.setAttribute("cy", 4 + mh * 0.75); tongue.setAttribute("ry", 4 + mh * 0.18);
    mouthShape.setAttribute("d", `M -${28 + smile * 4} ${-smile * 2} Q 0 ${8 + smile * 14} ${28 + smile * 4} ${-smile * 2}`);
    mouthShape.setAttribute("opacity", m > 0.06 ? 0 : 1);
    const blink = Math.max(0, 1 - Math.abs(((t % 3.6) - 1.7) / 0.07)), look = pose.gaze;
    eyes.forEach((e) => { e.lid.setAttribute("opacity", blink > 0.5 ? 1 : 0); e.pupil.setAttribute("cx", 0); e.pupil.setAttribute("cy", 5 * look); });
    brows[0].setAttribute("transform", `translate(0,${-4 * smile + (m > 0.4 ? -3 : 0)})`); brows[1].setAttribute("transform", `translate(0,${-4 * smile + (m > 0.4 ? -3 : 0)})`);
    head.setAttribute("transform", `translate(540,${566 + Math.sin(t * 1.7) * 2}) rotate(${Math.sin(t * 0.8) * 1.2 + (look ? 2 : 0)})`);
    body.setAttribute("transform", `translate(0,${Math.sin(t * 1.7) * 1.5})`);
  }
  window.__kochDraw = draw;
  draw(0);
  window.addEventListener("hf-seek", (ev) => draw(ev.detail.time));
})();
