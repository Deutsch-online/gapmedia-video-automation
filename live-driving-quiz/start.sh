#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null; then
  echo 'Install Node.js 20 or newer from https://nodejs.org first.'
  exit 1
fi
if [[ ! -d node_modules ]]; then
  npm ci --ignore-scripts --no-audit --no-fund
fi
node bank-media.mjs
exec node server.mjs
