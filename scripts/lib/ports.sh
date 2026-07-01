#!/usr/bin/env bash
# Shared port helpers for dev-up / deployer setup.

port_in_use() {
  local port="$1"
  ss -tuln 2>/dev/null | grep -q ":${port} "
}

docker_host_port() {
  local container="$1"
  local internal_port="$2"
  docker port "$container" "${internal_port}/tcp" 2>/dev/null | head -1 | sed 's/.*://'
}

# Ports already assigned in this run (avoid API/web/redis/postgres colliding).
DEPLOYER_PICKED_PORTS=()

deployer_port_is_picked() {
  local port="$1"
  local p
  for p in "${DEPLOYER_PICKED_PORTS[@]}"; do
    [[ "$p" == "$port" ]] && return 0
  done
  return 1
}

deployer_remember_port() {
  DEPLOYER_PICKED_PORTS+=("$1")
}

# pick_port PREFERRED CONTAINER INTERNAL_PORT FALLBACK...
# Reuses the host port when the container is already running; otherwise picks a free port.
pick_port() {
  local preferred="$1"
  local container="${2:-}"
  local internal_port="${3:-}"
  shift 3 || true
  local fallbacks=("$@")

  if [[ -n "$container" && -n "$internal_port" ]]; then
    local mapped
    mapped="$(docker_host_port "$container" "$internal_port")"
    if [[ -n "$mapped" ]]; then
      deployer_remember_port "$mapped"
      echo "$mapped"
      return 0
    fi
  fi

  local candidate
  for candidate in "$preferred" "${fallbacks[@]}"; do
    if deployer_port_is_picked "$candidate"; then
      continue
    fi
    if ! port_in_use "$candidate"; then
      deployer_remember_port "$candidate"
      echo "$candidate"
      return 0
    fi
  done

  echo "[ports] No free port (preferred ${preferred})." >&2
  exit 1
}
