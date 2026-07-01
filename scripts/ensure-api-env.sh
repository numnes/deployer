#!/usr/bin/env bash
# Create or update api/.env with runtime connection settings.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/api/.env"
EXAMPLE_FILE="${ROOT_DIR}/api/.env.example"

usage() {
  echo "Usage: ensure-api-env.sh --api-port PORT --postgres-port PORT --redis-port PORT --web-port PORT" >&2
  exit 1
}

API_PORT=""
POSTGRES_PORT=""
REDIS_PORT=""
WEB_PORT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-port) API_PORT="$2"; shift 2 ;;
    --postgres-port) POSTGRES_PORT="$2"; shift 2 ;;
    --redis-port) REDIS_PORT="$2"; shift 2 ;;
    --web-port) WEB_PORT="$2"; shift 2 ;;
    --front-port) WEB_PORT="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1" >&2; usage ;;
  esac
done

[[ -n "$API_PORT" && -n "$POSTGRES_PORT" && -n "$REDIS_PORT" && -n "$WEB_PORT" ]] || usage

set_env_var() {
  local key="$1"
  local value="$2"
  local tmp="${ENV_FILE}.tmp.$$"
  touch "$ENV_FILE"
  grep -v "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
}

get_env_var() {
  local key="$1"
  if [[ ! -f "$ENV_FILE" ]]; then
    return 1
  fi
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//' | tr -d '[:space:]'
}

generate_jwt_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$EXAMPLE_FILE" ]]; then
    cp "$EXAMPLE_FILE" "$ENV_FILE"
  else
    touch "$ENV_FILE"
  fi
fi

jwt="$(get_env_var JWT_SECRET || true)"
if [[ -z "$jwt" ]]; then
  jwt="$(generate_jwt_secret)"
fi

work_root="${HOME}/.local/share/deployer"
core_dir="${ROOT_DIR}/core"

set_env_var PORT "$API_PORT"
set_env_var DATABASE_URL "postgresql://postgres:deployer@localhost:${POSTGRES_PORT}/deployer"
set_env_var TYPEORM_SYNC "true"
set_env_var JWT_SECRET "$jwt"
set_env_var REDIS_HOST "127.0.0.1"
set_env_var REDIS_PORT "$REDIS_PORT"
set_env_var DEPLOYER_WORK_ROOT "$work_root"
set_env_var DEPLOYER_CORE_DIR "$core_dir"
set_env_var DEPLOYER_ALLOW_REGISTER "false"
set_env_var CORS_ORIGIN "http://localhost:${WEB_PORT}"

echo "[ensure-env] api/.env updated (API :${API_PORT}, Postgres :${POSTGRES_PORT}, Redis :${REDIS_PORT}, Web :${WEB_PORT})"
