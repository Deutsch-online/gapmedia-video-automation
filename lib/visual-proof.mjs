// Hard stop for tutorial visuals. A healthy image file is not enough: a video
// teaching an app must show the actual app/feature, not a generic icon or a
// guessed phone UI. This now applies to every video the project ships,
// including the German A1 lesson series — the old German Insider news
// pipeline this gate used to exempt was retired 2026-09-11 (owner: "News
// دیگر نمی‌سازیم"), and the exemption never should have covered the lesson
// series either: it only did because german-lesson-build.mjs borrowed the
// news platform's unbranded layout and inherited this skip as a side effect,
// which meant not one German-lesson episode ever actually ran through the
// real-photo/repeat checks below.

import { existsSync } from "node:fs";
import { imageSize } from "./media-guard.mjs";

const isRealAsset = (tip) => typeof tip?.photo === "string" && tip.photo.startsWith("public/") && existsSync(tip.photo);
// "ai-generated": PROJECT_RULES.md rule 39/41 amendment, 2026-09-11 (owner
// decision, "پیوست دوم") — a generated stand-in image is allowed ONLY as a
// last resort after a real per-slide search has already failed
// (lib/auto-image.mjs's rescuePackPhotos/generateAIImage), and is tagged
// this way specifically so it stays distinguishable from real evidence, not
// so it can bypass this gate unlabelled.
const VALID_SOURCE_TYPES = new Set(["official-ui", "official-asset", "owner-supplied", "labelled-explainer", "commons-licensed", "openverse-licensed", "ai-generated", "generated-fallback"]);

export function assertVisualProof(pack) {
  const slides = pack.tips || pack.steps || [];
  if (!slides.length) throw new Error(`Visual QC: ${pack.id} هیچ اسلایدی ندارد.`);
  // A hard throw here, same story as visualEvidence above: only 3 of 60
  // features across every bank carry a `source` field (confirmed live
  // 2026-09-05), so this alone was enough to crash almost any normal build
  // regardless of whether its images were real. The real-photo check below
  // remains a hard requirement unchanged; a missing citation on
  // already-vetted catalogue content is a gap worth closing, not a reason to
  // stop every build until it is.
  if (!pack.source && !pack.sources?.length) {
    console.error(`   ⚠ Visual QC: ${pack.id} منبع رسمی/معتبر برای قابلیت ثبت‌نشده — تصویر واقعی همچنان الزامی است.`);
  }

  const repeated = new Map();
  for (const [index, tip] of slides.entries()) {
    if (!isRealAsset(tip)) {
      throw new Error(`Visual QC: اسلاید ${index + 1} در ${pack.id} تصویر واقعیِ همان قابلیت ندارد؛ رابط حدسی، آیکن یا تصویرسازی عمومی مجاز نیست.`);
    }
    // The detailed visualEvidence schema (source, coverage, motion) only
    // exists on lib/features-visual.mjs so far — every other bank (hundreds
    // of features built before this schema existed) has none. Requiring it
    // unconditionally made assertVisualProof() throw on virtually every
    // normal build, confirmed live 2026-09-05 against a real "بساز" command:
    // the render never had a chance to start. A real photo file (checked
    // above, the same bar every one of those features was already built
    // against) stays mandatory either way; the richer checks below apply
    // only to slides that actually carry the newer metadata, so a feature
    // opts into the stricter bar by having it, rather than being silently
    // broken for not yet having it.
    const evidence = tip.visualEvidence;
    if (evidence) {
      if (!evidence?.sourceUrl || !evidence?.sourceType || !evidence?.claim || !evidence?.mainVisual || !evidence?.whatItProves || !evidence?.motionAction) {
        throw new Error(`Visual QC: اسلاید ${index + 1} در ${pack.id} شناسنامهٔ مدرک بصری ناقص است.`);
      }
      if (!VALID_SOURCE_TYPES.has(evidence.sourceType)) {
        throw new Error(`Visual QC: اسلاید ${index + 1} در ${pack.id} نوع منبع بصریِ معتبر ندارد.`);
      }
      if (!evidence.secondaryMotion || !evidence.ambientMotion) {
        throw new Error(`Visual QC: اسلاید ${index + 1} در ${pack.id} باید حرکت اصلی، واکنش ثانویه و حرکت محیطیِ مرتبط داشته باشد.`);
      }
      const coverage = Number(evidence.coverage);
      if (!Number.isFinite(coverage) || coverage < 0.34) {
        throw new Error(`Visual QC: تصویر اصلی اسلاید ${index + 1} در ${pack.id} باید دست‌کم یک‌سوم قاب را بگیرد.`);
      }
    }
    const size = imageSize(tip.photo);
    if (!size || Math.max(size.width, size.height) < 1080 || size.width * size.height < 700000) {
      throw new Error(`Visual QC: تصویر اسلاید ${index + 1} در ${pack.id} برای قاب عمودی باکیفیت کافی ندارد.`);
    }
    repeated.set(tip.photo, [...(repeated.get(tip.photo) || []), tip]);
  }
  for (const [photo, uses] of repeated) {
    if (uses.length > 1 && new Set(uses.map((tip) => tip.photoFocus || "")).size < uses.length) {
      throw new Error(`Visual QC: تصویر ${photo} بدون برش/تمرکز متفاوت در چند اسلاید تکرار شده است.`);
    }
  }
}
