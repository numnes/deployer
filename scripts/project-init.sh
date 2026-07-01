#!/usr/bin/env bash
# Copy GitHub Actions workflows and deployer.yaml into an application repository.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TARGET_DIR=""
FORCE=0
BRANCHES="master,homologation"

usage() {
  cat <<EOF
Usage: deployer project init [PATH] [options]

Copy preview workflows and deployer.yaml into an application repo.

  PATH              Target directory (default: current directory)

Options:
  -f, --force       Overwrite existing files
  --branches LIST   Comma-separated PR target branches (default: master,homologation)
  -h, --help        Show this help

Examples:
  deployer project init
  deployer project init ../my-app
  deployer project init --branches main,develop
  deployer project init --force
EOF
}

log() { echo "[project-init] $*"; }
die() { echo "[project-init] ERROR: $*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--force) FORCE=1; shift ;;
    --branches) BRANCHES="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    -*) die "Unknown option: $1 (run with --help)" ;;
    *)
      if [[ -z "$TARGET_DIR" ]]; then
        TARGET_DIR="$1"
        shift
      else
        die "Unexpected argument: $1"
      fi
      ;;
  esac
done

TARGET_DIR="$(cd "${TARGET_DIR:-.}" && pwd)"

WORKFLOWS_DIR="${TARGET_DIR}/.github/workflows"
DEPLOYER_YAML="${TARGET_DIR}/deployer.yaml"

SRC_DEPLOY="${ROOT_DIR}/actions/deploy-preview.yml"
SRC_TEARDOWN="${ROOT_DIR}/actions/teardown-preview.yml"
SRC_CONFIG="${ROOT_DIR}/examples/deployer.yaml"

[[ -f "$SRC_DEPLOY" ]] || die "Template not found: $SRC_DEPLOY"
[[ -f "$SRC_TEARDOWN" ]] || die "Template not found: $SRC_TEARDOWN"
[[ -f "$SRC_CONFIG" ]] || die "Template not found: $SRC_CONFIG"

if [[ ! -d "$TARGET_DIR" ]]; then
  die "Directory does not exist: $TARGET_DIR"
fi

if [[ -f "${TARGET_DIR}/.git" ]] || [[ -d "${TARGET_DIR}/.git" ]]; then
  :
else
  log "Warning: ${TARGET_DIR} does not look like a git repository (no .git)."
fi

write_file() {
  local dest="$1"
  local src="$2"
  if [[ -f "$dest" && "$FORCE" != "1" ]]; then
    log "skip (exists): ${dest#"$TARGET_DIR"/}  (use --force to overwrite)"
    return 1
  fi
  cp "$src" "$dest"
  log "wrote: ${dest#"$TARGET_DIR"/}"
  return 0
}

apply_branches() {
  local file="$1"
  local tmp="${file}.tmp.$$"
  local in_branches=0
  local replaced=0
  local line

  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ ^[[:space:]]*branches:[[:space:]]*$ ]]; then
      printf '%s\n' "$line"
      local IFS=','
      read -ra parts <<< "$BRANCHES"
      local b
      for b in "${parts[@]}"; do
        b="$(echo "$b" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
        [[ -n "$b" ]] && printf '      - %s\n' "$b"
      done
      in_branches=1
      replaced=1
      continue
    fi
    if [[ $in_branches -eq 1 && "$line" =~ ^[[:space:]]+- ]]; then
      continue
    fi
    if [[ $in_branches -eq 1 && ! "$line" =~ ^[[:space:]] ]]; then
      in_branches=0
    elif [[ $in_branches -eq 1 && "$line" =~ ^[[:space:]]+[^-] ]]; then
      in_branches=0
    fi
    printf '%s\n' "$line"
  done < "$file" > "$tmp"

  if [[ "$replaced" != "1" ]]; then
    rm -f "$tmp"
    die "branches block not found in ${file}"
  fi
  mv "$tmp" "$file"
}

mkdir -p "$WORKFLOWS_DIR"

WROTE=0
SKIPPED=0

for pair in \
  "${SRC_DEPLOY}:${WORKFLOWS_DIR}/deploy-preview.yml" \
  "${SRC_TEARDOWN}:${WORKFLOWS_DIR}/teardown-preview.yml" \
  "${SRC_CONFIG}:${DEPLOYER_YAML}"; do
  src="${pair%%:*}"
  dest="${pair#*:}"
  if write_file "$dest" "$src"; then
    WROTE=$((WROTE + 1))
  else
    SKIPPED=$((SKIPPED + 1))
  fi
done

for wf in "${WORKFLOWS_DIR}/deploy-preview.yml" "${WORKFLOWS_DIR}/teardown-preview.yml"; do
  if [[ -f "$wf" ]]; then
    apply_branches "$wf"
  fi
done

echo ""
log "Done in ${TARGET_DIR}"
log "  files written: ${WROTE}, skipped: ${SKIPPED}"
echo ""
echo "Next steps:"
echo "  1. Register the project in the deployer dashboard (Projects → slug must match DEPLOYER_PROJECT_SLUG)"
echo "  2. Create an API key (Users → API Keys)"
echo "  3. In the app repo GitHub settings, add secrets:"
echo "       DEPLOYER_API_URL, DEPLOYER_API_KEY"
echo "     and variable:"
echo "       DEPLOYER_PROJECT_SLUG"
echo "  4. Adjust deployer.yaml (build steps and PM2 target) for your stack"
echo "  5. Commit and push .github/workflows/ and deployer.yaml"
echo ""
echo "Docs: dashboard → Setup → GitHub Actions / Secrets"
