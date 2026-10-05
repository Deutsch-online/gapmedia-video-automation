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
  // everyday noises for the comedy episodes
  vacuum: { d: 2.6, e: "0.5*(2*random(0)-1)*(0.75+0.25*sin(2*PI*5*t))*min(1,t*6)*min(1,(2.6-t)*4)", lp: 1600, hp: 120 },
  ring: { d: 1.8, e: "0.5*(sin(2*PI*880*t)+0.6*sin(2*PI*1320*t))*between(mod(t,0.45),0,0.18)", hp: 300 },
  drill: { d: 1.7, e: "0.6*sin(2*PI*150*t)*(0.65+0.35*sin(2*PI*45*t))+0.18*(2*random(0)-1)*min(1,t*8)*min(1,(1.7-t)*6)", hp: 120, lp: 3500 },
  // a rubber stamp on paper: a dull thud and a short slap
  stamp: { d: 0.45, e: "0.9*sin(2*PI*80*t)*exp(-24*t)+0.6*(2*random(0)-1)*exp(-70*t)", hp: 50, lp: 2800 },
  // cartoon sounds for the punchlines (owner, 2026-10-04: the music and sounds were not comic)
  womp: { d: 1.5, e: "0.22*between(t,0,0.4)*(sin(2*PI*233*t)+0.5*sin(2*(2*PI*233*t))+0.33*sin(3*(2*PI*233*t))+0.22*sin(4*(2*PI*233*t)))*min(1,t*40)*min(1,(0.4-t)*25)+0.22*between(t,0.45,1.45)*(sin(2*PI*(220*(t-0.45)-38*(t-0.45)*(t-0.45)+0.7*sin(2*PI*6*(t-0.45))))+0.5*sin(2*(2*PI*(220*(t-0.45)-38*(t-0.45)*(t-0.45)+0.7*sin(2*PI*6*(t-0.45)))))+0.33*sin(3*(2*PI*(220*(t-0.45)-38*(t-0.45)*(t-0.45)+0.7*sin(2*PI*6*(t-0.45)))))+0.22*sin(4*(2*PI*(220*(t-0.45)-38*(t-0.45)*(t-0.45)+0.7*sin(2*PI*6*(t-0.45))))))*min(1,(t-0.45)*40)*min(1,(1.45-t)*8)", lp: 2200, hp: 90 },
  slidewhistle: { d: 0.6, e: "0.5*sin(2*PI*(500*t+1500*t*t))*min(1,t*30)*min(1,(0.58-t)*20)", hp: 300 },
  boing: { d: 0.9, e: "0.6*sin(2*PI*(300*t+22*sin(2*PI*7*t)))*exp(-3.5*t)", hp: 120 },
  bonk: { d: 0.4, e: "0.9*sin(2*PI*(330*t-250*t*t))*exp(-16*t)+0.4*(2*random(0)-1)*exp(-80*t)", hp: 80, lp: 3000 },
  // kitchen sounds for «Ich koche» (owner, 2026-10-05): each one runs ~5 s under the action of its scene
  water: { d: 4.9, e: "0.32*(2*random(0)-1)*(0.8+0.2*sin(2*PI*9*t))*min(1,t*4)*min(1,(4.9-t)*4)", hp: 500, lp: 5200 },
  chop: { d: 4.9, e: "(0.9*sin(2*PI*140*mod(t+0.31,0.62))*exp(-35*mod(t+0.31,0.62))+0.55*(2*random(0)-1)*exp(-110*mod(t+0.31,0.62)))*min(1,(4.9-t)*6)", hp: 60, lp: 4200 },
  peel: { d: 4.9, e: "0.4*(2*random(0)-1)*between(mod(t,0.91),0.08,0.7)*sin(PI*(mod(t,0.91)-0.08)/0.62)*min(1,(4.9-t)*6)", hp: 1400, lp: 6500 },
  sizzle: { d: 6.2, e: "0.3*(2*random(0)-1)*(0.55+0.45*random(1))*min(1,t*5)*min(1,(6.2-t)*3)", hp: 2800 },
  stir: { d: 4.9, e: "0.28*(2*random(0)-1)*(0.45+0.55*abs(sin(2*PI*0.9*t)))*min(1,t*6)*min(1,(4.9-t)*6)", hp: 700, lp: 3600 },
  boil: { d: 6.2, e: "0.34*(2*random(0)-1)*(0.5+0.5*abs(sin(2*PI*5.5*t)))*min(1,t*4)*min(1,(6.2-t)*3)", hp: 90, lp: 900 },
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
      ...(x.hp || x.lp ? ["-af", [x.hp ? `highpass=f=${x.hp}` : "", x.lp ? `lowpass=f=${x.lp}` : ""].filter(Boolean).join(",")] : []), "-ac", "2", file], { stdio: "inherit" });
  }
  return file;
}
