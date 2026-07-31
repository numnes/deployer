# shellcheck shell=bash
# Load durable settings from deployer.env (never overwritten by setup/restart).
#
# Optional keys:
#   DEPLOYER_PUBLIC_WEB_URL   → CORS_ORIGIN (browser Origin of the dashboard)
#   DEPLOYER_PUBLIC_API_URL   → NEXT_PUBLIC_API_URL baked into the web image
#   DEPLOYER_PUBLIC_WEB_BASE_PATH → NEXT_PUBLIC_BASE_PATH (e.g. /deployer)
#   DEPLOYER_API_PORT / DEPLOYER_WEB_PORT / DEPLOYER_POSTGRES_PORT / DEPLOYER_REDIS_PORT
#     → pin host ports (skip auto-pick); fails if the port is already in use

load_deployer_public_env() {
  local root="${1:-}"
  if [[ -z "$root" ]]; then
    echo "load_deployer_public_env: root directory required" >&2
    return 1
  fi
  local file="${root}/deployer.env"
  if [[ -f "$file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$file"
    set +a
  fi
}

# True if value looks like a local-dev Origin (safe to rewrite on port changes).
is_local_dev_url() {
  local url="${1:-}"
  [[ -z "$url" ]] && return 0
  [[ "$url" =~ ^https?://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?/?$ ]]
}
