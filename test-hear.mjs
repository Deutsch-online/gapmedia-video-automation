// The comparison in lib/hear.mjs has to hold two lines at once: forgive how a
// transcriber spells a sound, and refuse to forgive a sound that changed. Each
// case below came from a real reported fault or a real false alarm, so loosening
// the comparison to silence one of them will fail one of these.
//
//   node test-hear.mjs
import { faults } from "./lib/hear.mjs";

const cases = [
  // Confirmed live 2026-09-13, a1-18-shopping line 4, across several takes and
  // two separate runs. «می‌خواهی» /mixâhi/ drops its intervocalic ه in ordinary
  // connected speech (/mixâi/, written «می‌خوای»); the transcriber spells that
  // «میخوایی». The PLURAL «می‌خواهید»/«میخواید» was already allowed — the
  // singular of the same verb simply had no entry.
  ["pass", "«می‌خواهی» heard in its colloquial form",
    "وقتی چیزی را می‌خواهی بخری، همین جمله کافی است.",
    "وقتی چیزی را میخوایی بخری، همین جمله کافی است."],
  ["pass", "«می‌خواهی» heard as the canonical colloquial spelling",
    "وقتی چیزی را می‌خواهی بخری، همین جمله کافی است.",
    "وقتی چیزی را میخوای بخری، همین جمله کافی است."],
  // The same episode's OTHER rejections are genuinely different words and must
  // keep blocking: «است» (is) is not «از» (from), and «خریدت» (your purchase)
  // is not «خریده» (has bought) — a real, audible final consonant is missing.
  ["fail", "«است» heard as «از» is a different word, not a spelling",
    "وقتی چیزی را می‌خواهی بخری، همین جمله کافی است.",
    "وقتی چیزی را می‌خواهی بخری، همین جمله کافی از."],
  ["fail", "«خریدت» heard as «خریده» is a different word",
    "اولین خریدت در آلمان را با همین جمله‌ها انجام بده.",
    "اولین خریده در آلمان را با همین جمله‌ها انجام بده."],
  // Spelling decisions by the transcriber. The audio has no spaces in it and
  // Persian does not write short vowels, so none of these is a fault.
  ["pass", "the possessive heard as one word",
    "آیا ویوهایِ تیک تاکَت، اَصلَن برای درآمد، واجِدِ شَرایِط هستند؟",
    "آیا ویوهای تیکتاکات اصلن برای درامد واجد شرایت هستند؟"],
  ["pass", "«درآمد» written as two",
    "آیا ویوهایِ تیک تاکَت، اَصلَن برای درآمد، واجِدِ شَرایِط هستند؟",
    "آیا ویوهای تیک تاکت اصلن برای در آمد واجد شرایت هستند؟"],
  ["pass", "«نمونه کارَت» run together, medial ه lost",
    "برای همکاری تبلیغی، پروفایل و نمونه کارَت را کامل کن",
    "برای همکاری تبلیغی، پروفایل و نمونکارت را کامل کن."],
  ["pass", "final ه dropped, and واو معدوله in «بخوان»",
    "تَعریف ویو، واجِدِ شَرایِط را داخل همان صفحه بخوان",
    "تعریف ویو، واجد شرایت را داخل همان صفح بخان"],
  ["pass", "colloquial «رو» for «را», ط written as ت",
    "کشور، سن و شرایط، برنامه را با حساب خودت",
    "کشور، سن و شرائط برنامه رو با حساب خودت"],
  ["pass", "a naturally spoken formal hook stays equivalent",
    "میخواهید بدون ضبط صدا، روی ویدیو نریشن بگذارید؟",
    "می خواید بدون ضبط صدا روی ویدیو نریشن بذارید"],
  ["pass", "the MiniMax-ready hook allows only its documented colloquial reading",
    "میخواین بدون ضبط صدا، روی ویدیو نریشن بگذارید؟",
    "می خواین بدون ضبط صدا روی ویدیو نریشن بذارید"],
  ["pass", "the stable narration rewrite avoids the rejected loanword",
    "بدون ضبط صدا، روی ویدیو صدای خودکار بگذارید.",
    "بدون ضبط صدا روی ویدیو صدای خودکار بذارید"],
  ["pass", "short vowel left out of the brand — «تکتاکت»",
    "آیا ویوهایِ تیک تاکَت، اَصلَن برای درآمد، واجِدِ شَرایِط هستند؟",
    "آیا ویوهای تکتاکت اصلن برای درامد واجد شرایت هستند"],
  ["pass", "«جمله» heard with an Arabic ة instead of ه — real episode-16 false alarm",
    "این جمله یعنی باران می‌بارد.", "این جملة یعنی باران می‌بارد."],
  ["pass", "a word-final ع elided into the next word — real episode-17 false alarm",
    "و این دو کلمه یعنی سریع و آهسته.", "و این دو کلمه یعنی سری و آهسته."],
  // Both of episode 18's remaining rejections, confirmed live 2026-09-13 on
  // three full builds in a row (news-scan #249, #250, #251) with identical
  // output each time — not synthesis noise.
  //
  // «جمله‌ها» loses its ZWNJ on the way to the engine and becomes «جملهها»,
  // two ه in a row. Only one of them is a /h/: the first is the silent
  // vowel-carrier of «جمله». The transcriber writes the single h it heard.
  ["pass", "«جمله‌ها» heard with one ه instead of the doubled spelling",
    "اولین خرید در آلمان را با همین جمله‌ها انجام بده.",
    "اولین خرید در آلمان را با همین جملها انجام بده."],
  // A word-final /d/ devoices towards [t] in connected speech. The decisive
  // evidence: in the SAME build, the same «خرید» from the same voice was
  // transcribed correctly in line 1 and as «خریط» in line 6.
  ["pass", "«خرید» heard with its final د devoiced to ط",
    "با این چهار جمله، خرید را کامل به آلمانی انجام بده.",
    "با این چهار جمله، خریط را کامل به آلمانی انجام بده."],
  // The devoicing allowance runs one way only. A reference ending in ت — the
  // possessive clitic — heard without it is still a lost morpheme, which is
  // the whole bug class fixed earlier on 2026-09-13. Kept next to the rule it
  // constrains so loosening one fails the other.
  ["fail", "the reverse — a reference ت heard as د — is still a fault",
    "خریدت را انجام بده", "خرید را انجام بده"],
  ["fail", "a word-final ه is not a licence to drop a whole syllable",
    "این جمله را بگو", "این را بگو"],

  // Sounds that actually changed. Each one alters the sentence.
  ["fail", "an ezafe the grammar has no room for",
    "برای درآمد واجِدِ شَرایِط", "برای درآمده واجد شرایت"],
  ["fail", "«نمونه‌کار» collapsing to «کارت», a card",
    "نمونه کارَت را کامل کن", "کارت را کامل کن"],
  ["fail", "the possessive breaking off — «تیک تاک کَت»",
    "ویوهایِ تیک تاکَت", "ویوهای تیک تاک کت"],
  ["fail", "the same break with a long vowel in it",
    "ویوهایِ تیک تاکَت", "ویوهای تیک تاک کات"],
  ["fail", "«ویو» taking a vowel it does not have",
    "تعریف ویو را بخوان", "تعریف ویویه را بخان"],
  ["fail", "words missing from the line",
    "کشور، سن و شرایط، برنامه را باز کن", "کشور و شرایط را باز کن"],
];

let bad = 0;
for (const [want, name, expected, heard] of cases) {
  const found = faults({ expected, heard });
  const got = found.length ? "fail" : "pass";
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok ? "  ok  " : "  NOT "} ${want.padEnd(4)} ${name}`);
  if (!ok) {
    console.log(`         expected ${want}, got ${got}`);
    for (const f of found) console.log(`         ${f.kind}: «${f.want}» → «${f.got}»`);
  }
}

console.log("");
console.log(bad === 0 ? `${cases.length} cases, all as expected` : `${bad} of ${cases.length} wrong`);
process.exit(bad === 0 ? 0 : 1);
