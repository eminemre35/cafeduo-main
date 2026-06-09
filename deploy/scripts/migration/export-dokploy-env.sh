#!/usr/bin/env bash
# Export CafeDuo Dokploy compose env to B2 (run on old or new VDS as root).
set -euo pipefail

APP_NAME="${CAFEDUO_COMPOSE_APP:-cafeduo-proje-3qsnfh}"
PG=$(docker ps --format '{{.Names}}' | grep dokploy-postgres | head -1)
TS=$(date -u +%Y%m%d-%H%M%S)
FILE="/tmp/cafeduo-dokploy-env-${TS}.txt"

if [[ -z "$PG" ]]; then
  echo "dokploy-postgres container not found" >&2
  exit 1
fi

docker exec "$PG" psql -U dokploy -d dokploy -At \
  -c "SELECT env FROM compose WHERE \"appName\" = '${APP_NAME}';" > "$FILE"

BYTES=$(wc -c < "$FILE" | tr -d ' ')
echo "exported ${BYTES} bytes -> ${FILE}"

if [[ "$BYTES" -lt 10 ]]; then
  echo "env export looks empty — check appName=${APP_NAME}" >&2
  exit 1
fi

rclone copy "$FILE" b2-cafeduo:cafeduo-backups/dokploy-env/
rm -f "$FILE"
echo "uploaded to b2-cafeduo:cafeduo-backups/dokploy-env/cafeduo-dokploy-env-${TS}.txt"
