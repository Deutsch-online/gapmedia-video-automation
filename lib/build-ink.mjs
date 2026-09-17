// "Editorial Ink" builder — matches the reference reel's visual language:
// warm paper ground, a strict two-colour palette (navy + crimson), engraved
// hand-drawn illustrations, solid circle colour-blocks, full-width text bands,
// and whip-blur transitions instead of hard cuts.
import { readFileSync } from "node:fs";
import { renderUI, UI_CSS } from "./ui-mock.mjs";
import { retentionLineFor } from "./retention.mjs";
import { sceneArtPlan, sceneArt, stepStage, iconKeyFor, hookArtFor, MOTIF_CSS } from "./scene-art.mjs";
import { appScreen, toolCard, platformHero, PLATFORM_HERO_CSS } from "./app-screen.mjs";
import { platformMark, MARK_CSS } from "./platform-marks.mjs";
import { brandFor } from "./brand.mjs";
import { assertImage, imageSize } from "./media-guard.mjs";
import { characterSVG, characterCSS, characterTimeline, poseFor } from "./character.mjs";

const b64 = (p) => readFileSync(p).toString("base64");
const FONT_FACES = [
  [400, "Regular"], [500, "Medium"], [700, "Bold"], [800, "ExtraBold"], [900, "Black"],
]
  .map(([w, n]) => `@font-face{font-family:"Vazirmatn";font-weight:${w};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b64(`public/fonts/Vazirmatn-${n}.woff2`)}) format("woff2");}`)
  .join("\n");
const GSAP = readFileSync("public/gsap.min.js", "utf8");

// ---------- engraved line illustrations ----------
// Stroke-only art + hatching; a turbulence filter makes the strokes read hand-drawn.
const ART = {
  target: `<circle cx="100" cy="104" r="72" /><circle cx="100" cy="104" r="50" /><circle cx="100" cy="104" r="28" /><circle cx="100" cy="104" r="9" fill="currentColor"/>
    <path d="M104 100 168 38"/><path d="M150 30l22-8-6 22"/><path d="M156 52l16-14"/>
    <path d="M62 168l24-40M138 168l-24-40"/>
    <path d="M40 60l-12 8M46 44l-14 4M52 152l-16 8M160 150l16 10"/>`,
  bulb: `<path d="M100 24a48 48 0 0 0-28 87c6 5 8 9 8 15h40c0-6 2-10 8-15A48 48 0 0 0 100 24z"/>
    <path d="M80 140h40M86 154h28M92 168h16"/>
    <path d="M100 44v34M86 60l14 12M114 60l-14 12"/>
    <path d="M30 60l-14-8M170 60l14-8M28 118H12M172 118h16M44 26 34 16M156 26l10-10"/>`,
  phone: `<rect x="56" y="18" width="88" height="164" rx="16"/><rect x="66" y="34" width="68" height="126" rx="6"/>
    <path d="M88 26h24"/><circle cx="100" cy="172" r="7"/>
    <path d="M76 52h56M76 68h40M76 84h56M76 100h32M76 116h48M76 132h28"/>`,
  chart: `<path d="M28 172h150"/><path d="M28 172V28"/>
    <rect x="52" y="118" width="26" height="54"/><rect x="92" y="82" width="26" height="90"/><rect x="132" y="48" width="26" height="124"/>
    <path d="M56 124h18M56 134h18M96 88h18M96 98h18M136 54h18M136 64h18"/>
    <path d="M44 100l30-26 34 22 40-46"/>`,
  clock: `<circle cx="100" cy="102" r="74"/><circle cx="100" cy="102" r="62"/>
    <path d="M100 60v46l30 18"/><circle cx="100" cy="102" r="6" fill="currentColor"/>
    <path d="M100 34v10M100 160v10M32 102h10M158 102h10M52 54l7 7M141 150l7 7M148 54l-7 7M59 150l-7 7"/>`,
  megaphone: `<path d="M36 84v34l30 8 62 34V42L66 76z"/><path d="M128 60c22 8 22 62 0 70"/>
    <path d="M150 52c30 14 30 90 0 104"/><path d="M66 126l10 44h22l-8-38"/>
    <path d="M44 92h14M44 102h14M44 112h14"/>`,
  camera: `<rect x="24" y="56" width="152" height="106" rx="14"/><path d="M74 56l12-20h28l12 20"/>
    <circle cx="100" cy="110" r="34"/><circle cx="100" cy="110" r="22"/><circle cx="100" cy="110" r="10"/>
    <path d="M40 76h18M152 76h10M84 92l-8 8M116 128l8-8"/>`,
  rocket: `<path d="M100 16c26 22 38 54 38 88l-16 26H78l-16-26c0-34 12-66 38-88z"/>
    <circle cx="100" cy="82" r="18"/><path d="M62 118 34 146l30-4M138 118l28 28-30-4"/>
    <path d="M86 154c6 18 8 24 14 30 6-6 8-12 14-30"/><path d="M92 46h16M88 60h24"/>`,
  key: `<circle cx="66" cy="102" r="38"/><circle cx="66" cy="102" r="16"/>
    <path d="M104 102h72"/><path d="M150 102v26M172 102v20"/><path d="M40 78l-10-8M40 126l-10 8"/>`,
  magnet: `<path d="M50 40v58a50 50 0 0 0 100 0V40h-32v58a18 18 0 0 1-36 0V40z"/>
    <path d="M50 40h32M118 40h32"/><path d="M56 150l-12 12M144 150l12 12M100 168v16"/>`,
  star: `<path d="M100 18 124 76l62 6-47 42 14 62-53-34-53 34 14-62-47-42 62-6z"/>
    <path d="M100 44 88 78l-34 4M100 44l12 34 34 4"/>
    <path d="M74 132l10-30M126 132l-10-30"/>`,
  users: `<circle cx="70" cy="58" r="28"/><path d="M22 158a48 48 0 0 1 96 0"/>
    <circle cx="142" cy="70" r="22"/><path d="M116 152a40 40 0 0 1 64-8"/>
    <path d="M52 44c10-8 26-8 36 0M58 66h24"/>
    <path d="M34 140h72M40 152h60M126 140h44M132 152h34"/>
    <path d="M70 86v16M142 92v12"/>`,
  wand: `<path d="M40 168 128 80"/><path d="M120 72l16 16"/>
    <path d="M150 24l6 18 18 6-18 6-6 18-6-18-18-6 18-6z"/>
    <circle cx="60" cy="52" r="6"/><circle cx="168" cy="120" r="6"/><circle cx="96" cy="30" r="4"/>`,
  mic: `<rect x="80" y="20" width="40" height="76" rx="20"/><path d="M56 88a44 44 0 0 0 88 0"/>
    <path d="M100 132v34M74 168h52"/><path d="M88 40h24M88 56h24M88 72h24"/>`,
  globe: `<circle cx="100" cy="102" r="72"/><path d="M28 102h144"/>
    <path d="M100 30c26 22 26 122 0 144M100 30c-26 22-26 122 0 144"/>
    <path d="M46 62c30 14 78 14 108 0M46 142c30-14 78-14 108 0"/>`,
  calendar: `<rect x="28" y="42" width="144" height="130" rx="10"/><path d="M28 78h144"/>
    <path d="M64 26v28M136 26v28"/>
    <path d="M56 100h20M92 100h20M128 100h20M56 130h20M92 130h20M128 130h20"/>`,
  layers: `<path d="M100 22 178 64l-78 42-78-42z"/><path d="M22 100l78 42 78-42"/><path d="M22 136l78 42 78-42"/>
    <path d="M62 60l38-20 38 20M74 68l26-14"/>`,
  chat: `<path d="M24 36h152v92H88l-42 34V128H24z"/>
    <path d="M52 66h96M52 92h60"/>
    <path d="M36 46h8M36 118h8M164 46h-8"/>`,
  chip: `<rect x="52" y="52" width="96" height="96" rx="8"/><rect x="76" y="76" width="48" height="48" rx="4"/>
    <path d="M72 24v28M100 24v28M128 24v28M72 148v28M100 148v28M128 148v28M24 72h28M24 100h28M24 128h28M148 72h28M148 100h28M148 128h28"/>`,
  trend: `<path d="M24 150 76 96l32 30 66-76"/><path d="M144 46h34v34"/>
    <path d="M24 172h152"/><path d="M46 160v-18M86 160v-34M126 160v-26M166 160v-52"/>`,
  refresh: `<path d="M170 100a70 70 0 1 1-22-50"/><path d="M152 20v36h-36"/>
    <path d="M60 100a40 40 0 0 0 40 40"/>`,
  heart: `<path d="M100 174C40 130 22 104 22 74a38 38 0 0 1 78-16 38 38 0 0 1 78 16c0 30-18 56-78 100z"/>
    <path d="M56 66c-6 10-5 22 2 32M70 58c-8 10-8 22-2 32"/>
    <path d="M132 62c8 10 8 24 2 34"/>
    <path d="M84 132c8 8 24 8 32 0"/>`,
  bookmark: `<path d="M56 24h88a8 8 0 0 1 8 8v144l-52-40-52 40V32a8 8 0 0 1 8-8z"/>
    <path d="M80 62h40"/>`,
  write: `<path d="M28 172h144"/><path d="M62 146l16-52 62-62 26 26-62 62z"/>
    <path d="M128 58l26 26"/><path d="M78 94l26 26"/>`,
  toggle: `<rect x="24" y="66" width="152" height="68" rx="34"/>
    <circle cx="142" cy="100" r="22" fill="currentColor"/><path d="M52 100h34"/>`,
  send: `<path d="M24 100 176 34l-30 132-42-40z"/><path d="M104 126l-30 34v-46"/>
    <path d="M24 100l80 26 42-92"/>`,
  shop: `<path d="M32 78h136v96a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8z"/>
    <path d="M26 78l14-40h120l14 40"/><path d="M32 78h136"/>
    <path d="M84 182v-52h32v52"/><path d="M68 44v34M100 44v34M132 44v34"/>`,
  pen: `<path d="M36 168l10-34 92-92 24 24-92 92z"/><path d="M126 50l24 24"/><path d="M36 168l22-8-14-14z"/>
    <path d="M60 140l70-70"/>`,
  play: `<rect x="22" y="36" width="156" height="112" rx="16"/><path d="M84 68v48l44-24z"/>
    <path d="M22 60h156"/><circle cx="42" cy="48" r="5"/><circle cx="60" cy="48" r="5"/>
    <path d="M60 166h80M100 148v18"/>`,
  hashtag: `<path d="M68 24 50 178M138 24l-18 154M28 70h146M22 122h146"/>`,
  sparkle: `<path d="M100 20c6 44 16 54 60 60-44 6-54 16-60 60-6-44-16-54-60-60 44-6 54-16 60-60z"/>
    <path d="M48 128l4 16 16 4-16 4-4 16-4-16-16-4 16-4z"/>`,
  target2: `<circle cx="100" cy="100" r="70"/><circle cx="100" cy="100" r="44"/><circle cx="100" cy="100" r="18"/>`,
  user: `<circle cx="100" cy="66" r="34"/><path d="M32 176a68 68 0 0 1 136 0"/><path d="M60 150h80"/>`,
  bolt: `<path d="M112 16 58 106h36l-10 78 58-96h-38z"/>`,
  music: `<path d="M148 26v96"/><path d="M76 46v96"/><path d="M76 46 148 26"/>
    <ellipse cx="56" cy="146" rx="24" ry="18"/><ellipse cx="128" cy="126" rx="24" ry="18"/>`,
};
const artFor = (k) => ART[k] || ART.star;

const PD = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

