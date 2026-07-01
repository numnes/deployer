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

Environment (non-interactive):
  DEPLOYER_PROJECT_SLUG       Project slug
  DEPLOYER_PROJECT_GIT_URL    Git remote URL
  DEPLOYER_PROJECT_SERVER_URL Optional public URL (nginx domain)

Examples:
  deployer project init
  deployer project init ../my-app
  deployer project init --branches main,develop
  deployer project init --force
EOF
}

log() { echo "[project-init] $*"; }
die() { echo "[project-init] ERROR: $*" >&2; exit 1; }

slug_valid() {
  [[ "$1" =~ ^[a-z0-9][a-z0-9-]*$ ]]
}

prompt_with_default() {
  local label="$1"
  local default="$2"
  local value=""
  if [[ -n "$default" ]]; then
    read -r -p "${label} [${default}]: " value
    value="${value:-$default}"
  else
    while [[ -z "$value" ]]; do
      read -r -p "${label}: " value
      [[ -n "$value" ]] || echo "Required." >&2
    done
  fi
  printf '%s' "$value"
}

collect_project_metadata() {
  local detected_json
  detected_json="$(node "${ROOT_DIR}/scripts/project-metadata.js" detect "$TARGET_DIR")"

  local default_slug default_git
  default_slug="$(DETECTED="$detected_json" node -e 'const d=JSON.parse(process.env.DETECTED);process.stdout.write(d.slug||"")')"
  default_git="$(DETECTED="$detected_json" node -e 'const d=JSON.parse(process.env.DETECTED);process.stdout.write(d.gitUrl||"")')"
  local slug_source git_source
  slug_source="$(DETECTED="$detected_json" node -e 'const d=JSON.parse(process.env.DETECTED);process.stdout.write(d.sources?.slug||"")')"
  git_source="$(DETECTED="$detected_json" node -e 'const d=JSON.parse(process.env.DETECTED);process.stdout.write(d.sources?.gitUrl||"")')"

  echo ""
  log "Project registration (for deployer dashboard)"
  [[ -n "$slug_source" ]] && echo "  slug hint: ${slug_source}"
  [[ -n "$git_source" ]] && echo "  git URL hint: ${git_source}"

  if [[ -n "${DEPLOYER_PROJECT_SLUG:-}" ]]; then
    PROJECT_SLUG="$DEPLOYER_PROJECT_SLUG"
    echo "  slug: ${PROJECT_SLUG} (DEPLOYER_PROJECT_SLUG)"
  else
    while true; do
      PROJECT_SLUG="$(prompt_with_default "Slug" "$default_slug")"
      if slug_valid "$PROJECT_SLUG"; then
        break
      fi
      echo "Invalid slug. Use lowercase letters, numbers, and hyphens." >&2
    done
  fi

  if [[ -n "${DEPLOYER_PROJECT_GIT_URL:-}" ]]; then
    PROJECT_GIT_URL="$DEPLOYER_PROJECT_GIT_URL"
    echo "  git URL: ${PROJECT_GIT_URL} (DEPLOYER_PROJECT_GIT_URL)"
  else
    while true; do
      PROJECT_GIT_URL="$(prompt_with_default "Git URL" "$default_git")"
      [[ -n "$PROJECT_GIT_URL" ]] && break
      echo "Git URL is required." >&2
    done
  fi

  if [[ -n "${DEPLOYER_PROJECT_SERVER_URL:-}" ]]; then
    PROJECT_SERVER_URL="$DEPLOYER_PROJECT_SERVER_URL"
  else
    echo ""
    echo "  Public URL: the public domain configured in nginx where preview instances"
    echo "  will be available (e.g. https://preview.example.com)."
    echo "  Each branch is served at {URL}/{branch-slug}/"
    read -r -p "Public URL (optional): " PROJECT_SERVER_URL
  fi
}

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

collect_project_metadata

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

apply_project_slug() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    return
  fi
  if ! grep -q '__DEPLOYER_PROJECT_SLUG__' "$file"; then
    return
  fi
  local tmp="${file}.tmp.$$"
  sed "s/__DEPLOYER_PROJECT_SLUG__/${PROJECT_SLUG}/g" "$file" > "$tmp"
  mv "$tmp" "$file"
  log "set project slug in ${file#"$TARGET_DIR"/}"
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
    apply_project_slug "$wf"
  fi
done

echo ""
log "Done in ${TARGET_DIR}"
log "  files written: ${WROTE}, skipped: ${SKIPPED}"
echo ""
echo "Next steps:"
echo "  1. Register the project in the deployer dashboard (see registration JSON below)"
echo "  2. Create an API key (Users → API Keys)"
echo "  3. In the app repo GitHub settings, add secrets DEPLOYER_API_URL and DEPLOYER_API_KEY"
echo "  4. Adjust deployer.yaml (build steps and PM2 target) for your stack"
echo "  5. Commit and push .github/workflows/ and deployer.yaml"
echo ""
echo "Docs: dashboard → Setup → GitHub Actions"
echo ""
echo "=== Registration JSON (import in Projects → Add project) ==="
registration_args=(--slug "$PROJECT_SLUG" --git-url "$PROJECT_GIT_URL")
if [[ -n "${PROJECT_SERVER_URL:-}" ]]; then
  registration_args+=(--server-url "$PROJECT_SERVER_URL")
fi
node "${ROOT_DIR}/scripts/project-metadata.js" registration-json "${registration_args[@]}"
echo "=== End registration JSON ==="
echo ""
echo "Import: Dashboard → Projects → Add project → Import registration JSON"
echo ""
echo "GitHub (repo → Settings → Secrets and variables → Actions):"
echo "  Secrets: DEPLOYER_API_URL, DEPLOYER_API_KEY"
echo "  (project slug is already set in the workflow files)"
