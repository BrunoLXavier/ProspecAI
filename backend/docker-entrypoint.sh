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

  exec uvicorn main:app --host 0.0.0.0 --port 8000
