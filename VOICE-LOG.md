# Voice correction log

Every narration setting and pronunciation fix that a listening test decided,
with what was rejected and why. Kept so a later pass does not re-propose a
reading that was already tried and turned down, and does not quietly drift back
to values that were listened to and rejected.

**LOCKED** means approved by ear. Do not change without a new listening test,
and record the test here when you do.

The approved settings live in `lib/voice-settings.mjs`; the spoken-copy rules
live in `lib/pronounce.mjs`. This file is the reasoning behind both.

---

## Settings

| | Value | Status |
|---|---|---|
| voice | `Arabic_CalmWoman` | **LOCKED** |
| emotion | `surprised` | **LOCKED** |
| speed | `0.95` | **LOCKED** |
| pitch | `2` | **LOCKED** |
| model | `speech-2.8-hd` | LOCKED |
| language_boost | `Persian` | forced — MiniMax has no Persian voice |

MiniMax carries no Persian or Dari voice among its 332 system voices, so the
timbre is Arabic and `language_boost` carries the words. Cloning is the only
route to a genuinely Persian timbre; one clone was auditioned on 2026-08-28 and
was not preferred.

### Rejected settings — do not retry

| Setting | Heard as | Verdict |
|---|---|---|
| Turkish female voice | robotic | REJECTED |
| `emotion=happy` | robotic, flat | REJECTED |
| `emotion=happy`, louder | more robotic | REJECTED |
| `speed=1.1` | phrases run together — «تند تند پشت هم» | REJECTED |
| `speed=1.1` (as the shipped default) | see the settings-drift entry below | REJECTED |

`emotion=surprised` was once suspected of breaking the reading at 23s. That was
wrong: the degradation came from generating the whole narration in **one**
request, which loses level as it runs (−24 dB → −36 dB). Generated per line the
level stays flat at about −26 dB and `surprised` is clean. The suspicion is
recorded so it is not raised a third time.

---

## Generation

**One request per line.** Always. A single long request degrades, so an
audition built that way makes the listener judge a fault the finished video does
not have. `music/make-voice.mjs` and `verify-voice.mjs` both do this.

---

## Corrections

### English UI labels and bound spoken words — pending listening approval
**Changed:** 2026-09-02. `Creator Search Insights`, `Content gap`, and `Search analytics` are UI labels, not Persian loanwords. Their spoken copy now remains Latin and is protected from an internal breath; TikTok remains a Persian-spoken brand name. Colloquial forms such as «می‌خواین» and «می‌تونین» are now one spoken word rather than being separated by a space.

**Status: NEEDS LISTENING TEST.** This changes only the private TTS copy, not on-screen text or the locked voice settings. The next narrated render must be listened to before this reading is marked LOCKED.

### Settings drift — the approved reading was never shipped
**Found:** 2026-08-30, by reading the code rather than by ear.
`music/minimax-tts.mjs` carried its own defaults — `emotion=happy`, `pitch=1`,
`speed=1.1` — and nothing in `.env`, the workflows, or `make-voice.mjs` set the
approved values. Every rendered video used the reading that had been auditioned
and rejected as robotic; the approved values existed only in throwaway audition
scripts.
**Action:** moved to `lib/voice-settings.mjs` as the single source, imported by
the TTS adapter, with a warning printed when a run differs from it.
**Status: FIXED.**

### Possessive «ـت» fusing into the preceding word
The engine swallows an unmarked possessive and produces a different word.
Marking its vowel fixes it. **Splitting it off with a space does not** — that
produces the separated delivery the fix was meant to cure.

| Written | Spoken | Was heard as |
|---|---|---|
| ویوهایت | ویوهایَت | — |
| ویدیویت | ویدیویَت | — |
| نمونه‌کارت | نمونه کارَت | «کارت» — a card, a different word |
| تیک‌تاکت | تیک تاکَت | «تیک تاک کَت» |
| اینستاگرامت، پیجت، حسابت، مخاطبت | ‑َت marked | — |

**Status: LOCKED.**

**Rejected for «تیک‌تاکت»:** the two-word rewrite «تیک‌تاکِ تو», and the
closed-up spellings «تیکتاکَت» / «تیکتاکت». Four spellings were auditioned
together on 2026-08-30 and the marked possessive was chosen. Do not re-propose
the rewrite.

### Ezafe appearing where the grammar has none
«برای درآمد واجد شرایط» came out as «برای درآمدهِ واجد» — an added ه or ی is a
different word, and it is the one narration fault that changes the claim.
**Action:** a breath before the predicate. `BREAK_BEFORE` in `lib/pronounce.mjs`
places it in front of the sentence adverb and the predicate, not on a word
count. **Status: LOCKED.**

### «واجدشرایط» glued
Read English-like, and bled an ezafe backwards. Written with a space:
«واجِدِ شَرایِط». **Status: LOCKED.**

### Numbers
«۲۰۰» was read as «دو هزار». `persianNumberWords()` converts rather than looking
up — a lookup table produced «چهل و هشت۹۳» for «۴۸۹۳». **Status: LOCKED.**

### «Preview» و «میکروفون» — ورودی خصوصیِ امن برای TTS، 2026-09-12

**گزارش شنیداری صاحب کانال:** در ویدیوی TikTok، «Preview» و «میکروفون» نادرست
خوانده شدند. علت: برچسب انگلیسی رابط کاربری و وام‌واژهٔ چندبخشی بدون تبدیل
گفتاری وارد MiniMax شده بودند.

**اصلاح قطعی:** متن روی اسکرین همچنان برچسب واقعی `Preview` یا `Microphone`
است، اما نریشن خصوصی آن‌ها را به‌ترتیب «پیش نَمایش» و «مایک» می‌فرستد. هر
ورودی خامِ این سه شکل (`Preview`، `Microphone`، «میکروفون») در گیت پیش از TTS
رد می‌شود. فایل صوتی نیز اکنون هشِ متن گفتاری را در نام خود دارد؛ بنابراین
هیچ MP3 قدیمی پس از تغییر تلفظ قابل استفاده نیست.

