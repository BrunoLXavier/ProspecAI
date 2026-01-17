#!/usr/bin/env python3
from __future__ import annotations

"""Simple seed verification script.

Checks that key tables exist and that seeded rows are present for the specified
tenant(s). Exits with non-zero code if required checks fail.

Usage:
  python scripts/verify_seeds.py --tenants <comma-separated-uuids>
Or set env `SEED_TENANT_IDS`.
"""

import argparse
import os
import sys
from typing import List

from sqlalchemy import create_engine, text, bindparam


REQUIRED_TABLES = ["users", "funding_sources"]
OPTIONAL_TABLES = [
    "clients",
    "opportunities",
    "llm_configs",
    "pii_detections",
    "report_templates",
]


def get_tenants_from_args(args) -> List[str]:
    if args.tenants:
        return [t.strip() for t in args.tenants.split(",") if t.strip()]
    env = os.getenv("SEED_TENANT_IDS")
    if env:
        return [t.strip() for t in env.split(",") if t.strip()]
    raise RuntimeError("No tenants provided via --tenants or SEED_TENANT_IDS")


def table_exists(conn, table_name: str) -> bool:
    q = text("SELECT 1 FROM information_schema.tables WHERE table_name = :t LIMIT 1")
    r = conn.execute(q, {"t": table_name})
    return r.first() is not None


def column_exists(conn, table_name: str, column_name: str) -> bool:
    q = text(
        "SELECT 1 FROM information_schema.columns WHERE table_name = :t AND column_name = :c LIMIT 1"
    )
    r = conn.execute(q, {"t": table_name, "c": column_name})
    return r.first() is not None


def count_rows(conn, table_name: str, tenants: List[str]) -> int:
    has_tenant = column_exists(conn, table_name, "tenant_id")
    if has_tenant and tenants:
        # Use expanding bindparam to safely expand Python list into SQL IN (...) list
        q = text(f"SELECT count(1) FROM {table_name} WHERE tenant_id IN :t").bindparams(
            bindparam("t", expanding=True)
        )
        r = conn.execute(q, {"t": tenants})
    else:
        q = text(f"SELECT count(1) FROM {table_name}")
        r = conn.execute(q)
    row = r.first()
    return int(row[0]) if row is not None else 0


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--tenants", help="Comma-separated tenant UUIDs")
    args = p.parse_args()

    tenants = get_tenants_from_args(args)

    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("DATABASE_URL is not set", file=sys.stderr)
        sys.exit(2)

    engine_url = DATABASE_URL.replace("+asyncpg", "") if "+asyncpg" in DATABASE_URL else DATABASE_URL
    eng = create_engine(engine_url)

    failed = False
    with eng.connect() as conn:
        print(f"Verifying seeds for tenants: {tenants}")

        # Required tables
        for t in REQUIRED_TABLES:
            if not table_exists(conn, t):
                print(f"[ERROR] Required table missing: {t}")
                failed = True
                continue
            cnt = count_rows(conn, t, tenants)
            print(f"[OK] Table {t} exists; rows for tenants: {cnt}")
            if cnt <= 0:
                print(f"[ERROR] Required data missing in {t} for tenants: {tenants}")
                failed = True

        # Optional tables
        for t in OPTIONAL_TABLES:
            if not table_exists(conn, t):
                print(f"[WARN] Optional table not present: {t} (skipping)")
                continue
            cnt = count_rows(conn, t, tenants)
            print(f"[OK] Optional table {t} rows for tenants: {cnt}")

    if failed:
        print("Seed verification failed", file=sys.stderr)
        sys.exit(3)
    print("Seed verification passed")


if __name__ == "__main__":
    main()
