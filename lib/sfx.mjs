// Small comedy and game sounds for the EasyDeutsch dialogues (owner, 2026-10-04: "make it
// more fun"). Synthesised with ffmpeg expressions, so they are deterministic and carry no
// third-party licence: a bell for the lesson phrase, a pop for a photo card, a
// "ba-dum-tss" after the joke that closes a scene, clock ticks and a two-note chime for
// the quiz.
import { existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const EXPR = {
  ding: { d: 0.9, e: "0.55*sin(2*PI*1318.5*t)*exp(-5*t)+0.3*sin(2*PI*1975.5*t)*exp(-7*t)" },
  pop: { d: 0.14, e: "0.8*sin(2*PI*(700-2600*t)*t)*exp(-30*t)" },
  rimshot: { d: 1.5, e: "0.9*sin(2*PI*190*t)*exp(-16*t)+0.9*between(t,0.17,9)*sin(2*PI*140*(t-0.17))*exp(-16*(t-0.17))+0.32*between(t,0.4,9)*(2*random(0)-1)*exp(-3.5*(t-0.4))", hp: 300 },
  tick: { d: 0.07, e: "0.7*sin(2*PI*2200*t)*exp(-60*t)" },
  // "dun-dun": the cliffhanger sting, two low notes
  sting: { d: 1.8, e: "0.8*sin(2*PI*110*t)*exp(-3*t)+0.8*between(t,0.4,9)*sin(2*PI*82.4*(t-0.4))*exp(-2.2*(t-0.4))+0.25*between(t,0.4,9)*sin(2*PI*164.8*(t-0.4))*exp(-3*(t-0.4))" },
  tada: { d: 1.2, e: "0.5*sin(2*PI*1046.5*t)*exp(-4*t)+0.5*between(t,0.16,9)*sin(2*PI*1568*(t-0.16))*exp(-3*(t-0.16))+0.25*between(t,0.16,9)*sin(2*PI*2093*(t-0.16))*exp(-4*(t-0.16))" },
};
export const SFX_KINDS = Object.keys(EXPR);

export function sfxFile(kind, dir = "music/sfx") {
  const x = EXPR[kind];
  if (!x) throw new Error(`unknown sound "${kind}"`);
  mkdirSync(dir, { recursive: true });
  const file = `${dir}/easy-${kind}.wav`;
  if (!existsSync(file)) {
    execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", `aevalsrc='${x.e}':s=44100:d=${x.d}`,
      ...(x.hp ? ["-af", `highpass=f=${x.hp}`] : []), "-ac", "2", file], { stdio: "inherit" });
  }
  return file;
}
