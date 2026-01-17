# Seeds and verification

This document explains how to run the project's Alembic seed modules and how to verify that required demo data is present.

Environment variables

- `DATABASE_URL` (required) – connection string for the target Postgres database. If using an async URL (`+asyncpg`), the seed runner strips the suffix for sync usage.
- `SEED_TENANT_IDS` (recommended) – comma-separated tenant UUIDs for which to run seeds.
- `RUN_SEEDS_ON_START` (optional) – when set inside container entrypoint, runs seeds during container startup.
- `USE_ENTRYPOINT` (optional) – when set on host scripts, indicates the container entrypoint handles migrations and seeds.

Running seeds (manual)

From the host, you can run the canonical runner inside the backend image:

```powershell
docker-compose run --rm backend python /app/scripts/run_seeds_fixed.py --tenants 00000000-0000-0000-0000-000000000001
```

Run seeds via container entrypoint (recommended for CI/dev):

```powershell
set USE_ENTRYPOINT=1
set RUN_SEEDS_ON_START=1
set SEED_TENANT_IDS=00000000-0000-0000-0000-000000000001
start-docker.bat
```

Verifying seeded data

Use the verification helper which performs simple checks for key tables and seeded rows:

```powershell
docker-compose run --rm backend python /app/scripts/verify_seeds.py --tenants 00000000-0000-0000-0000-000000000001
```

This script will exit with non-zero code if required tables or demo rows are missing.

CI Integration

Add a step in CI to:
1. Build the backend image
2. Start a Postgres service (or reuse CI Postgres)
3. Run `run_seeds_fixed.py --tenants ...`
4. Run `verify_seeds.py --tenants ...` and fail the job if verification fails

Notes

- Seeds are idempotent and tenant-scoped. Prefer `run_seeds_fixed.py` as the canonical runner.
- If a seed expects a table/column that is not present in your DB, the verification step will warn or fail depending on the table's importance.
