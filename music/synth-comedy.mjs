// A comedy underscore, fully synthesised (owner, 2026-10-04: "the music is not comic"). Not the
// social-media EDM bed of synth.mjs: pizzicato walking bass, marimba, tuba and clarinet-like
// lines, woodblock accents. The tune is original and short-phrased, so it stays out of the way
// of the dialogue. Usage: node music/synth-comedy.mjs <seconds> <variant 1..3> <out.wav>
//   variant 1: sneaky pizzicato + marimba (C major)    variant 2: oom-pah tuba + clarinet (G major)
//   variant 3: bouncy pluck + shaker (F major)
// Env: MUSIC_BPM (default 120), MUSIC_CUTS (seconds, comma-separated: a woodblock + marimba accent lands there).
import { writeFileSync } from "node:fs";

const DUR = Number(process.argv[2]) || 60;
const VAR = ((Math.max(1, Math.floor(Number(process.argv[3]) || 1)) - 1) % 3) + 1;
const OUT = process.argv[4] || `music/comedy-${DUR}s-v${VAR}.wav`;
const SR = 44100, N = Math.floor(SR * DUR);
const BPM = Number(process.env.MUSIC_BPM) || 120, beat = 60 / BPM, bar = beat * 4, eighth = beat / 2;
const L = new Float32Array(N), R = new Float32Array(N);
const nf = (m) => 440 * Math.pow(2, (m - 69) / 12);
const TAU = Math.PI * 2;
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = rng(1337 + VAR * 911);
const noise = () => rnd() * 2 - 1;
// add a voice: fn(t) -> sample, panned by p (-1 left .. 1 right)
function add(t0, dur, fn, g = 1, p = 0) {
  const i0 = Math.max(0, Math.floor(t0 * SR)), i1 = Math.min(N, Math.floor((t0 + dur) * SR));
  const gl = g * Math.cos((p + 1) * Math.PI / 4), gr = g * Math.sin((p + 1) * Math.PI / 4);
  for (let i = i0; i < i1; i++) { const v = fn((i - Math.floor(t0 * SR)) / SR); L[i] += v * gl; R[i] += v * gr; }
}
const pizz = (t0, m, g = 1) => { const f = nf(m); add(t0, 0.4, (t) => (Math.sin(TAU * f * t) + 0.45 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 28)) * Math.exp(-t * 13) * 0.55 * Math.min(1, t * 400), g, 0); };
const marimba = (t0, m, g = 1, p = 0) => { const f = nf(m); add(t0, 0.55, (t) => (Math.sin(TAU * f * t) * Math.exp(-t * 9) + 0.32 * Math.sin(TAU * 4 * f * t) * Math.exp(-t * 34)) * 0.34 * Math.min(1, t * 500), g, p); };
const pluck = (t0, m, g = 1, p = 0) => { const f = nf(m); add(t0, 0.5, (t) => (Math.sin(TAU * f * t) * 0.6 + Math.sin(TAU * 2 * f * t) * 0.25 * Math.exp(-t * 8) + Math.sin(TAU * 3 * f * t) * 0.12 * Math.exp(-t * 16)) * Math.exp(-t * 7) * 0.4 * Math.min(1, t * 600), g, p); };
function tuba(t0, m, dur, g = 1) { const f = nf(m - 12); let y = 0; add(t0, dur + 0.05, (t) => { const x = 2 * ((f * t) % 1) - 1; y += 0.11 * (x - y); return y * Math.min(1, t * 60) * Math.max(0, 1 - Math.max(0, t - dur) * 25) * Math.exp(-t * 3) * 1.1; }, g, -0.1); }
function pah(t0, ms, g = 1) { ms.forEach((m, k) => { const f = nf(m); let y = 0; add(t0, 0.22, (t) => { const x = (f * t) % 1 < 0.5 ? 1 : -1; y += 0.18 * (x - y); return y * Math.exp(-t * 17) * 0.13 * Math.min(1, t * 200); }, g, 0.25 + k * 0.1); }); }
function clar(t0, m, dur, g = 1, p = 0.2) { const f = nf(m); add(t0, dur + 0.05, (t) => { const vib = 1 + 0.004 * Math.sin(TAU * 5.2 * t) * Math.min(1, t * 4); const ph = TAU * f * vib * t; return (Math.sin(ph) + 0.33 * Math.sin(3 * ph) + 0.18 * Math.sin(5 * ph) + 0.08 * Math.sin(7 * ph)) * Math.min(1, t * 40) * Math.min(1, Math.max(0, dur - t) * 30 + 0.0) * 0.2; }, g, p); }
const wood = (t0, g = 1) => add(t0, 0.14, (t) => (Math.sin(TAU * 980 * t) * 0.6 + Math.sin(TAU * 1560 * t) * 0.3) * Math.exp(-t * 55) * 0.55, g, 0.15);
function shaker(t0, g = 1) { let y = 0; add(t0, 0.09, (t) => { const x = noise(); const h = x - y; y += 0.5 * h; return h * Math.exp(-t * 55) * 0.07; }, g, -0.2); }

