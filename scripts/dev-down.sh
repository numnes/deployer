#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[dev-down] Stopping API in PM2..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete deployer-api >/dev/null 2>&1 || true
else
  npx --yes pm2 delete deployer-api >/dev/null 2>&1 || true
fi

echo "[dev-down] Stopping containers..."
docker compose -f "${ROOT_DIR}/docker-compose.dev.yml" down

echo "[dev-down] OK"
