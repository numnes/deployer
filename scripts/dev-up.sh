#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

compose() {
  docker compose -f "${ROOT_DIR}/docker-compose.dev.yml" "$@"
}

port_in_use() {
  local port="$1"
  ss -tuln 2>/dev/null | grep -q ":${port} "
}

pick_redis_port() {
  local preferred="${1:-6480}"
  local existing
  existing="$(docker port deployer-redis 6379/tcp 2>/dev/null | head -1 | sed 's/.*://')"
  if [[ -n "$existing" ]]; then
    echo "$existing"
    return
  fi
  if ! port_in_use "$preferred"; then
    echo "$preferred"
    return
  fi
  for port in 6380 6381 6382 6481 6482; do
    if ! port_in_use "$port"; then
      echo "$port"
      return
    fi
  done
  echo "No free port for Redis (try freeing 6480 or 6380)." >&2
  exit 1
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

REDIS_PUBLISH_PORT="$(pick_redis_port "${REDIS_PUBLISH_PORT:-6480}")"
export REDIS_PUBLISH_PORT
if docker ps --format '{{.Names}}' | grep -qx deployer-redis; then
  echo "[dev-up] Deployer Redis on localhost:${REDIS_PUBLISH_PORT}"
elif [[ "$REDIS_PUBLISH_PORT" != "6480" ]]; then
  echo "[dev-up] Port 6480 in use; Redis published on ${REDIS_PUBLISH_PORT}"
fi

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
if [[ -f ".env" ]]; then
  # shellcheck disable=SC1091
  source ".env"
fi
export REDIS_HOST="${REDIS_HOST:-localhost}"
export REDIS_PORT="${REDIS_PUBLISH_PORT}"
set +a

"${PM2[@]}" delete deployer-api >/dev/null 2>&1 || true
"${PM2[@]}" start "${ROOT_DIR}/server/dist/main.js" --name deployer-api --time --update-env --cwd "${ROOT_DIR}/server"
popd >/dev/null

echo ""
echo "[dev-up] OK"
echo "  - API:   http://localhost:${PORT:-3000} (PM2: deployer-api)"
echo "  - Front: http://localhost:3001 (Docker: deployer-front)"
echo "  - Redis: localhost:${REDIS_PUBLISH_PORT}"
echo ""

api_code="$(wait_for_http "http://localhost:${PORT:-3000}/docs" "API" || true)"
front_code="$(wait_for_http "http://localhost:3001/" "Front" || true)"
echo "[dev-up] Health check: API /docs=${api_code}, Front=${front_code}"
