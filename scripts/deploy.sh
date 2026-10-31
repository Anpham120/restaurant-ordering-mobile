#!/usr/bin/env bash
# CD: deploy the main branch on this server. Runs in the deploy directory (source + real .env).
# Backs up the DB, builds new images, waits until healthy; on any failure rolls back to the previous images.
# The db service and its volume are never recreated (--no-deps).
set -euo pipefail
export COMPOSE_PROJECT_NAME=restaurant-ordering-system
set -a; . ./.env; set +a
BACKEND=ordering-backend
WEB=ordering-web

SHA=$(git rev-parse --short HEAD)
echo "[deploy] commit $SHA"

# Make sure the database is up (first deploy creates it), then back it up:
# a new version may run Flyway migrations that an image rollback cannot undo.
docker compose up -d --wait db
scripts/backup-db.sh pre-deploy

# Keep the running images under ":previous" so a rollback does not depend on dangling image IDs.
tag_previous() { docker image inspect "$1:latest" >/dev/null 2>&1 && docker tag "$1:latest" "$1:previous"; }
HAVE_PREV=0
if tag_previous "$BACKEND" && tag_previous "$WEB"; then HAVE_PREV=1; fi

healthy() {
  curl -fsS http://127.0.0.1:8084/api/health | grep -q '"UP"' &&
  curl -fsS -o /dev/null http://127.0.0.1:8085/ &&
  curl -fsS http://127.0.0.1:8084/api/menu >/dev/null
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
  echo "[deploy] done: $SHA is live at https://${APP_DOMAIN:-order.atlasplatform12.tech}"
else
  rollback
  exit 1
fi
