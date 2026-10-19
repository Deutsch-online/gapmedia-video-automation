#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
wan_root="${WAN2GP_ROOT:-$project_root/.tools/Wan2GP}"
revision=fdc63bdf89358fb13c93cf6b38693fd89a859f00
command -v uv >/dev/null || { echo 'Install uv before running this setup.' >&2; exit 2; }
export UV_CACHE_DIR="${UV_CACHE_DIR:-$project_root/.cache/wan2gp-uv}"
export UV_PYTHON_INSTALL_DIR="${UV_PYTHON_INSTALL_DIR:-$project_root/.tools/python}"
if [[ ! -d "$wan_root" ]]; then
  git clone https://github.com/deepbeepmeep/Wan2GP.git "$wan_root"
fi
remote="$(git -C "$wan_root" remote get-url origin)"
[[ "$remote" == https://github.com/deepbeepmeep/Wan2GP.git ]] || { echo 'Unexpected Wan2GP origin' >&2; exit 2; }
git -C "$wan_root" checkout "$revision"
if [[ ! -x "$wan_root/.venv/bin/python" ]]; then
  uv venv --python 3.11 --managed-python "$wan_root/.venv"
fi
uv pip install --python "$wan_root/.venv/bin/python" torch==2.10.0 torchvision==0.25.0 torchaudio==2.10.0 --index-url https://download.pytorch.org/whl/cu130
uv pip install --python "$wan_root/.venv/bin/python" -r "$wan_root/requirements.txt" pip
"$wan_root/.venv/bin/python" -m pip check
"$wan_root/.venv/bin/python" -c 'import torch, gradio, diffusers, transformers, decord; print("WanGP dependencies imported; CUDA available:", torch.cuda.is_available())'
echo "WanGP installed at $wan_root. Model weights are downloaded on the GPU host at first generation."
echo "Run $wan_root/.venv/bin/python $project_root/ai-cast/wan2gp_worker.py --root $wan_root --check"
