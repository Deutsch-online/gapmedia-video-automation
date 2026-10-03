// The people in the 3D lesson stage, fetched at build time and never committed.
//
// Owner, 2026-09-28: the lesson characters must look and move like real people.
// The models and the motion-capture clips come from public sources whose terms
// allow use but not redistribution, so they are downloaded into public/3d/
// (git-ignored) on every build instead of living in the repository:
//
//   Xbot.glb           three.js examples (Mixamo rig + mocap: walk, idle, agree, headShake)
//   avaturn.glb        met4citizen/TalkingHead — the woman (non-commercial use)
//   readyplayer.me.glb three.js examples — the man, a Ready Player Me avatar
//   brunette.glb       met4citizen/TalkingHead — Lena in the dialogue lessons, created
//                      at Ready Player Me (CC BY-NC 4.0: non-commercial use)
//   anim/fem|masc/*.glb readyplayerme/animation-library — mocap made for the Ready
//                      Player Me armatures (feminine / masculine), used only on the
//                      two Ready Player Me avatars (its licence)
//
// The channel has no income (owner, 2026-09-28); if that changes, the woman
// must be replaced with a model licensed for commercial use.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

export const ASSET_DIR = "public/3d/models";
const RAW = "https://raw.githubusercontent.com";
export const MODELS = {
  "Xbot.glb": `${RAW}/mrdoob/three.js/r181/examples/models/gltf/Xbot.glb`,
  "readyplayer.me.glb": `${RAW}/mrdoob/three.js/r181/examples/models/gltf/readyplayer.me.glb`,
  "avaturn.glb": `${RAW}/met4citizen/TalkingHead/main/avatars/avaturn.glb`,
  "brunette.glb": `${RAW}/met4citizen/TalkingHead/main/avatars/brunette.glb`,
};
// the masculine and feminine copies of each clip have the same file name: kept apart
const talk = (g, p) => [1, 2, 3, 4, 5, 6].map((i) => `${g}/glb/expression/${p}_Talking_Variations_00${i}.glb`);
export const CLIPS = [
  "masculine/glb/idle/M_Standing_Idle_001.glb",
  "masculine/glb/expression/M_Standing_Expressions_011.glb",   // hand on the chest, a slight bow
  ...talk("masculine", "M"),
  "feminine/glb/idle/F_Standing_Idle_001.glb",
  ...talk("feminine", "F"),
];
const local = (c) => join(c.startsWith("feminine/") ? "fem" : "masc", c.split("/").pop());

const ok = (f) => existsSync(f) && statSync(f).size > 10_000;

export function ensure3DAssets({ dir = ASSET_DIR, log = console.error } = {}) {
  mkdirSync(join(dir, "anim", "fem"), { recursive: true }); mkdirSync(join(dir, "anim", "masc"), { recursive: true });
  for (const [name, url] of Object.entries(MODELS)) {
    const out = join(dir, name);
    if (ok(out)) continue;
    log(`   ↓ 3D model ${name}`);
    execFileSync("curl", ["-sSfL", "--retry", "4", "--retry-delay", "3", "-o", out, url], { stdio: "inherit" });
  }
  const clips = CLIPS;
  if (clips.every((c) => ok(join(dir, "anim", local(c))))) return dir;
  const tmp = join(dir, ".rpm-lib");
  rmSync(tmp, { recursive: true, force: true });
  log("   ↓ 3D mocap clips (Ready Player Me animation library)");
  const git = (...a) => execFileSync("git", a, { stdio: "inherit" });
  git("clone", "-q", "--filter=blob:none", "--no-checkout", "--depth", "1", "https://github.com/readyplayerme/animation-library", tmp);
  git("-C", tmp, "sparse-checkout", "set", "--no-cone", ...clips);
  git("-C", tmp, "checkout", "-q", "HEAD");
  for (const c of clips) copyFileSync(join(tmp, c), join(dir, "anim", local(c)));
  rmSync(tmp, { recursive: true, force: true });
  return dir;
}

if (import.meta.url === `file://${process.argv[1]}`) ensure3DAssets();
