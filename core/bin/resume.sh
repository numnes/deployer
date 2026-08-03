#!/usr/bin/env bash
# Resume rápido (wake): sobe PM2 sem clone/build.
# Uso: resume.sh <slug-projeto> <branch>
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/deploy.sh" --resume "$@"