// ---- harmony: I - vi - IV - V, four bars each, then the same with a turnaround
const KEY = { 1: 48, 2: 55, 3: 53 }[VAR];            // C3, G3, F3
const CH = [[0, "maj"], [9, "min"], [5, "maj"], [7, "maj"]];
const triad = (root, typ) => [root, root + (typ === "min" ? 3 : 4), root + 7];
const PENT = [0, 2, 4, 7, 9];                          // major pentatonic: nothing can sound wrong
// original two-bar melodic cells over eighths (1 = a note); chosen at random per phrase
const CELLS = [
  [1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0],
  [1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0],
  [0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0],
  [1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0],
];
const nBars = Math.ceil(DUR / bar);
let deg = 2;
for (let b = 0; b < nBars; b++) {
  const t0 = b * bar;
  const [off, typ] = CH[Math.floor(b / 2) % 4];
  const root = KEY + off, tri = triad(root, typ);
  const sneak = b % 8 === 7;                           // every eighth bar: a chromatic tiptoe
  const layers = { bass: true, comp: b >= 2, tune: b >= 4 && !(b % 8 >= 6), perc: b >= 2 };
  // bass
  if (VAR === 2) { tuba(t0, root, beat * 0.7); tuba(t0 + beat * 2, root + 7, beat * 0.7); }
  else if (sneak) [0, 1, 2, 3].forEach((k) => pizz(t0 + k * beat, root + k * 1, 1));
  else [root, tri[1], tri[2], tri[1] + 5 > tri[2] ? tri[1] + 5 : tri[2] + 2].forEach((m, k) => pizz(t0 + k * beat, m, k % 2 ? 0.75 : 1));
  // comp
  if (layers.comp) {
    if (VAR === 2) [1, 3].forEach((k) => pah(t0 + k * beat, tri.map((m) => m + 12)));
    else [1.5, 3.5].forEach((k) => tri.forEach((m, j) => (VAR === 1 ? marimba : pluck)(t0 + k * beat, m + 12, 0.55, -0.4 + j * 0.4)));
  }
  if (layers.perc && VAR === 3) for (let e = 0; e < 8; e++) shaker(t0 + e * eighth, e % 2 ? 0.7 : 1);
  // tune: a two-bar cell, a new one every two bars
  if (layers.tune) {
    if (b % 2 === 0) { var cell = CELLS[Math.floor(rnd() * CELLS.length)]; }
    for (let e = 0; e < 8; e++) {
      if (!cell[(b % 2) * 8 + e]) continue;
      deg = Math.max(0, Math.min(9, deg + [-2, -1, 0, 1, 2][Math.floor(rnd() * 5)]));
      const m = KEY + 24 + 12 * Math.floor(deg / 5) + PENT[deg % 5];
      if (VAR === 2) clar(t0 + e * eighth, m, eighth * 0.8); else if (VAR === 1) marimba(t0 + e * eighth, m, 1, 0.3); else pluck(t0 + e * eighth, m, 1, 0.3);
    }
  }
}
// the end: a button chord, then a woodblock
{ const te = Math.max(0, DUR - 1.4); const [off] = CH[0]; const tri = triad(KEY + off, "maj");
  tri.forEach((m, j) => { marimba(te, m + 12, 1.3, -0.3 + j * 0.3); pizz(te, m - 12 + 12, 0.9); }); wood(te + 0.5, 0.8); }
// accents on the cuts: a woodblock and a rising two-note marimba pickup
String(process.env.MUSIC_CUTS || "").split(",").map(Number).filter((t) => t > 0.2 && t < DUR - 1).forEach((t) => {
  wood(t, 0.9); marimba(t - 0.12, KEY + 31, 0.8, 0.4); marimba(t, KEY + 36, 0.9, 0.4);
});
// soft warmth: a little room echo
const d1 = Math.floor(SR * 0.19), d2 = Math.floor(SR * 0.31);
for (let i = N - 1; i >= 0; i--) { if (i >= d1) { L[i] += R[i - d1] * 0.14; R[i] += L[i - d1] * 0.14; } if (i >= d2) { L[i] += L[i - d2] * 0.07; R[i] += R[i - d2] * 0.07; } }
// to a 16-bit stereo wav, peak 0.8
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const sc = peak > 0 ? 0.8 / peak : 1, buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * sc * 32767))), 44 + i * 4); buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * sc * 32767))), 46 + i * 4); }
writeFileSync(OUT, buf);
console.log(`  comedy music v${VAR} ${DUR}s ${BPM}bpm -> ${OUT}`);
