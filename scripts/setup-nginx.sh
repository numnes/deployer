#!/usr/bin/env bash
# Wire deployer location includes into a system nginx sites-enabled config.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SITES_ENABLED="${NGINX_SITES_ENABLED:-/etc/nginx/sites-enabled}"
FORCE_FILE=""
YES=0

usage() {
  cat <<EOF
Usage: deployer setup nginx [options]

List nginx sites-enabled configs, pick one, and add the deployer
locations include line if it is not already present.

Options:
  -f, --file PATH       Use this nginx config (skip interactive list)
  -s, --sites-dir DIR   sites-enabled directory (default: ${SITES_ENABLED})
  -y, --yes             Skip confirmation before editing the file
  -h, --help            Show this help

Environment:
  DEPLOYER_LOCATIONS_DIR   Locations directory (default: ~/deployer/locations)
  NGINX_SITES_ENABLED      Same as --sites-dir

The added line looks like:
    include /path/to/locations/*.location;    # deployer
EOF
}

log() { echo "[setup-nginx] $*"; }
die() { echo "[setup-nginx] ERROR: $*" >&2; exit 1; }

resolve_locations_dir() {
  if [[ -n "${DEPLOYER_LOCATIONS_DIR:-}" ]]; then
    printf '%s' "$DEPLOYER_LOCATIONS_DIR"
    return
  fi
  local env_file="${ROOT_DIR}/api/.env"
  if [[ -f "$env_file" ]]; then
    local from_env
    from_env="$(grep -E '^DEPLOYER_LOCATIONS_DIR=' "$env_file" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '[:space:]"'"'" || true)"
    if [[ -n "$from_env" ]]; then
      printf '%s' "$from_env"
      return
    fi
  fi
  printf '%s' "${HOME}/deployer/locations"
}

include_line() {
  local locations_dir="$1"
  printf '    include %s/*.location;    # deployer' "$locations_dir"
}

file_has_include() {
  local file="$1"
  local locations_dir="$2"
  if grep -qF '# deployer' "$file" 2>/dev/null; then
    return 0
  fi
  if grep -qF "${locations_dir}" "$file" 2>/dev/null && grep -qE '\.location' "$file" 2>/dev/null; then
    return 0
  fi
  return 1
}

insert_include() {
  local file="$1"
  local line="$2"
  local tmp="${file}.deployer.tmp.$$"

  if grep -qE '^[[:space:]]*server[[:space:]]*\{' "$file"; then
    awk -v insert="$line" '
      BEGIN { done = 0 }
      {
        print $0
        if (!done && $0 ~ /^[[:space:]]*server[[:space:]]*\{/) {
          print insert
          done = 1
        }
      }
      END {
        if (!done) exit 1
      }
    ' "$file" > "$tmp" || {
      rm -f "$tmp"
      die "Could not find a server { } block in ${file}"
    }
  else
    {
      echo ""
      echo "# Added by deployer setup nginx"
      echo "$line"
    } >> "$file"
    return 0
  fi

  mv "$tmp" "$file"
}

pick_site_file() {
  local sites_dir="$1"
  local -a files=()
  local entry name

  [[ -d "$sites_dir" ]] || die "sites-enabled directory not found: ${sites_dir}"

  while IFS= read -r -d '' entry; do
    name="$(basename "$entry")"
    [[ "$name" == "default" ]] && continue
    files+=("$entry")
  done < <(find "$sites_dir" -maxdepth 1 \( -type f -o -type l \) ! -name '.*' -print0 2>/dev/null | sort -z)

  if [[ ${#files[@]} -eq 0 ]]; then
    die "No config files found in ${sites_dir}"
  fi

  if [[ ${#files[@]} -eq 1 ]]; then
    printf '%s' "${files[0]}"
    return
  fi

  echo ""
  log "Select a nginx config in ${sites_dir}:"
  local i=1
  for entry in "${files[@]}"; do
    printf '  %2d) %s\n' "$i" "$(basename "$entry")"
    i=$((i + 1))
  done
  echo ""

  local choice
  while true; do
    read -r -p "Choice [1-${#files[@]}]: " choice
    if [[ "$choice" =~ ^[0-9]+$ ]] && (( choice >= 1 && choice <= ${#files[@]} )); then
      printf '%s' "${files[$((choice - 1))]}"
      return
    fi
    echo "Invalid choice." >&2
  done
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--file) FORCE_FILE="$2"; shift 2 ;;
    -s|--sites-dir) SITES_ENABLED="$2"; shift 2 ;;
    -y|--yes) YES=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) die "Unknown option: $1 (run with --help)" ;;
    *) die "Unexpected argument: $1" ;;
  esac
done

LOCATIONS_DIR="$(resolve_locations_dir)"
mkdir -p "$LOCATIONS_DIR"
LINE="$(include_line "$LOCATIONS_DIR")"

log "Locations directory: ${LOCATIONS_DIR}"

if [[ -n "$FORCE_FILE" ]]; then
  TARGET_FILE="$FORCE_FILE"
else
  TARGET_FILE="$(pick_site_file "$SITES_ENABLED")"
fi

[[ -f "$TARGET_FILE" ]] || die "File not found: ${TARGET_FILE}"

log "Selected config: ${TARGET_FILE}"

if file_has_include "$TARGET_FILE" "$LOCATIONS_DIR"; then
  log "Include line already present — no changes made."
  exit 0
fi

echo ""
echo "Will add this line inside the server block (or at the end of the file):"
echo "${LINE}"
echo ""

if [[ "$YES" != "1" ]]; then
  read -r -p "Continue? [y/N] " ans
  if [[ ! "$ans" =~ ^[yY]$ ]]; then
    echo "Cancelled."
    exit 0
  fi
fi

insert_include "$TARGET_FILE" "$LINE"
log "Updated ${TARGET_FILE}"

if command -v nginx >/dev/null 2>&1; then
  echo ""
  log "Testing nginx configuration..."
  if sudo nginx -t 2>/dev/null || nginx -t 2>/dev/null; then
    log "nginx -t OK — run: sudo nginx -s reload"
  else
    echo "[setup-nginx] WARNING: nginx -t failed — review ${TARGET_FILE}" >&2
    exit 1
  fi
else
  log "nginx not found in PATH — reload manually after reviewing the file."
fi
