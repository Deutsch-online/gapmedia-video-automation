// «Deutsch in 60 Sekunden» (owner, 2026-10-05): a course of one-minute lessons. Design: CURRICULUM_DESIGN.md.
// Owner's choices: Lena and Herr Braun in the lessons, calm music, humour, flashcards too.
// Every lesson has the same six parts (hook, notice, understand, your turn, say it, next), explained in
// English by a narrator, the German spoken by Lena and Herr Braun, the Persian as the only subtitle.
// No generated video: portraits (public/ai-cast), typography and shapes, animated with GSAP.
//
// A lesson is data (LESSONS). buildTimeline() places every spoken line after the one before it, from the
// measured length of each voice file, and refuses a lesson that would pass 65 s before anything is rendered.
import { readFileSync, existsSync } from "node:fs";

export const COURSE = { title: "Deutsch in 60 Sekunden", titleFa: "آلمانی در ۶۰ ثانیه" };
export const LESSON_MIN = 60, LESSON_MAX = 65;
export const SEGMENTS = ["hook", "notice", "pattern", "turn", "say", "next"];

// narrator line (English; German in "double quotes" is read by the German voice), German line of a character, countdown
const N = (en, fa, extra = {}) => ({ k: "n", en, fa, ...extra });
const D = (who, de, fa, hl, extra = {}) => ({ k: "d", who, de, fa, hl, ...extra });
const CD = (secs = 3, extra = {}) => ({ k: "cd", secs, ...extra });

export const LESSONS = {
  "c01-hello": {
    no: 1, mission: 1, unit: "a1-01-greetings",
    title: "Hello, but which one?", titleFa: "سلام، ولی کدام؟",
    hook: [N("Two hellos in German. Pick the wrong one, and it gets awkward.", "دو جور سلام به آلمانی. اگر اشتباه انتخاب کنی، ناجور می‌شود.")],
    notice: [
      N("With friends:", "با دوست‌ها:"),
      D("lena", "Hallo!", "سلام!", "Hallo", { chip: 0 }),
      N("With your boss:", "با رئیس:"),
      D("braun", "Guten Tag.", "روز بخیر.", "Tag", { chip: 1 }),
      D("lena", "Herr Braun, es ist Abend!", "آقای براون، الان عصر است!", "Abend", { joke: true }),
      D("braun", "Tschüss.", "خداحافظ.", "Tschüss", { joke: true, chip: 2 }),
    ],
    pattern: [
      N('One pattern: "Guten", plus the time of day.', "یک الگو: Guten به‌علاوهٔ زمان روز."),
      D("lena", "Guten Morgen.", "صبح بخیر.", "Morgen", { slot: 0 }),
      D("lena", "Guten Tag.", "روز بخیر.", "Tag", { slot: 1 }),
      D("lena", "Guten Abend.", "عصر بخیر.", "Abend", { slot: 2 }),
    ],
    turn: [
      N("Your turn. It is eight in the evening. You meet your neighbour.", "نوبت توست. ساعت هشت عصر است. همسایه‌ات را می‌بینی.", { show: "moon" }),
      CD(3, { show: "moon" }),
      D("lena", "Guten Abend!", "عصر بخیر!", "Abend", { show: "moon", answer: true }),
      N("You leave a friend. What do you say?", "از دوستت خداحافظی می‌کنی. چه می‌گویی؟", { show: "door" }),
      CD(3, { show: "door" }),
      D("braun", "Tschüss!", "خداحافظ!", "Tschüss", { show: "door", answer: true }),
    ],
    say: [
      N("Say it with me.", "با من بگو."),
      D("lena", "Wie geht's?", "حالت چطور است؟", "geht's", { line: 0, repeat: true }),
      D("braun", "Gut, danke! Und dir?", "خوبم، مرسی! تو چطوری؟", "danke", { line: 1, repeat: true }),
    ],
    next: [N('Tomorrow: "du" or "Sie". Choose wrong, and you insult someone.', "فردا: du یا Sie. اشتباه انتخاب کنی، توهین کرده‌ای.")],
    nextCard: { de: "du oder Sie?", fa: "فردا: du یا Sie؟", review: "Guten Abend" },
    chips: [{ de: "Hallo", fa: "با دوست" }, { de: "Guten Tag", fa: "با رئیس" }, { de: "Tschüss", fa: "خداحافظی" }],
    patternWords: [{ de: "Morgen", fa: "صبح", icon: "dawn" }, { de: "Tag", fa: "روز", icon: "sun" }, { de: "Abend", fa: "عصر", icon: "moon" }],
    sayLines: [{ de: "Wie geht's?", fa: "حالت چطور است؟" }, { de: "Gut, danke! Und dir?", fa: "خوبم، مرسی! تو چطوری؟" }],
    cards: [
      { de: "Hallo", en: "Hello (friends)", fa: "سلام (با دوست)", ex: "Hallo! Wie geht's?", exFa: "سلام! حالت چطور است؟" },
      { de: "Guten Tag", en: "Good day (formal)", fa: "روز بخیر (رسمی)", ex: "Guten Tag, Herr Braun.", exFa: "روز بخیر، آقای براون." },
      { de: "Guten Morgen", en: "Good morning", fa: "صبح بخیر", ex: "Guten Morgen, Frau Krause!", exFa: "صبح بخیر، خانم کراوزه!" },
      { de: "Guten Abend", en: "Good evening", fa: "عصر بخیر", ex: "Guten Abend, Lena!", exFa: "عصر بخیر، لنا!" },
      { de: "Tschüss", en: "Bye (informal)", fa: "خداحافظ", ex: "Tschüss, bis morgen!", exFa: "خداحافظ، تا فردا!" },
      { de: "Wie geht's? — Gut, danke!", en: "How are you? — Fine, thanks!", fa: "حالت چطور است؟ — خوبم، مرسی!", ex: "Gut, danke! Und dir?", exFa: "خوبم، مرسی! تو چطوری؟" },
    ],
  },
};

