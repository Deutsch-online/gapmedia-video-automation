# Daily keyframe economy

Starting at episode 24, the Lina/Oma series generates two source stills, one per
speaker, rather than nine. Each speaker must stay in the same room with the same
one-to-three visible props. Incompatible story plans fail validation before any
GPU submission; the renderer does not silently purchase extra keyframes.

Nine separate five-second audio-conditioned video takes are still generated.
Dialogue, mouth timing, individual motion prompts, seeds, caption design and the
1080x1920, 45-second final format remain unchanged. A source still is copied
locally into each matching shot cache; the speaking take still has its own audio,
motion and seed signature. This is not a repeated-video or still-image fallback.
The complete nine-entry image contact sheet is still sent before video generation.
It now shows the two reusable starting poses, not nine independently generated poses.
Later actions must be compatible with those starting poses and are carried by video motion.

This removes seven image-model submissions on a fresh episode without reducing
image inference steps or selecting a smaller speech-video model. It does **not**
guarantee a full episode under all GPU runtimes. Actual included allowance and the
provider's full per-call maximum plus 30-unit reserve remain mandatory. For a
480-unit video call, admission still requires at least 510 available units.

The renderer archives `economy.json` with planned image/video submission counts.
Real debits remain in `renders/cinematic-series-cache/budgets/*.json`; shared
account usage can affect them. Inspect the first fresh economy episode before
claiming measured savings or guaranteed daily completion.

Episode 23 keeps all signed images, its sent preview and eight completed takes.
Its rejected extra native-size attempt already consumed processing; a future
optimization cannot refund that debit. Only its remaining take should be made
once live included allowance admits it. The existing native-aspect bucket fix
prevents repeating that false rejection.
