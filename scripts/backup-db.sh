#!/usr/bin/env bash
# Dump the production PostgreSQL to $BACKUP_DIR (gzip), keep the newest $BACKUP_KEEP files.
# Usage (in the deploy directory, next to .env and docker-compose.yml): scripts/backup-db.sh [label]
# Restore: gunzip -c FILE | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
set -euo pipefail
export COMPOSE_PROJECT_NAME=restaurant-ordering-system

LABEL=${1:-manual}
BACKUP_DIR=${BACKUP_DIR:-/home/coder/ordering-backups}
BACKUP_KEEP=${BACKUP_KEEP:-30}
set -a; . ./.env; set +a

if [ -z "$(docker compose ps -q db 2>/dev/null)" ]; then
  echo "[backup] db container not running (first deploy?) - nothing to back up"
  exit 0
fi

mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/ordering-$(date +%Y%m%d-%H%M%S)-$LABEL.sql.gz"
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-ordering}" -d "${POSTGRES_DB:-ordering}" --no-owner | gzip > "$FILE.part"
# an empty or truncated dump must not count as a backup
[ "$(gzip -cd "$FILE.part" | head -c 100 | wc -c)" -gt 0 ] || { rm -f "$FILE.part"; echo "[backup] FAILED: empty dump"; exit 1; }
mv "$FILE.part" "$FILE"
echo "[backup] $FILE ($(du -h "$FILE" | cut -f1))"

ls -1t "$BACKUP_DIR"/ordering-*.sql.gz 2>/dev/null | tail -n +$((BACKUP_KEEP + 1)) | xargs -r rm -f
