import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LESSONS, SEGMENTS, buildTimeline, buildCourseHTML, buildCardHTML, flashcardsTSV, estimateDur, validateLesson, LESSON_MIN, LESSON_MAX } from "./lib/course-lesson.mjs";

for (const [id, lesson] of Object.entries(LESSONS)) {
  assert.deepEqual(validateLesson(lesson), [], `${id} has no problems`);
  const tl = buildTimeline(lesson, estimateDur);
  assert.ok(tl.total >= LESSON_MIN && tl.total <= LESSON_MAX, `${id}: ${tl.total}s`);
  assert.deepEqual(tl.segs.map((s) => s.id), SEGMENTS, "the six parts, in order");
  // nothing overlaps: every spoken item starts after the one before it ended
  let end = 0;
  for (const it of tl.items) { assert.ok(it.t0 >= end - 1e-6, `${id}: ${JSON.stringify(it).slice(0, 50)} starts before the one before ended`); end = it.t1; }
  // a lesson that is too long is refused before a render
  assert.ok(buildTimeline(lesson, (it) => estimateDur(it) * 1.4).total > LESSON_MAX, "a 40 % longer voice passes the limit (the build then refuses it)");
  for (const theme of ["easy", "tiktok", "youtube"]) {
    const html = buildCourseHTML({ lesson, tl, theme });
    assert.match(html, /data-composition-id="main"/); assert.match(html, /window\.__timelines\["main"\]/);
    const own = html.slice(html.indexOf("</script>"));   // after the embedded GSAP library
    assert.doesNotMatch(own, /Math\.random|Date\.now/, "deterministic");
    assert.doesNotMatch(own, /repeat:\s*-1/, "no endless repeat");
  }
  assert.match(buildCardHTML({ lesson }), /Lesson 1/);
  const tsv = flashcardsTSV(lesson).trim().split("\n");
  assert.equal(tsv.length, lesson.cards.length); for (const row of tsv) assert.equal(row.split("\t").length, 2, "front and back");
}
const mood = readFileSync("music/mood.mjs", "utf8"); assert.match(mood, /calm: \{ bpm: \[84, 92\]/);
const wf = readFileSync(".github/workflows/course-lesson.yml", "utf8");
assert.doesNotMatch(wf, /schedule:/, "manual only"); assert.match(wf, /node course-build\.mjs/); assert.match(wf, /group: gapmedia-lesson/);
console.log("course: ok");
