#!/usr/bin/env bash
# Pergunta e-mail/senha e grava usuário no Postgres (via scripts/seed-default-user.js).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -n "${DEPLOYER_SKIP_SEED_USER:-}" ]]; then
  echo "[dev-up] DEPLOYER_SKIP_SEED_USER definido; pulando usuário padrão."
  exit 0
fi

prompt_credentials() {
  local email password password2

  if [[ -n "${DEPLOYER_SEED_EMAIL:-}" && -n "${DEPLOYER_SEED_PASSWORD:-}" ]]; then
    echo "[dev-up] Usando DEPLOYER_SEED_EMAIL / DEPLOYER_SEED_PASSWORD do ambiente."
    return 0
  fi

  echo ""
  echo "[dev-up] Usuário padrão do deployer (login no front)"
  read -r -p "E-mail: " email
  export DEPLOYER_SEED_EMAIL="$email"

  while true; do
    read -r -s -p "Senha (mín. 8 caracteres): " password
    echo ""
    read -r -s -p "Confirmar senha: " password2
    echo ""
    if [[ ${#password} -lt 8 ]]; then
      echo "Senha muito curta. Use pelo menos 8 caracteres." >&2
      continue
    fi
    if [[ "$password" != "$password2" ]]; then
      echo "As senhas não coincidem." >&2
      continue
    fi
    export DEPLOYER_SEED_PASSWORD="$password"
    break
  done
}

prompt_credentials

if ! docker ps --format '{{.Names}}' | grep -qx deployer-postgres; then
  echo "[seed-user] Container deployer-postgres não está rodando." >&2
  exit 1
fi

if [[ ! -d "${ROOT_DIR}/server/node_modules/bcrypt" ]]; then
  echo "[seed-user] Rode pnpm/npm install em server/ antes do seed." >&2
  exit 1
fi

node "${ROOT_DIR}/scripts/seed-default-user.js"