export function buildInkHTML(pack) {
  // A platform is not a colour token.  It changes the spatial language of the
  // whole film: TikTok reads like a fast, tactile cut; Instagram like an
  // editorial story; app tutorials like a product lab; German A1 like a
  // language flash-card studio.  The family is chosen from the *subject*, not
  // a daily seed, so the renderer cannot silently turn both projects into the
  // same recoloured template.
  const DESIGN = pack.design?.family || (pack.kind === "german-lesson"
    ? "german-flashcard"
    : pack.platform === "tiktok"
      ? "tiktok-cutout"
      : pack.platform === "instagram"
        ? "instagram-editorial"
        : pack.platform === "tools"
          ? "product-lab"
          : "evidence-board");
  const n = pack.tips.length;
  // the video's concept decides its graphics; generic falls back to the device
  // every slide draws art for its OWN action, so there is no single video motif
  const HERO = true;
  // one art plan per video: four different drawings, never a repeat
  const ART_PLAN = sceneArtPlan(pack.tips);
  const BRAND = brandFor(pack);
  // The hook is where the viewer decides whether this is for them, so it has to
  // plant the identity: the tool's own wordmark and colour, or the app's real
  // screen. An abstract drawing leaves nothing to recognise later.
  const HOOK_BRAND = (pack.tips.find((t) => t.brand) || {}).brand || null;
  const HOOK_SCREEN = HOOK_BRAND ? null : ((pack.tips.find((t) => t.screen) || {}).screen || null);
  // A verified official screen always wins in the hook. Do not replace it with a generic illustration.
  // The German A1 lesson series never sets pack.hookPhoto, so falling back to
  // the first tip's photo here used to show the exact same picture in the
  // hook AND in the first vocabulary slide right after it — a repeated
  // image across slides, the pattern VISUAL_QC_STANDARD.md explicitly
  // rejects (owner review 2026-09-11). Every other pack (tiktok/instagram/
  // tools) still gets this fallback: a real screenshot in the hook is
  // strictly better than an illustration when one is available and nothing
  // downstream repeats it. A lesson hook without its own photo falls
  // through to the illustrated sceneArt() treatment below instead.
  const HOOK_MEDIA_TIP = pack.kind === "german-lesson" ? null : (pack.tips.find((t) => t.photo) || null);
  const HOOK_MEDIA = pack.hookPhoto || HOOK_MEDIA_TIP?.photo || null;
  const HOOK_MEDIA_ALT = HOOK_MEDIA === pack.hookPhoto ? (pack.hookPhotoAlt || pack.feature || "Hook visual") : (HOOK_MEDIA_TIP?.photoAlt || pack.feature || "Official app interface");
  const HOOK_MEDIA_AR = HOOK_MEDIA === pack.hookPhoto ? pack.hookPhotoAspect : HOOK_MEDIA_TIP?.photoAspect;
  const TOTAL = pack.duration ?? 56;
  const HOOK = pack.hookDuration ?? 4;
  const OUTRO = pack.outroDuration ?? 6;
  // When the narration has been measured, each scene lasts as long as its own
  // spoken line; otherwise fall back to an even split.
  const DURS = Array.isArray(pack.tipDurations) && pack.tipDurations.length === n
    ? pack.tipDurations
    : Array.from({ length: n }, () => (TOTAL - HOOK - OUTRO) / n);
  const TIP = DURS[0];
  const tipStart = (i) => HOOK + DURS.slice(0, i).reduce((a, d) => a + d, 0);
  const tipLen = (i) => DURS[i];
  // Under ~3.2s a two-line caption cannot be read — drop the chrome and let the
  // band headline + illustration carry the message (short-form scanning).
  const COMPACT = TIP < 3.2;

  // strict two-colour system, alternating per scene
  const PAIR = (pack.ink && pack.ink.pair) || ["#123a63", "#b31739"];

  // The chapter rail's segments: hook, every step, outro — each with the same
  // start and duration as the scene it tracks, taken from the very constants
  // the scenes are laid out with rather than recomputed. Idea borrowed (the
  // idea only — no code, and nothing installed) from a chaptered-explainer
  // tool the owner sent on 2026-09-16, whose licence forbids commercial use;
  // written from scratch here for our own vertical format.
  const CHAPTERS = [
    { at: 0, duration: HOOK },
    ...DURS.map((d, i) => ({ at: HOOK + DURS.slice(0, i).reduce((a, x) => a + x, 0), duration: d })),
    { at: HOOK + DURS.reduce((a, d) => a + d, 0), duration: OUTRO },
  ];
  const PAPER = (pack.ink && pack.ink.paper) || "#efe9e1";
  const TINT = (pack.ink && pack.ink.tint) || "rgba(18,58,99,.10)";
  const inkOf = (i) => PAIR[i % PAIR.length];
  // The bokeh circles need real, visible colour (confirmed live 2026-09-07:
  // the existing --glow/--glow2 vars are deliberately faint for the big base
  // wash and just disappear into a light PAPER at that strength) — a plain
  // hex + alpha suffix, not the subtle wash vars.
  const alpha = (hex, a) => `${hex}${a}`;
  // Darken a hex toward black by a factor, keeping its hue — so the ground's
  // top/bottom edges deepen in the SAME colour family as PAPER (a navy paper
  // darkens to deep navy, a violet paper to deep violet), instead of a
  // hardcoded navy that would tint every platform's edges blue.
  const darken = (hex, f) => {
    const h = String(hex).replace("#", "");
    if (h.length < 6) return hex;
    const c = (i) => Math.round(parseInt(h.slice(i, i + 2), 16) * f).toString(16).padStart(2, "0");
    return `#${c(0)}${c(2)}${c(4)}`;
  };

  // The "warm paper ground" below was built assuming PAPER is always a light
  // tone: its gradient anchors a hardcoded #ffffff at the top and a hardcoded
  // near-black only at the very bottom edge, so a caller-supplied dark PAPER
  // (a serious/news-toned video, confirmed live 2026-09-04) still rendered as
  // the same cream paper look — the override changed the accent glow but the
  // ground itself never moved. Anchors now follow whichever end PAPER is
  // actually closer to, instead of assuming light.
  const paperIsDark = (() => {
    const h = String(PAPER).replace("#", "");
    if (h.length < 6) return false;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 90;
  })();
  const PAPER_NEAR = paperIsDark ? "#000000" : "#ffffff";
  const PAPER_FAR = paperIsDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.05)";
  const PAPER_SHEEN_NEAR = paperIsDark ? "rgba(255,255,255,.10)" : "rgba(255,255,255,.75)";
  const PAPER_SHEEN_FAR = paperIsDark ? "rgba(255,255,255,.03)" : "rgba(0,0,0,.06)";
  // A flat two-colour gradient reads as flat no matter which two colours go
  // in it — confirmed live 2026-09-06 after two separate re-colourings both
  // still looked "bad" to the channel owner. What was actually missing was
  // depth: a believable light source, a photographic edge falloff, and real
  // grain instead of a repeating dot pattern. A darker ground can carry a
  // stronger vignette without crushing the image; a light one needs a
  // gentler touch so the corners don't look muddy.
  const VIGNETTE_EDGE = paperIsDark ? "rgba(0,0,0,.55)" : "rgba(20,15,10,.16)";
  // A soft white glint among the colour blobs below — every wallpaper-style
  // reference photo supplied 2026-09-07 mixes its colour bokeh with a few
  // paler, brighter circles, not just the two brand hues repeated.
  const HIGHLIGHT = paperIsDark ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.60)";

  // The reference the channel owner supplied 2026-09-07 (iOS "Multicoloured"
  // wallpaper) is one specific look: many soft, out-of-focus circles of mixed
  // size and colour — brand hues plus paler glints — scattered over a pastel
  // gradient that trends toward a light lavender at the bottom. BOKEH is that
  // circle field; GROUND is that gradient. Both the ordinary scenes and the
  // real-photo scenes share them, so every scene reads the same way — the
  // real-photo scenes previously diverged to a hardcoded cream studio ground,
  // which is exactly the "کلا این رنگ" the owner rejected.
  // The circle colours: a genuine multi-hue mix, not one brand hue repeated —
  // the owner asked for "رنگ مختلط بیشتر" (more mixed colour). A feature can
  // supply its own `ink.mix`; otherwise fall back to the two pair colours plus
  // a cool accent so it still reads as a mix. On a dark ground these glow
  // brighter, so the alphas below are tuned for dark; a light ground softens
  // them by using the same values over a paler base.
  const MIX = (pack.ink && Array.isArray(pack.ink.mix) && pack.ink.mix.length)
    ? pack.ink.mix : [PAIR[1], PAIR[0], "#6366F1", "#22D3EE"];
  const mixAt = (i) => MIX[i % MIX.length];
  const BOKEH = [
    `radial-gradient(circle 300px at 76% 12%, ${HIGHLIGHT}, transparent 70%)`,
    `radial-gradient(circle 420px at 14% 22%, ${alpha(mixAt(0), "66")}, transparent 68%)`,
    `radial-gradient(circle 340px at 92% 40%, ${alpha(mixAt(1), "5c")}, transparent 66%)`,
    `radial-gradient(circle 240px at 60% 6%, ${HIGHLIGHT}, transparent 72%)`,
    `radial-gradient(circle 460px at 20% 70%, ${alpha(mixAt(2), "5c")}, transparent 68%)`,
    `radial-gradient(circle 360px at 84% 82%, ${alpha(mixAt(3), "52")}, transparent 66%)`,
    `radial-gradient(circle 260px at 8% 94%, ${alpha(mixAt(4), "4d")}, transparent 70%)`,
    `radial-gradient(circle 300px at 46% 52%, ${alpha(mixAt(1), "3d")}, transparent 74%)`,
    `radial-gradient(circle 220px at 40% 30%, ${alpha(mixAt(2), "33")}, transparent 74%)`,
  ].join(",");
  const GROUND = paperIsDark
    ? `linear-gradient(180deg,${darken(PAPER, 0.62)} 0%,${PAPER} 48%,${darken(PAPER, 0.5)} 100%)`
    : `linear-gradient(180deg,#F8F4FE 0%,${PAPER} 42%,#E4D9FB 100%)`;

  const plain = (s) => String(s).replace(/<[^>]*>/g, "").trim();
  // A verified public app screen can be used for a tutorial step. It is encoded
  // into the composition so the renderer never relies on a network request.
  // A newsroom screenshot is usually a wide montage of several phone frames.
  // Contained in a portrait phone frame it shrinks to a stamp — on screen and
  // unreadable, which is the same as not showing it. The file's own
  // dimensions decide the frame; an unreadable header falls back to portrait.
  // The frame takes the picture's own proportions rather than forcing the
  // picture into a fixed one. A tall device holding a square capture leaves
  // black bands above and below — the unfinished look this was meant to end —
  // and cropping the square to fill it cut the digits off "504" and "12".
  //
  // So: only a genuinely phone-shaped capture gets the tall device. Everything
  // else gets a panel built to its own aspect ratio, which is always full
  // and never cropped.
  const shapeOf = (photo) => {
    const p = photo?.src || photo;
    const size = typeof p === "string" ? imageSize(p) : null;
    if (!size) return { cls: "wide", ar: 1.6 };
    const ar = size.width / size.height;
    if (ar >= 0.46 && ar <= 0.70) return { cls: "phone", ar };
    // tip.photo is always a real, rescued/sourced photo — never an app
    // screenshot (those render through the tip.screen/tip.ui → stepStage
    // path instead) — so a landscape-leaning source (ar > 0.85: a typical
    // 4:3/16:9/3:2 web photo) preserving its own native ratio rendered as a
    // small, horizontal box sitting high on the 1080x1920 canvas (owner
    // report 2026-09-10, across both the German-lesson series and daily
    // tiktok/instagram real-photo scenes). .official-ui img already has
    // object-fit:cover, so cropping to a portrait ratio here costs nothing
    // the photo wasn't already going to have cropped at its native ratio,
    // and it reads far better on a vertical canvas.
    // Owner rule 2026-09-13, with three delivered frames as evidence: a
    // picture may never be shown incomplete. This line used to force EVERY
    // landscape source into a 0.75 portrait frame and rely on object-fit:
    // cover to make it fit — which for a 16:9 source throws away ~58% of its
    // width, from both sides. The comment above justified that with "tip.photo
    // is always a real photo — never an app screenshot", and that assumption
    // is simply not true of the rescue path: it routinely returns product
    // cards and UI shots that are mostly TEXT. The delivered frames showed
    // «دایرکت‌فا» cut to «...ون هوشمند دایرکت و کامنت این...» and a card whose
    // whole label was chopped off at the edge.
    //
    // Cropping is lossless for a photograph and destructive for text. So the
    // frame now keeps the source's own shape (clamped so it cannot become a
    // sliver on a 1080x1920 canvas) and the image is drawn with `contain` —
    // see the fit-contain rule in the stylesheet. A deliberately-shaped image
    // still crops as before, because it comes through forcedAr instead.
    if (ar > 0.85) return { cls: "panel", ar: Math.min(ar, 1.6) };
    return { cls: "panel", ar };
  };
  // A vocabulary/lifestyle photo is never a device capture, so it should
  // never be squeezed into whatever landscape ratio the source happened to
  // have (a 4:3 or 16:9 web photo reads as a small, high, horizontal box on
  // a 1080x1920 canvas). forcedAr — set per tip via tip.photoAspect —
  // overrides shapeOf's native-ratio "panel" with a fixed portrait ratio
  // instead; .official-ui img already has object-fit:cover, so the source
  // photo crops cleanly into it regardless of its own shape.
  // `fit` is the whole rule in one field. forcedAr is set ONLY by paths that
  // chose the shape on purpose for an image whose meaning survives a crop —
  // german-lesson-build.mjs's vocabulary photos and auto-image.mjs's generated
  // images, both at 0.75 — so those keep cropping to fill, exactly as before.
  // Every other photo arrives from the live rescue at an unknown shape and
  // frequently carries text, so it is shown whole.
  const frameShape = (photo, forcedAr) => (forcedAr
    ? { cls: "panel", ar: forcedAr, fit: "cover" }
    : { ...shapeOf(photo), fit: "contain" });
  const photoSrc = (photo) => {
    const raw = photo?.dataURI || photo?.src || photo;
    if (typeof raw === "string" && raw.startsWith("public/")) {
      // The extension was the only thing trusted here, and one file in
      // public/sources with a .png name is actually saved HTML. Read the real
      // type from the bytes, and fail loudly rather than embed a data URI that
      // claims to be an image and is not.
      const type = assertImage(raw);
      // imageType()/assertImage() (media-guard.mjs) return the short type
      // token "svg" — the same token an .svg extension would give — but the
      // actual, registered MIME subtype for SVG is "svg+xml", not "svg".
      // "data:image/svg;base64,..." is not a real MIME type; Chromium's
      // renderer (the same one this project's own render pipeline streams
      // frames from) refuses to decode it, so the <img> paints nothing.
      // Combined with this composition's near-black ink ground, an
      // undecoded image is visually indistinguishable from a black slide —
      // exactly what shipped for every LAW 7 layer 6 (local SVG fallback)
      // slide in episode 20's real render (owner report 2026-09-15: "همه
      // عکس ها سیاه امده است"). Every raster type's real MIME subtype
      // happens to equal its media-guard.mjs token (png/jpeg/gif/webp), so
      // only svg needs remapping here.
      const mime = type === "svg" ? "svg+xml" : type;
      return `data:image/${mime};base64,${b64(raw)}`;
    }
    return raw || "";
  };

  // pathLength="1" normalises each shape so a single dash length draws them all
  const drawable = (svgBody) =>
    svgBody.replace(/<(path|circle|rect|ellipse|line|polyline|polygon)\b/g, '<$1 pathLength="1"');

  const illo = (icon, i) =>
    `<svg class="illo" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="3.2"
       stroke-linecap="round" stroke-linejoin="round" filter="url(#sketch${i % 3})">${drawable(artFor(icon))}</svg>`;

  // --- scene A: solid circle block + illustration inside + band caption
  const sceneCircle = (i, tip, ink) => `
      <div class="circleblock" style="background:${ink}">
        <span class="illo-wrap light">${illo(tip.icon, i)}</span>
      </div>
      <div class="band" style="background:${ink}"><span>${tip.head}</span></div>`;

  // --- scene B: band on top, big ink illustration on paper below
  const scenePaper = (i, tip, ink) => `
      <div class="band top" style="background:${ink}"><span>${tip.head}</span></div>
      <span class="illo-wrap ink big" style="color:${ink}">${illo(tip.icon, i)}</span>`;

  // --- scene C: wrong / right pair inside bands
  const sceneCompare = (i, tip, ink) => `
      <span class="illo-wrap ink cmp-illo" style="color:${ink}">${illo(tip.icon, i)}</span>
      <div class="cmprow bad"><span class="mk">✕</span><span>${tip.bad}</span></div>
      <div class="cmprow good" style="background:${ink}"><span class="mk ok">✓</span><span>${tip.good}</span></div>
      <div class="band" style="background:${ink}"><span>${tip.head}</span></div>`;

  // --- scene S: one numbered step of a single feature
  // The exact English path the viewer must tap, rendered LTR as breadcrumbs. Most
  // people run their apps in English, so the Persian instruction alone leaves
  // them hunting; the real label removes the guesswork. The last crumb is the
  // thing being tapped, so it is highlighted.
  // A step may carry the English path outright, or carry a verified English
  // screen schema that already contains it: the title is where you are, the
  // highlighted row is what you tap. Reading the breadcrumb off that schema
  // asserts nothing the feature file did not already assert.
  //
  // Without this, a feature written with screens but no `path` ships with no
  // English anywhere — which is what happened to Pin Comment, and to 25 other
  // features. The Persian instruction alone leaves a viewer whose app is in
  // English hunting through menus for a word that is never shown to them.
  const pathOf = (tip) => {
    if (tip.path) return String(tip.path);
    const s = tip.screen;
    if (!s?.title || !s.rows?.length) return "";
    const row = s.rows[Math.min(Math.max(s.hit || 0, 0), s.rows.length - 1)];
    return row ? `${s.title} > ${row}` : "";
  };

  const pathCrumbs = (path) => {
    const parts = String(path).split(">").map((p) => p.trim()).filter(Boolean);
    return parts
      .map((p, i) => {
        const last = i === parts.length - 1;
        return `${i ? '<i class="pcrumb-sep">›</i>' : ""}<span class="pcrumb${last ? " on" : ""}">${p}</span>`;
      })
      .join("");
  };

  const iphoneFrame = (inner, kind = "") => `<div class="iphone-stage ${kind}">
    <span class="iphone-island"></span><span class="iphone-time">9:41</span>
    <span class="iphone-signal">● ◔ ▰</span><div class="iphone-screen">${inner}</div>
    <span class="iphone-home"></span></div>`;

  // A phone is evidence, not a default template. Only a supplied UI schema
  // (or a real screenshot above) earns an iPhone frame. A written path alone
  // is still an action and must receive artwork derived from that action.
  const screenTip = (tip) => {
    if (tip.screen) return tip;
    if (tip.ui) return { ...tip, screen: { title: tip.ui.title || "Instagram", rows: tip.ui.rows || ["Continue"], hit: tip.ui.hit || 0 } };
    return tip;
  };

  // Which steps may show a phone screen: the first one that asks for it, and
  // only that one. Four identical frames read as one picture repeated, which is
  // the single thing this channel has been told most often to stop doing.
  const SCREEN_USED = (() => {
    const taken = pack.tips.map(() => true);
    const first = pack.tips.findIndex((t) => t.screen || t.ui);
    if (first >= 0) taken[first] = false;
    return taken;
  })();

  const sceneStep = (i, tip, ink) => `
      <div class="stepwrap">
        <span class="stepnum" style="background:${ink}">${PD(tip.step)}</span>
        ${tip.video ? null : tip.photo
          ? `<div class="official-ui ${frameShape(tip.photo, tip.photoAspect).cls} fit-${frameShape(tip.photo, tip.photoAspect).fit} focus-${tip.photoFocus || "default"}" style="--ar:${frameShape(tip.photo, tip.photoAspect).ar.toFixed(3)}">${frameShape(tip.photo, tip.photoAspect).cls === "phone" ? '<span class="island"></span><span class="btn-l"></span><span class="btn-r"></span>' : ""}<span class="shot"><img src="${photoSrc(tip.photo)}" alt="${tip.photoAlt || "Official app interface"}"/></span><span class="focusframe"></span><span class="tapdot"></span><span class="scanline"></span></div>`
          : pack.photos?.[i]
          ? `<div class="newsphoto ${pack.platform === "news" ? "" : "tutorialphoto"}"><img src="${pack.photos[i].dataURI}" alt=""/>${pack.platform === "news" ? "<span>تصویر آرشیوی</span>" : ""}</div>`
          : (tip.screen || tip.ui) && ["tiktok", "instagram"].includes(pack.platform) && !SCREEN_USED[i]
            ? stepStage(PAIR, { tip: screenTip(tip), art: ART_PLAN[i], platform: pack.platform, iconSVG: `<span class="illo-wrap ink" style="color:${ink}">${illo(iconKeyFor(ART_PLAN[i]), i)}</span>`, markSVG: platformMark(pack.platform, ink, 40) })
            : stepStage(PAIR, { tip, art: ART_PLAN[i], platform: pack.platform, allowScreen: false, iconSVG: `<span class="illo-wrap ink" style="color:${ink}">${illo(iconKeyFor(ART_PLAN[i]), i)}</span>`, markSVG: platformMark(pack.platform, ink, 40) })}
      </div>
      <div class="band" style="background:${ink}"><span>${tip.head}</span></div>
      ${pathOf(tip) ? `<div class="pathchip" style="--ink:${ink}">${pathCrumbs(pathOf(tip))}</div>` : ""}`;

  // --- scene D: giant number in a circle
  const sceneStat = (i, tip, ink) => `
      <div class="circleblock" style="background:${ink}">
        <span class="bignum" data-to="${tip.stat.value}">۰</span>
      </div>
      <div class="statcap">${tip.stat.label}</div>
      <div class="band" style="background:${ink}"><span>${tip.head}</span></div>`;

  const kindOf = (tip) => tip.step ? "step" : (tip.stat ? "stat" : tip.bad ? "cmp" : tip.icon && (tip.feature || tip.tool) ? "circle" : "paper");

  // Official footage rides alongside its scene rather than inside it: a scene
  // is a timed clip, and the framework forbids a <video> nested in one. Same
  // start and duration, one track above, positioned by CSS over the media area.
  const brollClips = pack.tips
    .map((tip, i) => {
      if (!tip.video) return "";
      const at = tipStart(i);
      const dur = tipLen(i);
      const from = Number(tip.videoStart || 0);
      return `  <video id="broll${i}" class="clip stepbroll" src="${tip.video}" data-start="${at.toFixed(3)}"`
        + ` data-duration="${dur.toFixed(3)}" data-media-start="${from.toFixed(2)}"`
        + ` data-track-index="2" muted playsinline></video>`;
    })
    .filter(Boolean)
    .join("\n");

  const scenes = pack.tips
    .map((tip, i) => {
      const ink = inkOf(i);
      const at = tipStart(i);
      const k = kindOf(tip);
      // A faithful iPhone guide is the graphic for an in-app step. Floating
      // stars, chips or unrelated sketch art around it only distract from the
      // exact row the viewer needs to tap.
      const usesPhoneGuide = (tip.screen || tip.ui) && ["tiktok", "instagram"].includes(pack.platform);
      const inner =
        k === "step" ? sceneStep(i, tip, ink) :
        k === "stat" ? sceneStat(i, tip, ink) :
        k === "cmp" ? sceneCompare(i, tip, ink) :
        k === "circle" ? sceneCircle(i, tip, ink) :
        scenePaper(i, tip, ink);
      return `  <section id="s${i + 2}" class="clip scene k-${k} art-${ART_PLAN[i]}" data-start="${at.toFixed(3)}" data-duration="${tipLen(i).toFixed(3)}" data-track-index="1" style="--ink:${ink}">
    <div class="paper" style="--glow:${ink}2e;--glow2:${PAIR[(1)]}22"></div><div class="grain"></div><div class="vignette"></div>
    ${pack.noCharacters ? "" : `<span class="charwrap">${characterSVG({ pose: poseFor(tip.head || ""), ink })}</span>`}
    ${usesPhoneGuide ? "" : `<span class="backdrop" style="color:${ink}">${illo(iconKeyFor(ART_PLAN[i]), i)}</span>
    <span class="sticker s-a" style="color:${ink}">${illo(iconKeyFor(ART_PLAN[i]), i)}</span>
    <span class="sticker s-b" style="color:${PAIR[(i + 1) % PAIR.length]}">${illo(i % 2 ? "sparkle" : "star", i + 3)}</span>`}
    <div class="world" id="w${i + 2}">
      ${COMPACT || tip.video ? "" : `<div class="kick">${pack.kicker || "قابلیت"}</div>`}
${inner}
      ${COMPACT
        ? (tip.feature || tip.tool ? `<div class="chip">${plain(tip.feature || tip.tool)}</div>` : "")
        : (tip.sub ? `<div class="cap">${tip.sub}</div>` : "")}
    </div>
  </section>`;
    })
    .join("\n");

  // dur must be THIS scene's length, not the average. Every scene was handed
  // the same TIP value while the sections were emitted with their real,
  // differing durations, so the exit animation — which fires at at+dur-.34 —
  // ran early on any scene longer than the average and left the card empty for
  // the remainder. On the longest slide that was about three quarters of a
  // second of blank paper, which is what a frame check at 19s found.
  const tipsData = pack.tips.map((tip, i) => ({
    id: "s" + (i + 2), at: +tipStart(i).toFixed(3), dur: +tipLen(i).toFixed(3), i, k: kindOf(tip), art: ART_PLAN[i],
  }));

  return `<!doctype html>
<html lang="fa">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<title>${pack.title}</title>
<script>${GSAP}</script>
<style>
${FONT_FACES}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:${PAPER}}
body{font-family:"Vazirmatn",sans-serif;color:#16233a;-webkit-font-smoothing:antialiased}
#root{position:relative;width:1080px;height:1920px;overflow:hidden;background:${PAPER}}
.clip{position:absolute;inset:0;overflow:hidden}
.scene,.hookscene,.outroscene{direction:rtl}
/* --- warm paper ground ---
   A soft field of overlapping blurred colour circles (bokeh), not one flat
   gradient — the reference wallpapers supplied 2026-09-07 (iOS "Multicoloured"
   and "Sky" style photos) are built from exactly this: several translucent
   circles of mixed size and colour, softly overlapping, plus a paler glint
   or two. A single two-colour linear gradient could never read as "photo";
   many soft, differently-sized colour pools scattered across the frame do. */
.paper{position:absolute;inset:0;z-index:0;
  background:${BOKEH},${GROUND}}
.paper::after{content:"";position:absolute;inset:0;
  background:linear-gradient(115deg,${PAPER_SHEEN_NEAR} 0%,transparent 32%,transparent 72%,${PAPER_SHEEN_FAR} 100%)}
/* A believable edge falloff — the one thing a flat two-colour gradient can
   never fake on its own — reads as "lit scene", not "coloured rectangle". */
.vignette{position:absolute;inset:0;z-index:1;pointer-events:none;
  background:radial-gradient(ellipse 760px 1300px at 50% 48%, transparent 58%, ${VIGNETTE_EDGE} 100%)}
/* Real film-grain noise (SVG feTurbulence) instead of a repeating dot
   pattern, blended with overlay so it reads correctly on any ground colour
   — light or dark — without a separate tint to maintain per case. */
.grain{position:absolute;inset:0;z-index:1;opacity:.5;pointer-events:none;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  background-size:180px 180px}
.world{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;
  justify-content:center;text-align:center;padding:280px 70px 470px;will-change:transform,filter}
/* --- kicker --- */
.kick{font-weight:800;font-size:34px;letter-spacing:.16em;color:#6b6257;margin-bottom:36px}
/* --- solid circle colour block --- */
.circleblock{width:660px;height:660px;border-radius:50%;display:grid;place-items:center;
  box-shadow:0 40px 90px rgba(30,20,10,.22)}
.illo-wrap{display:block}
.illo path,.illo circle,.illo rect,.illo ellipse,.illo line,.illo polyline,.illo polygon{
  stroke-dasharray:1;stroke-dashoffset:0}
.illo{width:420px;height:420px}
.illo-wrap.light{color:#f7f3ec}
.illo-wrap.ink.big .illo{width:520px;height:520px}
/* --- full-width text band --- */
.band{--safe:840px;position:relative;width:calc(100% + 140px);margin:52px -70px 0;padding:30px 60px;color:#fff;
  font-weight:800;font-size:66px;line-height:1.35;
  box-shadow:0 22px 50px rgba(30,20,10,.28)}
.band.top{margin:0 -70px 56px}
.band .hl{color:#ffd98a}
.band span{display:block;max-width:var(--safe);margin:0 auto}
.band::before,.band::after{content:"";position:absolute;left:60px;right:60px;height:2px;
  background:rgba(255,255,255,.32)}
.band::before{top:10px}
.band::after{bottom:10px}
/* --- compare rows --- */
.cmp-illo .illo{width:300px;height:300px;margin-bottom:34px}
.compact .cmp-illo .illo{width:330px;height:330px}
.cmprow{width:100%;max-width:840px;display:flex;align-items:center;gap:24px;padding:26px 32px;border-radius:14px;
  font-weight:700;font-size:44px;line-height:1.35;text-align:right;margin-bottom:20px;
  background:rgba(255,255,255,.72);border:2px solid rgba(20,30,50,.14);color:#3a3a3a}
.cmprow .mk{flex:none;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;
  font-size:36px;font-weight:900;color:#fff;background:${PAIR[1]}}
.cmprow.bad{opacity:.72}
.cmprow.good{color:#fff;border-color:transparent}
.cmprow.good .mk{background:#fff;color:#123a63}
/* --- stat --- */
.bignum{font-weight:900;font-size:320px;line-height:1;color:#f7f3ec}
.statcap{font-weight:800;font-size:44px;color:#6b6257;margin-top:30px}
/* --- caption (kept above the platform UI rail) --- */
.cap{position:absolute;left:120px;right:120px;bottom:330px;font-weight:700;font-size:46px;line-height:1.55;
  color:#22303f;background:rgba(255,255,255,.92);border-radius:20px;padding:28px 34px;
  border:2px solid rgba(20,30,50,.10);box-shadow:0 18px 44px rgba(30,20,10,.16)}
.cap .em{color:${PAIR[1]}}

${UI_CSS}
${MOTIF_CSS}
${PLATFORM_HERO_CSS}
/* stickers fill the corners the layout leaves bare */
.sticker{position:absolute;z-index:1;pointer-events:none;display:grid;place-items:center;
  width:132px;height:132px;border-radius:38px;background:rgba(255,255,255,.92);
  border:3px solid currentColor;box-shadow:0 14px 30px rgba(30,20,10,.16)}
.sticker svg{width:78px!important;height:78px!important}
.sticker.s-a{left:64px;top:470px}
.sticker.s-b{right:64px;top:400px;width:110px;height:110px;border-radius:32px}
.sticker.s-b svg{width:62px!important;height:62px!important}
/* --- step scene --- */
.stepwrap{position:relative;display:grid;place-items:center;margin-bottom:10px}
/* The step marker is a glossy 3D object, not a flat disc: a specular hot spot
   at the top-left, a darker terminator at the bottom-right and a contact shadow
   below. That single lit sphere is what makes the reference read as "3D motion"
   rather than "moving flat shapes". */
.stepnum{position:absolute;top:-38px;left:-40px;z-index:3;width:128px;height:128px;border-radius:50%;
  display:grid;place-items:center;color:#fff;font-weight:900;font-size:66px;
  text-shadow:0 3px 6px rgba(0,0,0,.35);
  background-image:radial-gradient(circle at 33% 27%,
      rgba(255,255,255,.95) 0 6%,
      rgba(255,255,255,.42) 16%,
      rgba(255,255,255,0) 46%),
    radial-gradient(circle at 72% 82%, rgba(0,0,0,.42), rgba(0,0,0,0) 58%);
  box-shadow:inset 0 -14px 26px rgba(0,0,0,.30),
             inset 0 10px 18px rgba(255,255,255,.35),
             0 22px 34px -10px rgba(30,20,10,.45)}
/* the sphere's own cast shadow on the paper, so it floats above the surface */
.stepnum::after{content:"";position:absolute;left:12%;bottom:-26px;width:76%;height:26px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(30,20,10,.34),transparent 70%);z-index:-1}
/* soft light pooling behind the card */
.stepwrap::before{content:"";position:absolute;left:50%;top:46%;width:760px;height:760px;
  transform:translate(-50%,-50%);border-radius:50%;z-index:0;pointer-events:none;
  background:radial-gradient(circle,color-mix(in srgb,var(--ink) 26%,transparent) 0%,transparent 62%)}
/* ground contact shadow under the device */
.stepwrap::after{content:"";position:absolute;left:50%;bottom:-34px;width:390px;height:44px;
  transform:translate(-50%,0);border-radius:50%;z-index:0;pointer-events:none;
  background:radial-gradient(ellipse,rgba(30,20,10,.30),transparent 72%)}
.stepwrap .pmock{z-index:2}
/* A recreated phone screen is the proof for an in-app step. Do not cover it
   with decorative badges or floating icons: the viewer must read the exact
   English row and see one clear tap target. */
.stage-screen .stage-badge,.stage-screen .stage-ico{display:none}
/* the card grows in height, so its contents must be clipped — never squashed */
.plist,.pcmts{flex:none}
.pscreen{justify-content:flex-start}
.step-illo .illo{width:440px;height:440px}
.compact .step-illo .illo{width:420px;height:420px}
.compact .band{line-height:1.32}
/* --- compact (short-form) --- */
.compact .world{padding:250px 60px 380px}
.compact .band{font-size:84px;padding:34px 60px;margin-top:56px}
.compact .circleblock{width:640px;height:640px}
.compact .illo{width:400px}
.compact .illo-wrap.ink.big .illo{width:500px}
.chip{margin-top:34px;font-weight:800;font-size:46px;color:#123a63;background:rgba(255,255,255,.92);
  border:2px solid rgba(18,58,99,.25);border-radius:999px;padding:16px 44px;direction:ltr;
  box-shadow:0 12px 30px rgba(30,20,10,.14)}

.markwrap{display:grid;place-items:center;width:190px;height:190px;border-radius:52px;
  background:rgba(255,255,255,.85);border:3px solid rgba(20,30,50,.10);
  box-shadow:0 18px 40px rgba(30,20,10,.18);margin-bottom:26px}
.markwrap .pmark{width:124px;height:124px}
/* a large, faint engraving so no frame reads as blank paper */
.backdrop{position:absolute;left:50%;top:50%;z-index:1;
  opacity:.30;pointer-events:none}
.backdrop svg{width:1020px;height:1020px;stroke-width:6}

/* the promise that earns the next three seconds */
.benefit{display:flex;align-items:center;gap:16px;margin-bottom:22px;max-width:100%;
  font-weight:900;font-size:40px;line-height:1.34;color:#fff;border-radius:26px;padding:18px 32px;
  box-shadow:0 16px 34px rgba(30,20,10,.26);text-align:center}
.benefit span{flex:1}
.benefit::before{content:"";width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.9)}
.b-viral{background:#E0245E}
.b-seen{background:#0E7490}
.b-money{background:#15803D}
/* --- hook: block + huge type + a preview of the payoff --- */
.hookworld{padding:170px 80px 330px;justify-content:flex-start}
/* the question is the headline — it is what stops the scroll */
.hookask{font-weight:900;font-size:86px;line-height:1.24;color:${PAIR[0]};margin-top:6px}
.hookworld .hookq{font-size:44px;font-weight:800;line-height:1.35;margin-top:24px}
.hookworld .hookq .hl{color:#fff;background:${PAIR[1]};border-radius:16px;padding:10px 26px;
  box-shadow:0 12px 28px rgba(30,20,10,.22);display:inline-block}
.hookblock{width:calc(100% + 180px);margin:0 -90px 34px;padding:20px 90px;display:flex;justify-content:center;
  box-shadow:0 18px 44px rgba(30,20,10,.28)}
.hookkicker{font-family:"Baloo","Vazirmatn",sans-serif;font-weight:800;font-size:58px;color:#fff;
  direction:ltr;letter-spacing:.01em}
/* --- the hook keeps its subject and withholds the answer --- */
.mystery .veil{position:absolute;inset:-30px;z-index:5;pointer-events:none;border-radius:48px;
  background:radial-gradient(circle at 60% 44%, transparent 96px, ${PAIR[0]}1f 156px, ${PAIR[0]}52 268px)}
.mystery .spot{position:absolute;z-index:6;left:50%;top:30%;width:156px;height:156px;
  border-radius:50%;border:7px solid var(--ring);opacity:.92}
.mystery .qmark{position:absolute;z-index:7;right:0;top:-16px;width:94px;height:94px;
  border-radius:50%;color:#fff;font-weight:900;font-size:58px;display:grid;place-items:center;
  box-shadow:0 16px 36px rgba(20,25,40,.30)}
/* A pale wash reads as an empty slide on a phone. The hook carries the
   video's own colour so the first frame has something to look at. */
/* The hook scene is a step scene now and inherits the step ground. Its old
   background is gone rather than overridden, so there is one place where the
   look of a slide is decided. */
.hookpreview{position:relative;margin-top:26px;display:grid;place-items:center}
.hookpreview{margin-top:20px}
.hookpreview .pmock{width:330px;height:470px;transform:rotate(-4deg)}
/* Official product media is the hook hero: no invented camera or generic artwork. */
.hookpreview .hookofficial{width:720px;max-width:100%;height:460px;overflow:hidden;border-radius:36px;background:#fff;box-shadow:0 24px 54px rgba(30,20,10,.26);border:5px solid rgba(20,30,50,.10);transform:rotate(-2deg);position:relative;z-index:2}
.hookpreview .hookofficial img{width:100%;height:100%;display:block;object-fit:contain;background:#fff}
.hookpreview .hookofficial:after{content:"";position:absolute;inset:0;border:2px solid rgba(255,255,255,.8);border-radius:31px;pointer-events:none}
/* the identity card leads the hook, tilted so it reads as an object, not a UI */
.hookpreview .tcard{transform:rotate(-3deg) scale(1.0);transform-origin:center}
.hookpreview .ascreen{transform:rotate(-3deg) scale(.98);transform-origin:center}
/* the app's own logo, beside the hook graphic — it is the app being taught,
   so its mark belongs here, not the channel's */
.hooklogo{position:absolute;right:-6px;bottom:6px;z-index:4;display:grid;place-items:center;
  width:150px;height:150px;border-radius:44px;background:#fff;
  box-shadow:0 20px 44px rgba(30,20,10,.26);border:4px solid rgba(20,30,50,.08)}
.hooklogo svg{width:96px;height:96px}
.hookpreview .pmock .ptext,.hookpreview .pmock .pbubble{font-size:24px}
.hookpreview .pmock .ptitle{font-size:26px}
.hookburst{position:absolute;width:520px;height:520px;border-radius:50%;border:5px dashed;opacity:.35;z-index:-1}
.hookend{margin-top:30px;display:flex;justify-content:center}
.hookend span{font-size:40px;font-weight:800;line-height:1.35;color:${PAIR[0]};
  border:5px solid ${PAIR[1]};border-radius:22px;padding:14px 34px;background:rgba(255,255,255,.72)}
.hookcue{display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:22px}
.hookcue i{width:44px;height:44px;border-right:10px solid;border-bottom:10px solid;transform:rotate(45deg);border-radius:4px}
/* --- hook --- */
.hookscene .world{justify-content:center;padding:300px 70px 430px}
.hookbadge{font-weight:900;font-size:52px;color:#fff;background:${PAIR[1]};border-radius:999px;
  padding:16px 46px;margin-bottom:44px;box-shadow:0 18px 40px rgba(30,20,10,.28)}
.hookq{font-weight:900;font-size:104px;line-height:1.24;color:${PAIR[0]}}
.hookq .hl{color:${PAIR[1]}}
.hookillo{margin-top:56px;color:${PAIR[0]}}
.hookillo .illo{width:360px;height:360px}
/* --- exact in-app path, shown in English under the caption --- */
.pathchip{margin-top:22px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px;
  direction:ltr;background:#fff;border:3px solid color-mix(in srgb,var(--ink) 30%,#fff);
  border-radius:18px;padding:14px 24px;box-shadow:0 14px 30px rgba(30,20,10,.16);max-width:900px}
.pcrumb{font-family:"Baloo","Vazirmatn",sans-serif;font-weight:800;font-size:34px;color:#4a5568;
  white-space:nowrap}
.pcrumb.on{color:#fff;background:var(--ink);border-radius:11px;padding:4px 16px}
.pcrumb-sep{font-style:normal;font-weight:900;font-size:32px;color:color-mix(in srgb,var(--ink) 45%,#fff)}
/* The source and date, on screen. News the viewer cannot check is a rumour. */
.srcline{margin-top:14px;font-weight:700;font-size:28px;color:#6b7280;direction:rtl}
.newsphoto{position:relative;width:500px;height:600px;overflow:hidden;border:12px solid #fff;box-shadow:0 24px 54px rgba(18,23,31,.22);background:#d9dde2;transform:rotate(-2deg)}
.newsphoto img{width:100%;height:100%;object-fit:cover;display:block}
.newsphoto::after{content:"";position:absolute;inset:0;background:linear-gradient(160deg,transparent 45%,rgba(0,0,0,.35))}
.newsphoto span{position:absolute;z-index:2;bottom:20px;right:20px;color:#fff;background:rgba(18,23,31,.78);padding:9px 16px;font-size:21px;font-weight:600;border-radius:99px;direction:rtl}
.hookphoto{width:350px;height:560px;transform:rotate(-3deg);background:#c8ddfb}
.hookphoto img{object-fit:contain;object-position:center}
.tutorialphoto{transform:rotate(0deg);border-radius:34px}
/* A real, recognisable in-app screen is the graphic when the lesson is about
   finding a real TikTok feature. Each focus uses a different crop and target. */
/* Official footage sits where the synthetic screen would have been. It is a
   sibling clip, not a child of the scene, so it is placed in page space. */
.stepbroll{position:absolute;left:50%;top:196px;transform:translateX(-50%);
  width:520px;height:640px;object-fit:cover;border-radius:32px;
  border:8px solid #fff;box-shadow:0 30px 68px rgba(28,54,82,.26);background:#0c1220}
/* The ground, taken from the reference videos rather than invented.

   Measured across five of them: mean frame brightness 64, 73, 90, 125 and 183
   out of 255 — four of five are dark — with dominant colours #0b0b0b,
   #11141a, #023d5c and #300044. This channel was building a pale lavender
   page, the opposite of all of them, and adjusting the lavender was never
   going to close that gap.

   So a slide carrying a real interface sits on a deep navy-black studio
   ground, lit from behind the device, with a faint grid for scale. */
/* Warm off-white with an orange cast, not a blue-grey one. The page reads as
   lit rather than tinted: brightest behind the device, warming to a soft
   apricot at the edges, with a faint grid for scale. This was hardcoded with
   zero reference to PAPER/ink, so it silently won over any dark override on
   every scene carrying a real photo — confirmed live 2026-09-04: an Astra
   video asking for a near-black ground rendered cream on every single scene,
   because every scene used a real photo. paperIsDark switches to the same
   "lit" idea in dark form: brightest near-black behind the device, cooling
   toward the paper tone at the edges instead of warming into apricot —
   the ordinary warm-paper videos this renderer was built for are untouched. */
/* A real-photo scene uses the SAME bokeh ground as every other scene — the
   owner wants one consistent look, not a separate studio treatment that
   ignores the palette (that divergence is what kept rendering as cream). */
.scene:has(.official-ui) .paper{background:${BOKEH},${GROUND}}
  .scene:has(.official-ui) .paper::before{content:"";position:absolute;inset:0;opacity:.4;
  background-image:linear-gradient(${paperIsDark ? "rgba(200,180,240,.09)" : "rgba(120,80,200,.08)"} 1px,transparent 1px),
    linear-gradient(90deg,${paperIsDark ? "rgba(200,180,240,.09)" : "rgba(120,80,200,.08)"} 1px,transparent 1px);
  background-size:68px 68px;
  mask-image:radial-gradient(circle at 50% 38%, transparent 26%, #000 80%)}
/* The riser reads as light spilling from behind the device, not as a card. */
.scene:has(.official-ui) .official-ui::before{
  background:radial-gradient(circle at 50% 40%, color-mix(in srgb,var(--ink) 60%,transparent), transparent 68%);
  filter:blur(26px);box-shadow:none}
.scene:has(.official-ui) .world{padding:150px 56px 150px;justify-content:flex-start}
.scene:has(.official-ui) .kick{margin-bottom:22px}

${characterCSS()}
.official-ui{position:relative;box-sizing:border-box;padding:13px 11px;border-radius:44px;
  background:linear-gradient(160deg,#20252f,#0d1016 60%,#171c25);
  box-shadow:0 2px 0 rgba(255,255,255,.26) inset, 0 0 0 2px rgba(12,16,22,.9),
    0 42px 78px rgba(16,22,34,.36), 0 12px 26px rgba(16,22,34,.22)}
/* A phone-shaped capture gets a phone. */
.official-ui.phone{width:452px;height:916px;border-radius:62px;padding:10px}
/* Black, not dark grey. Only the rim carries light, the way a real black phone
   does — a body that reads mid-grey looks like a mockup of a phone. */
.official-ui.phone{background:linear-gradient(158deg,#3c4048 0%,#08090b 14%,#020203 58%,#2a2e36 100%)}
/* An iPhone, at its real proportions: 19.5:9, a 12% corner radius, a bezel
   thin enough to read as glass rather than as a picture frame, and the
   Dynamic Island — which is the single detail that makes a viewer recognise
   the device rather than merely see a rounded rectangle. */
.official-ui.phone .shot{inset:10px;border-radius:54px}
.official-ui.phone .island{position:absolute;left:50%;top:26px;transform:translateX(-50%);
  width:126px;height:36px;border-radius:99px;background:#05070a;z-index:4;
  box-shadow:0 0 0 1px rgba(255,255,255,.06)}
.official-ui.phone .island::after{content:"";position:absolute;right:15px;top:50%;
  transform:translateY(-50%);width:13px;height:13px;border-radius:50%;
  background:radial-gradient(circle at 35% 32%, #2a3550, #080b12 70%)}
/* Side buttons: barely visible, and their absence is what made the old frame
   read as a border rather than as hardware. */
.official-ui.phone .btn-l,.official-ui.phone .btn-r{position:absolute;width:4px;
  border-radius:3px;background:linear-gradient(180deg,#2a303c,#151a23)}
.official-ui.phone .btn-l{left:-4px;top:190px;height:104px}
.official-ui.phone .btn-r{right:-4px;top:230px;height:150px}
/* Everything else gets a panel cut to the picture, so it is always full. */
.official-ui.panel{width:min(640px, calc(760px * var(--ar)));aspect-ratio:var(--ar);
  border-radius:32px;padding:12px}
.official-ui.wide{width:840px;aspect-ratio:var(--ar);border-radius:30px;padding:12px}
/* A plain photo is not a phone: the base .official-ui's near-black device
   bezel (and its matching near-opaque outline ring) reads as a heavy dark
   frame around what should be a light photo card — a real, visible
   contributor to scenes reading as too dark overall (owner report
   2026-09-10). Only .phone keeps the device-black treatment; panel/wide
   get a light card mat instead. */
.official-ui.panel,.official-ui.wide{
  background:linear-gradient(160deg,#ffffff,#eef3fa 60%,#e4edf7);
  box-shadow:0 2px 0 rgba(255,255,255,.6) inset, 0 0 0 2px rgba(30,58,95,.08),
    0 30px 60px rgba(30,58,95,.14), 0 10px 20px rgba(30,58,95,.10)}
/* The riser: an offset panel behind, the depth the reference videos get from
   stacking a faded card behind a sharp one. */
.official-ui::before{content:"";position:absolute;left:-26px;right:-26px;top:34px;bottom:-22px;
  border-radius:50px;z-index:-1;
  background:linear-gradient(150deg,color-mix(in srgb,var(--ink) 26%,#ffffff),rgba(255,255,255,.35));
  box-shadow:0 26px 54px rgba(30,40,60,.16)}
.official-ui.panel::before,.official-ui.wide::before{left:-20px;right:-20px;top:26px;bottom:-18px;border-radius:36px}
/* Speaker slot — small, but it is what makes the shape read as a phone. */
.official-ui.phone::after{content:"";position:absolute;left:50%;top:5px;width:96px;height:7px;
  transform:translateX(-50%);border-radius:99px;background:rgba(255,255,255,.30);z-index:3}
.official-ui .shot{position:absolute;inset:13px 11px;border-radius:32px;overflow:hidden;background:#0b0f16}
.official-ui.panel .shot,.official-ui.wide .shot{inset:12px;border-radius:20px}
.official-ui.wide .focusframe,.official-ui.wide .tapdot,
.official-ui.panel .focusframe,.official-ui.panel .tapdot{display:none}
.official-ui img{position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;object-position:center;display:block}
/* Owner rule 2026-09-13: a picture is never shown incomplete. Everything that
   is not a deliberately-shaped photo (see frameShape's fit field) is drawn whole —
   a screenshot or a product card is mostly text, and a crop that eats a word
   is worse than a letterbox bar. The bar is .shot's own background, so it
   reads as part of the device frame rather than as a gap. */
.official-ui.fit-contain img{object-fit:contain}
/* A zoom on top of a contained image would crop it again and undo the rule. */
.official-ui.fit-contain .shot img{transform:none}
/* Cyan focus respects TikTok's own visual language; it avoids the old red/orange treatment. */
.official-ui .focusframe{position:absolute;border:6px solid #25f4ee;border-radius:20px;box-shadow:0 0 0 12px rgba(37,244,238,.18),0 0 34px rgba(37,244,238,.42)}
.official-ui .tapdot{position:absolute;width:48px;height:48px;border:5px solid #fff;border-radius:50%;background:#25f4ee;box-shadow:0 9px 22px rgba(20,54,76,.28)}
.official-ui .scanline{position:absolute;left:28px;right:28px;top:50%;height:4px;opacity:0;pointer-events:none;
  background:linear-gradient(90deg,transparent,#25f4ee 18%,#fff 50%,#25f4ee 82%,transparent);
  box-shadow:0 0 18px rgba(37,244,238,.9)}
.official-ui.wide .scanline,.official-ui.panel .scanline{display:none}
.official-ui.focus-search .focusframe{left:78px;top:66px;width:238px;height:58px}.official-ui.focus-search .tapdot{left:289px;top:102px}
.official-ui.focus-gap .focusframe{left:112px;top:430px;width:190px;height:56px}.official-ui.focus-gap .tapdot{left:273px;top:460px}
.official-ui.focus-analytics .focusframe{left:50px;top:207px;width:208px;height:126px}.official-ui.focus-analytics .tapdot{left:230px;top:296px}
.official-ui.focus-edits-project .focusframe{left:38px;top:56px;width:244px;height:78px}.official-ui.focus-edits-project .tapdot{left:258px;top:105px}
.official-ui.focus-edits-preview .focusframe{left:92px;top:136px;width:216px;height:252px}.official-ui.focus-edits-preview .tapdot{left:282px;top:364px}
.official-ui.focus-edits-tracks .focusframe{left:30px;top:434px;width:340px;height:178px}.official-ui.focus-edits-tracks .tapdot{left:340px;top:574px}
.official-ui.focus-edits-export .focusframe{left:292px;top:56px;width:82px;height:52px}.official-ui.focus-edits-export .tapdot{left:316px;top:98px}
.official-ui.focus-vids-start .focusframe{left:38px;top:78px;width:300px;height:110px}.official-ui.focus-vids-start .tapdot{left:310px;top:158px}
.official-ui.focus-vids-prompt .focusframe{left:52px;top:230px;width:296px;height:92px}.official-ui.focus-vids-prompt .tapdot{left:322px;top:294px}
.official-ui.focus-vids-preview .focusframe{left:70px;top:112px;width:260px;height:265px}.official-ui.focus-vids-preview .tapdot{left:302px;top:342px}
.official-ui.focus-vids-share .focusframe{left:264px;top:62px;width:106px;height:58px}.official-ui.focus-vids-share .tapdot{left:334px;top:105px}
.iphone-stage{position:relative;width:610px;height:780px;padding:78px 28px 48px;border-radius:78px;
  background:linear-gradient(125deg,#e7ebf0,#5e6874 35%,#11161e 48%,#2d3540);box-shadow:0 38px 76px rgba(18,23,31,.28);z-index:3}
.iphone-screen{height:100%;overflow:hidden;border-radius:55px;background:#101114;display:grid;place-items:center}
.iphone-stage .stage{width:500px;height:600px;transform:scale(1.02);transform-origin:center}
.iphone-stage .ascreen{width:450px;height:570px;border-radius:34px}
.iphone-island{position:absolute;z-index:6;top:23px;left:50%;width:184px;height:42px;margin-left:-92px;border-radius:30px;background:#000}
.iphone-time,.iphone-signal{position:absolute;z-index:7;top:32px;color:#fff;font:700 18px Arial}.iphone-time{left:43px}.iphone-signal{right:40px;letter-spacing:3px}
.iphone-home{position:absolute;z-index:6;bottom:19px;left:50%;width:190px;height:7px;margin-left:-95px;border-radius:8px;background:#fff}
/* One faithful phone, never a phone frame wrapped around another fake screen. */
.stage-screen .pmock{width:438px;height:716px;padding:70px 16px 42px;border:12px solid #111318;border-radius:64px;background:#111318;box-shadow:0 38px 74px rgba(15,18,27,.32)}
.stage-screen .pmock::before{content:"";position:absolute;z-index:8;top:18px;left:50%;width:164px;height:34px;margin-left:-82px;border-radius:24px;background:#000}
.stage-screen .pmock::after{content:"";position:absolute;z-index:8;bottom:17px;left:50%;width:154px;height:7px;margin-left:-77px;border-radius:9px;background:#fff}
.stage-screen .pmock .pscreen{border-radius:38px;background:#fdfbf7}
/* --- outro --- */
/* Same hardcoded-warm problem as the two .paper rules above, third instance:
   the outro card ignored PAPER entirely and always closed on cream regardless
   of the rest of the video's palette. */
.outroscene .paper{background:${paperIsDark
  ? `radial-gradient(circle at 50% 42%,${PAIR[1]}22,transparent 60%),linear-gradient(180deg,#0a0e14,#000000)`
  : `radial-gradient(circle at 50% 42%,#123a6318,transparent 60%),linear-gradient(180deg,#f6f1ea,#e4dbd0)`}}