export const segmentItems = (lesson, segments = SEGMENTS) => segments.flatMap((seg) => (lesson[seg] || []).map((it) => ({ ...it, seg })));

// rough length of a spoken item, only for tests and for the check before the voices exist
// (calibrated: the real German voices ran 1.28x the 0.055 s per character that was first assumed)
export const estimateDur = (it) => it.k === "n" ? 0.3 + 0.45 * String(it.en).split(/\s+/).length : it.k === "d" ? 0.3 + 0.07 * it.de.length : 0;

export function validateLesson(lesson, segments = SEGMENTS) {
  const problems = [];
  const items = segmentItems(lesson, segments);
  for (const seg of segments) if (!lesson[seg]?.length) problems.push(`segment ${seg} is empty`);
  for (const it of items) {
    if (it.k === "n" && !(it.en && it.fa)) problems.push(`narrator line without English or Persian: ${JSON.stringify(it).slice(0, 60)}`);
    if (it.k === "d") {
      if (!["lena", "braun"].includes(it.who)) problems.push(`unknown speaker ${it.who}`);
      if (!it.fa) problems.push(`no Persian subtitle: ${it.de}`);
      if (it.hl && !it.de.toLowerCase().includes(it.hl.toLowerCase())) problems.push(`highlight "${it.hl}" is not in "${it.de}"`);
    }
  }
  if (!lesson.cards?.length) problems.push("no flashcards");
  const { total } = buildTimeline(lesson, estimateDur, segments);
  if (total > LESSON_MAX) problems.push(`about ${total.toFixed(0)} s: more than ${LESSON_MAX} s`);
  return problems;
}

