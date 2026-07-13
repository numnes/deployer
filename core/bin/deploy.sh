#!/usr/bin/env bash
# Uso: deploy.sh <slug-projeto> <url-git> <branch>
# Env opcional: DEPLOYER_IMAGE=<registry/image:tag> (modo docker remoto)
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
NAME="$(instance_name "$PROJECT_SLUG" "$BRANCH")"

clone_or_update_repo() {
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
}

write_deploy_meta() {
  local runner="$1"
  local port="$2"
  local result_json="${DEPLOYER_STATE_DIR}/${NAME}.deploy-result.json"
  export _D_META_PROJECT="$PROJECT_SLUG"
  export _D_META_BRANCH="$BRANCH"
  export _D_META_BRANCH_SLUG="$BRANCH_SLUG"
  export _D_META_PM2="$NAME"
  export _D_META_PORT="$port"
  export _D_META_RUNNER="$runner"
  export _D_META_OUT="$result_json"
  python3 <<'PY'
import json, os, sys

out = {
    "projectSlug": os.environ["_D_META_PROJECT"],
    "branch": os.environ["_D_META_BRANCH"],
    "branchSlug": os.environ["_D_META_BRANCH_SLUG"],
    "pm2Name": os.environ["_D_META_PM2"],
    "port": int(os.environ["_D_META_PORT"]),
    "runner": os.environ["_D_META_RUNNER"],
}
path = os.environ["_D_META_OUT"]
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f)
print(f"[deploy] metadados gravados em {path}", file=sys.stderr)
PY
}

deploy_pm2() {
  local target="$1"
  shift
  local -a build_cmds=("$@")

  PORT="$(next_free_port)"
  export PORT
  echo "$PORT" >"${DEPLOYER_STATE_DIR}/${NAME}.port"

  (
    cd "$TARGET_DIR"
    for cmd in "${build_cmds[@]}"; do
      log "[deploy] build: $cmd"
      bash -lc "$cmd" >&2
    done
  )

  local abs_target="${TARGET_DIR}/${target}"
  if [[ ! -e "$abs_target" ]]; then
    echo "Target não encontrado: $abs_target" >&2
    exit 1
  fi

  stop_instance "$NAME"
  write_instance_runner "$NAME" "pm2"
  env PORT="$PORT" pm2 start "$abs_target" --name "$NAME" --update-env

  write_location_file "$LOCATIONS_DIR" "$LOCATION_BASENAME" "$PORT"
  nginx_reload
  write_deploy_meta "pm2" "$PORT"
  log "OK deploy ${PROJECT_SLUG} branch ${BRANCH} -> porta ${PORT} pm2:${NAME}"
}

deploy_docker() {
  local docker_build_mode="$1"
  local dockerfile_rel="$2"
  local context_rel="$3"
  local container_port="$4"
  local image_name_base="$5"

  if [[ "$docker_build_mode" == "remote" && -z "${DEPLOYER_IMAGE:-}" ]]; then
    echo "Runner docker com build remote exige o campo 'image' no trigger de deploy." >&2
    exit 1
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker não encontrado no PATH." >&2
    exit 1
  fi

  local image_to_run=""
  if [[ -n "${DEPLOYER_IMAGE:-}" ]]; then
    log "[deploy] pulling image ${DEPLOYER_IMAGE}"
    docker pull "$DEPLOYER_IMAGE"
    image_to_run="$DEPLOYER_IMAGE"
  else
    clone_or_update_repo
    local dockerfile_path="${TARGET_DIR}/${dockerfile_rel}"
    local build_context="${TARGET_DIR}/${context_rel}"
    if [[ ! -f "$dockerfile_path" ]]; then
      echo "Dockerfile não encontrado: $dockerfile_path" >&2
      exit 1
    fi
    image_to_run="${image_name_base}:${BRANCH_SLUG}"
    log "[deploy] building image ${image_to_run}"
    docker build -t "$image_to_run" -f "$dockerfile_path" "$build_context"
  fi

  local host_port
  host_port="$(next_free_port)"
  echo "$host_port" >"${DEPLOYER_STATE_DIR}/${NAME}.port"

  stop_instance "$NAME"
  write_instance_runner "$NAME" "docker"
  docker run -d \
    --name "$NAME" \
    -p "${host_port}:${container_port}" \
    --restart unless-stopped \
    "$image_to_run" >/dev/null

  write_location_file "$LOCATIONS_DIR" "$LOCATION_BASENAME" "$host_port"
  nginx_reload
  write_deploy_meta "docker" "$host_port"
  log "OK deploy ${PROJECT_SLUG} branch ${BRANCH} -> porta ${host_port} docker:${NAME}"
}

# Sempre clona/atualiza para ler deployer.yaml (e para build local).
clone_or_update_repo

mapfile -t _parsed < <(parse_deployer_yaml "$TARGET_DIR")
RUNNER="${_parsed[0]}"

if [[ "$RUNNER" == "pm2" ]]; then
  TARGET="${_parsed[1]}"
  BUILD_CMDS=()
  for line in "${_parsed[@]}"; do
    if [[ "$line" == BUILD:* ]]; then
      BUILD_CMDS+=("${line#BUILD:}")
    fi
  done
  deploy_pm2 "$TARGET" "${BUILD_CMDS[@]}"
elif [[ "$RUNNER" == "docker" ]]; then
  DOCKER_BUILD_MODE="local"
  DOCKERFILE="Dockerfile"
  DOCKER_CONTEXT="."
  CONTAINER_PORT="3000"
  IMAGE_NAME_BASE="app"
  for line in "${_parsed[@]}"; do
    case "$line" in
      DOCKER_BUILD:*) DOCKER_BUILD_MODE="${line#DOCKER_BUILD:}" ;;
      DOCKERFILE:*) DOCKERFILE="${line#DOCKERFILE:}" ;;
      CONTEXT:*) DOCKER_CONTEXT="${line#CONTEXT:}" ;;
      DOCKER_PORT:*) CONTAINER_PORT="${line#DOCKER_PORT:}" ;;
      IMAGE_NAME:*) IMAGE_NAME_BASE="${line#IMAGE_NAME:}" ;;
    esac
  done
  deploy_docker "$DOCKER_BUILD_MODE" "$DOCKERFILE" "$DOCKER_CONTEXT" "$CONTAINER_PORT" "$IMAGE_NAME_BASE"
else
  echo "Runner '${RUNNER}' não suportado (use pm2 ou docker)." >&2
  exit 1
fi
