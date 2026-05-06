#!/usr/bin/env bash
# Uso: deploy.sh <slug-projeto> <url-git> <branch>
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/common.sh
source "${SCRIPT_DIR}/../lib/common.sh"

usage() {
  echo "Uso: $0 <slug-projeto> <url-git> <branch>" >&2
  exit 1
}

log() {
  echo "$1" >&2
}

[[ $# -ge 3 ]] || usage

PROJECT_SLUG="$1"
GIT_URL="$2"
BRANCH="$3"
BRANCH_SLUG="$(sanitize_branch_slug "$BRANCH")"
LOCATION_BASENAME="$(location_file_basename "$PROJECT_SLUG" "$BRANCH_SLUG")"

TARGET_DIR="${DEPLOYER_WORK_ROOT}/${PROJECT_SLUG}/${BRANCH_SLUG}"
LOCATIONS_DIR="${DEPLOYER_LOCATIONS_DIR}"
NAME="$(pm2_app_name "$PROJECT_SLUG" "$BRANCH")"

if [[ -d "${TARGET_DIR}/.git" ]]; then
  git -C "$TARGET_DIR" fetch origin
  git -C "$TARGET_DIR" checkout "$BRANCH" || git -C "$TARGET_DIR" checkout -b "$BRANCH" "origin/${BRANCH}"
  git -C "$TARGET_DIR" pull --ff-only origin "$BRANCH" || git -C "$TARGET_DIR" pull --ff-only || true
else
  mkdir -p "$(dirname "$TARGET_DIR")"
  if git clone --depth 1 --branch "$BRANCH" "$GIT_URL" "$TARGET_DIR" 2>/dev/null; then
    :
  else
    rm -rf "$TARGET_DIR"
    git clone "$GIT_URL" "$TARGET_DIR"
    git -C "$TARGET_DIR" checkout "$BRANCH"
  fi
fi

mapfile -t _parsed < <(parse_deployer_yaml "$TARGET_DIR")
RUNNER="${_parsed[0]}"
TARGET="${_parsed[1]}"
BUILD_CMDS=()
for line in "${_parsed[@]}"; do
  if [[ "$line" == BUILD:* ]]; then
    BUILD_CMDS+=("${line#BUILD:}")
  fi
done

if [[ "$RUNNER" != "pm2" ]]; then
  echo "Runner '${RUNNER}' não suportado (use pm2)." >&2
  exit 1
fi

PORT="$(next_free_port)"
export PORT
echo "$PORT" >"${DEPLOYER_STATE_DIR}/${NAME}.port"

(
  cd "$TARGET_DIR"
  for cmd in "${BUILD_CMDS[@]}"; do
    log "[deploy] build: $cmd"
    bash -lc "$cmd" >&2
  done
)

ABS_TARGET="${TARGET_DIR}/${TARGET}"
if [[ ! -e "$ABS_TARGET" ]]; then
  echo "Target não encontrado: $ABS_TARGET" >&2
  exit 1
fi

pm2 delete "$NAME" 2>/dev/null || true
env PORT="$PORT" pm2 start "$ABS_TARGET" --name "$NAME" --update-env

write_location_file "$LOCATIONS_DIR" "$LOCATION_BASENAME" "$PORT"
nginx_reload

RESULT_JSON="${DEPLOYER_STATE_DIR}/${NAME}.deploy-result.json"
export _D_META_PROJECT="$PROJECT_SLUG"
export _D_META_BRANCH="$BRANCH"
export _D_META_BRANCH_SLUG="$BRANCH_SLUG"
export _D_META_PM2="$NAME"
export _D_META_PORT="$PORT"
export _D_META_OUT="$RESULT_JSON"
python3 <<'PY'
import json, os, sys

out = {
    "projectSlug": os.environ["_D_META_PROJECT"],
    "branch": os.environ["_D_META_BRANCH"],
    "branchSlug": os.environ["_D_META_BRANCH_SLUG"],
    "pm2Name": os.environ["_D_META_PM2"],
    "port": int(os.environ["_D_META_PORT"]),
}
path = os.environ["_D_META_OUT"]
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f)
print(f"[deploy] metadados gravados em {path}", file=sys.stderr)
PY

log "OK deploy ${PROJECT_SLUG} branch ${BRANCH} -> porta ${PORT} pm2:${NAME}"
