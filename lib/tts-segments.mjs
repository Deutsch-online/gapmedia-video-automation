// Splitting a narration line into Farsi and English spans, and deciding from
// that whether the ENGLISH half of the pocket-tts pipeline is needed at all.
//
// Lifted out of music/pocket-tts.mjs so the decision can be unit-tested. That
// file is a CLI script: importing it runs it, so the predicate could not be
// checked any other way, and the predicate now gates a real refusal.
//
// Why it gates anything: pocket-tts speaks Farsi with mehdi-hf/pocket-tts-farsi
// and English with the separate, GATED kyutai voice-cloning weights, which need
// a HuggingFace token. music/pocket-tts.mjs used to exit 1 whenever HF_TOKEN
// was unset, for every line — including lines with no Latin character in them,
// which never touch the gated weights.
//
// Measured 2026-09-13 by .github/workflows/tts-probe.yml on a real runner:
// mehdi-hf/pocket-tts-farsi downloads with NO token (the Hub's own note is
// "set a HF_TOKEN to enable higher rate limits and faster downloads" — a rate
// limit, not an authorisation), and a real pure-Persian line from
// lib/narration.mjs synthesised to a 247,724-byte, 5.16s probe.wav. So the
// blanket refusal was turning away work that demonstrably succeeds.

// A run of Latin letters/digits — plus the punctuation that belongs inside a
// label (space, ' & . -) — is one English segment; everything else is Farsi.
export function segment(s) {
  const parts = [];
  const re = /[A-Za-z0-9][A-Za-z0-9 .,'&-]*[A-Za-z0-9]|[A-Za-z0-9]/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push({ lang: "fa", text: s.slice(last, m.index) });
    parts.push({ lang: "en", text: m[0].trim() });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ lang: "fa", text: s.slice(last) });
  return parts.filter((p) => p.text.trim().length > 0);
}

/**
 * Does this line actually reach the gated English model?
 * @param {Array<{lang: string}>} segs output of segment()
 */
export function needsEnglishModel(segs) {
  return (segs || []).some((p) => p.lang === "en");
}