// Places the spoken items one after the other. durOf(item) is the length of its voice file in seconds.
// Gaps: a short breath after every line, a longer beat before a joke, a pause for the learner after a
// "say it" line (as long as the line itself), a countdown of whole seconds. The last segment is held
// until the lesson is 60 s long. More than 65 s is an error (before any render).
export function buildTimeline(lesson, durOf, segments = SEGMENTS) {
  const items = [], segs = [];
  let t = 0.5;
  for (const seg of segments) {
    const s0 = t;
    for (const raw of lesson[seg] || []) {
      const it = { ...raw, seg };
      if (it.k === "cd") { it.t0 = t; it.t1 = t + it.secs; t = it.t1 + 0.25; }
      else {
        it.dur = durOf(it);
        it.t0 = t + (it.joke ? 0.35 : 0);
        it.t1 = it.t0 + it.dur;
        t = it.t1 + (it.repeat ? it.dur + 0.8 : 0.28);
        if (it.repeat) it.pauseTo = +t.toFixed(3);
      }
      items.push(it);
    }
    t += 0.3;
    segs.push({ id: seg, t0: s0, t1: t });
  }
  const END_HOLD = 1.4;
  let total = t + END_HOLD;
  if (total < LESSON_MIN) { segs[segs.length - 1].t1 += LESSON_MIN - total; total = LESSON_MIN; }
  segs[segs.length - 1].t1 = total;
  return { items, segs, total: +total.toFixed(3) };
}

