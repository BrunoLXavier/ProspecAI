#!/bin/sh
set -e

# Entrypoint for backend container
# Waits for DB readiness, runs migrations (with retries), optionally runs seeds,
# then starts the application.

DB_WAIT_TIMEOUT=${DB_WAIT_TIMEOUT:-60}
MIGRATION_RETRIES=${MIGRATION_RETRIES:-5}
SLEEP_BETWEEN_RETRIES=${SLEEP_BETWEEN_RETRIES:-3}

wait_for_db() {
  echo "Waiting for database to become available (timeout=${DB_WAIT_TIMEOUT}s)..."
  python - <<'PY'
import os, time, socket, sys
from urllib.parse import urlparse

url = os.getenv('DATABASE_URL', 'postgresql://postgres:changeme@postgres:5432/prospecai')
parsed = urlparse(url)
host = parsed.hostname or 'postgres'
port = parsed.port or 5432
timeout = int(os.getenv('DB_WAIT_TIMEOUT', '60'))
deadline = time.time() + timeout
while time.time() < deadline:
    try:
        s = socket.create_connection((host, int(port)), 3)
        s.close()
        print(f"Database reachable at {host}:{port}")
        sys.exit(0)
    except Exception as e:
        print(f"Waiting for DB {host}:{port} - {e}")
        time.sleep(1)
print(f"Timed out after {timeout}s waiting for DB at {host}:{port}", file=sys.stderr)
sys.exit(2)
PY
}

run_migrations() {
  echo "Running database migrations (alembic)..."
  n=0
  until [ "$n" -ge "$MIGRATION_RETRIES" ]
  do
    if alembic upgrade head; then
      echo "Migrations applied successfully."
      return 0
    fi
    n=$((n+1))
    echo "Migration attempt $n/$MIGRATION_RETRIES failed; retrying in ${SLEEP_BETWEEN_RETRIES}s..."
    sleep ${SLEEP_BETWEEN_RETRIES}
  done
  echo "ERROR: Migrations failed after ${MIGRATION_RETRIES} attempts." >&2
  return 1
}

echo "Checking database readiness..."
wait_for_db

if run_migrations; then
  echo "Migrations finished."
else
  echo "Migrations failed; exiting with non-zero status." >&2
  exit 1
fi

if [ -n "${SEED_TENANT_IDS:-}" ]; then
  echo "SEED_TENANT_IDS detected: ${SEED_TENANT_IDS}. Running seeds..."
  if python -m backend.scripts.run_seeds --tenants "${SEED_TENANT_IDS}"; then
    echo "Seeds executed successfully."
  else
    echo "Warning: seeds failed. Continuing startup." >&2
  fi
else
  echo "SEED_TENANT_IDS not set; skipping seeds."
fi

echo "Starting backend server..."
if [ "${RUN_SERVER:-true}" = "false" ]; then
  echo "RUN_SERVER=false; exiting after migrations and seeds without starting server."
  exit 0
fi

exec uvicorn main:app --host 0.0.0.0 --port 8000
