#!/usr/bin/env bash
# Installs deployer to ~/deployer and registers the "deployer" CLI in ~/.local/bin
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/numnes/deployer/main/scripts/install.sh | bash
#
# Environment:
#   DEPLOYER_INSTALL_DIR  clone destination (default: ~/deployer)
#   DEPLOYER_REPO_URL     git repository (default: https://github.com/numnes/deployer.git)
#   DEPLOYER_BIN_DIR      where to link the executable (default: ~/.local/bin)
set -euo pipefail

INSTALL_DIR="${DEPLOYER_INSTALL_DIR:-${HOME}/deployer}"
REPO_URL="${DEPLOYER_REPO_URL:-https://github.com/numnes/deployer.git}"
BIN_DIR="${DEPLOYER_BIN_DIR:-${HOME}/.local/bin}"
CONFIG_DIR="${HOME}/.config/deployer"

log() { echo "[install] $*"; }
die() { echo "[install] ERROR: $*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

log "Checking dependencies..."
need_cmd git
need_cmd docker
need_cmd node
docker compose version >/dev/null 2>&1 || docker-compose version >/dev/null 2>&1 || die "docker compose is not available"

mkdir -p "$BIN_DIR" "$CONFIG_DIR"

if [[ -d "${INSTALL_DIR}/.git" ]]; then
  log "Repository already exists at ${INSTALL_DIR}; updating..."
  git -C "$INSTALL_DIR" pull --ff-only || die "git pull failed"
else
  log "Cloning ${REPO_URL} → ${INSTALL_DIR}"
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

DEPLOYER_BIN_DIR="$BIN_DIR" bash "${INSTALL_DIR}/scripts/sync-cli.sh"

if [[ ! -f "${INSTALL_DIR}/server/.env" ]]; then
  if [[ -f "${INSTALL_DIR}/server/.env.example" ]]; then
    cp "${INSTALL_DIR}/server/.env.example" "${INSTALL_DIR}/server/.env"
    log "Created server/.env from .env.example (deployer setup will finalize it)"
  fi
fi

echo ""
log "Installation complete."
echo ""
echo "  Directory:  ${INSTALL_DIR}"
echo "  CLI:        deployer"
echo ""

case ":${PATH}:" in
  *:"${BIN_DIR}":*) ;;
  *)
    echo "Add to PATH (if not already):"
    echo ""
    echo "  export PATH=\"\${HOME}/.local/bin:\${PATH}\""
    echo ""
    echo "For a persistent shell config, add the line above to ~/.bashrc or ~/.zshrc"
    echo ""
    ;;
esac

echo "Next steps:"
echo ""
echo "  deployer setup    # start the stack"
echo "  deployer status   # check services"
echo "  deployer down     # stop everything (with confirmation)"
echo "  deployer help     # list commands"
echo ""
