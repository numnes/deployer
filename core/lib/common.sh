#!/usr/bin/env bash
# Biblioteca compartilhada do deployer core.
set -euo pipefail

: "${DEPLOYER_WORK_ROOT:?Defina DEPLOYER_WORK_ROOT (ex: /home/deployer)}"
: "${DEPLOYER_STATE_DIR:="${DEPLOYER_WORK_ROOT}/.deployer-state"}"
: "${DEPLOYER_LOCATIONS_DIR:="${HOME}/deployer/locations"}"

mkdir -p "$DEPLOYER_STATE_DIR"
mkdir -p "$DEPLOYER_LOCATIONS_DIR"

sanitize_branch_slug() {
  local b="$1"
  echo "$b" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9._-]/-/g' | sed 's/^-*//;s/-*$//'
}

instance_name() {
  local project="$1"
  local branch="$2"
  echo "${project}-$(sanitize_branch_slug "$branch")"
}

pm2_app_name() {
  instance_name "$@"
}

read_instance_runner() {
  local name="$1"
  local runner_file="${DEPLOYER_STATE_DIR}/${name}.runner"
  if [[ -f "$runner_file" ]]; then
    cat "$runner_file"
    return 0
  fi
  echo "pm2"
}

write_instance_runner() {
  local name="$1"
  local runner="$2"
  echo "$runner" >"${DEPLOYER_STATE_DIR}/${name}.runner"
}

stop_instance() {
  local name="$1"
  local runner
  runner="$(read_instance_runner "$name")"
  if [[ "$runner" == "docker" ]]; then
    docker stop "$name" 2>/dev/null || true
    docker rm "$name" 2>/dev/null || true
  else
    pm2 delete "$name" 2>/dev/null || true
  fi
}

next_free_port() {
  local start="${1:-10200}"
  local end="${2:-19999}"
  local p
  for ((p = start; p <= end; p++)); do
    if ! ss -tuln 2>/dev/null | grep -q ":${p} "; then
      echo "$p"
      return 0
    fi
  done
  echo "Nenhuma porta livre entre ${start} e ${end}" >&2
  return 1
}

location_file_basename() {
  local project_slug="$1"
  local branch_slug="$2"
  # O path público deve ser só /<branchSlug>/.
  # O PM2 name já inclui o project slug; manter o nginx path simples.
  echo "${branch_slug}.location"
}

nginx_reload() {
  if command -v sudo >/dev/null 2>&1; then
    sudo nginx -t && sudo nginx -s reload
  else
    nginx -t && nginx -s reload
  fi
}

write_location_file() {
  local locations_dir="$1"
  local location_basename="$2"
  local port="$3"
  local path="$locations_dir/${location_basename}"
  cat >"$path" <<EOF
location ^~ /${location_basename%.location}/ {
    proxy_pass http://127.0.0.1:${port}/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}
EOF
  echo "$path"
}

parse_deployer_yaml() {
  local repo_dir="$1"
  local yaml="${repo_dir}/deployer.yaml"
  if [[ ! -f "$yaml" ]]; then
    echo "Arquivo deployer.yaml não encontrado em ${repo_dir}" >&2
    return 1
  fi
  python3 - "$yaml" <<'PY'
import sys, yaml
path = sys.argv[1]
with open(path) as f:
    d = yaml.safe_load(f) or {}
runner = d.get("runner") or "pm2"
print(runner)
if runner == "docker":
    docker = d.get("docker") or {}
    build_mode = docker.get("build") or "local"
    dockerfile = docker.get("dockerfile") or "Dockerfile"
    context = docker.get("context") or "."
    port = docker.get("port") or 3000
    image_name = docker.get("imageName") or "app"
    print(f"DOCKER_BUILD:{build_mode}")
    print(f"DOCKERFILE:{dockerfile}")
    print(f"CONTEXT:{context}")
    print(f"DOCKER_PORT:{port}")
    print(f"IMAGE_NAME:{image_name}")
else:
    build = d.get("build") or []
    if isinstance(build, str):
        build = [build]
    target = d.get("target")
    if not target:
        raise SystemExit("deployer.yaml: campo 'target' é obrigatório para runner pm2")
    print(target)
    for c in build:
        print("BUILD:" + c)
PY
}
