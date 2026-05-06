#!/usr/bin/env bash
# Pausa preview: remove PM2 e location nginx, mantém checkout em disco.
# Uso: pause.sh <slug-projeto> <branch>
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/common.sh
source "${SCRIPT_DIR}/../lib/common.sh"

usage() {
  echo "Uso: $0 <slug-projeto> <branch>" >&2
  exit 1
}

[[ $# -ge 2 ]] || usage

PROJECT_SLUG="$1"
BRANCH="$2"
BRANCH_SLUG="$(sanitize_branch_slug "$BRANCH")"
NAME="$(pm2_app_name "$PROJECT_SLUG" "$BRANCH")"
LOCATIONS_DIR="${DEPLOYER_LOCATIONS_DIR}"
LOC_FILE="${LOCATIONS_DIR}/$(location_file_basename "$PROJECT_SLUG" "$BRANCH_SLUG")"
LEGACY_LOC_FILE="${LOCATIONS_DIR}/${PROJECT_SLUG}-${BRANCH_SLUG}.location"

pm2 delete "$NAME" 2>/dev/null || true
rm -f "${DEPLOYER_STATE_DIR}/${NAME}.port"
rm -f "${DEPLOYER_STATE_DIR}/${NAME}.deploy-result.json"
rm -f "$LOC_FILE"
rm -f "$LEGACY_LOC_FILE"
nginx_reload

echo "OK pause ${PROJECT_SLUG} branch ${BRANCH}" >&2
