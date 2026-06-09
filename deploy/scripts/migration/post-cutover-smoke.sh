#!/usr/bin/env bash
# Faz 7: smoke checks after DNS cutover (run from dev machine or new VDS).
set -euo pipefail

BASE="${SMOKE_BASE_URL:-https://cafeduotr.com}"

echo "=== DNS ==="
dig +short cafeduotr.com || true

echo "=== HTTP ==="
curl -fsS "${BASE}/health" | head -c 200; echo
curl -fsS "${BASE}/api/meta/version" | head -c 200; echo
curl -fsS "${BASE}/api/health" | head -c 200; echo

echo "=== npm smoke (if repo available) ==="
if [[ -f package.json ]]; then
  SMOKE_BASE_URL="$BASE" node scripts/smoke/prod-smoke.mjs
fi

echo "Manual checklist: login, check-in, game, admin kafe ekle, socket.io"
