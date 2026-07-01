#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/ports.sh
source "${ROOT_DIR}/scripts/lib/ports.sh"

compose() {
  docker compose -f "${ROOT_DIR}/docker-compose.dev.yml" "$@"
}

wait_for_http() {
  local url="$1"
  local label="$2"
  for _ in $(seq 1 30); do
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || echo 000)"
    if [[ "$code" =~ ^(200|301|302|307|308)$ ]]; then
      echo "$code"
      return 0
    fi
    sleep 1
  done
  echo "000"
  echo "[dev-up] Warning: ${label} did not respond in time (${url})." >&2
  return 1
}

stop_api_for_port_scan() {
  if command -v pm2 >/dev/null 2>&1; then
    pm2 delete deployer-api >/dev/null 2>&1 || true
  else
    npx --yes pm2 delete deployer-api >/dev/null 2>&1 || true
  fi
}

echo "[dev-up] Resolving ports..."
stop_api_for_port_scan

POSTGRES_PUBLISH_PORT="$(pick_port 5432 deployer-postgres 5432 5433 5434 5435 5436 5440 5450)"
REDIS_PUBLISH_PORT="$(pick_port 6480 deployer-redis 6379 6380 6381 6382 6481 6482 6483)"
API_PORT="$(pick_port 3000 "" "" 3002 3003 3004 3005 3010 3020 3030)"
FRONT_PUBLISH_PORT="$(pick_port 3001 deployer-front 3000 3002 3003 3004 3005 3011 3021 3031)"

for pair in \
  "Postgres:${POSTGRES_PUBLISH_PORT}:5432" \
  "Redis:${REDIS_PUBLISH_PORT}:6480" \
  "API:${API_PORT}:3000" \
  "Front:${FRONT_PUBLISH_PORT}:3001"; do
  IFS=: read -r label port default <<< "$pair"
  if [[ "$port" != "$default" ]]; then
    echo "[dev-up] Port ${default} in use; ${label} on ${port}"
  fi
done

bash "${ROOT_DIR}/scripts/ensure-server-env.sh" \
  --api-port "$API_PORT" \
  --postgres-port "$POSTGRES_PUBLISH_PORT" \
  --redis-port "$REDIS_PUBLISH_PORT" \
  --front-port "$FRONT_PUBLISH_PORT"

export POSTGRES_PUBLISH_PORT REDIS_PUBLISH_PORT FRONT_PUBLISH_PORT
export NEXT_PUBLIC_API_URL="http://localhost:${API_PORT}"

echo "[dev-up] Starting Postgres/Redis/Front in Docker..."
compose up -d --build postgres redis front

echo "[dev-up] Waiting for Postgres to become healthy..."
postgres_ok=false
for _ in $(seq 1 60); do
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' deployer-postgres 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    postgres_ok=true
    break
  fi
  sleep 1
done
if [[ "$postgres_ok" != "true" ]]; then
  echo "[dev-up] Postgres did not become healthy in time." >&2
  compose ps
  exit 1
fi

echo "[dev-up] Building API (Nest) and starting with PM2..."
if command -v pnpm >/dev/null 2>&1; then
  PKG_MGR=(pnpm)
else
  PKG_MGR=(npx --yes pnpm@10)
fi

if command -v pm2 >/dev/null 2>&1; then
  PM2=(pm2)
else
  PM2=(npx --yes pm2)
fi

pushd "${ROOT_DIR}/server" >/dev/null
"${PKG_MGR[@]}" install
"${PKG_MGR[@]}" run build
popd >/dev/null

echo "[dev-up] Setting up default admin user..."
bash "${ROOT_DIR}/scripts/seed-default-user.sh"

pushd "${ROOT_DIR}/server" >/dev/null
set -a
# shellcheck disable=SC1091
source ".env"
set +a

"${PM2[@]}" delete deployer-api >/dev/null 2>&1 || true
"${PM2[@]}" start "${ROOT_DIR}/server/dist/main.js" --name deployer-api --time --update-env --cwd "${ROOT_DIR}/server"
popd >/dev/null

echo ""
echo "[dev-up] OK"
echo "  - API:   http://localhost:${API_PORT} (PM2: deployer-api)"
echo "  - Front: http://localhost:${FRONT_PUBLISH_PORT} (Docker: deployer-front)"
echo "  - Postgres: localhost:${POSTGRES_PUBLISH_PORT}"
echo "  - Redis: localhost:${REDIS_PUBLISH_PORT}"
echo ""

api_code="$(wait_for_http "http://localhost:${API_PORT}/docs" "API" || true)"
front_code="$(wait_for_http "http://localhost:${FRONT_PUBLISH_PORT}/" "Front" || true)"
echo "[dev-up] Health check: API /docs=${api_code}, Front=${front_code}"
