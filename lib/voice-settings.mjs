import { renameSync, rmSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";

// The narration settings that were chosen by ear, in one place.
//
// They were previously chosen in audition scripts and never written down, so
// `minimax-tts.mjs` kept its own defaults — happy, pitch 1, speed 1.1 — and
// every rendered video used the reading that was listened to and rejected as
// robotic. A setting that is approved by ear and lives only in a scratch script
// is not approved in anything that ships.
//
// Change these only after a listening test says to, and record the test in
// VOICE-LOG.md. An environment variable still wins, so an audition can try
// something without editing the locked values.

export const APPROVED = {
  // MiniMax has no Persian voice. This is an Arabic timbre carrying Persian
  // words through language_boost. Turkish was auditioned and heard as robotic.
  voiceId: "Arabic_CalmWoman",
  // "happy" and its louder reading were both heard as robotic. "surprised"
  // carries the energy the channel wants. The API accepts only happy, sad,
  // angry, fearful, disgusted, surprised, neutral and calm.
  emotion: "surprised",
  // 1.1 ran the phrases together — «تند تند پشت هم». Slower reads as a person
  // talking rather than an announcer clearing a script.
  speed: 0.95,
  // Whole numbers only. 2, and pitch 3 is REJECTED: it measured a wider pitch
  // range — 12.4 semitones against 8.1, closer to the reference speakers — and
  // was heard as childish. The measurement was right about the range and wrong
  // about the voice. Range is not the same thing as sounding like an adult, and
  // when the two disagree the ear decides. Do not raise this on the strength of
  // a number again.
  pitch: 2,
  vol: 1,
  model: "speech-2.8-hd",
  languageBoost: "Persian",
};

// The German-lesson series' narration is bilingual: every clip except one
// per scene is the APPROVED Persian voice above; the German word/phrase
// itself needs an actual German voice. Kept here, next to APPROVED, so
// every language this project's narration ever uses lives in the one file
// the header comment above promises — german-lesson-build.mjs imports this
// instead of hardcoding its own copy.
//
// language_boost="German" alone was not enough (owner report 2026-09-10:
// the German word still came out sounding English-accented) — it was still
// being spoken by APPROVED.voiceId (an Arabic-timbre voice picked for
// Persian, never auditioned for German). Verified via a live MiniMax
// get_voice call (music/minimax-voices.mjs --lang German) that real
// German-native system voices exist: German_FriendlyMan, German_SweetLady,
// German_PlayfulMan. German_SweetLady is female, matching APPROVED's voice
// gender. Tested live (episode 9, a1-01-greetings, run 34516805328,
// 2026-09-10) and confirmed by ear by the owner — see VOICE-LOG.md.
export const GERMAN_WORD_VOICE_ID = "German_SweetLady";

// Owner report 2026-09-11 (episode A1-012, "haben"): the German word clip
// read too fast and too quiet — described as coming across accented/
// unclear ("لهجهٔ فارسی"). The clip's own voice_id/language_boost are
// already right (see the comment above — that was a different, already-
// fixed bug); this is about pace/loudness specifically for a single
// foreign word or short phrase a learner needs to actually catch, which is
// a different requirement than APPROVED.speed (0.95), tuned by ear for
// flowing PERSIAN sentences. Checked MiniMax's own t2a_v2 docs
// (platform.minimax.io/docs/api-reference/speech-t2a-http, 2026-09-11)
// for valid ranges before picking values: speed 0.5-2.0 (default 1), vol
// 0-10 (default 1). Two variables changed together because the owner
// reported both problems (fast AND quiet) from the same single listen, the
// same situation GERMAN_LESSON_NARRATION_OVERRIDE's own comment already
// covers for changing more than one variable at once.
// **Status: NOT LOCKED.** Needs a real listen on the correction rebuild
// before this counts as confirmed — log the result in VOICE-LOG.md.
export const GERMAN_WORD_VOICE_SETTINGS = { speed: 0.85, vol: 1.4 };

// Owner request 2026-09-11: the German-lesson series' narration should sound
// "کمی بالاتر" (a bit higher-pitched) and "اندکی آهسته" (slightly slower).
// Scoped to german-lesson-build.mjs's own TTS calls — but only the PERSIAN
// clips (hook, Persian explanation, outro), NOT the German-word clip. That
// was tried first and broke: applying this to the German-word clip
// (GERMAN_WORD_VOICE_ID + language_boost="German") produced a build the
// owner reported as missing German pronunciation entirely (2026-09-11) —
// that exact voice/pitch/speed combination was never auditioned; the only
// combination actually tested and confirmed by ear (VOICE-LOG.md, episode
// 9) is GERMAN_WORD_VOICE_ID at the DEFAULT pitch/speed, which is what it
// uses again now. NOT applied to APPROVED above either, which stays exactly
// as locked for every other video (daily tutorials, TikTok/Instagram).
//
// Reverted 2026-09-13: pitch 3 was flagged PENDING a real listen when this
// override was added (2026-09-11, see VOICE-LOG.md) and never confirmed in
// the five-plus episodes built since — it reused the exact pitch value
// APPROVED.pitch's own comment already documents as auditioned and REJECTED
// ("heard as childish") for this same voice engine reading Persian. Today
// gave the trigger condition that PENDING entry itself named: a1-17-
// adjectives failed Narration QC on 12+ independent synthesis takes across
// two different sentences and multiple unrelated words (بزرگ, توصیف, کلمه,
// جفت, آسان, کوچک, بد — repeatedly, regardless of rewording or sentence
// position), a failure rate far above anything else in this pipeline. Only
// pitch reverts (one variable, per this file's own change rule); speed 0.88
// is the owner's separate, unrelated "کمی آهسته" request and stays. See
// VOICE-LOG.md for the full entry.
export const GERMAN_LESSON_NARRATION_OVERRIDE = { pitch: 2, speed: 0.88 };

/** Approved values, with environment overrides for auditions. */
export function voiceSettings(env = process.env) {
  return {
    voiceId: env.MINIMAX_VOICE_ID || APPROVED.voiceId,
    emotion: env.MINIMAX_EMOTION || APPROVED.emotion,
    speed: Number(env.VOICE_SPEED || APPROVED.speed),
    pitch: Math.round(Number(env.MINIMAX_VOICE_PITCH ?? APPROVED.pitch)),
    vol: Number(env.MINIMAX_VOICE_VOL || APPROVED.vol),
    model: env.MINIMAX_TTS_MODEL || APPROVED.model,
    // The approved reading is Persian narration; this override exists only
    // for a caller that deliberately needs a different language read
    // correctly (e.g. german-lesson-build.mjs pronouncing a German word),
    // never for changing how the Persian narration itself is read — that
    // stays APPROVED.languageBoost unless a real listening test changes it.
    languageBoost: env.MINIMAX_LANGUAGE_BOOST || APPROVED.languageBoost,
  };
}

/**
 * The engine receives one line at a time. Keeping every line short and
 * semantically complete is more important than forcing dramatic parameters:
 * the API controls speed/pitch, but it cannot repair a sentence cut in half.
 * These limits are a production guard, not a substitute for listening.
 */
export function narrationLineCheck(text) {
  const value = String(text || "").trim();
  const issues = [];
  if (!value) issues.push("empty narration line");
  if (/[0-9۰-۹]/.test(value)) issues.push("digits must be expanded before TTS");
  if (/\s+[،,:؛]\s*|[،,:؛]\s*[،,:؛]/.test(value)) issues.push("broken punctuation");
  if (value.length > 190) issues.push("line is too long for natural short-form delivery");
  // These labels are correct on a real UI screenshot but have documented
  // pronunciation failures in the selected Persian TTS voice.  They must be
  // rewritten by minimaxSpeakable() before this pre-synthesis gate.  Keeping
  // the rejection here prevents a future content path from bypassing that
  // rewrite and silently shipping the same fault again.
  if (/\b(?:preview|microphone)\b|میکروفون/i.test(value)) {
    issues.push("unsafe UI label reached Persian TTS copy");
  }
  // Specific second-person possessives immediately before a word starting
  // with «د». These are real, measured failures — not a blanket rule for
  // every word that happens to end in «ت». The earlier broad regex also
  // rejected ordinary grammar such as «تفاوت دارد», which blocked the German
  // lesson recovery after it had successfully removed the actual bad words.
  // Measured on 2026-09-13, with two different engines and these words:
  //   «اولین خریدت در آلمان …»      → heard «خریده»   (run #248, Edge)
  //   «اولین خرید خودت در آلمان …» → heard «خوده»    (run #250, Edge)
  // The clitic's /t/ assimilates into the following /d/ and the word lands as
  // a different one, which music/voice-qc.mjs correctly rejects. The first fix
  // only MOVED the clitic from «خریدت» to «خودت» and it failed identically —
  // proof the fault belongs to the pattern, not to either word.
  //
  // Catching these known cases here costs nothing. Catching one in production costs a
  // 15-minute render, a chained recovery attempt, and a Telegram alert the
  // owner has to read — which is exactly what it cost, three times.
  if (/(?:خریدت|خودت|سفارشت)\s+د/.test(value)) {
    issues.push("possessive ـت before «د» — its /t/ assimilates and the word is heard as another; drop the clitic or reorder");
  }
  return issues;
}

/** The request body MiniMax expects, so every caller sends the same shape. */
export function ttsBody(text, s = voiceSettings()) {
  return {
    model: s.model,
    text,
    stream: false,
    language_boost: s.languageBoost,
    output_format: "hex",
    voice_setting: {
      voice_id: s.voiceId,
      speed: s.speed,
      vol: s.vol,
      pitch: s.pitch,
      emotion: s.emotion,
    },
    audio_setting: { sample_rate: 44100, bitrate: 128000, format: "mp3", channel: 1 },
  };
}

// MiniMax pads every clip with silence at both ends and leaves a long gap at
// each comma. Measured against the five reference speakers this channel is
// compared against, that put the narration at 70 voiced frames a second against
// their 74-78, with a third of the track silent against their quarter.
//
// Trimming the ends and capping any interior silence at 0.22s — a real breath,
// and about the length a person actually takes — brings both inside the human
// range without removing the breaths. It belongs with the settings because it
// is part of the approved delivery, and it has to run at the moment a clip is
// written: plan-voice and the render both measure these files, and trimming
// later would leave the scene timings disagreeing with the audio.
export function trimDeadAir(file) {
  const tmp = `${file}.trim.mp3`;
  try {
    execFileSync("ffmpeg", [
      "-y", "-hide_banner", "-loglevel", "error", "-i", file,
      "-af", "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05"
        + ":stop_periods=-1:stop_threshold=-45dB:stop_silence=0.22",
      "-c:a", "libmp3lame", "-b:a", "128k", tmp,
    ]);
    // A clip that will not trim is still a usable clip; keep the original
    // rather than losing the line.
    if (statSync(tmp).size > 1024) renameSync(tmp, file);
    else rmSync(tmp, { force: true });
  } catch {
    rmSync(tmp, { force: true });
  }
}

/** Whether a set of settings differs from what the ear approved. */
export function drift(s = voiceSettings()) {
  const out = [];
  for (const [k, want] of Object.entries(APPROVED)) {
    if (k === "vol" || k === "model" || k === "languageBoost") continue;
    if (s[k] !== want) out.push(`${k}: ${s[k]} (approved: ${want})`);
  }
  return out;
}
