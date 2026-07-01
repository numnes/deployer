#!/usr/bin/env bash
# Refresh deployer CLI symlink and script permissions after git pull or install.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${DEPLOYER_BIN_DIR:-${HOME}/.local/bin}"
CONFIG_DIR="${HOME}/.config/deployer"

log() { echo "[sync-cli] $*"; }

mkdir -p "$BIN_DIR" "$CONFIG_DIR"

chmod +x "${ROOT_DIR}/bin/deployer"
chmod +x "${ROOT_DIR}/scripts/"*.sh 2>/dev/null || true
chmod +x "${ROOT_DIR}/scripts/lib/"*.sh 2>/dev/null || true

LINK="${BIN_DIR}/deployer"
ln -sf "${ROOT_DIR}/bin/deployer" "$LINK"

echo "$ROOT_DIR" > "${CONFIG_DIR}/root"

log "CLI: ${LINK} → ${ROOT_DIR}/bin/deployer"
log "Root: ${CONFIG_DIR}/root"
