// Music derived from the CONTENT, not from a bare random seed.
//
// Two levels, mirroring how the graphics work:
//  1. MOOD — the whole track's identity comes from what the video teaches. An
//     analytics video should sound focused and driving; a music/audio tool
//     should sound warm and melodic; a growth/publishing video should sound
//     bright and lifting. Tempo, brightness, groove, palette and which voices
//     play all follow from that.
//  2. ACCENT — each slide gets the accent that fits ITS action. "Send/publish"
//     rises and releases, "write" ticks like typing, "open the site" clicks,
//     "download/done" chimes, "audio" sweeps a filter. So the ear hears the
//     specific step change, not one generic whoosh four times.
//
// style.mjs and synth.mjs BOTH import bpmFor() from here, so the composition's
// cut times and the rendered audio can never disagree about the tempo.

export const MOODS = {
  // Every mood is upbeat — the channel's videos are cheerful how-tos, so even the
  // "focused" one should feel good. Lead melody is always on: a track without a
  // tune reads as background noise rather than something you want to hear.
  // focused, driving — data, keywords, analytics, rules
  focus: { bpm: [120, 128], bright: 1.00, groove: "four", palette: "bright",
           useLead: true, usePluck: true, openHats: true, swing: 0.010 },
  // warm and melodic — anything about sound, music or voice
  warm: { bpm: [116, 124], bright: 1.02, groove: "half", palette: "soft",
          useLead: true, usePluck: true, openHats: true, swing: 0.022 },
  // bright and lifting — growth, publishing, reach, monetisation
  lift: { bpm: [126, 134], bright: 1.16, groove: "four", palette: "bright",
          useLead: true, usePluck: true, openHats: true, swing: 0.006 },
  // clean and modern — creation tools, editing, design
  craft: { bpm: [122, 130], bright: 1.08, groove: "broken", palette: "bright",
           useLead: true, usePluck: true, openHats: true, swing: 0.014 },
  // punchy and playful — social features, stories, community
  play: { bpm: [128, 136], bright: 1.12, groove: "broken", palette: "bright",
          useLead: true, usePluck: true, openHats: true, swing: 0.018 },
  // calm and friendly — a course lesson (owner, 2026-10-05: "calm music"): slow, soft, a gentle tune, no open hats
  calm: { bpm: [84, 92], bright: 0.85, groove: "half", palette: "soft",
          useLead: true, usePluck: true, openHats: false, swing: 0.010 },
  // steady and serious — a deportation story must not sound celebratory
  news: { bpm: [96, 104], bright: 0.72, groove: "half", palette: "soft",
          useLead: false, usePluck: true, openHats: false, swing: 0.004 },
};

// Which mood a video gets, read from what it actually teaches.
export function moodFor(pack) {
  const id = String(pack.id || "").toLowerCase();
  const text = (
    (pack.feature || "") + " " + (pack.hook?.l1 || "") + " " + (pack.hook?.l2 || "") + " " +
    (pack.tips || []).map((t) => t.head || "").join(" ")
  );
  const has = (...w) => w.some((x) => text.includes(x));

  if (/audio|suno|eleven|podcast|dub|voice|music/.test(id) || has("صدا", "موسیقی", "آهنگ", "دوبله"))
    return "warm";
  if (/keyword|insight|retention|analytic|health-rating|search/.test(id) || has("آمار", "نمودار", "جستجو", "کلمات کلیدی", "امتیاز"))
    return "focus";
  if (/media-kit|schedule|trial|broadcast|collab|grid|pin|translate|dubbing/.test(id) || has("برند", "منتشر", "زمان‌بندی", "رشد", "دنبال"))
    return "lift";
  if (/kling|cleanup|removebg|upscayl|photopea|descript|capcut|teleprompter|carousel|template|canva|ideogram/.test(id) || has("بساز", "ویرایش", "تدوین", "دیزاین", "قالب"))
    return "craft";
  return "play";
}

function rng(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The one place tempo is decided. Within the mood's range the seed still varies
// it, so two "lift" videos are not the same track.
export function bpmFor(seed, mood) {
  const m = MOODS[mood] || MOODS.play;
  const R = rng((Math.max(1, Math.floor(seed || 1)) * 2654435761) % 2147483647 || 7);
  const [lo, hi] = m.bpm;
  return lo + Math.floor(R() * (hi - lo + 1));
}

export function moodParams(mood) {
  const m = MOODS[mood] || MOODS.play;
  return { bright: m.bright, groove: m.groove, palette: m.palette,
           useLead: m.useLead, usePluck: m.usePluck, openHats: m.openHats, swing: m.swing };
}

// ---- per-slide accents -----------------------------------------------------
// Keyed by the slide's art name (lib/scene-art.mjs), so picture and sound are
// chosen from the same caption and always agree.
const ACCENT_BY_ART = {
  send: "riser", upload: "riser", rocket: "riser",
  write: "tick", chat: "tick",
  browser: "click", menu: "click", toolbox: "click", phone: "click", chip: "click",
  sparkle: "chime", star: "chime", heart: "chime", wand: "chime", play: "chime",
  bookmark: "chime", resume: "impact", studio: "sweep", screen: "click", brand: "click",
  mic: "sweep", wave: "sweep", music: "sweep", globe: "sweep",
  chart: "impact", trend: "impact", target: "impact", search: "impact",
  camera: "impact", clock: "impact", calendar: "impact",
};

// How hard each slide should land. A payoff slide — the thing saved, sent or
// finished — deserves more push than "open the menu", and a flat sequence of
// four identical hits is what makes a track feel lifeless no matter its tempo.
const WEIGHT_BY_ART = {
  send: 1.25, upload: 1.15, rocket: 1.25, sparkle: 1.2, bookmark: 1.2,
  star: 1.15, heart: 1.15, studio: 1.15, resume: 1.1, chart: 1.1, trend: 1.1,
  browser: 0.85, menu: 0.8, toolbox: 0.85, chip: 0.8, phone: 0.85,
  write: 0.9, chat: 0.9, clock: 0.9, calendar: 0.95,
};

export function weightFor(artName) {
  return WEIGHT_BY_ART[artName] ?? 1;
}

export function accentFor(artName) {
  return ACCENT_BY_ART[artName] || "impact";
}

// Serialise "time:type,time:type" for the synth to read from the environment.
export function accentSpec(cutTimes, artNames) {
  return cutTimes
    .map((t, i) => `${t.toFixed(3)}:${accentFor(artNames[i] || "")}:${weightFor(artNames[i] || "").toFixed(2)}`)
    .join(",");
}
