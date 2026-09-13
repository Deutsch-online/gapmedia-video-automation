// Compare what the narration was asked to say with what a transcriber heard in
// the audio, and name the second where they diverge.
//
// The comparison has to be deaf to spelling and awake to sound. Persian writes
// one sound with several letters — ت and ط are both /t/, س ص ث are all /s/ —
// so a transcriber picking a different letter is not a mispronunciation, and
// flagging it would bury the real faults under noise. What is NOT folded away
// is anything that changes the sound: a missing syllable, an extra vowel, a
// word that split in two.

const DIACRITICS = /[ً-ْٰـ]/g; // harakat, superscript alef, tatweel
const JOINERS = /[\u200B-\u200F\u00A0\uFEFF]/g; // ZWNJ, NBSP and friends
const PUNCT = /[.,،؛;:!؟?"'«»()\[\]—–-]/g;

// Letters that share a sound in Persian. The transcriber may pick any of them.
const SAME_SOUND = [
  ["ت", "ط"],
  ["س", "ص", "ث"],
  ["ز", "ذ", "ض", "ظ"],
  ["ق", "غ"],
  // ة (Arabic teh marbuta) is not a Persian letter, but Whisper — trained
  // heavily on Arabic — sometimes spells a word-final ه this way in an
  // Arabic-origin word like «جمله». Same sound, different alphabet habit;
  // confirmed live 2026-09-12 against a real episode-16 rejection where
  // «جمله» came back as «جملة» twice in a row, on an otherwise-correct clip.
  ["ه", "ح", "ة"],
  ["ا", "آ", "أ", "إ", "ٱ"],
  ["ی", "ي", "ى", "ئ"],
  ["ک", "ك"],
  ["و", "ؤ"],
];

// Readings that are correct Persian speech, not faults. The narration is meant
// to be colloquial, so a transcriber writing «بخون» for «بخوان» has recorded
// the delivery that was asked for. Flagging these would train the eye to skip
// the report.
const COLLOQUIAL = [
  ["بخوان", "بخون"],
  ["بخواند", "بخونه"],
  ["میخواهید", "میخواید"],
  // The 2nd-person SINGULAR of the same verb was missing while its plural
  // above was covered. «می‌خواهی» /mixâhi/ loses its intervocalic ه in
  // ordinary connected speech — /mixâi/, written «می‌خوای» — the same
  // elision this file's own final-ه rule documents further down. The
  // transcriber spells that sound «میخوایی», writing the glide out.
  // Confirmed live 2026-09-13: a1-18-shopping line 4, «وقتی چیزی را
  // می‌خواهی بخری، همین جمله کافی است.» rejected across several takes and
  // two separate runs on this word alone. Same verb, same person, same
  // tense, same meaning — only the spoken realisation differs.
  ["میخواهی", "میخوای"],
  ["میخواهی", "میخوایی"],
  ["خواهید", "خواین"],
  ["توانید", "تونین"],
  ["را", "رو"],
  ["است", "اس"],
  ["آن", "اون"],
  ["شود", "شه"],
  ["کند", "کنه"],
  ["دهد", "ده"],
  ["هستند", "هستن"],
  ["نیست", "نیس"],
  ["بگذار", "بذار"],
  ["بگذارید", "بذارید"],
  ["برایت", "برات"],
  // Colloquial Persian says ـان as ـون. The reference speakers do it in every
  // sentence, and it is the delivery this narration is asked for.
  ["همان", "همون"],
  ["آنها", "اونا"],
  ["نان", "نون"],
  ["جان", "جون"],
  ["خواهم", "خوام"],
];
const FOLD = new Map();
for (const group of SAME_SOUND) for (const ch of group) FOLD.set(ch, group[0]);

/** Reduce a word to the sounds it carries, dropping everything written-only. */
export function fold(word) {
  // واو معدوله: the و in خوا is not sounded — «بخوان» is /bexân/, «خواهر» is
  // /xâhar/. A transcriber writing «بخان» has heard the word said correctly,
  // so the silent letter goes before anything is compared.
  let s = String(word)
    .replace(/خوا/g, "خا")
    .replace(DIACRITICS, "")
    .replace(JOINERS, "")
    .replace(PUNCT, "")
    // A ه-final stem taking the plural «ها» writes two ه in a row once the
    // ZWNJ is gone — «جمله‌ها» becomes «جملهها» — but only ONE of them is a
    // /h/. The first is the vowel-carrier ⟨-e⟩ of «جمله», silent as a
    // consonant; the word is /dʒom.le.hɑ/ with a single h, which is exactly
    // why the standard spelling puts a ZWNJ between them. The transcriber
    // writes the sound it heard, «جملها», and that is the same word said
    // correctly. Confirmed live 2026-09-13: a1-18-shopping line 1 rejected
    // on «جملهها» → «جملها» on three separate full builds in a row.
    //
    // Narrow on purpose — ONLY before the ا of «ها». A blanket «هه» → «ه»
    // would fold «دهه» /dæ.he/ (a decade) into «ده» (ten, or a village),
    // two different words, because there the FIRST ه is the real /h/ and
    // the second is the vowel-carrier. The distinction only collapses when
    // the plural follows.
    .replace(/هها/g, "ها");
  let out = "";
  for (const ch of s) out += FOLD.get(ch) ?? ch;
  // A trailing ه after a consonant is silent-ish and the transcriber drops it
  // as often as it keeps it; the ezafe faults we care about add a whole vowel
  // sound, which survives this.
  return out.trim();
}

export function tokens(text) {
  return String(text)
    .split(/\s+/)
    .map(fold)
    .filter(Boolean);
}

/**
 * Where the transcriber wrote one word as two — «درآمد» as «در آمد» — join them
 * back before comparing. Word division is a spelling decision, and the audio
 * has no spaces in it; a split like that says nothing about how the word was
 * said, and left in it drowns the faults that do.
 */
// Written as a pair of alignment moves rather than a pre-pass, because the
// split can fall on either side: the transcriber writes «درآمد» as «در آمد»,
// and it writes «تیک تاکَت» as «تیکتاکات». Neither is a pronunciation fault —
// the audio has no spaces in it, and where a transcriber puts them is a
// spelling decision about a sound that was said correctly.

// Built once, in folded form, so the comparison can count a colloquial
// reading as a match rather than as a substitution to be repaired.
const ALLOWED = new Set(COLLOQUIAL.map(([w, g]) => `${fold(w)}|${fold(g)}`));

const same = (x, y) => {
  if (x === undefined || y === undefined) return false;
  if (x === y || ALLOWED.has(`${x}|${y}`)) return true;
  // A final ه is barely voiced and the transcriber drops it as often as not, so
  // «صفحه» arriving as «صفح» is not a fault. The reverse is: an ADDED ه is the
  // invented ezafe that turns «درآمد» into «درآمده», which changes the word.
  // The allowance only runs one way on purpose.
  if (x.endsWith("ه") && x.slice(0, -1) === y) return true;
  // A word-final ع is a glottal catch in spoken Persian, not the pharyngeal
  // consonant Arabic gives it — easily elided in connected speech, especially
  // running into a following vowel («سریع و آهسته» flows straight into «و»).
  // Confirmed live 2026-09-12: episode 17's «سریع» was heard as «سری» on two
  // independent takes in a row, an otherwise-correct clip rejected twice for
  // the same reason. One-way only, same reasoning as the ه rule above: an
  // ADDED ع would be a real, audible addition, not something to forgive.
  if (x.endsWith("ع") && x.slice(0, -1) === y) return true;
  // Persian devoices a word-final /d/ towards [t] in connected speech, and the
  // transcriber writes that as ت (or ط, already folded to ت above) — «خرید»
  // comes back as «خریط». Confirmed live 2026-09-13 with the strongest
  // evidence this comparison can get: in ONE build of a1-18-shopping the very
  // same word «خرید», spoken by the same voice, was transcribed correctly in
  // line 1 and as «خریط» in line 6. A pronunciation fault does not accept and
  // reject the same word in the same take; a spelling choice does.
  //
  // One-way, and only word-final, for the same reason as the ه and ع rules
  // above. The reverse — a reference ending in ت heard as د — stays a fault,
  // so the possessive clitic class this project fixed on 2026-09-13
  // («خریدت» heard as «خریده») is untouched: those references end in ت, not
  // د, and nothing here forgives a lost morpheme.
  return x.endsWith("د") && `${x.slice(0, -1)}ت` === y;
};

/**
 * Levenshtein alignment over folded words. Returns one entry per step so a
 * caller can point at the exact word, rather than reporting a distance number
 * that says a line is wrong without saying where.
 */
export function align(expected, heard) {
  const a = tokens(expected);
  const b = tokens(heard);
  const rawA = String(expected).split(/\s+/).filter(Boolean);
  const rawB = String(heard).split(/\s+/).filter(Boolean);

  const INF = Number.POSITIVE_INFINITY;
  // Comparing across a join needs one more allowance. Persian does not write
  // short vowels, so a transcriber guesses them: «تاکَت» comes back as «تاکات»,
  // an alef standing in for a fatha. And a ه inside the join goes quiet —
  // «نمونه‌کارت» arrives as «نمونکارت». Dropping ا and ه on both sides lets the
  // join be judged on its consonants, which are what the engine actually said.
  //
  // This runs ONLY on join candidates, where the words already concatenate, so
  // it cannot loosen an ordinary word-for-word comparison. «تیک تاک کت» — the
  // fault this whole exercise is about — still fails it.
  const skeleton = (s) => s.replace(/[اه]/g, "");
  // One letter of slack, in one direction only. A transcriber leaving a letter
  // out is guessing at a vowel it cannot hear written; a transcriber putting an
  // extra one IN is reporting a syllable that was actually said — which is the
  // whole «تیک تاک کَت» fault. Short readings are forgiven, long ones are not.
  const oneShorter = (x, y) => {
    if (x.length !== y.length + 1) return false;
    for (let k = 0; k < x.length; k++) {
      if (x.slice(0, k) + x.slice(k + 1) === y) return true;
    }
    return false;
  };
  const joined = (x, y) => {
    if (same(x, y)) return true;
    const [sx, sy] = [skeleton(x), skeleton(y)];
    return sx === sy || oneShorter(sx, sy);
  };
  const joinB = (i, j) => (j >= 2 && joined(a[i - 1], b[j - 2] + b[j - 1]) ? 0 : INF);
  const joinA = (i, j) => (i >= 2 && joined(a[i - 2] + a[i - 1], b[j - 1]) ? 0 : INF);

  const d = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) d[i][0] = i;
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (same(a[i - 1], b[j - 1]) ? 0 : 1),
        j >= 2 ? d[i - 1][j - 2] + joinB(i, j) : INF,
        i >= 2 ? d[i - 2][j - 1] + joinA(i, j) : INF,
      );
    }
  }

  const steps = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j >= 2 && d[i][j] === d[i - 1][j - 2] + joinB(i, j)) {
      steps.push({ op: "same", want: rawA[i - 1], got: `${rawB[j - 2]}${rawB[j - 1]}`, wantIndex: i - 1, gotIndex: j - 2 });
      i--; j -= 2;
    } else if (i >= 2 && j > 0 && d[i][j] === d[i - 2][j - 1] + joinA(i, j)) {
      steps.push({ op: "same", want: `${rawA[i - 2]}${rawA[i - 1]}`, got: rawB[j - 1], wantIndex: i - 2, gotIndex: j - 1 });
      i -= 2; j--;
    } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (same(a[i - 1], b[j - 1]) ? 0 : 1)) {
      steps.push({
        op: same(a[i - 1], b[j - 1]) ? "same" : "wrong",
        want: rawA[i - 1],
        got: rawB[j - 1],
        wantIndex: i - 1,
        gotIndex: j - 1,
      });
      i--; j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      steps.push({ op: "missing", want: rawA[i - 1], got: null, wantIndex: i - 1, gotIndex: j });
      i--;
    } else {
      steps.push({ op: "extra", want: null, got: rawB[j - 1], wantIndex: i, gotIndex: j - 1 });
      j--;
    }
  }
  steps.reverse();
  return steps;
}

const mmss = (t) =>
  t == null ? "—" : `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/**
 * Turn an alignment into the faults worth reporting, timestamped against the
 * stitched track so they can be checked by ear at the second named.
 */
export function faults({ expected, heard, words = [], offset = 0 }) {
  const steps = align(expected, heard);
  const at = (k) => {
    const w = words[k];
    return w ? { start: +(w.start + offset).toFixed(2), end: +(w.end + offset).toFixed(2) } : null;
  };
  return steps
    .filter((s) => s.op !== "same")
    .map((s) => {
      const t = at(s.gotIndex);
      return {
        kind: s.op,
        want: s.want,
        got: s.got,
        wantIndex: Number.isInteger(s.wantIndex) ? s.wantIndex : null,
        gotIndex: Number.isInteger(s.gotIndex) ? s.gotIndex : null,
        at: t,
        where: t ? `${mmss(t.start)}–${mmss(t.end)} (${t.start}s)` : "—",
      };
    });
}

export { mmss };
