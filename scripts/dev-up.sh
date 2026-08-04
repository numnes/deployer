#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/ports.sh
source "${ROOT_DIR}/scripts/lib/ports.sh"
# shellcheck source=lib/public-env.sh
source "${ROOT_DIR}/scripts/lib/public-env.sh"
load_deployer_public_env "$ROOT_DIR"

compose() {
  # Project directory must be the install root (not the caller's cwd).
  docker compose --project-directory "${ROOT_DIR}" -f "${ROOT_DIR}/docker-compose.dev.yml" "$@"
}

# Roda comando em silêncio; em falha imprime o log completo.
run_quiet() {
  local label="$1"
  shift
  local log
  log="$(mktemp "${TMPDIR:-/tmp}/deployer-build.XXXXXX")"
  echo "[dev-up] ${label}"
  if "$@" >"$log" 2>&1; then
    rm -f "$log"
    return 0
  fi
  local ec=$?
  echo "[dev-up] Failed: ${label}" >&2
  echo "[dev-up] Build log:" >&2
  cat "$log" >&2 || true
  rm -f "$log"
  return "$ec"
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

# Fixed ports from deployer.env win over auto-pick (stable nginx → localhost mappings).
POSTGRES_PUBLISH_PORT="$(pick_or_fixed "${DEPLOYER_POSTGRES_PORT:-}" 5432 deployer-postgres 5432 5433 5434 5435 5436 5440 5450)"
REDIS_PUBLISH_PORT="$(pick_or_fixed "${DEPLOYER_REDIS_PORT:-}" 6480 deployer-redis 6379 6380 6381 6382 6481 6482 6483)"
API_PORT="$(pick_or_fixed "${DEPLOYER_API_PORT:-}" 3000 "" "" 3002 3003 3004 3005 3010 3020 3030)"
WEB_PUBLISH_PORT="$(pick_or_fixed "${DEPLOYER_WEB_PORT:-}" 3001 deployer-web 3000 3002 3003 3004 3005 3011 3021 3031)"

for pair in \
  "Postgres:${POSTGRES_PUBLISH_PORT}:5432:${DEPLOYER_POSTGRES_PORT:-}" \
  "Redis:${REDIS_PUBLISH_PORT}:6480:${DEPLOYER_REDIS_PORT:-}" \
  "API:${API_PORT}:3000:${DEPLOYER_API_PORT:-}" \
  "Web:${WEB_PUBLISH_PORT}:3001:${DEPLOYER_WEB_PORT:-}"; do
  IFS=: read -r label port default fixed <<< "$pair"
  if [[ -n "$fixed" ]]; then
    echo "[dev-up] ${label} port fixed at ${port} (deployer.env)"
  elif [[ "$port" != "$default" ]]; then
    echo "[dev-up] Port ${default} in use; ${label} on ${port}"
  fi
done

bash "${ROOT_DIR}/scripts/ensure-api-env.sh" \
  --api-port "$API_PORT" \
  --postgres-port "$POSTGRES_PUBLISH_PORT" \
  --redis-port "$REDIS_PUBLISH_PORT" \
  --web-port "$WEB_PUBLISH_PORT"

export POSTGRES_PUBLISH_PORT REDIS_PUBLISH_PORT WEB_PUBLISH_PORT

if [[ -n "${DEPLOYER_PUBLIC_API_URL:-}" ]]; then
  export NEXT_PUBLIC_API_URL="${DEPLOYER_PUBLIC_API_URL%/}"
else
  export NEXT_PUBLIC_API_URL="http://localhost:${API_PORT}"
fi
if [[ -n "${DEPLOYER_PUBLIC_WEB_BASE_PATH:-}" ]]; then
  export NEXT_PUBLIC_BASE_PATH="${DEPLOYER_PUBLIC_WEB_BASE_PATH}"
else
  export NEXT_PUBLIC_BASE_PATH=""
fi
if [[ -n "${DEPLOYER_VERSION:-}" ]]; then
  export NEXT_PUBLIC_DEPLOYER_VERSION="${DEPLOYER_VERSION}"
else
  export NEXT_PUBLIC_DEPLOYER_VERSION="$(
    git -C "${ROOT_DIR}" describe --tags --always 2>/dev/null || echo "dev"
  )"
fi

