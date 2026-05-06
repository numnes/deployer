#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

compose() {
  docker compose -f "${ROOT_DIR}/docker-compose.dev.yml" "$@"
}

echo "[dev-up] Subindo Postgres/Redis/Front no Docker..."
compose up -d --build postgres redis front

echo "[dev-up] Aguardando Postgres ficar saudável..."
for i in $(seq 1 60); do
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' deployer-postgres 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    break
  fi
  sleep 1
done

echo "[dev-up] Construindo API (Nest) e iniciando no PM2..."
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm não encontrado. Instale pnpm (ex.: npm i -g pnpm)." >&2
  exit 1
fi
if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 não encontrado. Instale pm2 (ex.: npm i -g pm2)." >&2
  exit 1
fi

pushd "${ROOT_DIR}/server" >/dev/null
pnpm install
pnpm run build

set -a
if [[ -f ".env" ]]; then
  # shellcheck disable=SC1091
  source ".env"
fi
set +a

pm2 delete deployer-api >/dev/null 2>&1 || true
pm2 start "${ROOT_DIR}/server/dist/main.js" --name deployer-api --time --update-env
popd >/dev/null

echo ""
echo "[dev-up] OK"
echo "  - API:   http://localhost:3000 (PM2: deployer-api)"
echo "  - Front: http://localhost:3001 (Docker: deployer-front)"
echo ""

