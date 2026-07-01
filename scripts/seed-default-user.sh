#!/usr/bin/env bash
# Prompts for email/password and writes admin user to Postgres (via scripts/seed-default-user.js).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -n "${DEPLOYER_SKIP_SEED_USER:-}" ]]; then
  echo "[dev-up] DEPLOYER_SKIP_SEED_USER set; skipping default user."
  exit 0
fi

prompt_credentials() {
  local email password password2

  if [[ -n "${DEPLOYER_SEED_EMAIL:-}" && -n "${DEPLOYER_SEED_PASSWORD:-}" ]]; then
    echo "[dev-up] Using DEPLOYER_SEED_EMAIL / DEPLOYER_SEED_PASSWORD from environment."
    return 0
  fi

  echo ""
  echo "[dev-up] Default deployer user (dashboard login)"
  read -r -p "Email: " email
  export DEPLOYER_SEED_EMAIL="$email"

  while true; do
    read -r -s -p "Password (min. 8 characters): " password
    echo ""
    read -r -s -p "Confirm password: " password2
    echo ""
    if [[ ${#password} -lt 8 ]]; then
      echo "Password too short. Use at least 8 characters." >&2
      continue
    fi
    if [[ "$password" != "$password2" ]]; then
      echo "Passwords do not match." >&2
      continue
    fi
    export DEPLOYER_SEED_PASSWORD="$password"
    break
  done
}

prompt_credentials

if ! docker ps --format '{{.Names}}' | grep -qx deployer-postgres; then
  echo "[seed-user] Container deployer-postgres is not running." >&2
  exit 1
fi

if [[ ! -d "${ROOT_DIR}/api/node_modules/bcrypt" ]]; then
  echo "[seed-user] Run pnpm/npm install in api/ before seeding." >&2
  exit 1
fi

node "${ROOT_DIR}/scripts/seed-default-user.js"
