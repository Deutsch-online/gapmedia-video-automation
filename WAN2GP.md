# WanGP speaking-video backend

This project integrates **WanGP / Wan2GP**, by DeepBeepMeep:
https://github.com/deepbeepmeep/Wan2GP

Pinned revision: `fdc63bdf89358fb13c93cf6b38693fd89a859f00`.
Model: `longcat_avatar_v1_5` (audio-driven, single speaker).
Preserve upstream license and attribution; see Wan2GP's `LICENSE.txt`.

## Installation

Use a Linux NVIDIA GPU host with a driver compatible with PyTorch 2.10 / CUDA 13.
Install `uv`, git and ffmpeg, then run:

```bash
bash scripts/setup-wan2gp.sh
```

The installer creates an isolated Python 3.11 environment, installs the upstream
requirements and pins the source revision. Set `WAN2GP_ROOT` before installation
to choose a different checkout directory. Model weights are separate and download
at first generation; storage and memory requirements depend on the model.

## Use from the existing series pipeline

```bash
export WAN2GP_ROOT=/absolute/path/to/Wan2GP
export WAN2GP_PYTHON="$WAN2GP_ROOT/.venv/bin/python"
"$WAN2GP_PYTHON" ai-cast/wan2gp_worker.py --root "$WAN2GP_ROOT" --check
export CINEMATIC_SPEECH_BACKEND=wan2gp
python ai-cast/cinematic-series.py run
```

The media environment still needs its normal dependencies and configured private
Telegram delivery credentials. WanGP runs in a separate subprocess with its own
Python and dependencies. The worker passes the exact aligned five-second, mono,
48 kHz final-mix WAV plus the scene-specific single-speaker image to the model.
The normal duration, subtitle, pause-only music and private delivery checks remain
in force. Cache identities include the backend, model and pinned WanGP revision.
A failed local render does not silently fall back to a remote provider.

Without `CINEMATIC_SPEECH_BACKEND=wan2gp`, the existing Gradio backend remains
selected. The hosted GitHub runner has not been changed to pretend it has a GPU.
WanGP provides software, not GPU capacity, cloud credits or a quota bypass.

## Validation in the current workspace

Checkout: `/workspace/Wan2GP`; Python: `/workspace/Wan2GP/.venv/bin/python`.
PyTorch 2.10.0+cu130 and the upstream requirements installed. Torch, Gradio,
Diffusers and Transformers imports succeeded. The adapter's five unit tests
passed. CUDA availability is **false**: actual model generation, model downloads,
speed, output quality and lip synchronization have not been validated here.

`uv pip check` additionally flags the upstream decord 0.6.0 wheel's legacy cp36
platform metadata; its Python 3.11 import succeeds. This is recorded rather than
altering third-party wheel metadata or claiming a clean GPU runtime.