// ---------------------------------------------------------------- the picture
const b64 = (p) => readFileSync(p).toString("base64");
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Persian text with German words inside: each Latin run is isolated (bdi) so « » and the punctuation do not jump around
export const faMix = (str) => esc(str).replace(/([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9'’]*(?:[ ,.?!:'’-]+[A-Za-zÄÖÜäöüß0-9'’]+)*[?!.]?)/g, '<bdi dir="ltr">$1</bdi>');
export const F = (x) => (+x).toFixed(3);
export const GSAP = () => readFileSync("public/gsap.min.js", "utf8");
export const FONT = () => (existsSync("public/fonts/Vazirmatn-Black.woff2") ? b64("public/fonts/Vazirmatn-Black.woff2") : "");
export const THEMES = {
  easy: { bg: "#FFF4E0", ink: "#1F2A44", acc: "#C40000", acc2: "#FFCE00", card: "#FFFFFF", border: "#1F2A44", fa: "#4A3B2C", lena: "#2F4B7C", braun: "#2E7A4D" },
  tiktok: { bg: "#E8F8F8", ink: "#101820", acc: "#D6103F", acc2: "#25F4EE", card: "#FFFFFF", border: "#101820", fa: "#3A3F47", lena: "#0B7D80", braun: "#B3123A" },
  youtube: { bg: "#F3F5FA", ink: "#0F0F0F", acc: "#CC0000", acc2: "#065FD4", card: "#FFFFFF", border: "#0F0F0F", fa: "#4B4B4B", lena: "#065FD4", braun: "#1E7F34" },
};
export const themeNames = Object.keys(THEMES);
export const WHO = { lena: "Lena", braun: "Herr Braun" };

export function lineHTML(de, hl) {
  const s = String(de), h = String(hl || "").replace(/[.!?]+$/, "");
  const k = h ? s.toLowerCase().indexOf(h.toLowerCase()) : -1;
  return k < 0 ? esc(s) : `${esc(s.slice(0, k))}<span class="hl">${esc(s.slice(k, k + h.length))}</span>${esc(s.slice(k + h.length))}`;
}

const ICON = {
  dawn: '<div class="ic dawn"><i></i></div>',
  sun: '<div class="ic sun"><i></i></div>',
  moon: '<div class="ic moon"><i></i></div>',
};

export function buildCourseHTML({ lesson, tl, theme = "easy" }) {
  const T = THEMES[theme] || THEMES.easy, TOTAL = tl.total;
  const js = [];
  const to = (sel, v, t) => js.push(`tl.to("${sel}", ${v}, ${F(t)});`);
  const fromTo = (sel, f, v, t) => js.push(`tl.fromTo("${sel}", ${f}, ${v}, ${F(t)});`);
  const pop = (sel, t, d = 0.3) => fromTo(sel, `{opacity:0,y:30,scale:.92}`, `{opacity:1,y:0,scale:1,duration:${d},ease:"back.out(2)",immediateRender:false}`, t);
  const seg = Object.fromEntries(tl.segs.map((s) => [s.id, s]));
  const spoken = tl.items.filter((x) => x.k !== "cd");

  // captions: a German line (who, the line with its highlight, Persian), or only Persian for the narrator
  const caps = spoken.map((it, i) => it.k === "d"
    ? `<div id="c${i}" class="cap"><b class="who" style="color:${it.who === "lena" ? T.lena : T.braun}">${WHO[it.who]}</b><div class="de">${lineHTML(it.de, it.hl)}</div><div class="fa" dir="rtl">${faMix(it.fa)}</div></div>`
    : `<div id="c${i}" class="cap nar"><div class="fa big" dir="rtl">${faMix(it.fa)}</div></div>`).join("\n");
  spoken.forEach((it, i) => {
    pop(`#c${i}`, it.t0 - 0.05);
    to(`#c${i}`, `{opacity:0,y:-10,duration:.2}`, (it.repeat ? it.pauseTo : it.t1 + 0.12) - 0.2);
  });

  // stage of every segment: fades in with its segment, fades out at its end
  for (const s of tl.segs) {
    fromTo(`#st-${s.id}`, `{opacity:0}`, `{opacity:1,duration:.35,immediateRender:false}`, s.t0);
    to(`#st-${s.id}`, `{opacity:0,duration:.3}`, s.t1 - 0.3);
    to("#dot-" + s.id, `{background:"${T.acc}",scale:1.35,duration:.25}`, s.t0);
    to("#dot-" + s.id, `{background:"#B9B2A6",scale:1,duration:.25}`, s.t1 - 0.25);
  }

  // hook: the two hellos pop up, a question mark between them
  const h0 = seg.hook.t0;
  pop("#hk-a", h0 + 0.4, 0.4); pop("#hk-q", h0 + 1.6, 0.4); pop("#hk-b", h0 + 2.6, 0.4);

  // notice: the portrait of whoever speaks, chips lit as each greeting is said
  const portraits = tl.items.filter((x) => x.k === "d" && (x.seg === "notice" || x.seg === "say"));
  portraits.forEach((it) => {
    const on = it.who === "lena" ? "#pl" : "#pb", off = it.who === "lena" ? "#pb" : "#pl";
    to(on, `{opacity:1,duration:.18}`, it.t0 - 0.2); to(off, `{opacity:0,duration:.18}`, it.t0 - 0.2);
  });
  // the portrait frame is there in "notice" and in "say it"; it breathes slowly through the whole lesson
  for (const id of ["notice", "say"]) {
    fromTo("#port", `{opacity:0}`, `{opacity:1,duration:.4,immediateRender:false}`, seg[id].t0);
    to("#port", `{opacity:0,duration:.3}`, seg[id].t1 - 0.3);
  }
  const nb = Math.max(1, Math.round(TOTAL / 2.4));
  to("#portb", `{scale:1.03,duration:${F(TOTAL / nb)},ease:"sine.inOut",yoyo:true,repeat:${nb - 1}}`, 0);
  tl.items.filter((x) => x.chip !== undefined).forEach((it) => to(`#chip${it.chip}`, `{background:"${T.acc2}",scale:1.08,duration:.25}`, it.t0));

  // pattern: the word slot changes with every spoken time of day
  tl.items.filter((x) => x.slot !== undefined).forEach((it) => {
    const t0 = it.t0 - 0.05;
    lesson.patternWords.forEach((_, j) => {
      to(`#pw${j}`, `{opacity:${j === it.slot ? 1 : 0},y:${j === it.slot ? 0 : 20},duration:.25}`, t0);
      to(`#pi${j}`, `{opacity:${j === it.slot ? 1 : 0.18},scale:${j === it.slot ? 1.12 : 0.9},duration:.25}`, t0);
    });
  });
  const pn = tl.items.find((x) => x.seg === "pattern");
  pop("#pat-base", pn.t0 + 0.2, 0.4);

  // turn: a prompt picture, a countdown ring, the answer shown when it is spoken
  const turnN = tl.items.filter((x) => x.seg === "turn");
  turnN.forEach((it) => {
    if (it.k === "n") fromTo(`#tp-${it.show}`, `{opacity:0,scale:.9}`, `{opacity:1,scale:1,duration:.4,ease:"back.out(1.6)",immediateRender:false}`, it.t0);
    if (it.k === "cd") {
      fromTo(`#cd-${it.show}`, `{opacity:0,scale:.7}`, `{opacity:1,scale:1,duration:.3,immediateRender:false}`, it.t0);
      for (let k = 0; k < it.secs; k++) {
        const sel = `#cdn-${it.show}-${k}`;
        fromTo(sel, `{opacity:0,scale:1.5}`, `{opacity:1,scale:1,duration:.3,ease:"power2.out",immediateRender:false}`, it.t0 + k);
        to(sel, `{opacity:0,duration:.15}`, it.t0 + k + 0.85);
      }
      to(`#cd-${it.show}`, `{opacity:0,duration:.2}`, it.t1);
    }
    if (it.k === "d") fromTo(`#ans-${it.show}`, `{opacity:0,y:40,scale:.9}`, `{opacity:1,y:0,scale:1,duration:.4,ease:"back.out(2)",immediateRender:false}`, it.t0 - 0.05);
  });
  for (const show of ["moon", "door"]) {
    const items = turnN.filter((x) => x.show === show);
    if (items.length) {
      to(`#tp-${show}`, `{opacity:0,duration:.25}`, items[items.length - 1].t1 + 0.9);
      to(`#ans-${show}`, `{opacity:0,duration:.25}`, items[items.length - 1].t1 + 0.9);
    }
  }

  // say it: the two phrases light up one after the other, sound bars move while a character speaks
  tl.items.filter((x) => x.line !== undefined).forEach((it) => {
    to(`#sl${it.line}`, `{opacity:1,scale:1.04,duration:.25}`, it.t0);
    const n = Math.max(2, Math.round(it.dur / 0.3));
    to(`.bar-${it.line}`, `{scaleY:1.9,duration:.15,ease:"sine.inOut",yoyo:true,repeat:${n * 2 - 1},stagger:.04}`, it.t0);
  });

  // next: the card of the next lesson, and what comes back
  pop("#nx-card", seg.next.t0 + 0.2, 0.45); pop("#nx-rev", seg.next.t0 + 1.6, 0.4);

  const dots = SEGMENTS.map((id) => `<i id="dot-${id}" class="dot"></i>`).join("");
  const chips = lesson.chips.map((c, i) => `<div id="chip${i}" class="chip"><b>${esc(c.de)}</b><span dir="rtl">${esc(c.fa)}</span></div>`).join("");
  const pwords = lesson.patternWords.map((w, j) => `<div id="pw${j}" class="pw" style="opacity:${j === 0 ? 0 : 0}">${esc(w.de)}<small dir="rtl">${esc(w.fa)}</small></div>`).join("");
  const picons = lesson.patternWords.map((w, j) => `<div id="pi${j}" class="pi" style="opacity:.18">${ICON[w.icon]}</div>`).join("");
  const cdFor = (show) => `<div id="cd-${show}" class="cd" style="opacity:0"><div class="ring"></div>${[0, 1, 2].map((k) => `<div id="cdn-${show}-${k}" class="cdn" style="opacity:0">${3 - k}</div>`).join("")}</div>`;
  const slines = lesson.sayLines.map((l, i) => `<div id="sl${i}" class="sline" style="opacity:.35"><b>${esc(l.de)}</b><span dir="rtl">${esc(l.fa)}</span><div class="bars">${[0, 1, 2, 3, 4].map(() => `<u class="bar-${i}"></u>`).join("")}</div></div>`).join("");
  const N = lesson.nextCard;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1920">
<style>
${FONT() ? `@font-face{font-family:"EasyFont";font-weight:900;src:url(data:font/woff2;base64,${FONT()}) format("woff2");}` : ""}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;background:${T.bg};overflow:hidden}
#root{position:relative;width:1080px;height:1920px;background:${T.bg};font-family:"EasyFont",Arial,sans-serif;overflow:hidden;color:${T.ink}}
.blob{position:absolute;border-radius:50%;opacity:.5}
.brand{position:absolute;left:44px;top:60px;font-size:36px;line-height:1.15;color:${T.ink}}
.brand small{display:block;font-size:26px;color:${T.fa}}
.dots{position:absolute;left:44px;top:170px;display:flex;gap:16px}
.dot{display:block;width:20px;height:20px;border-radius:50%;background:#B9B2A6}
.st{position:absolute;left:0;top:250px;width:1080px;height:920px;opacity:0}
.cap{position:absolute;left:44px;right:150px;top:1230px;padding:16px 28px 20px;text-align:center;opacity:0;background:${T.card};border:6px solid ${T.border};border-radius:38px;box-shadow:0 10px 0 ${T.acc2}}
.cap .who{display:block;font-size:30px;letter-spacing:.04em;margin-bottom:2px}
.cap .de{font-size:66px;line-height:1.12;color:${T.ink}}
.cap .fa{margin-top:10px;font-size:40px;line-height:1.35;color:${T.fa}}
.cap .fa.big{margin-top:0;font-size:46px;color:${T.ink}}
.cap.nar{padding:26px 28px 30px}
.hl{color:${T.acc}}
.pill{position:absolute;padding:30px 50px;border-radius:70px;border:6px solid ${T.border};background:${T.card};font-size:96px;box-shadow:0 10px 0 ${T.acc2}}
#hk-a{left:90px;top:200px}#hk-b{left:330px;top:560px;box-shadow:0 10px 0 ${T.acc}}
#hk-q{left:760px;top:360px;font-size:200px;color:${T.acc};border:none;background:none;box-shadow:none;padding:0}
.portwrap{position:absolute;left:190px;top:260px;width:700px;height:700px}
#portb{position:absolute;inset:0;border-radius:64px;border:8px solid ${T.border};overflow:hidden;background:${T.card};box-shadow:0 14px 0 ${T.acc2}}
.pimg{position:absolute;left:0;top:0;width:700px;height:700px;object-fit:cover}
#pb{opacity:0}
.chips{position:absolute;left:60px;right:150px;top:730px;display:flex;gap:18px;justify-content:center}
.chip{flex:1;padding:14px 10px;border-radius:30px;border:5px solid ${T.border};background:${T.card};text-align:center}
.chip b{display:block;font-size:42px}.chip span{display:block;font-size:30px;color:${T.fa}}
#pat-base{position:absolute;left:60px;top:150px;width:960px;text-align:center;font-size:150px;opacity:0}
.pws{position:absolute;left:60px;top:340px;width:960px;height:240px}
.pw{position:absolute;left:0;width:960px;text-align:center;font-size:170px;color:${T.acc};opacity:0}
.pw small{display:block;font-size:46px;color:${T.fa};margin-top:-10px}
.pis{position:absolute;left:60px;top:640px;width:960px;display:flex;justify-content:space-around}
.pi{width:250px;height:250px;display:flex;align-items:center;justify-content:center;background:${T.card};border:6px solid ${T.border};border-radius:50%}
.ic{position:relative;width:130px;height:130px}.ic i{position:absolute;display:block}
.sun i{left:15px;top:15px;width:100px;height:100px;border-radius:50%;background:#FFC21A;box-shadow:0 0 0 14px rgba(255,194,26,.35),0 0 0 30px rgba(255,194,26,.18)}
.dawn{overflow:hidden;height:80px;margin-top:40px}.dawn i{left:15px;top:20px;width:100px;height:100px;border-radius:50%;background:#FF9A3C;box-shadow:0 0 0 14px rgba(255,154,60,.35)}
.moon i{left:10px;top:10px;width:110px;height:110px;border-radius:50%;box-shadow:inset -34px 0 0 0 #3B4E8F}
.tp{position:absolute;left:150px;top:60px;width:780px;height:560px;border-radius:64px;border:8px solid ${T.border};background:${T.card};box-shadow:0 14px 0 ${T.acc2};opacity:0;text-align:center}
.tp .clk{position:absolute;left:0;right:0;top:300px;font-size:150px}
#tp-moon .ic{position:absolute;left:325px;top:110px;transform:scale(1.5)}
#tp-door .door{position:absolute;left:290px;top:40px;width:200px;height:340px;border:10px solid ${T.border};border-radius:20px 20px 0 0;background:#F3D9A4}
#tp-door .door:after{content:"";position:absolute;right:26px;top:190px;width:26px;height:26px;border-radius:50%;background:${T.border}}
#tp-door .q{position:absolute;left:0;right:0;top:390px;font-size:90px;color:${T.acc}}
.cd{position:absolute;left:380px;top:660px;width:320px;height:320px;opacity:0}
.ring{position:absolute;inset:0;border-radius:50%;border:16px solid ${T.acc2};background:${T.card}}
.cdn{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:190px;color:${T.acc}}
.ans{position:absolute;left:150px;top:690px;width:780px;padding:34px 20px;border-radius:50px;border:8px solid ${T.border};background:${T.acc2};text-align:center;font-size:110px;opacity:0}
.sls{position:absolute;left:60px;right:150px;top:730px;display:flex;flex-direction:column;gap:14px}
.sline{padding:12px 24px;border-radius:30px;border:5px solid ${T.border};background:${T.card};display:flex;align-items:center;gap:16px;justify-content:space-between}
.sline b{font-size:40px;white-space:nowrap}.sline span{font-size:26px;color:${T.fa}}
.bars{display:flex;gap:6px;align-items:center;height:50px}.bars u{display:block;width:8px;height:22px;border-radius:4px;background:${T.acc};transform-origin:center}
#nx-card{position:absolute;left:100px;top:150px;width:880px;padding:60px 30px;border-radius:64px;border:8px solid ${T.border};background:${T.card};box-shadow:0 14px 0 ${T.acc2};text-align:center;opacity:0}
#nx-card .k{font-size:34px;color:${T.fa};letter-spacing:.1em}#nx-card b{display:block;font-size:130px;line-height:1.1;margin:20px 0}#nx-card span{display:block;font-size:56px;color:${T.fa}}
#nx-rev{position:absolute;left:100px;top:700px;width:880px;padding:28px;border-radius:40px;border:6px dashed ${T.border};text-align:center;font-size:46px;opacity:0}
#nx-rev b{color:${T.acc}}
</style>
<script>${GSAP()}</script>
</head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${F(TOTAL)}">
<div id="film" class="clip" data-start="0" data-duration="${F(TOTAL)}" data-track-index="1">
  <div class="blob" style="left:-160px;top:1450px;width:520px;height:520px;background:${T.acc2}"></div>
  <div class="blob" style="left:760px;top:60px;width:420px;height:420px;background:${T.acc2};opacity:.28"></div>
  <div class="brand">${esc(COURSE.title)}<small>Mission ${lesson.mission} · Lesson ${lesson.no}</small></div>
  <div class="dots">${dots}</div>
  <div id="st-hook" class="st"><div id="hk-a" class="pill" style="opacity:0">Hallo</div><div id="hk-q" class="pill" style="opacity:0">?</div><div id="hk-b" class="pill" style="opacity:0">Guten Tag</div></div>
  <div id="port" class="portwrap" style="opacity:0"><div id="portb"><img id="pl" class="pimg" src="public/ai-cast/lena-cu.png"/><img id="pb" class="pimg" src="public/ai-cast/braun-cu.png"/></div></div>
  <div id="st-notice" class="st"><div class="chips">${chips}</div></div>
  <div id="st-pattern" class="st"><div id="pat-base">Guten</div><div class="pws">${pwords}</div><div class="pis">${picons}</div></div>
  <div id="st-turn" class="st">
    <div id="tp-moon" class="tp">${ICON.moon}<div class="clk">20:00</div></div>
    <div id="tp-door" class="tp"><div class="door"></div><div class="q">?</div></div>
    ${cdFor("moon")}${cdFor("door")}
    <div id="ans-moon" class="ans">${lineHTML(lesson.turn.find((x) => x.k === "d" && x.show === "moon").de, lesson.turn.find((x) => x.k === "d" && x.show === "moon").hl)}</div>
    <div id="ans-door" class="ans">${lineHTML(lesson.turn.find((x) => x.k === "d" && x.show === "door").de, lesson.turn.find((x) => x.k === "d" && x.show === "door").hl)}</div>
  </div>
  <div id="st-say" class="st"><div class="sls">${slines}</div></div>
  <div id="st-next" class="st"><div id="nx-card"><div class="k">NEXT LESSON</div><b>${esc(N.de)}</b><span dir="rtl">${esc(N.fa)}</span></div><div id="nx-rev">Coming back: <b>${esc(N.review)}</b></div></div>
  ${caps}
</div>
</div>
<script>
var tl = gsap.timeline({ paused: true });
${js.join("\n")}
tl.set({}, {}, ${F(TOTAL)});
window.__timelines["main"] = tl;
</script>
</body></html>`;
}

// ---------------------------------------------------------------- the flashcards
// Anki / Quizlet text import: front = English and Persian, back = the German and an example. Tab separated.
export function flashcardsTSV(lesson) {
  const cell = (s) => String(s).replace(/[\t\r\n]+/g, " ");
  return lesson.cards.map((c) => `${cell(`${c.en} · ${c.fa}`)}\t${cell(`${c.de}<br>${c.ex} — ${c.exFa}`)}`).join("\n") + "\n";
}

// One picture with all the cards of the lesson (1080 x 1350), made with HyperFrames like the video.
export function buildCardHTML({ lesson, theme = "easy" }) {
  const T = THEMES[theme] || THEMES.easy;
  const rows = lesson.cards.map((c) => `<div class="row"><b>${esc(c.de)}</b><span class="en">${esc(c.en)}</span><span class="fa" dir="rtl">${esc(c.fa)}</span><span class="ex">${esc(c.ex)} <em dir="rtl">${esc(c.exFa)}</em></span></div>`).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1350">
<style>
${FONT() ? `@font-face{font-family:"EasyFont";font-weight:900;src:url(data:font/woff2;base64,${FONT()}) format("woff2");}` : ""}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;background:${T.bg};overflow:hidden}
#root{position:relative;width:1080px;height:1350px;background:${T.bg};font-family:"EasyFont",Arial,sans-serif;color:${T.ink};overflow:hidden}
h1{position:absolute;left:50px;top:36px;font-size:54px}h2{position:absolute;left:50px;top:104px;font-size:32px;color:${T.fa};font-weight:900}
.rows{position:absolute;left:40px;right:40px;top:170px;display:flex;flex-direction:column;gap:12px}
.row{padding:12px 24px;border-radius:26px;border:5px solid ${T.border};background:${T.card};display:grid;grid-template-columns:1fr 1fr;gap:0 18px;box-shadow:0 6px 0 ${T.acc2}}
.row b{font-size:46px;color:${T.acc}}.row .en{font-size:30px;align-self:center}.row .fa{font-size:30px;color:${T.fa};grid-column:1/3}.row .ex{font-size:26px;grid-column:1/3}.row em{font-style:normal;color:${T.fa}}
</style>
<script>${GSAP()}</script>
</head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1350" data-duration="1">
<div id="card" class="clip" data-start="0" data-duration="1" data-track-index="1">
<h1>${esc(COURSE.title)} · Lesson ${lesson.no}</h1><h2>${esc(lesson.title)}</h2>
<div class="rows">${rows}</div>
</div></div>
<script>
var tl = gsap.timeline({ paused: true });
tl.set({}, {}, 1);
window.__timelines["main"] = tl;
</script>
</body></html>`;
}