.payoff{font-weight:800;font-size:40px;line-height:1.5;color:${PAIR[0]};margin-bottom:46px;
  background:rgba(255,255,255,.9);border:2px solid rgba(18,58,99,.18);border-radius:22px;
  padding:26px 32px;box-shadow:0 14px 34px rgba(30,20,10,.14)}
.outrocircle{width:380px;height:380px;border-radius:50%;background:${PAIR[0]};display:grid;place-items:center;
  box-shadow:0 40px 90px rgba(30,20,10,.26)}
.outrocircle img{width:260px;height:260px;border-radius:50%;object-fit:cover}
.brandname{font-weight:900;font-size:74px;color:${PAIR[0]};margin-top:46px}
.brandsub{font-weight:700;font-size:38px;color:#4a5568;margin-top:22px;line-height:1.45}
/* A question, not a request. Asking for likes costs about 60% of them; a
   question lifts comments ~26%, and comments carry more reach weight. */
.askbox{width:100%;max-width:840px;margin-top:22px;background:#fff;border:4px solid;
  border-radius:24px;padding:26px 30px;box-shadow:0 18px 40px rgba(30,20,10,.18);
  display:flex;flex-direction:column;gap:10px;align-items:center}
.askq{font-weight:900;font-size:44px;line-height:1.34;color:#16233a;text-align:center}
.askhint{font-weight:700;font-size:30px;color:#6b7280}
.actchips{width:100%;max-width:840px;margin-top:18px;display:flex;flex-direction:column;gap:12px}
.actchip{display:flex;align-items:center;gap:14px;background:#fff;border-radius:14px;padding:13px 20px;
  border:2px solid rgba(20,30,50,.10);box-shadow:0 12px 28px rgba(30,20,10,.16)}
.actchip span{font-weight:800;font-size:34px;color:#1b2430}
.actchip i{width:40px;height:40px;border-radius:11px;flex:none;display:block}
.cta{margin-top:30px;font-weight:900;font-size:46px;color:#fff;background:${PAIR[1]};border-radius:999px;
  padding:26px 74px;box-shadow:0 20px 44px rgba(30,20,10,.28)}
/* --- persistent brand mark, clear of platform UI --- */
.mark{position:absolute;top:54px;right:32px;z-index:40;display:flex;align-items:center;gap:12px}
.mark img{width:58px;height:58px;border-radius:16px;box-shadow:0 8px 22px rgba(30,20,10,.28)}
.mark span{font-weight:900;font-size:29px;color:${PAIR[0]}}
/* --- progress rule --- */
/* Chapter rail. One segment per scene instead of one continuous smear, so
   the first frame already answers "how long is this and how far in am I" —
   a viewer who can see four short blocks stays for four short blocks. The
   height, colour and z-index are unchanged from the single bar this
   replaces, so nothing else in the layout moves and the TikTok/Instagram
   safe zone is exactly as it was.

   RTL on purpose, both ways: chapter 1 sits at the RIGHT and each block fills
   right-to-left. The single bar it replaces already did this — it carried
   transform-origin:right center — because the narration, the captions and the
   reading direction of every scene are Persian. A rail that ran the other way
   would be the only element on screen moving against the language. */
.rule{position:absolute;top:0;left:0;right:0;height:8px;display:flex;gap:3px;direction:rtl;z-index:50}
.rule b{position:relative;display:block;flex:1 1 0;height:100%;background:rgba(20,30,50,.10);overflow:hidden}
.rule b i{position:absolute;inset:0;display:block;background:${PAIR[1]};transform-origin:right center}

/* -------------------------------------------------------------------------
   Content-native visual systems

   These are deliberately structural overrides, not a recolour.  They keep
   the already-verified image as the hero, while changing hierarchy, material,
   crop treatment and the visual verb for each channel/series.
   ------------------------------------------------------------------------- */
.design-tiktok-cutout .paper{background:
  linear-gradient(135deg,rgba(37,244,238,.14) 0 12%,transparent 12% 88%,rgba(254,44,85,.16) 88%),
  linear-gradient(180deg,#0d1017,#171b26)}
.design-tiktok-cutout .paper::after{background:repeating-linear-gradient(90deg,transparent 0 76px,rgba(255,255,255,.035) 77px 79px)}
.design-tiktok-cutout .world{align-items:stretch;text-align:right;padding:168px 68px 330px}
.design-tiktok-cutout .kick{align-self:flex-start;color:#dce6f5;letter-spacing:.08em;background:rgba(255,255,255,.09);border:2px solid rgba(37,244,238,.5);border-radius:999px;padding:12px 24px;margin-bottom:22px}
.design-tiktok-cutout .stepwrap{align-self:center;transform:rotate(-1.6deg)}
.design-tiktok-cutout .official-ui.panel,.design-tiktok-cutout .official-ui.wide{border-radius:18px;border:8px solid #fff;box-shadow:18px 18px 0 #25f4ee,-18px -18px 0 #fe2c55,0 32px 62px rgba(0,0,0,.42)}
.design-tiktok-cutout .official-ui.phone{box-shadow:18px 18px 0 #25f4ee,-14px -14px 0 #fe2c55,0 32px 62px rgba(0,0,0,.45)}
.design-tiktok-cutout .band{width:auto;margin:28px 0 0;border-radius:18px 0 18px 18px;padding:24px 28px;box-shadow:12px 12px 0 rgba(255,255,255,.15);font-size:58px}
.design-tiktok-cutout .band::before,.design-tiktok-cutout .band::after{display:none}
.design-tiktok-cutout .pathchip{align-self:center;border-radius:999px;border-color:#25f4ee;background:#111722}
.design-tiktok-cutout .pcrumb{color:#eaf7ff}.design-tiktok-cutout .pcrumb.on{background:#fe2c55}
.design-tiktok-cutout .stepnum{border-radius:22px;box-shadow:8px 8px 0 #fe2c55,0 18px 30px rgba(0,0,0,.38)}
.design-tiktok-cutout .backdrop{opacity:.16;left:78%;top:65%}.design-tiktok-cutout .sticker{border-radius:16px;background:#10151f}
.design-tiktok-cutout .hookscene .world{padding:220px 68px 360px}.design-tiktok-cutout .hookscene .band{font-size:80px;align-self:stretch;margin-top:28px}
.design-tiktok-cutout .hookend span{color:#f6fbff;background:#10151f;border-color:#25f4ee;border-radius:999px}

/* For You signal lab — a different TikTok treatment for a video about the
   viewer's decision to stay or leave. The official three-phone capture is
   never replaced; every step crops to a different actual For You page, while
   the thin signal rails and heartbeat line give this specific lesson its own
   visual language instead of recolouring the general TikTok template. */
.design-tiktok-signal-lab .paper{background:
  radial-gradient(circle at 50% 18%,rgba(37,244,238,.18),transparent 28%),
  radial-gradient(circle at 14% 82%,rgba(254,44,85,.16),transparent 34%),#090c12}
.design-tiktok-signal-lab .paper::after{background:repeating-linear-gradient(90deg,transparent 0 58px,rgba(37,244,238,.07) 59px 61px)}
.design-tiktok-signal-lab .world{align-items:center;text-align:center;padding:148px 60px 308px}
.design-tiktok-signal-lab .kick{align-self:center;color:#dffeff;letter-spacing:.14em;background:rgba(37,244,238,.11);border:2px solid #25f4ee;border-radius:8px;padding:11px 22px;margin-bottom:20px}
.design-tiktok-signal-lab .stepwrap{transform:perspective(1000px) rotateX(1.4deg)}
.design-tiktok-signal-lab .official-ui.panel{width:520px!important;height:850px!important;aspect-ratio:auto!important;border:7px solid #f8feff;border-radius:54px;box-shadow:18px 20px 0 #25f4ee,-16px -14px 0 #fe2c55,0 34px 76px rgba(0,0,0,.55)}
.design-tiktok-signal-lab .official-ui.panel .shot{border-radius:42px}
.design-tiktok-signal-lab .official-ui.panel .shot img{transform:scale(1.34);will-change:transform}
.design-tiktok-signal-lab .official-ui.focus-feed-left .shot img{transform-origin:18% 50%}
.design-tiktok-signal-lab .official-ui.focus-feed-center .shot img{transform-origin:50% 50%}
.design-tiktok-signal-lab .official-ui.focus-feed-right .shot img{transform-origin:82% 50%}
.design-tiktok-signal-lab .official-ui.focus-feed-compare .shot img{transform:scale(1.04);transform-origin:50% 50%}
.design-tiktok-signal-lab .band{width:890px;background:#f7feff!important;color:#10151f;border:4px solid #f7feff;border-radius:14px;padding:25px 30px;box-shadow:12px 12px 0 #fe2c55;font-size:54px}
.design-tiktok-signal-lab .band::before,.design-tiktok-signal-lab .band::after{background:#25f4ee;left:24px;right:24px}
.design-tiktok-signal-lab .pathchip{background:#101720;border-color:#25f4ee;border-radius:10px;box-shadow:8px 8px 0 rgba(254,44,85,.42)}
.design-tiktok-signal-lab .pcrumb{color:#f4fdff}.design-tiktok-signal-lab .pcrumb.on{background:#fe2c55}
.design-tiktok-signal-lab .stepnum{border-radius:18px;box-shadow:8px 8px 0 #25f4ee,0 16px 32px rgba(0,0,0,.45)}
.design-tiktok-signal-lab .hookscene .world{padding:194px 62px 350px}.design-tiktok-signal-lab .hookscene .band{font-size:76px}.design-tiktok-signal-lab .hookend span{color:#f8feff;background:#101720;border-color:#25f4ee;border-radius:10px;box-shadow:8px 8px 0 rgba(254,44,85,.42)}

.design-instagram-editorial .paper{background:
  radial-gradient(circle at 86% 10%,rgba(225,48,108,.18),transparent 28%),
  linear-gradient(145deg,#fffdf9 0%,#f8f1ea 52%,#f0e6f1 100%)}
.design-instagram-editorial .paper::after{background:linear-gradient(90deg,rgba(255,255,255,.76),transparent 40%),repeating-linear-gradient(0deg,transparent 0 50px,rgba(65,45,55,.055) 51px 52px)}
.design-instagram-editorial .world{align-items:flex-end;text-align:right;padding:150px 72px 305px}
.design-instagram-editorial .kick{align-self:flex-end;color:#8b214b;font-size:30px;letter-spacing:.12em;border-bottom:4px solid #e1306c;padding-bottom:11px;margin-bottom:30px}
.design-instagram-editorial .stepwrap{align-self:center;transform:rotate(1.2deg)}
.design-instagram-editorial .official-ui.panel,.design-instagram-editorial .official-ui.wide{border-radius:46px 46px 8px 8px;border:12px solid #fff;box-shadow:0 30px 70px rgba(74,42,58,.20),-26px 28px 0 rgba(225,48,108,.20)}
.design-instagram-editorial .official-ui.phone{box-shadow:0 30px 70px rgba(74,42,58,.28),-22px 26px 0 rgba(225,48,108,.22)}
.design-instagram-editorial .band{width:840px;margin:24px 0 0;background:#fff!important;color:#1f1a1c;border:3px solid rgba(31,26,28,.9);border-radius:0;padding:28px 34px;box-shadow:14px 14px 0 #e1306c;font-size:55px}
.design-instagram-editorial .band span{margin:0}.design-instagram-editorial .band::before,.design-instagram-editorial .band::after{background:#e1306c;left:28px;right:28px}
.design-instagram-editorial .pathchip{align-self:flex-end;border-radius:0;border-width:3px;box-shadow:10px 10px 0 rgba(31,26,28,.12)}
.design-instagram-editorial .stepnum{border-radius:50%;box-shadow:0 0 0 8px #fff,0 0 0 13px #e1306c,0 18px 30px rgba(74,42,58,.23)}
.design-instagram-editorial .sticker{border-radius:50%;background:#fff}.design-instagram-editorial .backdrop{opacity:.13;left:28%;top:58%}
.design-instagram-editorial .hookscene .world{padding:190px 72px 360px}.design-instagram-editorial .hookscene .band{font-size:78px;width:900px;align-self:center}
.design-instagram-editorial .hookend span{color:#311923;background:#fff;border-color:#e1306c;border-radius:0;box-shadow:8px 8px 0 rgba(225,48,108,.2)}

.design-product-lab .paper{background:
  linear-gradient(rgba(10,72,88,.075) 1px,transparent 1px),linear-gradient(90deg,rgba(10,72,88,.075) 1px,transparent 1px),
  radial-gradient(circle at 50% 18%,rgba(14,116,144,.20),transparent 34%),#edf8f7;background-size:52px 52px,52px 52px,auto,auto}
.design-product-lab .world{align-items:center;text-align:center;padding:164px 62px 300px}
.design-product-lab .kick{color:#075b70;font-family:"Baloo","Vazirmatn",sans-serif;letter-spacing:.1em;border:3px solid #0e7490;border-radius:10px;padding:10px 22px;background:#fff;margin-bottom:24px}
.design-product-lab .stepwrap{transform:perspective(1000px) rotateX(2deg)}
.design-product-lab .official-ui.panel,.design-product-lab .official-ui.wide{border-radius:22px;border:5px solid #0e7490;box-shadow:0 38px 0 rgba(14,116,144,.16),0 50px 74px rgba(15,72,88,.22)}
.design-product-lab .band{background:#0e7490!important;border-radius:12px;font-size:56px;width:880px;margin:28px 0 0;box-shadow:0 12px 0 #083c4b}
.design-product-lab .band::before,.design-product-lab .band::after{display:none}
.design-product-lab .pathchip{border-radius:12px;border-color:#0e7490}.design-product-lab .stepnum{border-radius:18px;background:#0e7490!important}
.design-product-lab .hookscene .world{padding:205px 62px 360px}.design-product-lab .hookscene .band{font-size:80px}.design-product-lab .hookend span{border-radius:12px;border-color:#0e7490}

.design-german-flashcard .paper{background:
  linear-gradient(120deg,transparent 0 44%,rgba(229,57,53,.10) 44% 46%,transparent 46% 100%),
  repeating-linear-gradient(0deg,transparent 0 55px,rgba(17,17,17,.055) 56px 57px),#f7f6f2}
.design-german-flashcard .world{align-items:center;text-align:center;padding:150px 62px 250px}
.design-german-flashcard .kick{font-family:"Baloo","Vazirmatn",sans-serif;color:#111;border:4px solid #111;background:#f2c94c;border-radius:0;padding:9px 20px;letter-spacing:.08em;margin-bottom:22px}
.design-german-flashcard .stepwrap{width:870px;padding:20px 0 46px;border-top:10px solid #e53935;border-bottom:3px solid #111;transform:none}
.design-german-flashcard .official-ui.panel,.design-german-flashcard .official-ui.wide{width:760px!important;max-width:100%;aspect-ratio:3/4!important;border-radius:0;border:16px solid #fff;box-shadow:18px 18px 0 #111,0 34px 68px rgba(17,17,17,.22)}
.design-german-flashcard .official-ui .shot{border-radius:0}.design-german-flashcard .stepnum{top:-38px;left:22px;border-radius:0;width:118px;height:88px;background:#e53935!important;box-shadow:8px 8px 0 #111}
.design-german-flashcard .band{width:870px;margin:20px 0 0;background:#fff!important;color:#111;border:4px solid #111;border-radius:0;padding:22px 28px;box-shadow:12px 12px 0 #f2c94c;font-size:60px}
.design-german-flashcard .band::before,.design-german-flashcard .band::after{display:none}
.design-german-flashcard .outroscene .paper{background:linear-gradient(135deg,#f7f6f2 0 65%,#e53935 65% 100%)}
.design-german-flashcard .hookscene .world{padding:205px 62px 320px}.design-german-flashcard .hookscene .band{font-size:78px}.design-german-flashcard .hookend span{border-radius:0;border-color:#e53935;box-shadow:10px 10px 0 #f2c94c}

/* German A1 has two native output formats. These are not recolours of the
   same card: TikTok is a dark, fast vocabulary stage; Instagram is a bright,
   saveable study-note layout. Both retain the real, contextual vocabulary
   photos rather than introducing a fake phone screen. */
.design-german-tiktok-learning .paper{background:
  radial-gradient(circle at 16% 13%,rgba(0,242,234,.28),transparent 28%),
  radial-gradient(circle at 86% 79%,rgba(254,44,85,.26),transparent 30%),
  linear-gradient(135deg,#080a10,#111827 58%,#0b0d14)}
.design-german-tiktok-learning .grain{opacity:.26}.design-german-tiktok-learning .world{padding:152px 56px 270px;justify-content:center}
.design-german-tiktok-learning .kick{font-family:"Baloo","Vazirmatn",sans-serif;color:#f8fafc;background:rgba(255,255,255,.1);border:2px solid rgba(0,242,234,.82);border-radius:999px;padding:10px 24px;letter-spacing:.08em;margin-bottom:24px;box-shadow:0 0 28px rgba(0,242,234,.22)}
.design-german-tiktok-learning .stepwrap{width:850px;padding:14px;background:linear-gradient(135deg,rgba(0,242,234,.9),rgba(254,44,85,.85));border-radius:38px;box-shadow:0 28px 70px rgba(0,0,0,.42)}
.design-german-tiktok-learning .official-ui.panel,.design-german-tiktok-learning .official-ui.wide{width:100%!important;max-width:100%;aspect-ratio:3/4!important;border:7px solid #10131d;border-radius:26px;box-shadow:none}
.design-german-tiktok-learning .official-ui .shot{border-radius:19px}.design-german-tiktok-learning .stepnum{top:-26px;left:-18px;width:112px;height:112px;background:#fe2c55!important;box-shadow:0 0 0 7px #10131d,0 16px 34px rgba(0,0,0,.42)}
.design-german-tiktok-learning .band{width:880px;margin:24px 0 0;background:#f8fafc!important;color:#0b0d14;border-radius:22px;padding:22px 30px;box-shadow:0 16px 0 rgba(0,242,234,.7),0 28px 60px rgba(0,0,0,.38);font-size:56px}
.design-german-tiktok-learning .band::before,.design-german-tiktok-learning .band::after{background:rgba(254,44,85,.72)}
.design-german-tiktok-learning .cap{left:104px;right:104px;bottom:238px;color:#f8fafc;background:rgba(11,14,20,.94);border:2px solid rgba(0,242,234,.55);border-radius:18px;font-size:42px;box-shadow:0 16px 40px rgba(0,0,0,.35)}
.design-german-tiktok-learning .backdrop{opacity:.14;color:#00f2ea}.design-german-tiktok-learning .sticker{background:#121722;border-color:#00f2ea}.design-german-tiktok-learning .hookscene .world{padding:194px 56px 315px}.design-german-tiktok-learning .hookscene .band{font-size:76px;box-shadow:0 18px 0 #fe2c55,0 30px 60px rgba(0,0,0,.42)}
.design-german-tiktok-learning .hookend span{background:#10131d;color:#fff;border-color:#00f2ea;border-radius:999px;box-shadow:0 0 26px rgba(0,242,234,.24)}.design-german-tiktok-learning .outroscene .paper{background:linear-gradient(145deg,#070a11,#17102a 58%,#33111f)}

.design-german-instagram-learning .paper{background:
  radial-gradient(circle at 10% 12%,rgba(131,58,180,.19),transparent 30%),
  radial-gradient(circle at 90% 88%,rgba(253,29,29,.16),transparent 30%),
  linear-gradient(145deg,#fffdfd,#fff4fa 57%,#f8efff)}
.design-german-instagram-learning .world{align-items:flex-end;text-align:right;padding:150px 68px 292px}.design-german-instagram-learning .kick{align-self:flex-end;color:#5d217c;font-size:30px;letter-spacing:.1em;border-bottom:4px solid #fd1d1d;padding-bottom:11px;margin-bottom:24px}
.design-german-instagram-learning .stepwrap{width:820px;align-self:center;padding:18px;background:#fff;border:2px solid rgba(131,58,180,.18);border-radius:42px 42px 12px 42px;box-shadow:-20px 22px 0 rgba(253,29,29,.16),0 32px 70px rgba(69,35,80,.18)}
.design-german-instagram-learning .official-ui.panel,.design-german-instagram-learning .official-ui.wide{width:100%!important;max-width:100%;aspect-ratio:3/4!important;border:0;border-radius:30px;box-shadow:none}.design-german-instagram-learning .official-ui .shot{border-radius:27px}
.design-german-instagram-learning .stepnum{top:-34px;left:22px;width:108px;height:108px;background:#833ab4!important;box-shadow:0 0 0 7px #fff,0 0 0 11px rgba(253,29,29,.72),0 16px 30px rgba(69,35,80,.24)}
.design-german-instagram-learning .band{width:850px;margin:26px 0 0;background:#fff!important;color:#26172d;border:2px solid rgba(38,23,45,.86);border-radius:0 24px 24px 24px;padding:24px 30px;box-shadow:12px 14px 0 rgba(131,58,180,.2);font-size:56px}.design-german-instagram-learning .band::before,.design-german-instagram-learning .band::after{background:#fd1d1d}
.design-german-instagram-learning .cap{left:120px;right:120px;bottom:236px;color:#4a2855;background:rgba(255,255,255,.95);border:2px solid rgba(131,58,180,.25);border-radius:22px 22px 4px 22px;font-size:42px;box-shadow:0 18px 42px rgba(69,35,80,.14)}
.design-german-instagram-learning .backdrop{opacity:.1;color:#833ab4}.design-german-instagram-learning .sticker{background:#fff;border-color:#833ab4}.design-german-instagram-learning .hookscene .world{align-items:center;text-align:center;padding:192px 68px 335px}.design-german-instagram-learning .hookscene .band{font-size:76px;border-radius:26px 26px 4px 26px;box-shadow:16px 18px 0 rgba(253,29,29,.18)}
.design-german-instagram-learning .hookend span{color:#491b60;background:#fff;border-color:#833ab4;border-radius:16px 16px 3px 16px;box-shadow:9px 10px 0 rgba(253,29,29,.14)}.design-german-instagram-learning .outroscene .paper{background:linear-gradient(135deg,#fff7fc,#efe0fa 63%,#ffdce4)}
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <filter id="sketch0"><feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="3" seed="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="4.5" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="sketch1"><feTurbulence type="fractalNoise" baseFrequency="0.026" numOctaves="3" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="sketch2"><feTurbulence type="fractalNoise" baseFrequency="0.019" numOctaves="3" seed="23" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G"/></filter>
  </defs>
</svg>

<div id="root" class="${COMPACT ? 'compact' : ''} design-${DESIGN}" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${TOTAL}">

  <div class="clip" data-start="0" data-duration="${TOTAL}" data-track-index="20">
    <div class="rule">${CHAPTERS.map((c, i) => `<b><i id="ch${i}"></i></b>`).join("")}</div>
  </div>
  <div class="clip" data-start="0" data-duration="${(HOOK + DURS.reduce((a, d) => a + d, 0)).toFixed(3)}" data-track-index="19">
    ${BRAND.hasName || BRAND.logoData
      ? `<div class="mark">${BRAND.logoData ? `<img src="${BRAND.logoData}" alt=""/>` : ""}${BRAND.hasName ? `<span>${BRAND.name}</span>` : ""}</div>`
      : ""}
  </div>

  <!-- HOOK -->
  <section id="s1" class="clip scene k-step hookscene" data-start="0" data-duration="${HOOK}" data-track-index="1" style="--ink:${PAIR[1]}">
    <div class="paper" style="--glow:${PAIR[1]}2e;--glow2:${PAIR[0]}1f"></div><div class="grain"></div><div class="vignette"></div>
    ${pack.noCharacters ? "" : `<span class="charwrap">${characterSVG({ pose: poseFor(pack.hook.ask || ""), ink: PAIR[1] })}</span>`}
    <div class="world" id="w1">
      <div class="kick">${pack.kicker || "قابلیت"}</div>
      <div class="stepwrap">
        ${HOOK_MEDIA
          ? `<div class="official-ui ${frameShape(HOOK_MEDIA, HOOK_MEDIA_AR).cls} fit-${frameShape(HOOK_MEDIA, HOOK_MEDIA_AR).fit} focus-default" style="--ar:${frameShape(HOOK_MEDIA, HOOK_MEDIA_AR).ar.toFixed(3)}">${frameShape(HOOK_MEDIA, HOOK_MEDIA_AR).cls === "phone" ? '<span class="island"></span><span class="btn-l"></span><span class="btn-r"></span>' : ""}<span class="shot"><img src="${photoSrc(HOOK_MEDIA)}" alt="${HOOK_MEDIA_ALT}"/></span></div>`
          : sceneArt(hookArtFor(pack), PAIR)}
      </div>
      <div class="band" style="background:${PAIR[1]}">${pack.hook.ask || pack.hook.l1}</div>
      <div class="hookend"><span>${retentionLineFor(pack)}</span></div>
    </div>
  </section>

${scenes}
${brollClips}

  <!-- OUTRO -->
  <section id="sOut" class="clip outroscene" data-start="${(HOOK + DURS.reduce((a, d) => a + d, 0)).toFixed(3)}" data-duration="${OUTRO}" data-track-index="1">
    <div class="paper"></div><div class="grain"></div><div class="vignette"></div>
    <div class="world" id="wOut">
      ${pack.payoff ? `<div class="payoff">${pack.payoff}</div>` : ""}
      ${BRAND.logoData ? `<div class="outrocircle"><img src="${BRAND.logoData}" alt=""/></div>` : ""}
      ${BRAND.hasName ? `<div class="brandname">${BRAND.name}</div>` : ""}
      <div class="brandsub">${pack.outro.tag}</div>
      <div class="cta">${pack.outro.follow}</div>
      ${pack.outroAsk ? `<div class="askbox" style="border-color:${PAIR[1]}">
        <span class="askq">${pack.outroAsk}</span>
        <span class="askhint">جوابت را در کامنت بنویس</span>
      </div>` : ""}
      <div class="actchips">
        <div class="actchip"><i style="background:${PAIR[0]}"></i><span>${pack.kind === "german-lesson" ? "برای قسمت بعدی، ما را دنبال کن" : "برای ترفند بعدی، ما را دنبال کن"}</span></div>
      </div>
    </div>
  </section>
</div>

<script>
window.__timelines = window.__timelines || {};
var tl = gsap.timeline({ paused: true });
var COMPACT_JS = ${COMPACT};
var HERO = ${HERO};
// one animator drives every concept hero via its shared class hooks
function animateHero(R, at){
  tl.fromTo(R+" .mfx",{opacity:0,y:34,scale:.8},{opacity:1,y:0,scale:1,duration:.5,stagger:.08,ease:"back.out(1.7)"},at);
  tl.fromTo(R+" .mbar",{scaleY:.06,opacity:.4},{scaleY:1,opacity:1,duration:.6,stagger:.06,ease:"back.out(1.6)"},at+.15);
  var dr=gsap.utils.toArray(R+" .mdr");
  if(dr.length) tl.fromTo(dr,{strokeDashoffset:1},{strokeDashoffset:0,duration:.8,stagger:.04,ease:"power2.out"},at+.1);
  tl.to(R+" .mpulse",{scale:1.16,duration:.5,yoyo:true,repeat:6,ease:"sine.inOut"},at+.5);
  tl.to(R+" .mcaret",{opacity:0,duration:.34,yoyo:true,repeat:10,ease:"steps(1)"},at+.5);
}
var TIPS = ${JSON.stringify(tipsData)};
var OUT_AT = ${(HOOK + DURS.reduce((a, d) => a + d, 0)).toFixed(3)};

// Different meanings deserve different kinetic grammar. Search and analytics
// arrive as a vertical inspection, an action travels into frame, and a general
// instructional card uses the editorial whip. Every state is explicit so a
// seek to any point recreates the same pose.
function worldIn(art){
  if(art === "search" || art === "chart") return {x:0,y:220,rotation:0,scale:.92,filter:"blur(14px)",opacity:0};
  if(art === "send" || art === "upload" || art === "download") return {x:-680,y:0,rotation:-7,scale:.9,filter:"blur(18px)",opacity:0};
  if(art === "write" || art === "menu") return {x:0,y:300,rotation:2,scale:.9,filter:"blur(12px)",opacity:0};
  return {x:720,y:0,rotation:7,scale:.86,filter:"blur(22px)",opacity:0};
}

// Each chapter fills over its own scene, at its own real start and duration —
// the same numbers that drive the scenes themselves, so the rail can never
// drift out of sync with what is on screen.
${CHAPTERS.map((c, i) => `tl.fromTo("#ch${i}",{scaleX:0},{scaleX:1,ease:"none",duration:${c.duration.toFixed(3)}},${c.at.toFixed(3)});`).join("\n")}

// ---- HOOK: legible at frame 0, then two punches ----
// .hookask/.hookblock/.hookkicker/.benefit/.srcline/.hookcue targeted a hook
// markup that no longer exists (renamed to .band/.stepwrap/.kick, or
// removed outright) — silent GSAP no-ops that also carried a stray,
// unmatched else-block fragment which made this whole inline script fail
// to parse, disabling every animation in the composition, not just the
// hook's. Rewired to the current class names; dropped the ones with no
// surviving element instead of guessing at a replacement.
tl.fromTo("#s1 .band",{scale:1.09},{scale:1,duration:.34,ease:"power3.out"},0);
tl.fromTo("#s1 .hookend",{y:26,opacity:0},{y:0,opacity:1,duration:.44,ease:"back.out(1.6)"},1.05);
tl.to("#s1 .hookend span",{scale:1.05,duration:.42,yoyo:true,repeat:3,ease:"sine.inOut"},1.6);
tl.fromTo("#s1 .stepwrap",{clipPath:"inset(0 0 0 100%)"},{clipPath:"inset(0 0 0 0%)",duration:.4,ease:"power4.out"},0);
tl.fromTo("#s1 .kick",{opacity:0,x:50},{opacity:1,x:0,duration:.34,ease:"power3.out"},.2);
tl.to("#s1 .band",{scale:1.05,duration:.14,ease:"power2.out"},1.15)
  .to("#s1 .band",{scale:1,duration:.4,ease:"elastic.out(1,.6)"},1.29);

// draw the ink on: strokes appear as if being sketched
function drawIn(sel, at, dur){
  var parts = gsap.utils.toArray(sel + " > *");
  if(!parts.length) return;
  tl.fromTo(parts,{strokeDashoffset:1},
    {strokeDashoffset:0,duration:dur||.55,ease:"power2.out",
     stagger:Math.min(.05, .35/parts.length)},at);
}

// ---- BODY: whip-blur entrance, then held motion ----
TIPS.forEach(function(t){
  var at=t.at, id="#"+t.id, W="#w"+(t.i+2);
  // Each slide behaves like a tangible editorial card: it swings in, settles,
  // shows the exact step, then leaves toward the next card. This is deliberate
  // slide motion rather than a static infographic fading between cuts.
  // worldIn deliberately varies both x and y. Reset both axes explicitly:
  // leaving y out here made search/chart/write slides keep their entry offset
  // after the animation completed, so their final composition sat too low.
  tl.fromTo(W,worldIn(t.art),
              {x:0,y:0,rotation:0,scale:1,filter:"blur(0px)",opacity:1,duration:COMPACT_JS?.34:.52,ease:"power4.out"},at);
  tl.fromTo(id+" .paper",{scale:1.12,rotation:-1.4},{scale:1,rotation:0,duration:.7,ease:"expo.out"},at);
  // Real interface, treated as evidence rather than as a sticker.
  //
  // It used to swing in at scale .78 with a -5° tilt on back.out — the same
  // bounce every decorative element gets. On an actual screenshot that reads
  // as a template: the thing the viewer is being asked to trust arrives
  // wobbling. A clipped reveal with a small settle says "look at this"
  // instead, and the slow push-in that follows keeps a still frame alive for
  // the four seconds it is on screen, which is what the reference channels do
  // with their screen recordings.
  tl.fromTo(id+" .official-ui",
    {clipPath:"inset(6% 8% 6% 8% round 34px)",scale:1.045,opacity:0},
    {clipPath:"inset(0% 0% 0% 0% round 34px)",scale:1,opacity:1,duration:.52,ease:"power3.out"},at+.08);
  // Push-in across the whole slide. ease "none" on purpose: a drift that
  // accelerates draws attention to itself, and this one must not be noticed.
  // Let the entrance settle before the subtle interface drift begins.
  tl.fromTo(id+" .official-ui",{scale:1},{scale:1.055,duration:Math.max(.45,t.dur-.96),ease:"none"},at+.62);
  // The callout lands after the image has settled, so the eye reaches the
  // frame already knowing what it is looking at.
  tl.fromTo(id+" .official-ui .focusframe",{scale:1.35,opacity:0},{scale:1,opacity:1,duration:.42,ease:"power4.out"},at+.62);
  tl.to(id+" .official-ui .tapdot",{scale:1.22,duration:.32,yoyo:true,repeat:3,ease:"sine.inOut"},at+.84);
  // A scan guides the eye through the one genuine screen action. It is an
  // overlay, not a color treatment: the official pixels remain untouched.
  tl.fromTo(id+" .official-ui .scanline",{y:-250,opacity:0},{y:250,opacity:.9,duration:.72,ease:"power2.inOut"},at+.7);
  tl.to(id+" .official-ui .scanline",{opacity:0,duration:.16,ease:"power1.out"},at+1.42);
  // Footage gets the same slow push, without the reveal — it is already moving.
  tl.fromTo("#broll"+t.i,{scale:1},{scale:1.03,duration:Math.max(1.2,t.dur-.2),ease:"none"},at+.3);
  tl.fromTo(id+" .kick",{y:-24,opacity:0},{y:0,opacity:1,duration:.35,ease:"power2.out"},at+.2);

  if(t.k==="circle"||t.k==="stat"){
    tl.fromTo(id+" .circleblock",{scale:.45},{scale:1,duration:.62,ease:"back.out(1.5)"},at+.18);
    tl.fromTo(id+" .illo",{scale:.6,opacity:0,rotation:-10},{scale:1,opacity:1,rotation:0,duration:.55,ease:"back.out(1.8)"},at+.34);
    drawIn(id+" .illo",at+.4);
    tl.to(id+" .circleblock",{rotation:2,duration:2.2,yoyo:true,repeat:Math.max(1,Math.ceil(t.dur/2.2)),ease:"sine.inOut"},at+.8);
  }
  if(t.k==="stat"){
    (function(){
      var el=document.querySelector(id+" .bignum"); if(!el) return;
      var to=parseFloat(el.getAttribute("data-to"))||0, o={v:0};
      var fa=function(x){return String(Math.round(x)).replace(/[0-9]/g,function(d){return "۰۱۲۳۴۵۶۷۸۹"[+d];});};
      tl.to(o,{v:to,duration:1.1,ease:"power2.out",onUpdate:function(){el.textContent=fa(o.v);}},at+.4);
    })();
    tl.fromTo(id+" .statcap",{y:22,opacity:0},{y:0,opacity:1,duration:.4,ease:"power2.out"},at+.9);
  }
  if(t.k==="step"){
    // 1. the concept panel lands with a spring, then grows open
    tl.fromTo(id+" .stepwrap",{y:64,scale:.84,opacity:0},
              {y:0,scale:1,opacity:1,duration:.58,ease:"back.out(1.5)"},at+.08);
    // The final geometry is authored in CSS. A mask/scale reveal keeps the
    // panel seek-safe; animating height causes layout reflow and drift.
    tl.fromTo(id+" .stage",{clipPath:"inset(38% 0 38% 0)",scale:.92,opacity:.2},
              {clipPath:"inset(0% 0 0% 0)",scale:1,opacity:1,duration:.6,ease:"expo.out"},at+.16);
    // 2. the content-driven graphic draws/pops/grows into place
    animateHero(id+" .stage", at+.28);
    tl.fromTo(id+" .stage-badge",{scale:0,rotation:-20},{scale:1,rotation:0,duration:.5,ease:"back.out(2)"},at+.4);
    // 3. the step's own icon flags what THIS step does
    tl.fromTo(id+" .stage-ico",{scale:.5,opacity:0,rotation:-8},{scale:1,opacity:1,rotation:0,duration:.5,ease:"back.out(1.8)"},at+.5);
    drawIn(id+" .stage-ico .illo",at+.56,.6);
    tl.to(id+" .stage-ico",{y:-12,duration:1.4,yoyo:true,repeat:Math.max(1,Math.ceil(t.dur/1.4)),ease:"sine.inOut"},at+.9);
    // 4. the glossy number sphere drops in and floats at its own rate (depth)
    tl.fromTo(id+" .stepnum",{scale:0,y:-70,rotation:-40},{scale:1,y:0,rotation:0,duration:.62,ease:"back.out(2.2)"},at+.26);
    tl.to(id+" .stepnum",{y:-16,duration:1.6,yoyo:true,repeat:Math.max(1,Math.ceil(t.dur/1.6)),ease:"sine.inOut"},at+1.0);
    // 5. ambient — the panel breathes so no frame is dead
    tl.to(id+" .stage",{y:-10,rotation:.4,duration:2.0,yoyo:true,repeat:Math.max(1,Math.ceil(t.dur/2)),ease:"sine.inOut"},at+.9);
  }
  if(t.k==="paper"){
    tl.fromTo(id+" .illo",{scale:.7,opacity:0,rotation:-8},{scale:1,opacity:1,rotation:0,duration:.6,ease:"back.out(1.7)"},at+.3);
    drawIn(id+" .illo",at+.36,.6);
    tl.to(id+" .illo",{y:-16,duration:1.6,yoyo:true,repeat:Math.max(1,Math.ceil(t.dur/1.6)),ease:"sine.inOut"},at+.9);
  }
  if(t.k==="cmp"){
    tl.fromTo(id+" .cmprow.bad",{x:-280,opacity:0},{x:0,opacity:1,duration:.45,ease:"power4.out"},at+.24);
    tl.fromTo(id+" .cmprow.good",{x:280,opacity:0},{x:0,opacity:1,duration:.45,ease:"power4.out"},at+.5);
    tl.to(id+" .cmprow.good",{scale:1.04,duration:.28,yoyo:true,repeat:1,ease:"sine.inOut"},at+.9);
  }
  // band wipes open from the right, like a printed rule being drawn
  tl.fromTo(id+" .band",{clipPath:"inset(0 0 0 100%)"},{clipPath:"inset(0 0 0 0%)",duration:.42,ease:"power3.out"},at+.34);
  tl.fromTo(id+" .band span",{opacity:0,x:40},{opacity:1,x:0,duration:.36,ease:"power2.out"},at+.55);
  tl.fromTo(id+" .pathchip",{y:26,opacity:0},{y:0,opacity:1,duration:.42,ease:"back.out(1.5)"},at+.72);
  tl.fromTo(id+" .pcrumb",{opacity:0,y:10},{opacity:1,y:0,duration:.26,stagger:.07,ease:"power2.out"},at+.8);
  tl.fromTo(id+" .cap",{y:44,opacity:0},{y:0,opacity:1,duration:.42,ease:"power3.out"},at+.62);
  // slow push so no frame is static
  // Hold movement ends before the exit begins; no two transform tweens own
  // the same wrapper at once.
  var holdAt=at+.58, exitAt=at+t.dur-.34;
  tl.to(W,{scale:1.05,duration:Math.max(.2,exitAt-holdAt),ease:"none"},holdAt);
  if(t.dur>1.0){
    tl.to(W,{x:-130,rotation:-2.5,scale:.94,filter:"blur(10px)",opacity:0,duration:.34,ease:"power2.in"},at+t.dur-.34);
  }
});

// One figure per slide, its tweens written at compose time — the timeline is
// built synchronously and has to stay deterministic.
${pack.tips.map((tip, i) => characterTimeline(`#s${i + 2}`, tipStart(i), tipLen(i))).join("\n")}

// ---- OUTRO ----
tl.fromTo("#wOut",{x:560,filter:"blur(26px)",opacity:0},{x:0,filter:"blur(0px)",opacity:1,duration:.5,ease:"power3.out"},OUT_AT);
tl.fromTo("#sOut .payoff",{y:40,opacity:0},{y:0,opacity:1,duration:.45,ease:"power3.out"},OUT_AT+.1);
tl.fromTo("#sOut .outrocircle",{scale:.5},{scale:1,duration:.6,ease:"back.out(1.7)"},OUT_AT+.15);
tl.fromTo("#sOut .brandname",{y:40,opacity:0},{y:0,opacity:1,duration:.5,ease:"power3.out"},OUT_AT+.4);
tl.fromTo("#sOut .brandsub",{y:30,opacity:0},{y:0,opacity:1,duration:.45,ease:"power2.out"},OUT_AT+.6);
tl.fromTo("#sOut .cta",{scale:.6,opacity:0},{scale:1,opacity:1,duration:.5,ease:"back.out(2)"},OUT_AT+.8);
tl.fromTo("#sOut .askbox",{y:34,opacity:0},{y:0,opacity:1,duration:.5,ease:"back.out(1.5)"},OUT_AT+0.9);
tl.to("#sOut .askbox",{scale:1.03,duration:.5,yoyo:true,repeat:2,ease:"sine.inOut"},OUT_AT+1.5);
tl.fromTo("#sOut .actchip",{x:-220,opacity:0},{x:0,opacity:1,duration:.38,stagger:.11,ease:"power4.out"},OUT_AT+1.25);
tl.to("#sOut .cta",{scale:1.05,duration:.5,yoyo:true,repeat:2,ease:"sine.inOut"},OUT_AT+1.4);

window.__timelines["main"] = tl;
</script>
</body>
</html>`;
}

