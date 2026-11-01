#!/usr/bin/env bash
# Disposable staging: build the stack from this checkout, smoke-test it, then remove everything.
#   scripts/staging-test.sh        build -> test -> tear down (what Jenkins runs for the develop branch)
#   scripts/staging-test.sh keep   same, but leave the stack running for manual testing
#   scripts/staging-test.sh down   tear down a stack left by "keep"
# Nothing is shared with production: own Compose project (ordering-staging) so own empty database volume, own image
# names, own loopback ports (backend 8184, web 8185), and a .env generated here with fresh random secrets on every run.
# No SePay key and no SMTP account, so no real payment or e-mail can happen. Needs docker compose, curl, bash.
set -euo pipefail
cd "$(dirname "$0")/.."

MODE=${1:-}
PROJECT=ordering-staging
API=http://127.0.0.1:8184
WEB=http://127.0.0.1:8185

teardown() {
  # dummy values only satisfy the required ${VAR:?} checks while compose parses the file
  COMPOSE_PROJECT_NAME=$PROJECT POSTGRES_PASSWORD=x APP_JWT_SECRET=x APP_ADMIN_PHONE=x APP_ADMIN_PASSWORD=x APP_DOMAIN=x \
    docker compose down -v --remove-orphans >/dev/null 2>&1 || true
  docker rmi "$PROJECT-backend:latest" "$PROJECT-web:latest" >/dev/null 2>&1 || true
  docker image prune -f >/dev/null 2>&1 || true                        # dangling layers left by the build
  docker builder prune -f --filter until=72h >/dev/null 2>&1 || true   # build cache unused for 3 days
  rm -f .env
  echo "[staging] removed containers, volume, images, old build cache and .env"
}

if [ "$MODE" = down ]; then teardown; exit 0; fi
[ "$MODE" = keep ] || trap teardown EXIT

rand() { head -c 256 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c "$1"; }

# a previous aborted run must not leave an old database behind
teardown >/dev/null
(
  umask 077
  cat > .env <<EOF
COMPOSE_PROJECT_NAME=$PROJECT
IMAGE_PREFIX=$PROJECT
# no public domain; set anyway: compose v2.33 requires APP_DOMAIN even when APP_WEB_URL is given
APP_DOMAIN=localhost
BACKEND_PORT=8184
WEB_PORT=8185
APP_WEB_URL=$WEB
APP_API_URL=$API
POSTGRES_DB=staging
POSTGRES_USER=staging
POSTGRES_PASSWORD=$(rand 24)
APP_JWT_SECRET=$(rand 64)
APP_ADMIN_PHONE=0900000000
APP_ADMIN_PASSWORD=$(rand 16)
APP_SEED_DEMO=true
EOF
)

echo "[staging] building and starting $PROJECT"
docker compose up -d --build --wait

FAILED=0
check() {   # check "name" command...
  local name=$1; shift
  if "$@" >/dev/null 2>&1; then echo "  ok    $name"; else echo "  FAIL  $name"; FAILED=$((FAILED + 1)); fi
}
status_is() { [ "$(curl -s -o /dev/null -w '%{http_code}' "${@:2}")" = "$1" ]; }
body_has() { curl -fsS "${@:2}" | grep -q "$1"; }
token_of() { sed -n 's/.*"token":"\([^"]*\)".*/\1/p'; }
# the first manager comes from APP_ADMIN_PHONE / APP_ADMIN_PASSWORD (no demo accounts when a manager is configured)
ADMIN_PASSWORD=$(sed -n 's/^APP_ADMIN_PASSWORD=//p' .env)
login() {   # login PHONE PASSWORD -> token
  curl -fsS -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
    -d "{\"login\":\"$1\",\"password\":\"$2\"}" | token_of
}
register() {   # register a customer -> token
  curl -fsS -X POST "$API/api/auth/register" -H 'Content-Type: application/json' \
    -d '{"fullName":"Khach Staging","phone":"0911000111","password":"Staging#12345"}' | token_of
}

echo "[staging] smoke tests"
check "api health is UP"                 body_has '"UP"' "$API/api/health"
check "web app is served"                status_is 200 "$WEB/"
check "menu has dishes"                  body_has '"name"' "$API/api/menu"
check "store settings"                   body_has 'storeName' "$API/api/store"
check "promotions"                       status_is 200 "$API/api/promotions"
check "delivery quote near the store"    body_has '"deliverable":true' "$API/api/delivery/quote?lat=20.99&lng=105.78"
check "delivery quote far away refused"  body_has '"deliverable":false' "$API/api/delivery/quote?lat=10.77&lng=106.70"
check "cart needs a token (401)"         status_is 401 "$API/api/me/cart"
MANAGER=$(login 0900000000 "$ADMIN_PASSWORD" || true)
CUSTOMER=$(register || true)
check "manager can log in"               test -n "$MANAGER"
check "customer can register"            test -n "$CUSTOMER"
check "customer can log in again"        test -n "$(login 0911000111 'Staging#12345' || true)"
check "wrong password is refused (401)"  status_is 401 -X POST "$API/api/auth/login" -H 'Content-Type: application/json' -d '{"login":"0900000000","password":"wrong-password"}'
check "manager opens the dashboard"      status_is 200 "$API/api/admin/dashboard" -H "Authorization: Bearer $MANAGER"
check "customer opens own cart"          status_is 200 "$API/api/me/cart" -H "Authorization: Bearer $CUSTOMER"
check "customer blocked from admin (403)" status_is 403 "$API/api/admin/dashboard" -H "Authorization: Bearer $CUSTOMER"

if [ "$FAILED" -gt 0 ]; then
  echo "[staging] $FAILED check(s) FAILED"
  docker compose logs --tail=60 backend || true
  exit 1
fi
echo "[staging] all checks passed"
if [ "$MODE" = keep ]; then
  echo "[staging] left running: web $WEB  api $API"
  echo "[staging] manager 0900000000, password in ./.env (APP_ADMIN_PASSWORD); register customers in the app"
  echo "[staging] tear down with: scripts/staging-test.sh down"
fi
