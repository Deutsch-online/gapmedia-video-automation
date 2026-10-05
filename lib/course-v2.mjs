// «Deutsch in 60 Sekunden», method 2 — from lesson 55 on (owner, 2026-10-05: "we reached lesson 54: change the
// method of the lessons after 54 and create a new one, after a general research"). The research and the reasons:
// research/teaching-methods-2026-10-05.md. Method 1 (lib/course-lesson.mjs, six parts, a hook line first) stays for
// the sample lesson 1; method 2 tells a story first and brings earlier lessons back.
//
// Five parts, 60 s:  Scene (a mini-story of Lena and Herr Braun carries the target phrases)  →  Notice (one thing
// explained in English)  →  Retrieve (a new phrase and a phrase from an earlier lesson, 3-2-1, answer)  →
// Shadow (say it with the character, with a sound tip for Persian speakers)  →  Next (a cliffhanger).
// The lesson position follows the series: the daily pointer stood at 54, so lesson 55 is A1 unit 55.
import { esc, faMix, F, GSAP, FONT, THEMES, WHO, COURSE, lineHTML, buildTimeline, validateLesson, estimateDur } from "./course-lesson.mjs";

export const SEGMENTS_V2 = ["scene", "notice", "retrieve", "shadow", "next"];
const N = (en, fa, extra = {}) => ({ k: "n", en, fa, ...extra });
const D = (who, de, fa, hl, extra = {}) => ({ k: "d", who, de, fa, hl, ...extra });
const CD = (secs = 3, extra = {}) => ({ k: "cd", secs, ...extra });

export const LESSONS_V2 = {
  "c55-weather": {
    method: 2, no: 55, mission: 6, unit: "a1-55-weather-forecast",
    title: "Will it rain?", titleFa: "باران می‌آید؟",
    scene: [
      D("lena", "Wie wird das Wetter?", "هوا چطور می‌شود؟", "Wetter", { chip: 0 }),
      D("braun", "Morgen wird es kalt.", "فردا سرد می‌شود.", "kalt", { chip: 1 }),
      D("lena", "Und heute?", "و امروز؟", "heute"),
      D("braun", "Es regnet am Nachmittag.", "بعدازظهر باران می‌بارد.", "regnet", { chip: 2 }),
      D("lena", "Aber die Sonne scheint!", "ولی آفتاب است!", "Sonne", { chip: 3 }),
      D("braun", "Noch.", "هنوز.", "Noch", { joke: true }),
    ],
    notice: [
      N('"Wird" means "becomes". "Morgen wird es kalt": tomorrow it gets cold.', "«wird» یعنی «می‌شود». «Morgen wird es kalt»: فردا سرد می‌شود.", { row: 1 }),
      N('Same word in the question: "Wie wird das Wetter?"', "همین کلمه در پرسش: «Wie wird das Wetter?»", { row: 0 }),
    ],
    retrieve: [
      N("Your turn. Rain at three o'clock. What do you say?", "نوبت توست. ساعت سه باران می‌بارد. چه می‌گویی؟", { show: "rain" }),
      CD(3, { show: "rain" }),
      D("lena", "Es regnet am Nachmittag.", "بعدازظهر باران می‌بارد.", "regnet", { show: "rain", answer: true }),
      N("Back to lesson 54. Ask: when do we leave?", "برگردیم به درس ۵۴. بپرس: کی حرکت می‌کنیم؟", { show: "clock" }),
      CD(3, { show: "clock" }),
      D("braun", "Wann fahren wir los?", "کی حرکت می‌کنیم؟", "los", { show: "clock", answer: true }),
    ],
    shadow: [
      N("Say it with me.", "با من بگو."),
      D("lena", "Morgen wird es kalt.", "فردا سرد می‌شود.", "kalt", { line: 0, repeat: true }),
      N('The "ch" in "Nachmittag" is like your Persian kh.', "ch در «Nachmittag» مثل «خ» فارسی است.", { tip: true }),
    ],
    next: [N("Tomorrow: Lena's head hurts. Whom does she call?", "فردا: سر لنا درد می‌کند. به چه کسی زنگ می‌زند؟")],
    nextCard: { de: "Kopf, Hand, Rücken", fa: "فردا: اعضای بدن", review: "Wann fahren wir los?" },
    chips: [{ de: "Wie wird das Wetter?", fa: "هوا چطور می‌شود؟" }, { de: "Morgen wird es kalt.", fa: "فردا سرد می‌شود" }, { de: "Es regnet am Nachmittag.", fa: "بعدازظهر باران می‌بارد" }, { de: "Die Sonne scheint.", fa: "آفتاب است" }],
    rows: [{ de: "Wie wird das Wetter?", fa: "هوا چطور می‌شود؟" }, { de: "Morgen wird es kalt.", fa: "فردا سرد می‌شود." }],
    sayLines: [{ de: "Morgen wird es kalt.", fa: "فردا سرد می‌شود." }],
    tip: { big: "ch", word: "Nachmittag", fa: "مثل «خ» فارسی" },
    cards: [
      { de: "Wie wird das Wetter?", en: "What will the weather be like?", fa: "هوا چطور می‌شود؟", ex: "Weißt du, wie das Wetter morgen wird?", exFa: "می‌دانی فردا هوا چطور می‌شود؟" },
      { de: "Morgen wird es kalt.", en: "Tomorrow it gets cold.", fa: "فردا سرد می‌شود.", ex: "Zieh dich warm an, morgen wird es kalt.", exFa: "گرم بپوش، فردا سرد می‌شود." },
      { de: "Es regnet am Nachmittag.", en: "It rains in the afternoon.", fa: "بعدازظهر باران می‌بارد.", ex: "Nimm den Schirm mit, es regnet am Nachmittag.", exFa: "چتر را با خود ببر، بعدازظهر باران می‌بارد." },
      { de: "Die Sonne scheint.", en: "The sun is shining.", fa: "آفتاب است.", ex: "Heute scheint endlich die Sonne.", exFa: "امروز بالاخره آفتاب است." },
      { de: "Wann fahren wir los? (lesson 54)", en: "When do we leave?", fa: "کی حرکت می‌کنیم؟", ex: "Wann fahren wir los?", exFa: "کی حرکت می‌کنیم؟" },
    ],
  },
};

