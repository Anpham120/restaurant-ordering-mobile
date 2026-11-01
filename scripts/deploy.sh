#!/usr/bin/env bash
# CD: deploy a stack on this server (main -> production, develop -> staging; the stack is chosen by the values in .env,
# see docker-compose.yml). Runs in the deploy directory (source + real .env).
# Backs up the DB, builds new images, waits until healthy; on any failure rolls back to the previous images.
# The db service and its volume are never recreated (--no-deps).
set -euo pipefail
set -a; . ./.env; set +a
export COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-restaurant-ordering-system}
BACKEND=${IMAGE_PREFIX:-ordering}-backend
WEB=${IMAGE_PREFIX:-ordering}-web
BACKEND_PORT=${BACKEND_PORT:-8084}
WEB_PORT=${WEB_PORT:-8085}
WEB_URL=${APP_WEB_URL:-https://${APP_DOMAIN:-order.atlasplatform12.tech}}

SHA=$(git rev-parse --short HEAD)
echo "[deploy] commit $SHA -> $COMPOSE_PROJECT_NAME"

# Make sure the database is up (first deploy creates it), then back it up:
# a new version may run Flyway migrations that an image rollback cannot undo.
docker compose up -d --wait db
# (BACKUP_ENABLED=false skips it for a disposable stack)
[ "${BACKUP_ENABLED:-true}" = true ] && scripts/backup-db.sh pre-deploy

# Keep the running images under ":previous" so a rollback does not depend on dangling image IDs.
tag_previous() { docker image inspect "$1:latest" >/dev/null 2>&1 && docker tag "$1:latest" "$1:previous"; }
HAVE_PREV=0
if tag_previous "$BACKEND" && tag_previous "$WEB"; then HAVE_PREV=1; fi

healthy() {
  curl -fsS http://127.0.0.1:$BACKEND_PORT/api/health | grep -q '"UP"' &&
  curl -fsS -o /dev/null http://127.0.0.1:$WEB_PORT/ &&
  curl -fsS http://127.0.0.1:$BACKEND_PORT/api/menu >/dev/null
}
check() {
  for _ in $(seq 1 24); do healthy && return 0; sleep 5; done
  return 1
}
rollback() {
  echo "[deploy] FAILED - rolling back to the previous images"
  docker compose logs --tail=80 backend || true
  if [ "$HAVE_PREV" = 1 ]; then
    docker tag "$BACKEND:previous" "$BACKEND:latest"
    docker tag "$WEB:previous" "$WEB:latest"
    docker compose up -d --no-deps --no-build --wait backend web || echo "[deploy] rollback failed too - check manually"
  else
    echo "[deploy] no previous images (first deploy) - nothing to roll back to"
  fi
}

if docker compose up -d --no-deps --build --wait backend web && check; then
  docker rmi "$BACKEND:previous" "$WEB:previous" >/dev/null 2>&1 || true
  docker image prune -f >/dev/null
  echo "[deploy] done: $SHA is live at $WEB_URL"
else
  rollback
  exit 1
fi
