#!/usr/bin/env bash
# Lista processos pm2 (JSON) para consumo pela API.
set -euo pipefail

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[]"
  exit 0
fi

python3 - <<'PY'
import json, subprocess
try:
    raw = subprocess.check_output(["pm2", "jlist"], text=True, stderr=subprocess.DEVNULL)
    apps = json.loads(raw) if raw.strip() else []
except (subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError):
    apps = []
out = []
for a in apps:
    pm2_env = a.get("pm2_env") or {}
    name = pm2_env.get("name") or a.get("name")
    status = pm2_env.get("status")
    out.append({
        "name": name,
        "status": status,
        "pm_id": a.get("pm_id"),
        "monit": a.get("monit"),
    })
print(json.dumps(out))
PY
