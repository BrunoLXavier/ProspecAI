#!/bin/sh
set -e

echo "[entrypoint] Running alembic migrations (if available)..."
if command -v alembic >/dev/null 2>&1; then
  # If DB already reports the same single head as filesystem, skip upgrade to avoid overlap errors.
  current=$(alembic current 2>/dev/null | awk 'NR==1{print $1}')
  heads_count=$(alembic heads 2>/dev/null | wc -l | tr -d '[:space:]')
  headrev=$(alembic heads 2>/dev/null | awk 'NR==1{print $1}')
  if [ -n "$current" ] && [ "$current" = "$headrev" ] && [ "$heads_count" -eq 1 ]; then
    echo "[entrypoint] DB already at head ($current); skipping alembic upgrade"
  else
    alembic upgrade heads || echo "[entrypoint] alembic upgrade failed; continuing"
  fi
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
elif [ -n "${SEED_TENANT_IDS:-}" ]; then
  echo "[entrypoint] SEED_TENANT_IDS is set — executing seed runner"
  python /app/scripts/run_seeds_fixed.py --tenants "${SEED_TENANT_IDS}"
  echo "[entrypoint] Seed runner finished"
else
  echo "[entrypoint] RUN_SEEDS_ON_START not set; skipping seeds"
fi

echo "[entrypoint] Starting application"
  # If TRANSLATIONS_DIR is not populated, attempt to copy locales from the frontend
  # This helps non-bind-mount deployments where locales should be baked into the image
  TRANSLATIONS_DIR=${TRANSLATIONS_DIR:-/app/translations}
  if [ ! -d "$TRANSLATIONS_DIR" ] || [ -z "$(ls -A "$TRANSLATIONS_DIR" 2>/dev/null)" ]; then
    if [ -d /app/frontend/src/locales ]; then
      echo "[entrypoint] Populating translations from /app/frontend/src/locales -> $TRANSLATIONS_DIR"
      mkdir -p "$TRANSLATIONS_DIR"
      if cp -a /app/frontend/src/locales/. "$TRANSLATIONS_DIR"/; then
        echo "[entrypoint] Locales copied successfully; setting permissions"
        chmod -R a+rw "$TRANSLATIONS_DIR" || true
      else
        echo "[entrypoint] Warning: copy of locales failed; skipping chmod"
      fi
    else
      echo "[entrypoint] No frontend locales found at /app/frontend/src/locales; skipping translations copy"
    fi
  else
    echo "[entrypoint] $TRANSLATIONS_DIR already populated; skipping translations copy"
  fi

  if [ "${RUN_SERVER:-true}" = "false" ]; then
    echo "[entrypoint] RUN_SERVER=false; exiting after migrations and seeds without starting server."
    exit 0
  fi

  exec uvicorn main:app --host 0.0.0.0 --port 8000