echo "[dev-up] Starting Postgres/Redis in Docker..."
compose up -d postgres redis >/dev/null

run_quiet "Rebuilding Deployer web interface..." compose build web
compose up -d web >/dev/null

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

api_build_log="$(mktemp "${TMPDIR:-/tmp}/deployer-api-build.XXXXXX")"
echo "[dev-up] Rebuilding Deployer API..."
if (
  cd "${ROOT_DIR}/api"
  "${PKG_MGR[@]}" install
  "${PKG_MGR[@]}" run build
) >"$api_build_log" 2>&1; then
  rm -f "$api_build_log"
else
  ec=$?
  echo "[dev-up] Failed: Rebuilding Deployer API..." >&2
  echo "[dev-up] Build log:" >&2
  cat "$api_build_log" >&2 || true
  rm -f "$api_build_log"
  exit "$ec"
fi

pushd "${ROOT_DIR}/api" >/dev/null
set -a
# shellcheck disable=SC1091
source ".env"
set +a

"${PM2[@]}" delete deployer-api >/dev/null 2>&1 || true
"${PM2[@]}" start "${ROOT_DIR}/api/dist/main.js" --name deployer-api --time --update-env --cwd "${ROOT_DIR}/api" >/dev/null
popd >/dev/null

echo "[dev-up] Waiting for API (schema sync)..."
for _ in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${API_PORT}/docs" 2>/dev/null || echo 000)"
  if [[ "$code" =~ ^(200|301|302|307|308)$ ]]; then
    break
  fi
  sleep 1
done

echo "[dev-up] Setting up default admin user..."
bash "${ROOT_DIR}/scripts/seed-default-user.sh"

echo ""
echo "[dev-up] OK"
echo "  - API:   http://localhost:${API_PORT} (PM2: deployer-api)"
echo "  - Web:   http://localhost:${WEB_PUBLISH_PORT} (Docker: deployer-web)"
echo "  - Postgres: localhost:${POSTGRES_PUBLISH_PORT}"
echo "  - Redis: localhost:${REDIS_PUBLISH_PORT}"
if [[ -n "${DEPLOYER_PUBLIC_API_URL:-}" || -n "${DEPLOYER_PUBLIC_WEB_URL:-}" ]]; then
  echo "  - Public API URL: ${DEPLOYER_PUBLIC_API_URL:-"(unset)"}"
  echo "  - Public Web / CORS: ${DEPLOYER_PUBLIC_WEB_URL:-"(from api/.env CORS_ORIGIN)"}"
fi
echo ""

api_code="$(wait_for_http "http://localhost:${API_PORT}/docs" "API" || true)"
web_code="$(wait_for_http "http://localhost:${WEB_PUBLISH_PORT}/" "Web" || true)"
echo "[dev-up] Health check: API /docs=${api_code}, Web=${web_code}"

SETUP_KEY="$(grep -E '^DEPLOYER_SETUP_KEY=' "${ROOT_DIR}/api/.env" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '[:space:]')"
if [[ -n "$SETUP_KEY" ]]; then
  masked="${SETUP_KEY:0:6}…${SETUP_KEY: -4}"
  echo ""
  echo "[dev-up] Setup key (root-only) configured in api/.env: ${masked}"
  echo "  Privileged endpoints (register / list users) require this key when the"
  echo "  API is exposed. Send it in the header X-Deployer-Setup-Key. Examples:"
  echo ""
  echo "    KEY=\$(grep '^DEPLOYER_SETUP_KEY=' ${ROOT_DIR}/api/.env | cut -d= -f2-)"
  echo "    # register a user"
  echo "    curl -fsS -X POST http://localhost:${API_PORT}/auth/register \\"
  echo "      -H \"Content-Type: application/json\" \\"
  echo "      -H \"X-Deployer-Setup-Key: \$KEY\" \\"
  echo "      -d '{\"email\":\"admin@example.com\",\"password\":\"change-me-123\"}'"
  echo "    # list users"
  echo "    curl -fsS http://localhost:${API_PORT}/users -H \"X-Deployer-Setup-Key: \$KEY\""
  echo ""
fi

# shellcheck source=lib/github-credentials-hint.sh
source "${ROOT_DIR}/scripts/lib/github-credentials-hint.sh"
print_github_credentials_hint