**وضعیت شنیداری:** تغییر متن و گیت کد تست شده‌اند؛ آزمون شنیداریِ همین خروجی
تازه باید روی نخستین رندر Cloud ثبت شود. گزارش شنیداری صاحب کانال همچنان بر
ASR اولویت دارد.

### «صفر» — corrected to the standard Persian reading «صِفر», 2026-09-12
**Reported by listener:** the latest video pronounced the number incorrectly.
The converter expanded digits to the plain written form «صفر», but this TTS
voice needs the short-vowel cue for the standard reading /sefr/. The on-screen
word remains «صفر»; only the private spoken copy is now `صِفر`.

**Release control added:** `music/plan-voice.mjs` now writes the exact
per-line audio used by the render, runs `music/voice-qc.mjs` (Whisper plus the
project's phonetic comparator) on those files, and permits one fresh take only.
A second failed ASR comparison blocks the video before visual rendering. This
is machine verification, not a substitute for the listener; any listener
report remains a release bug and is handled before the next output.

### Breath placement
A breath every one or two phrases, never mid-phrase. `breathe()` refuses to
break a compound verb, a number phrase or a bound pair; NBSP marks a multi-word
unit as unsplittable. **Status: LOCKED.**

### Colloquial over literal
Standing instruction: what is written on screen is not what has to be spoken.
The spoken copy carries the meaning in the form people say it — but not at the
cost of a word being heard wrong, which is what retired «تیک‌تاکِ تو».
**Status: LOCKED.**

---

## Verification

`node verify-voice.mjs --feature <key>` generates the narration per line,
transcribes it with Whisper, and prints where the words that came back differ
from the words that were sent, with the second on the stitched track.

It compares by **sound, not spelling**: ت/ط, س/ص/ث, ز/ذ/ض/ظ, ق/غ and ه/ح are the
same sound in Persian, so a transcriber choosing a different letter is not a
fault and is folded away. What survives the folding is a changed syllable, a
missing word, an added vowel.

**What it cannot do:** hear. It has no opinion on rhythm, breath, energy, or
whether a line sounds like a person. A line can transcribe perfectly and still
be robotic. Those faults are found by listening, and a reported fault is not
closed because this check passed.

### A breath landing inside a word
**Found:** 2026-08-30, by transcribing the narration and reading it back.
`breathe()` was free to drop a comma into the space inside a replacement value.
Those spaces are pronunciation aids — «آپلود» spelled «آپ لُود», «تیک‌تاکت»
spelled «تیک تاکَت» — not phrase boundaries, and a comma in one of them is heard
as a gap inside a single word. Thirty-one values were exposed. The transcript
caught it on «نمونه، کارَت»; it is the same mechanism behind the short gap
reported inside «تیک تاکت».
**Action:** every space in every replacement value is now non-breaking, as a
rule rather than per word. `breathe()` reads the head and tail of a joined unit
so the sets still match its edges — matching the whole token had silently
stopped the ezafe breath from being placed before «واجِدِ شَرایِط».
**Status: FIXED**, and covered by `test-hear.mjs`.

### «تعریف» read without its ع
Came back as «تریف». Written «تَعریف`. **Status: FIXED.**

### What the transcript check cannot settle
MiniMax is not deterministic and Persian ASR spells short vowels by guesswork,
so the same line transcribes differently run to run. The comparison forgives a
letter left out and refuses a letter added, which is the right asymmetry — a
missing letter is a vowel the transcriber could not see written, an extra one is
a syllable that was said. It still cannot arbitrate a one-consonant difference
inside a brand name. That one stays with the ear.

---

## Pitch range — «کمی شاد و انسانی‌تر»

**Measured, 2026-08-30.** Five reference videos the user sent were analysed with
`lib/prosody.py` and the narration measured the same way. "Flat" and "robotic"
turned out to be one number:

| | reference speakers | narration, before | after |
|---|---|---|---|
| range (semitones) | 12.8 – 19.1 | **8.1** | **12.4** |
| step-to-step movement | 0.20 – 0.23 | 0.21 ✓ | 0.22 ✓ |
| voiced frames / second | 74 – 78 | **67.6** | **75.3** |
| share of track silent | 0.22 – 0.26 | **0.32** | **0.25** |

The voice was moving as often as a person — it simply was not travelling as far.
Half the distance, which is what a flat reading is.

**pitch 2 → 3.** Tested 1, 2, 3, 4, 5 at the approved speed. Range peaks at 3
(11.8) and falls again at 4 (7.8) and 5 (10.2), so 3 is a real optimum and not
"higher is better".

**Silence trimmed at generation.** MiniMax pads each clip and leaves long gaps at
commas. Trimming the ends and capping interior silence at 0.22s brings rate and
pause share inside the human band without removing the breaths. `trimDeadAir()`
in `lib/voice-settings.mjs`, run as each clip is written so plan-voice and the
render measure the same audio.

**Rejected again, with a number this time:** `emotion=happy` measures a range of
10.0 against `surprised` at 11.8, and `speed` above 0.95 *narrows* the range
(1.0 → 9.4, 1.05 → 9.0) because a faster reading has less room for a contour.
Both had already been rejected by ear; the measurement agrees.

### Open, and probably not real
«تعریف» transcribes as «تریف» and «تطبیق» as «تطویق» in most runs. Persian ASR
drops ع and softens ب routinely, and the voice is an Arabic timbre that should
carry ع well. Not changed — the user has not reported either by ear, and
respelling a word that is being said correctly would be a fix for a fault that
does not exist. Listen for them before acting.

### pitch 3 — REJECTED by ear, 2026-08-30
Heard as childish («کودکانه»). Reverted to 2 and locked there.

This is the entry to read before trusting `lib/prosody.py` again. Pitch 3
measured a range of 12.4 semitones against 8.1 at pitch 2, much closer to the
reference speakers, and it still sounded wrong. **A wider range is not the same
thing as sounding like an adult** — raising the pitch of a voice widens its
range and also makes it younger, and the measurement can only see the first.

The tool keeps its use: it found that the narration was travelling half the
distance a person travels, which was a real fault and a real explanation of
«شاد نیست». It cannot judge whether a reading is right. When a number and the
ear disagree, the ear decides, and the number gets written down here as wrong.

**Kept from that round:** the silence trimming. It removes dead air at the ends
of a clip and caps interior gaps at 0.22s; it cannot raise pitch and had nothing
to do with the childish reading. Speaking rate 75.3 and pause share 0.25, both
inside the human band, come from it.

---

## The 2026-08-31 batch — five real bugs in one report

The user's complaint bundled several things together; each was checked
independently rather than assumed. Two turned out to be real structural bugs
with fixes at the class level; one turned out not to be a bug at all (the ear
was reacting to something else); two were tested and found not reproducible.

### «تیک‌تاک» split into «تیک، تاک» — CONFIRMED, FIXED (class-level)
Root cause: `normalise()` converts every leftover ZWNJ to a plain space,
including inside a brand name that has no possessive suffix — the protection
that exists for «تیک‌تاکت» never covered the bare name. That plain space then
sat exposed to `breathe()` exactly like the 31 pronunciation values did before
they were protected.
**Fixed at the class, not the instance:** a scan of every ZWNJ compound in the
whole feature catalogue found the same exposure in `بک‌گراند`, `به‌خاطر`,
`ری‌اکشن`, `اسکرین‌شات`, `پلی‌لیست`, `تله‌پرامپتر`, `ثبت‌نام`, `زمان‌بندی`,
`کلین‌آپ` — none ever reported broken, all carrying the identical risk. All
protected the same way. **Status: LOCKED.**

**Investigated and reverted:** `JOIN_AFTER`'s `` never matches Persian
letters (`` is defined over `\w`, which excludes them), so the "glue plural/
comparative suffixes" step has been a silent no-op the whole time. Fixing the
regex made it fire — and glued «بیننده‌های» into «بینندههای», a double-ه that
was never heard by anyone. Reverted unheard rather than shipped; the no-op is
the state every video so far was built and approved against.

### «رایگان» opening the hook — CONFIRMED, FIXED (7 of 7 instances)
A LOCKED content rule — stated repeatedly — says free/name/logo never opens a
tool video. `hook.ask` is shown on screen AND spoken, so this was a double
violation. Every tools-bank feature was scanned: **all seven** that mention
رایگان put it as the literal first word. All seven reworded to lead with the
result and mention رایگان after a natural pause instead.

### Mid-sentence em-dash and semicolon — CONFIRMED, FIXED
A dash used as a written pause (`... شو — رایگان`) was never converted to
anything the engine reads as a pause; it sat as a raw character, occupying a
slot in `breathe()`'s word array and corrupting its count. Now converted to a
comma before tokenising. Semicolons the same way.

### The breath counter never reset on an existing comma — CONFIRMED, FIXED
Once a comma already sits in the text — hand-written, or just produced by the
dash conversion above — `breathe()`'s `since` counter kept climbing through it
and inserted more, stacking three commas where one was intended
(«به‌خاطر، موزیک، حذف نشود،»). Now any comma already in the token resets the
counter, whether it came from the source text or from `breathe()` itself.

### «نه لای الگوریتم» — CONFIRMED via 4/4 independent takes, FIXED by rewording
This is very likely what the user actually heard and called «لای» — not the
word itself (a correct, ordinary Persian word meaning "amid/within"), but
whatever came apart right next to it. Isolated and tested: «الگوریتم» alone
reads fine; «نه لای الگوریتم» together breaks on **every one of four
independent generations** («نلویه آلگوریتام», «نه، لویه آلگوریتم» ×2, similar
on the fourth). Reworded to «نه توی الگوریتم گم می‌شود» — tested clean or
near-clean in 3 of 3. **Status: reworded, not a pronunciation-layer fix**; this
specific three-word sequence may simply be hard for this engine, the same class
of problem as «سوار … شو» below.

### «قبل از همه سوار ترند شو» — a discontinuous light verb, REWORDED
«سوار … شو» (get on/board) brackets its object; no positional breath rule can
safely place a pause inside it without more context than `breathe()` has.
Reworded to «به ترند سوار شو» so the two verb halves sit adjacent. Same fix
class as the «نه لای» rewording above: when a specific grammatical construction
is what breaks, the construction is changed rather than teaching the breath
placer one more special case.

### دایرکت, and English words appearing in the transcript — INVESTIGATED, NOT A BUG
The user heard English inside the Persian narration. Eight independent
generations of the دایرکت line and four of «ترند … وایرال» never once produced
an actual English-pronunciation reading — Whisper's transcript occasionally
romanises a confidently-pronounced loanword («trend», «viral», «algoritm») even
though `language_boost` is Persian and the source text is pure Persian script.
**Do not "fix" a word on the strength of what a transcript says if the audio
itself, generated repeatedly, never shows the fault.** This is the same
principle as the earlier سرپرست note on transcript noise, applied to a new
failure mode: romanisation instead of a wrong letter.

### «برایت» and «صدایت» — TESTED, NOT ADDED
Both appear in the catalogue with the same unmarked-possessive shape as
«پیامت»/«تیک‌تاکت». Tested marked vs. plain, three takes each: **no
consistent difference** — both forms showed the same scatter of ASR noise.
Unlike «پیامت» (which the ear can be shown breaking on 4/4 plain takes and
recovering on marked ones), there is no reproducible defect here to fix.
Not added. A possessive shape being on the known-risk list is a reason to test
it, not a reason to mark it.

### «پیامت» — CONFIRMED, FIXED
Same class as `ویوهایت`/`تیک‌تاکت`: unmarked, it broke in 4 of 4 independent
generations of the line it actually appears in. Marked «پیامَت», clean or
near-clean across the same count. **Status: LOCKED.**

### `verify-voice.mjs` had a blind spot — FIXED
It reconstructed `hook + tips` by hand instead of calling `narrationFor()`,
the function the render actually uses. `narrationFor()` falls back to
`pack.payoff` as the outro line when a feature has no hand-written script —
and «نه لای الگوریتم» lived in exactly that line, never checked. Every
finding above involving the outro came from re-pointing the tool at the real
source, not from a lucky guess about where to look. **Any feature with no
hand-authored entry in `lib/narration.mjs` speaks its payoff as the last line
— check it.**

## The 2026-09-06 batch — a whole class of unprotected English labels

User report: "نریشن نیز مشکل دارد باید بررسی کنی و تمام قانون نریشین فارسی
باید تطبیق شود" (the narration also has a problem; go check it and make sure
every Persian narration rule is applied) — no single word named. Text-level
only: no `MINIMAX_API_KEY` and no local Whisper in this environment, so
nothing here was regenerated or transcribed; each line below was checked by
running the actual `minimaxSpeakable()` the render calls, on the actual
catalogue text, and reading the output.

### English UI labels re-splitting after they were already protected — CONFIRMED, FIXED (class-level)
`breathe()` protects a multi-word English label by joining it with NBSP
before counting words — the mechanism «TikTok Search», «Creator Rewards»,
«Add media» etc. already relied on. But the later generic single-word rules
(`\bTikTok\b` → «تیک تاک», `\bReels?\b` → «ریل») do not stop at an NBSP: a
plain `\b` word boundary sits on both sides of it exactly like it sits next
to a plain space, so those rules re-matched the *first* word of an
already-protected label and partially re-Persianised it. Confirmed live in
already-shipped narration: «TikTok Search» → «تیک تاک Search» (the exact
line spoken in `search-insights-real-ui`, sent 2026-08-27 and re-rendered
2026-09-05) — a language switch mid-label, not a comma, so `verify-voice.mjs`'s
word-for-word ASR diff would not have caught it either (it is still the
written words, just half of one name read in the wrong language).
**Fixed at the class, not the instance:** `\bTikTok\b` and `\bReels?\b` both
gained a `(?! )` guard, so neither one touches a word it has already
NBSP-joined to something else. Any future generic single-word rule placed
after a multi-word-label protection needs the same guard — this is the
general shape of the fault, not specific to these two words.

### Three multi-word English labels had no protection at all — CONFIRMED, FIXED
Found by running every `hook.ask` / `steps[].text` / `payoff` / `outroAsk`
string in the catalogue through `minimaxSpeakable()` and flagging any comma
that landed touching a Latin word. Three real, reproducible splits, none
saved by a lucky adjacent comma in their actual sentence:
- «Creator Center» → «Creator، Center» (`fresh/tiktok-shop-video-assistant`)
- «Video Assistant» → «... روی، Video Assistant بزن» (same feature)
- «Help me create» → «Help me، create» (`visual/google-vids-product-demo`)
- «Reels insights» → «ریل insights» (mixed language, not just a split —
  `Reels` has a generic Persianisation rule, `insights` has none, so the pair
  came apart into one Persian and one bare English word — `visual/ig-insights-retention`)
All four now use the same NBSP-join protection as the existing labels
(`Creator Search Insights`, `Search analytics`, `TikTok Search`, `Content
gap`, `Trial reel insights`, `Share with everyone`, `Creator Rewards`, `Trial
reel`, `Add media`) — kept fully English, the same choice already made for
that group and for the same reason (§ English UI labels above in this file:
transliterating an English button name produced "شِیر" for Share and "نِکست"
for Next, rejected by ear 2026-08-31; a bare mid-sentence English word with
no Persian treatment at all is the same fault from the other direction).
Also added: `TikTok Shop` (same bug as `TikTok Search`, same fix, found by
the same sweep before the class-level fix above would have caught it anyway).

### «روی» — a preposition missing from `BOUND_BEFORE` — CONFIRMED, FIXED
This is the actual cause of the «Video Assistant» split above, not the
missing label protection alone: «روی Video Assistant بزن» took its breath
right after «روی» and before its object, because «روی» (on/onto) was never
in the preposition set that `breathe()` refuses to place a pause after. «بر»
(the more formal synonym) was already in the set; «روی» — used 54 times
across the catalogue, far more than «بر» — was not. Added. This fixes every
«روی <English label>» instruction in the catalogue, not only the one that
happened to be reported first.

### What this pass did not check
No audio was generated or listened to (no API key, no local ASR in this
environment) — everything above is a text-level fix, verified by reading
`minimaxSpeakable()`'s output, not by ear. Rhythm, stress, breath *feel*, and
whether any of the pronunciation-table entries in `lib/pronounce.mjs` are
still the right call are unverified by this pass. The next real render with
`MINIMAX_API_KEY` available should run `verify-voice.mjs` and a human
listening pass before this narration status is called "confirmed" under
`NARRATION_STANDARD.md` §"کنترل کیفیت اجباری".

---

## Persian reading rules, written down

The general rules moved to the **persian-tts-reading** skill
(`~/.claude/skills/persian-tts-reading/`) — seven files covering unwritten
sounds, homophone letters, what must never be split, foreign words, colloquial
register, breath, and verification. Read it before changing pronounce.mjs.

What stays here is this channel's own verdicts: what was approved by ear, and
what was rejected.

Fixes were being added one reported word at a time. These are the rules behind
them, so the next word of the same shape is right before anyone has to report it.

### The possessive enclitic is /-et/, not /-at/
**FIXED 2026-08-31.** Spelled «ـَت» with a fatha, but modern spoken Persian says
**-et**: «کتابت» is ketâb-**et**, «حسابت» is hesâb-**et**, «ریلزت» is relz-**et**.

All twenty-two entries in the table marked it with a fatha, telling the engine to
say /-at/ — a vowel Persian does not use there. That is why the suffix kept
arriving as a separate, English-sounding syllable instead of joining the word:
the engine was being asked for a sound that does not belong to the word, so it
put it outside the word.

Marked with a kasra it joins. Verified by transcript: «حسابت» and «ویدیویت» now
come back as single words.

**Never write the enclitic as its own token.** «ویوت» was spelled «ویو اِت» —
two words on the page and therefore two words in the mouth. It is not a word; it
is a vowel and a consonant on the end of one.

### غ and ق are one sound
Both are /q/ in Persian. The engine reads غ as a hard g and said «گیر» for
«غیر» — a different word. Spelling the sound with ق gives the right
pronunciation with a letter the engine reads reliably: «قِیر». **FIXED.**

This is the same move as respelling a loanword, applied to a native word: what
is written and what must be said are allowed to differ, and here they must.

### «ریلزت» — LOCKED as «ریلزِت»
Three spellings were auditioned on 2026-08-31 and the kasra form was chosen by
ear. **Rejected:** «ریلسِت» (the ز respelled as س) and «ریلزَت» (the fatha, which
is the same wrong vowel the rule above is about). Do not re-try either.

### What a short line cannot be tested on
«ریلزت» could not be settled by transcript. Whisper needs surrounding words; on
a two-word line it returned «بریلستر», which is a failure of the transcriber and
not evidence about the audio. Short lines go to the ear, and a transcript of one
is not a result.

### «پست» (post) — FIXED as «پُست», 2026-09-07
Reported live in the collab (Instagram) video: the payoff «پست روی هر دو پیج…»
was read as «پَست» (low/mean), a different word. An English loanword written in
Persian keeps its English sound (`foreign-words.md` Type A) — mark the damma.
Root cause was a pipeline gotcha: `["پست","پُست"]` already existed in the
`FIXES` table, but the voice pipeline calls `minimaxSpeakable()`, which uses the
separate `PERSIAN_TTS_FIXES` table — so the fix was dead for narration. Added
bare «پست» to `PERSIAN_TTS_FIXES` (sorted longest-first, so «پستت»/«پست‌هایت»
still win). **Always add TTS fixes to `PERSIAN_TTS_FIXES`, not `FIXES`.**

### «ده» (ten) — FIXED as «دَه» in number contexts, 2026-09-07
Reported live: «ده دقیقه» in the descript hook misread. The number ten needs a
fatha, «دَه» (/dah/), or the engine says /deh/ (village) — the wrong number.
Added «ده دقیقه»/«ده بار»/«ده ثانیه» only. **Rejected:** a bare «ده»→«دَه»
replace — bare «ده» is also the imperative «ده» (give, «نشان ده») which is /deh/
and must stay. Verified «نشان ده» is untouched.

### German word clips read with an English-accented voice — FIXED, 2026-09-10
Reported live: the German A1 series' German word/phrase clip was carrying
`APPROVED.voiceId` (`Arabic_CalmWoman`) with only `language_boost=German` —
language_boost changes reading rules, not the underlying voice, so it still
sounded English/Arabic-accented, not German.
**Action:** `music/minimax-voices.mjs` generalised to accept `--lang <name>`
(was Persian-only); a live `get_voice` scan for German confirmed real system
voices exist (`German_FriendlyMan`, `German_SweetLady`, `German_PlayfulMan`).
Picked `German_SweetLady` (female, matching `APPROVED`'s gender) and wired it
into `german-lesson-build.mjs` via `ttsSynthesize(..., GERMAN_WORD_VOICE_ID)`
for the German-word clip only — every other clip in the pack (hook, Persian
explanation, outro) stays on the Persian-approved voice.
**Test:** episode 9 (a1-01-greetings) rebuilt and sent live, run 34516805328 —
job log confirms `German_SweetLady` was the voice used for the German word
clip, build completed with 0 errors. Owner listened and confirmed: "ویدیو را
دیدم درست بود".
**Status: LOCKED.** `GERMAN_WORD_VOICE_ID = "German_SweetLady"` in
`lib/voice-settings.mjs`, next to `APPROVED`.

### Persian `MINIMAX_VOICE_ID` secret — corrected, 2026-09-10
The `MINIMAX_VOICE_ID` GitHub secret is set to `Persian_female_1_v1`,
overriding `APPROVED.voiceId` (`Arabic_CalmWoman`) project-wide. The owner
confirmed this is the value that has been in place, not a new change — an
earlier version of this entry wrongly logged it as unresolved/unverified.
Two live `get_voice` scans this session returned it as not present among
`system_voice`/`voice_cloning`/`voice_generation` — that scan result is
real, but the direct `t2a_v2` synthesis test (run 34516805328, episode 9,
2026-09-10) is the more authoritative check: it used this exact secret,
produced no `"voice id not exist"` error, and the owner listened to the
result and confirmed it sounded correct. The `get_voice` mismatch is
unexplained (possibly a voice category or account view the scan does not
cover) and does not override a successful live synthesis plus a listening
confirmation.
**Status: `Persian_female_1_v1` confirmed working, by ear, for Persian
narration.** Not promoted to `APPROVED.voiceId` in code — it stays an
env-var override for now — because this file's own change rule (one
variable at a time, checked against docs, logged here) was not run for
this specific value; it is documented as the actual production voice, not
as a fresh, doc-checked LOCKED replacement of `Arabic_CalmWoman`.

### German-lesson narration — pitch/speed override, PENDING a real listen, 2026-09-11
Owner request: the A1 series' narration should sound "کمی بالاتر" (a bit
higher-pitched) and "اندکی آهسته" (slightly slower).
**Action:** added `GERMAN_LESSON_NARRATION_OVERRIDE = { pitch: 3, speed: 0.88 }`
in `lib/voice-settings.mjs`, applied only inside `german-lesson-build.mjs`'s
`ttsSynthesize()` (every clip in that series: hook, German word, Persian
explanation, outro). `APPROVED` above — used by every other video — is
untouched.
**Flag, not a clean approval:** pitch 3 is the exact value this same file
already documents as auditioned and REJECTED for `APPROVED.voiceId` reading
Persian ("heard as childish", see the comment on `APPROVED.pitch` above).
That test was for the general narration voice used everywhere; this is a
narrower, explicitly different context the owner asked for — but it is the
same voice engine reading the same kind of Persian line, so the earlier
finding may well repeat here too. Two changed variables at once (pitch AND
speed) also does not follow this file's own "one variable at a time" rule —
done anyway because the owner asked for both together in one instruction,
and holding one back would not have answered what was asked.
**Status: NOT LOCKED.** Needs a real listen on the next A1 episode. If it
reproduces "childish", pitch goes back to 2 here and a different voice_id
(not pitch) is the next thing to audition for "sounds higher".

### Update, 2026-09-11 — regression: German pronunciation broke, root cause found and fixed
Live result from the episode built right after the change above (A1-012):
owner reported the video came out "بدون تلفظ آلمانی" — no German pronunciation
at all. Root cause: the override above was applied unconditionally in
`ttsSynthesize()`, including to the German-word clip
(`GERMAN_WORD_VOICE_ID` + `language_boost="German"`) — a combination that
had never been tested. The only combination actually confirmed by ear is
`GERMAN_WORD_VOICE_ID` at the DEFAULT pitch/speed (episode 9, above).
**Fix:** `ttsSynthesize()` now only applies
`GERMAN_LESSON_NARRATION_OVERRIDE` when no `voiceId` override is passed —
i.e. the Persian clips only (hook, explanation, outro). The German-word
clip is back on its tested default. **Status: German-word clip LOCKED as
before (untouched); the Persian pitch/speed change is still NOT LOCKED**
— still needs a real listen on the next episode to judge "کمی بالاتر و
آهسته‌تر" against "childish", now that it's isolated to the right clips.

### Update, 2026-09-11 — the fix above still needed a second pass: German word too fast/quiet
Owner heard episode A1-012 (haben) again after the fix above and reported the
German word clip specifically read too fast and too quiet — described as
coming across accented/unclear ("لهجهٔ فارسی"). Considered and rejected the
owner's own suggested fix (switch `language_boost` to English): that is the
exact bug already found and fixed 2026-09-10 ("German word clips read with
an English-accented voice") — reverting it would reintroduce a worse,
already-solved problem. The voice_id/language_boost are correct; this is a
pace/loudness issue specific to a short foreign word or phrase, distinct
from `APPROVED.speed` (tuned by ear for flowing Persian sentences).
**Action:** checked MiniMax's own t2a_v2 docs for valid ranges (speed
0.5–2.0, vol 0–10, both default 1) before picking values — added
`GERMAN_WORD_VOICE_SETTINGS = { speed: 0.85, vol: 1.4 }` in
`lib/voice-settings.mjs`, applied only to the German-word clip in
`german-lesson-build.mjs`'s `ttsSynthesize()` (checked via
`voiceId === GERMAN_WORD_VOICE_ID`, so it can never leak onto the Persian
clips or any other video). Two variables changed together because both
problems (fast AND quiet) came from the same single listen.
**Status: NOT LOCKED.** Needs a real listen on the `--unit a1-12-haben`
correction rebuild before this counts as confirmed.

### Update, 2026-09-11 — real root cause found: German word named in PERSIAN narration, wrong bug fixed twice
Owner heard the `--unit a1-12-haben` correction rebuild and reported it
*still* mispronounced — specifically, "sein" came out sounding like "ساین"
(English/Persian, unvoiced s) instead of correct German "زاین" (voiced z,
the real German rule for word-initial s before a vowel). The two fixes
above (German-word clip pitch/speed regression, then its pace/loudness)
were both real but did not touch this — this is a THIRD, separate bug in
the same episode. Root cause: `lib/narration.mjs`'s `a1-12-haben` entry
named the German verb "sein" in Latin script directly inside its PERSIAN
hook and outro lines ("بعد از sein، ..." / "...مثل sein..."). Those lines
are spoken by the PERSIAN voice (no `language_boost="German"`) — so of
course German orthography read with Persian/English phonetics. This has
nothing to do with `GERMAN_WORD_VOICE_ID`/`GERMAN_WORD_VOICE_SETTINGS`,
which only ever apply to the SEPARATE per-item German-word clip, not the
hook/outro. Every other unit's narration already avoids this (checked all
24 — only this one embedded a raw German word in Persian text); rewrote
both lines to refer to "فعل قبلی" instead of naming "sein".
**Lesson for narration.mjs entries generally:** never write a foreign
(German) word in Latin script inside a hook/step/outro string — those are
always spoken by the Persian voice with no language override. If a lesson
needs to reference another unit's word by name, describe it ("فعل قبلی",
"کلمهٔ قبلی") rather than spelling it.
**Status: NOT LOCKED.** Needs a real listen on the next `--unit
a1-12-haben` correction rebuild.

### German-lesson pitch override reverted 2 → 3 → 2, 2026-09-13
`GERMAN_LESSON_NARRATION_OVERRIDE`'s pitch (3, since 2026-09-11 above) was
logged **NOT LOCKED / PENDING a real listen** and never confirmed in the
five-plus episodes built since (a1-12 through a1-16). That entry named its
own trigger for reverting: "if it reproduces the same 'childish' read,
pitch goes back to 2." No human listening test happened either way — this
revert is instead triggered by the objective condition that entry set as
the reason to check by ear in the first place, combined with strong new
production evidence: `a1-17-adjectives` failed `music/voice-qc.mjs` on 12+
independent synthesis takes across four separate build attempts today
(runs 34737552669, 34738291448, 34738938113, 34739789826), spanning two
different rewordings of the hook and step text, misreading unrelated,
unconnected words each time (بزرگ, توصیف, کلمه, جفت, آسان, کوچک, بد) — a
failure rate far outside anything else observed in this project's
narration pipeline. Read MiniMax's own t2a_v2 docs (checked the same page
`GERMAN_WORD_VOICE_SETTINGS` above cites,
platform.minimax.io/docs/api-reference/speech-t2a-http) — pitch is
described as a semitone-equivalent shift with no documented claim that a
higher value improves ASR/listener intelligibility; nothing there
contradicts the original by-ear finding that pitch 3 measured a wider
pitch range but read as **less** natural, not more, for this voice engine
reading Persian.
**Action:** reverted ONLY `pitch` (3 → 2) in
`GERMAN_LESSON_NARRATION_OVERRIDE`, per this file's one-variable-at-a-time
rule — `speed` (0.88, the owner's separate "کمی آهسته" request) is
untouched and not implicated by anything above.
**This is not a substitute for a real listen.** A human should still judge
the next episode against "کمی بالاتر" (the original ask pitch 3 was
supposed to satisfy) now that it is back at the confirmed-safe default —
if pitch 2 reads as not high enough, the right next lever is a different
`voice_id` (per the original PENDING entry's own suggestion), never pitch
3 again; that value has now failed by-ear once (2026-08-30, general case)
and failed by objective production evidence once (2026-09-13, this case).
**Status: pitch 2 — back to LOCKED value. `speed: 0.88` — still NOT
LOCKED, unchanged, unaffected by this entry.**

## 2026-09-13 — TTS engine: MiniMax → pocket-tts (owner request)

**Why:** `music/minimax-tts.mjs` began returning "insufficient credit" between
08:32 and 10:30 UTC. daily.yml runs #224/#226/#227 burned 36 attempts across
both slots and shipped nothing; news-scan #231 (episode 18) died on its very
first TTS call, one second in. This is an account/billing stop — no code change
clears it. Owner then asked for a replacement that does not need MiniMax.

**What changed:** `TTS_ENGINE: "pocket"` in daily.yml and news-scan.yml. That
is the whole change — `music/plan-voice.mjs:26` and `music/make-voice.mjs:47`
already read this variable and already switch the text preparation with it
(`pocketSpeakable` instead of `minimaxSpeakable`). No voice parameter was
touched: `GERMAN_LESSON_NARRATION_OVERRIDE`'s `pitch: 2` / `speed: 0.88` and
`GERMAN_WORD_VOICE_SETTINGS` are exactly as the entries above left them, and
MiniMax stays in the tree — setting the variable back to `"minimax"` restores
the old engine with nothing else to undo.

**Evidence before switching, not after** (`.github/workflows/tts-probe.yml`
run #1, on a real runner, 12:16 UTC):
- `mehdi-hf/pocket-tts-farsi` downloaded with **no token** —
  `fetch-without-token: success`. The Hub's own note ("set a HF_TOKEN to enable
  higher rate limits and faster downloads") is about rate limits, not access.
- A real line from `lib/narration.mjs` (a1-18-shopping step 4, pure Persian, so
  the gated English half is never reached) synthesised to **5.16s / 247,724
  bytes**. pocket-tts reported "Generated: 4960 ms of audio in 1530 ms".
- 5.16s sits comfortably under this project's own overrun bound for that
  sentence (`0.9 + 0.55 × 14 words` = 8.6s, `music/pocket-tts.mjs`), so the
  line was neither truncated nor stretched.

**This is NOT a by-ear confirmation, and this file's own rule still stands.**
Duration and byte size are consistent with a real spoken line; nobody has
listened to it. The engine is a different voice, so the next narrated episode
needs a human listen against the criteria at the top of this file — clarity,
pauses, word endings, energy — before anyone calls this settled.

**What protects the channel in the meantime:** `NARRATION_QC` is back ON, so
`music/voice-qc.mjs` compares every pocket-tts take against Whisper ASR exactly
as it did for MiniMax, and `lib/hear.mjs` is untouched. If the new voice is
less intelligible, QC rejects it and the Recovery Loop reworks it — the gate
was not relaxed to make room for a new engine.

**Status: pocket-tts — PROVISIONAL, pending a human listen.** Revert lever:
`TTS_ENGINE=minimax`.

### 2026-09-13 · the production wrapper, not just the model (probe run #2)

Run #1 proved the **model**. It called `python -m pocket_tts generate` directly,
which production never does: production runs `music/pocket-tts.mjs`, which also
applies `pocketSpeakable()`, splits Persian from Latin, concatenates segments
with ffmpeg and trims dead air. That wrapper was the untested link.

`.github/workflows/tts-probe.yml` run #2 (13:45 UTC) exercised it end to end,
with `POCKET_TTS_FARSI_CONFIG` / `POCKET_TTS_VOICE` exported exactly as the
three production workflows export them:

- **The real wrapper, real line** (a1-18-shopping step 4):
  `wrapper.mp3` = **5.088s / 81,837 bytes**, reported as "1 segment".
  The model generated 5120 ms this run, so `trimDeadAir` removed ~32 ms — the
  0.072s difference from run #1's 5.16s is the sampler, not damage: run #1
  generated 4960 ms of audio for the same sentence at the same temperature.
  Nothing is mangled by the ffmpeg concat or the trim.
- **A mixed Persian+English line refused cleanly**, exit non-zero, no crash,
  and it **named the span**: «Second Space». It did not silently drop the
  English word the way the Farsi-only model does on its own.

**What this changes in practice.** Measured against the real corpus: only
**1 of 170** curated narration lines in `lib/narration.mjs` contains Latin text
(a1-01's «کلمهٔ Guten»), so the daily TikTok/Instagram VO runs on the free
engine with no credentials at all. The exposure is the **news and
Telegram-custom** paths, whose text is not hand-checked — 30% of the feature
banks' written strings carry a Latin app name — and any such line hard-fails
the build.

The remedy is free and is now one click: all three production workflows pass
`HF_TOKEN: ${{ secrets.HF_TOKEN }}` through to the render step. Unset, it is an
empty string and behaves exactly as today. Set once (a free token from
huggingface.co/settings/tokens), the English half works with no code change.

**Status unchanged: pocket-tts — PROVISIONAL, pending a human listen.** As of
this entry it has still never spoken in a delivered video. Revert lever:
`TTS_ENGINE=minimax`.

### 2026-09-13 14:08 UTC · pocket-tts spoke in production for the first time

`news-scan.yml` run #236, episode 18 (`a1-18-shopping`), the real pipeline —
not a probe:

```
pocket-tts voice -> music/voice/german-a1-18-shopping-hook.mp3 (1 segment)
```

3600 ms generated, one segment, no error. The Persian half of the narration is
therefore no longer theoretical: it ran inside `german-lesson-build.mjs` with
`TTS_ENGINE=pocket`, on the runner, against a real episode manifest, and
produced a real file. `HF_TOKEN` was empty in that run's env (visible in the
job log) and the pure-Persian line needed nothing from it, exactly as
`lib/tts-segments.mjs` says.

The episode still failed, and for the reason already documented: the German
word clip «Was kostet das?» is correctly held on MiniMax — pocket-tts has a
Farsi model and an English model and no German one — and MiniMax answers
"insufficient credit". The per-clip engine split behaved as designed; the
build printed its own note saying so before trying.

**Status: still PROVISIONAL.** A file was produced in production; nobody has
listened to it. The by-ear check at the top of this file is still owed before
pocket-tts can be called settled.

### 2026-09-13 19:12 UTC · the German word gets a real German voice, free

**Why this is a voice change and not a bug fix.** Episode 18 failed every hour
today on a single clip — «Was kostet das?» — because the German vocabulary word
was hardwired to MiniMax and MiniMax has no credit. Every report ended at "top
up MiniMax", which is not a fix. The owner said so plainly: «این هنوز درست
نشده است».

**The constraint was misread.** It was never "only MiniMax can speak German".
It was: pocket-tts has a Farsi model and an English model and no German one,
and a German word read by either is the English-accented result rejected on
2026-09-10. Microsoft Edge's neural service has genuinely native German voices,
needs no key and no account, and **this repo already speaks its protocol** —
`lib/edge-tts.mjs`, used by `render-ai-education-voice.mjs` for Persian. It was
sitting unused for exactly this problem.

**Evidence before the switch, not after** (`.github/workflows/tts-probe.yml`
run #3, on a runner, 19:11 UTC — the sandbox cannot reach
speech.platform.bing.com, 403 "Host not in allowlist"):

| voice | the exact failing line | result |
|---|---|---|
| `de-DE-KatjaNeural` | «Was kostet das?» | **1.296s / 21,165 bytes** |
| `de-DE-ConradNeural` | «Was kostet das?» | **1.368s / 22,317 bytes** |

Both plausible for a three-word question. No key, no credit, no quota. Both
takes are uploaded as the run's `german-voice-audition` artifact so the choice
can be made by ear rather than by argument.

**What changed:** `GERMAN_WORD_ENGINE` (new, default `"edge"`) selects the
German clip's engine independently of `TTS_ENGINE`. The owner's 2026-09-11
correction — the German word read too fast and too quiet — is carried across
rather than dropped: `GERMAN_WORD_VOICE_SETTINGS` (speed 0.85, vol 1.4) is
converted to Edge's percentage strings by `music/edge-tts.mjs`, so the same
intent survives the engine change.

**What did not change:** the Persian narration engine, `APPROVED`,
`GERMAN_LESSON_NARRATION_OVERRIDE`, `GERMAN_WORD_VOICE_SETTINGS` itself, and
`music/voice-qc.mjs`. The German clip can never resolve to pocket-tts — a test
pins that.

**Status: de-DE-KatjaNeural — PROVISIONAL, pending a human listen.** Duration
and byte size are consistent with a real German reading; nobody has heard it.
Listen to both takes in the artifact above. Revert levers:
`GERMAN_WORD_ENGINE=minimax` once credit returns, or `EDGE_TTS_VOICE=de-DE-ConradNeural`
for the male voice with no code change.

### 2026-09-13 20:01 UTC · pocket-tts FAILS this project's own narration gate

The first time pocket-tts's Persian was measured by `music/voice-qc.mjs` on a
complete episode, it failed **every line**. news-scan #245, episode 18:

```
Narration QC line 1: wrong «جمله‌ها» → «جملها»
Narration QC line 2: wrong «کاربردی» → «کاربوردی»
Narration QC line 3: wrong «جمله»   → «جمعه»
Narration QC line 4: wrong «وقتی»   → «اختی»
Narration QC line 5: wrong «سؤال،»  → «سهل»
```

**The gate was right to reject these.** «جمله» (jomle, *sentence*) heard as
«جمعه» (jom'e, *Friday*), «وقتی» (vaghti) as «اختی», «سؤال» (so'āl) as «سهل»
(sahl) are different WORDS, not alternate spellings of the same sound — the
distinction `lib/hear.mjs` exists to make. Folding any of these in would have
shipped a language lesson that mispronounces its own vocabulary.

So the earlier entries stand corrected on the point that matters: pocket-tts
downloads free, runs free, and produces audio of a plausible length — and none
of that was ever evidence it speaks Persian *well enough for this channel*.
Duration and byte size measure that a file exists. They do not measure
pronunciation. The gate does, and it says no.

**What changed:** `TTS_ENGINE` now accepts `"edge"`, and news-scan.yml uses it.
Edge's neural service is free and keyless like pocket-tts, is already used by
`render-ai-education-voice.mjs` for Persian, and was proven on a runner hours
earlier for German. `EDGE_PERSIAN_VOICE` (default `fa-IR-FaridNeural`) names
the Persian voice explicitly, because `music/edge-tts.mjs`'s own default is
German.

**What did not change:** `music/voice-qc.mjs` and `lib/hear.mjs` are untouched.
The gate stays the judge — if Edge reads no better, nothing ships, exactly as
nothing shipped before. That is the point: this is not a workaround, it is the
next candidate put in front of the same examiner.

**Status: fa-IR-FaridNeural — UNPROVEN on this path.** The next lesson run is
its first exam. pocket-tts remains available (`TTS_ENGINE=pocket`) but is now
known to fail QC on this content; MiniMax remains the paid fallback.
