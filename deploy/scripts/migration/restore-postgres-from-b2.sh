#!/usr/bin/env bash
# Restore latest (or named) B2 dump into CafeDuo postgres container.
set -euo pipefail

DUMP_NAME="${1:-}"
WORKDIR="${WORKDIR:-/tmp}"

if [[ -z "$DUMP_NAME" ]]; then
  DUMP_NAME=$(rclone lsf b2-cafeduo:cafeduo-backups/daily/ | sort | tail -1)
fi

if [[ -z "$DUMP_NAME" ]]; then
  echo "no dump found in B2" >&2
  exit 1
fi

echo "using dump: $DUMP_NAME"
rclone copy "b2-cafeduo:cafeduo-backups/daily/${DUMP_NAME}" "$WORKDIR/"

PG=$(docker ps --format '{{.Names}}' | grep cafeduo-proje | grep postgres | head -1)
if [[ -z "$PG" ]]; then
  echo "cafeduo postgres container not found" >&2
  exit 1
fi

DB_USER=$(docker exec "$PG" printenv POSTGRES_USER)
DB_NAME=$(docker exec "$PG" printenv POSTGRES_DB)

docker cp "${WORKDIR}/${DUMP_NAME}" "${PG}:/tmp/dump"
docker exec "$PG" pg_restore --clean --if-exists -U "$DB_USER" -d "$DB_NAME" /tmp/dump
docker exec "$PG" rm -f /tmp/dump
rm -f "${WORKDIR}/${DUMP_NAME}"

docker exec "$PG" psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM cafes) AS cafes, (SELECT count(*) FROM games) AS games;"

echo "restore complete — restart api container if needed"