export const validateV2 = (lesson) => validateLesson(lesson, SEGMENTS_V2);
export const timelineV2 = (lesson, durOf = estimateDur) => buildTimeline(lesson, durOf, SEGMENTS_V2);

export function buildCourseHTMLv2({ lesson, tl, theme = "easy" }) {
  const T = THEMES[theme] || THEMES.easy, TOTAL = tl.total;
  const js = [];
  const to = (sel, v, t) => js.push(`tl.to("${sel}", ${v}, ${F(t)});`);
  const fromTo = (sel, f, v, t) => js.push(`tl.fromTo("${sel}", ${f}, ${v}, ${F(t)});`);
  const pop = (sel, t, d = 0.3) => fromTo(sel, `{opacity:0,y:30,scale:.92}`, `{opacity:1,y:0,scale:1,duration:${d},ease:"back.out(2)",immediateRender:false}`, t);
  const seg = Object.fromEntries(tl.segs.map((s) => [s.id, s]));
  const spoken = tl.items.filter((x) => x.k !== "cd");

  const caps = spoken.map((it, i) => it.k === "d"
    ? `<div id="c${i}" class="cap"><b class="who" style="color:${it.who === "lena" ? T.lena : T.braun}">${WHO[it.who]}</b><div class="de">${lineHTML(it.de, it.hl)}</div><div class="fa" dir="rtl">${faMix(it.fa)}</div></div>`
    : `<div id="c${i}" class="cap nar"><div class="fa big" dir="rtl">${faMix(it.fa)}</div></div>`).join("\n");
  spoken.forEach((it, i) => {
    pop(`#c${i}`, it.t0 - 0.05);
    to(`#c${i}`, `{opacity:0,y:-10,duration:.2}`, (it.repeat ? it.pauseTo : it.t1 + 0.12) - 0.2);
  });
  for (const s of tl.segs) {
    fromTo(`#st-${s.id}`, `{opacity:0}`, `{opacity:1,duration:.35,immediateRender:false}`, s.t0);
    to(`#st-${s.id}`, `{opacity:0,duration:.3}`, s.t1 - 0.3);
    to("#dot-" + s.id, `{background:"${T.acc}",scale:1.35,duration:.25}`, s.t0);
    to("#dot-" + s.id, `{background:"#B9B2A6",scale:1,duration:.25}`, s.t1 - 0.25);
  }

  // scene: the portrait of whoever speaks, the four target phrases light up as they are said
  tl.items.filter((x) => x.k === "d" && x.seg === "scene").forEach((it) => {
    const on = it.who === "lena" ? "#pl" : "#pb", off = it.who === "lena" ? "#pb" : "#pl";
    to(on, `{opacity:1,duration:.18}`, it.t0 - 0.2); to(off, `{opacity:0,duration:.18}`, it.t0 - 0.2);
  });
  fromTo("#port", `{opacity:0}`, `{opacity:1,duration:.4,immediateRender:false}`, seg.scene.t0);
  to("#port", `{opacity:0,duration:.3}`, seg.scene.t1 - 0.3);
  const nb = Math.max(1, Math.round((seg.scene.t1 - seg.scene.t0) / 2.4));
  to("#portb", `{scale:1.03,duration:${F((seg.scene.t1 - seg.scene.t0) / nb)},ease:"sine.inOut",yoyo:true,repeat:${nb - 1}}`, seg.scene.t0);
  tl.items.filter((x) => x.chip !== undefined).forEach((it) => to(`#chip${it.chip}`, `{background:"${T.acc2}",scale:1.05,duration:.25}`, it.t0));

  // notice: the two phrases of the explanation, the one being explained lights up
  tl.items.filter((x) => x.row !== undefined).forEach((it) => {
    lesson.rows.forEach((_, j) => to(`#row${j}`, `{opacity:${j === it.row ? 1 : 0.4},scale:${j === it.row ? 1.03 : 1},duration:.25}`, it.t0));
  });
  pop("#key", seg.notice.t0 + 0.3, 0.45);

  // retrieve: a picture for the question, a countdown ring, the answer when it is spoken
  const rq = tl.items.filter((x) => x.seg === "retrieve");
  rq.forEach((it) => {
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
  for (const show of ["rain", "clock"]) {
    const items = rq.filter((x) => x.show === show);
    if (items.length) { to(`#tp-${show}`, `{opacity:0,duration:.25}`, items[items.length - 1].t1 + 0.9); to(`#ans-${show}`, `{opacity:0,duration:.25}`, items[items.length - 1].t1 + 0.9); }
  }

  // shadow: the phrase lights up while the character says it, sound bars move; then the sound tip
  tl.items.filter((x) => x.line !== undefined).forEach((it) => {
    to(`#sl${it.line}`, `{opacity:1,scale:1.04,duration:.25}`, it.t0);
    const n = Math.max(2, Math.round(it.dur / 0.3));
    to(`.bar-${it.line}`, `{scaleY:1.9,duration:.15,ease:"sine.inOut",yoyo:true,repeat:${n * 2 - 1},stagger:.04}`, it.t0);
  });
  const tip = tl.items.find((x) => x.tip);
  if (tip) pop("#tipcard", tip.t0 - 0.1, 0.45);

  pop("#nx-card", seg.next.t0 + 0.2, 0.45); pop("#nx-rev", seg.next.t0 + 1.6, 0.4);

  const dots = SEGMENTS_V2.map((id) => `<i id="dot-${id}" class="dot"></i>`).join("");
  const chips = lesson.chips.map((c, i) => `<div id="chip${i}" class="chip"><b>${esc(c.de)}</b><span dir="rtl">${esc(c.fa)}</span></div>`).join("");
  const rows = lesson.rows.map((r, j) => `<div id="row${j}" class="row" style="opacity:.4"><b>${esc(r.de)}</b><span dir="rtl">${esc(r.fa)}</span></div>`).join("");
  const cdFor = (show) => `<div id="cd-${show}" class="cd" style="opacity:0"><div class="ring"></div>${[0, 1, 2].map((k) => `<div id="cdn-${show}-${k}" class="cdn" style="opacity:0">${3 - k}</div>`).join("")}</div>`;
  const ans = (show) => { const a = lesson.retrieve.find((x) => x.k === "d" && x.show === show); return `<div id="ans-${show}" class="ans">${lineHTML(a.de, a.hl)}</div>`; };
  const slines = lesson.sayLines.map((l, i) => `<div id="sl${i}" class="sline" style="opacity:.4"><b>${esc(l.de)}</b><span dir="rtl">${esc(l.fa)}</span><div class="bars">${[0, 1, 2, 3, 4].map(() => `<u class="bar-${i}"></u>`).join("")}</div></div>`).join("");
  const NX = lesson.nextCard, TP = lesson.tip;

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
.portwrap{position:absolute;left:240px;top:260px;width:600px;height:600px}
#portb{position:absolute;inset:0;border-radius:56px;border:8px solid ${T.border};overflow:hidden;background:${T.card};box-shadow:0 14px 0 ${T.acc2}}
.pimg{position:absolute;left:0;top:0;width:600px;height:600px;object-fit:cover}
#pb{opacity:0}
.chips{position:absolute;left:60px;right:150px;top:640px;display:grid;grid-template-columns:1fr 1fr;gap:14px}
.chip{padding:12px 12px;border-radius:28px;border:5px solid ${T.border};background:${T.card};text-align:center}
.chip b{display:block;font-size:34px;line-height:1.15}.chip span{display:block;font-size:26px;color:${T.fa}}
.rows{position:absolute;left:60px;right:150px;top:420px;display:flex;flex-direction:column;gap:20px}
.row{padding:22px 28px;border-radius:36px;border:6px solid ${T.border};background:${T.card};box-shadow:0 8px 0 ${T.acc2}}
.row b{display:block;font-size:58px}.row span{display:block;font-size:34px;color:${T.fa}}
#key{position:absolute;left:60px;top:40px;width:870px;text-align:center;font-size:150px;color:${T.acc};opacity:0}
#key small{display:block;font-size:50px;color:${T.fa};margin-top:-14px}
.tp{position:absolute;left:150px;top:60px;width:780px;height:560px;border-radius:64px;border:8px solid ${T.border};background:${T.card};box-shadow:0 14px 0 ${T.acc2};opacity:0;text-align:center}
.tp .big{position:absolute;left:0;right:0;top:330px;font-size:130px}
.cloud{position:absolute;left:250px;top:90px;width:280px;height:150px}
.cloud i{position:absolute;display:block;background:#8FA3C7;border-radius:50%}
.cloud .a{left:0;top:60px;width:120px;height:90px}.cloud .b{left:70px;top:0;width:140px;height:140px}.cloud .c{left:150px;top:50px;width:130px;height:100px}
.drops{position:absolute;left:290px;top:250px;width:200px;display:flex;justify-content:space-between}
.drops u{display:block;width:12px;height:50px;border-radius:6px;background:#3B6FD1;transform:rotate(18deg)}
.face{position:absolute;left:290px;top:60px;width:200px;height:200px;border-radius:50%;border:10px solid ${T.border};background:#FFFFFF}
.face:before{content:"";position:absolute;left:92px;top:30px;width:10px;height:75px;border-radius:5px;background:${T.border}}
.face:after{content:"";position:absolute;left:92px;top:95px;width:60px;height:10px;border-radius:5px;background:${T.border}}
.qm{position:absolute;left:0;right:0;top:300px;font-size:150px;color:${T.acc}}
.cd{position:absolute;left:380px;top:660px;width:320px;height:320px;opacity:0}
.ring{position:absolute;inset:0;border-radius:50%;border:16px solid ${T.acc2};background:${T.card}}
.cdn{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:190px;color:${T.acc}}
.ans{position:absolute;left:100px;top:690px;width:880px;padding:34px 20px;border-radius:50px;border:8px solid ${T.border};background:${T.acc2};text-align:center;font-size:84px;line-height:1.1;opacity:0}
.sls{position:absolute;left:60px;right:150px;top:60px;display:flex;flex-direction:column;gap:14px}
.sline{padding:24px 28px;border-radius:36px;border:6px solid ${T.border};background:${T.card};display:flex;align-items:center;gap:16px;justify-content:space-between;box-shadow:0 8px 0 ${T.acc2}}
.sline b{font-size:52px}.sline span{font-size:30px;color:${T.fa}}
.bars{display:flex;gap:6px;align-items:center;height:50px}.bars u{display:block;width:8px;height:22px;border-radius:4px;background:${T.acc};transform-origin:center}
#tipcard{position:absolute;left:100px;top:360px;width:880px;padding:40px 20px;border-radius:56px;border:8px solid ${T.border};background:${T.card};box-shadow:0 12px 0 ${T.acc2};text-align:center;opacity:0}
#tipcard .k{font-size:34px;color:${T.fa};letter-spacing:.1em}#tipcard b{display:block;font-size:200px;line-height:1;color:${T.acc};margin:10px 0}#tipcard .w{font-size:64px}#tipcard .p{font-size:50px;color:${T.fa};margin-top:6px}
#nx-card{position:absolute;left:100px;top:150px;width:880px;padding:60px 30px;border-radius:64px;border:8px solid ${T.border};background:${T.card};box-shadow:0 14px 0 ${T.acc2};text-align:center;opacity:0}
#nx-card .k{font-size:34px;color:${T.fa};letter-spacing:.1em}#nx-card b{display:block;font-size:90px;line-height:1.1;margin:20px 0}#nx-card span{display:block;font-size:56px;color:${T.fa}}
#nx-rev{position:absolute;left:100px;top:700px;width:880px;padding:28px;border-radius:40px;border:6px dashed ${T.border};text-align:center;font-size:44px;opacity:0}
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
  <div id="port" class="portwrap" style="opacity:0"><div id="portb"><img id="pl" class="pimg" src="public/ai-cast/lena-cu.png"/><img id="pb" class="pimg" src="public/ai-cast/braun-cu.png"/></div></div>
  <div id="st-scene" class="st"><div class="chips">${chips}</div></div>
  <div id="st-notice" class="st"><div id="key">wird<small dir="rtl">می‌شود</small></div><div class="rows">${rows}</div></div>
  <div id="st-retrieve" class="st">
    <div id="tp-rain" class="tp"><div class="cloud"><i class="a"></i><i class="b"></i><i class="c"></i></div><div class="drops"><u></u><u></u><u></u><u></u></div><div class="big">15:00</div></div>
    <div id="tp-clock" class="tp"><div class="face"></div><div class="qm">?</div></div>
    ${cdFor("rain")}${cdFor("clock")}${ans("rain")}${ans("clock")}
  </div>
  <div id="st-shadow" class="st"><div class="sls">${slines}</div><div id="tipcard"><div class="k">SOUND TIP</div><b>${esc(TP.big)}</b><div class="w">${esc(TP.word)}</div><div class="p" dir="rtl">${esc(TP.fa)}</div></div></div>
  <div id="st-next" class="st"><div id="nx-card"><div class="k">NEXT LESSON</div><b>${esc(NX.de)}</b><span dir="rtl">${esc(NX.fa)}</span></div><div id="nx-rev">Coming back: <b>${esc(NX.review)}</b></div></div>
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
