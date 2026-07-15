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
  # Path público e arquivo de location usam <projectSlug>-<branchSlug> para
  # evitar colisões entre projetos diferentes com branches de mesmo nome.
  echo "${project_slug}-${branch_slug}.location"
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
# env: opcional (após build / target), aplicado no run (e no build pm2)
env_map = d.get("env") or {}
if isinstance(env_map, dict):
    for k, v in env_map.items():
        if v is None:
            continue
        key = str(k)
        if not key or not key.replace("_", "").isalnum() or key[0].isdigit():
            continue
        # valor serializado sem quebra de linha no protocolo BUILD:/ENV:
        val = str(v).replace("\n", "\\n")
        print(f"ENV:{key}={val}")
PY
}

# Junta env do deployer.yaml + arquivo da API (API sobrescreve) num arquivo dotenv.
# Uso: merge_app_env_file <arquivo-saida> ENV:key=value...
# Lê também DEPLOYER_APP_ENV_FILE se definido.
merge_app_env_file() {
  local out_file="$1"
  shift
  python3 - "$out_file" "${DEPLOYER_APP_ENV_FILE:-}" "$@" <<'PY'
import sys, re
out_path = sys.argv[1]
api_path = sys.argv[2] or ""
yaml_pairs = sys.argv[3:]

KEY_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

def parse_dotenv(text: str) -> dict:
    result = {}
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        eq = s.find("=")
        if eq <= 0:
            continue
        key = s[:eq].strip()
        if not KEY_RE.match(key):
            continue
        val = s[eq + 1 :].strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
            val = val[1:-1]
            val = (
                val.replace("\\n", "\n")
                .replace("\\r", "\r")
                .replace('\\"', '"')
                .replace("\\\\", "\\")
            )
        result[key] = val
    return result

def serialize(vars_map: dict) -> str:
    lines = []
    for key in sorted(vars_map):
        raw = vars_map[key]
        needs = (not raw) or any(c in raw for c in ' \t#"\'=\\\n\r')
        if needs:
            esc = (
                raw.replace("\\", "\\\\")
                .replace('"', '\\"')
                .replace("\r", "\\r")
                .replace("\n", "\\n")
            )
            lines.append(f'{key}="{esc}"')
        else:
            lines.append(f"{key}={raw}")
    return ("\n".join(lines) + "\n") if lines else ""

merged = {}
for item in yaml_pairs:
    if not item.startswith("ENV:"):
        continue
    body = item[4:]
    eq = body.find("=")
    if eq <= 0:
        continue
    key, val = body[:eq], body[eq + 1 :].replace("\\n", "\n")
    if KEY_RE.match(key):
        merged[key] = val

if api_path:
    try:
        with open(api_path, encoding="utf-8") as f:
            merged.update(parse_dotenv(f.read()))
    except FileNotFoundError:
        pass

with open(out_path, "w", encoding="utf-8") as f:
    f.write(serialize(merged))
PY
}

# Exporta KEY=VALUE de um dotenv no ambiente atual (eval-safe via python).
# Uso: eval "$(exports_from_dotenv_file /path/to.env)"
exports_from_dotenv_file() {
  local file="$1"
  python3 - "$file" <<'PY'
import sys, re, shlex
path = sys.argv[1]
KEY_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
try:
    text = open(path, encoding="utf-8").read()
except FileNotFoundError:
    sys.exit(0)
for line in text.splitlines():
    s = line.strip()
    if not s or s.startswith("#"):
        continue
    eq = s.find("=")
    if eq <= 0:
        continue
    key = s[:eq].strip()
    if not KEY_RE.match(key):
        continue
    val = s[eq + 1 :].strip()
    if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
        val = val[1:-1]
        val = (
            val.replace("\\n", "\n")
            .replace("\\r", "\r")
            .replace('\\"', '"')
            .replace("\\\\", "\\")
        )
    print(f"export {key}={shlex.quote(val)}")
PY
}
