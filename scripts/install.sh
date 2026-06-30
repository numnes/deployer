#!/usr/bin/env bash
# Instala o deployer em ~/deployer e registra o CLI "deployer" em ~/.local/bin
#
# Uso:
#   curl -fsSL https://raw.githubusercontent.com/numnes/deployer/main/scripts/install.sh | bash
#
# Variáveis:
#   DEPLOYER_INSTALL_DIR  destino do clone (padrão: ~/deployer)
#   DEPLOYER_REPO_URL     repositório git (padrão: https://github.com/numnes/deployer.git)
#   DEPLOYER_BIN_DIR      onde linkar o executável (padrão: ~/.local/bin)
set -euo pipefail

INSTALL_DIR="${DEPLOYER_INSTALL_DIR:-${HOME}/deployer}"
REPO_URL="${DEPLOYER_REPO_URL:-https://github.com/numnes/deployer.git}"
BIN_DIR="${DEPLOYER_BIN_DIR:-${HOME}/.local/bin}"
CONFIG_DIR="${HOME}/.config/deployer"

log() { echo "[install] $*"; }
die() { echo "[install] ERRO: $*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Comando obrigatório não encontrado: $1"
}

log "Verificando dependências..."
need_cmd git
need_cmd docker
need_cmd node
docker compose version >/dev/null 2>&1 || docker-compose version >/dev/null 2>&1 || die "docker compose não disponível"

mkdir -p "$BIN_DIR" "$CONFIG_DIR"

if [[ -d "${INSTALL_DIR}/.git" ]]; then
  log "Repositório já existe em ${INSTALL_DIR}; atualizando..."
  git -C "$INSTALL_DIR" pull --ff-only || die "git pull falhou"
else
  log "Clonando ${REPO_URL} → ${INSTALL_DIR}"
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

chmod +x "${INSTALL_DIR}/bin/deployer"
chmod +x "${INSTALL_DIR}/scripts/"*.sh 2>/dev/null || true

echo "$INSTALL_DIR" > "${CONFIG_DIR}/root"

LINK="${BIN_DIR}/deployer"
ln -sf "${INSTALL_DIR}/bin/deployer" "$LINK"
log "Executável: ${LINK} → ${INSTALL_DIR}/bin/deployer"

# server/.env de exemplo se não existir
if [[ ! -f "${INSTALL_DIR}/server/.env" ]]; then
  if [[ -f "${INSTALL_DIR}/server/.env.example" ]]; then
    cp "${INSTALL_DIR}/server/.env.example" "${INSTALL_DIR}/server/.env"
    log "Criado server/.env a partir de .env.example"
  fi
fi

echo ""
log "Instalação concluída."
echo ""
echo "  Diretório:  ${INSTALL_DIR}"
echo "  CLI:        deployer"
echo ""

case ":${PATH}:" in
  *:"${BIN_DIR}":*) ;;
  *)
    echo "Adicione ao PATH (se ainda não estiver):"
    echo ""
    echo "  export PATH=\"\${HOME}/.local/bin:\${PATH}\""
    echo ""
    echo "Para bash/zsh persistente, inclua a linha acima em ~/.bashrc ou ~/.zshrc"
    echo ""
    ;;
esac

echo "Próximos passos:"
echo ""
echo "  deployer setup    # sobe o ambiente"
echo "  deployer status   # verifica serviços"
echo "  deployer down     # derruba tudo (com confirmação)"
echo "  deployer help     # lista comandos"
echo ""
