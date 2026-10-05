#!/usr/bin/env bash
# QC of every finished video (not the silent intermediates) in a render folder; reports go to qc/<name>/ (committed by the workflow).
# Usage: scripts/qc-renders.sh renders/<series>/<date>
set -uo pipefail
dir="$1"; here="$(cd "$(dirname "$0")" && pwd)"
for f in "$dir"/*.mp4; do
  [ -e "$f" ] || continue
  case "$f" in *silent*|*cards.mp4) continue;; esac
  n="$(basename "$f" .mp4)"
  bash "$here/qc-video.sh" "$f" "qc/$n" "$n" > /dev/null 2>&1 && echo "qc/$n" || echo "qc failed: $n"
done
