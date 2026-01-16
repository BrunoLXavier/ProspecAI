#!/bin/sh
set -e

echo "[entrypoint] Running alembic migrations (if available)..."
if command -v alembic >/dev/null 2>&1; then
  alembic upgrade head || echo "[entrypoint] alembic upgrade failed; continuing"
fi

if [ "${RUN_SEEDS_ON_START:-}" = "1" ] || [ "${RUN_SEEDS_ON_START:-}" = "true" ]; then
  echo "[entrypoint] RUN_SEEDS_ON_START is set — executing seed runner"
  # If SEED_TENANT_IDS is set, pass it; otherwise the runner will read env var inside container
  if [ -n "${SEED_TENANT_IDS:-}" ]; then
    python /app/scripts/run_seeds_fixed.py --tenants "${SEED_TENANT_IDS}"
  else
    python /app/scripts/run_seeds_fixed.py
  fi
  echo "[entrypoint] Seed runner finished"
else
  echo "[entrypoint] RUN_SEEDS_ON_START not set; skipping seeds"
fi

echo "[entrypoint] Starting application"
exec uvicorn main:app --host 0.0.0.0 --port 8000
