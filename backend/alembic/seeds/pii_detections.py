from __future__ import annotations

import uuid
from typing import Iterable
from sqlalchemy import text


TABLE_NAME = 'pii_detection_rules'


DEFAULT_RULES = [
    {"name": "cnpj", "pattern": r"\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}", "description": "CNPJ pattern"},
    {"name": "cpf", "pattern": r"\d{3}\.\d{3}\.\d{3}-\d{2}", "description": "CPF pattern"},
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def _has_columns(conn, cols: Iterable[str]) -> bool:
    rows = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = :t"), {"t": TABLE_NAME}).fetchall()
    existing = {r[0] for r in rows}
    return all(c in existing for c in cols)


def seed_for_tenant(conn, tenant_id: str) -> None:
    if not _table_exists(conn, TABLE_NAME):
        print(f"Skipping {TABLE_NAME} seed: table not present")
        return

    # Ensure the table has the expected columns for this seed
    if not _has_columns(conn, ["name", "pattern"]):
        print(f"Skipping {TABLE_NAME} seed: expected columns missing")
        return

    for rule in DEFAULT_RULES:
        stmt = text(
            """
            INSERT INTO pii_detection_rules (id, tenant_id, name, pattern, description, created_at, updated_at)
            SELECT :id, :tenant_id, :name, :pattern, :description, now(), now()
            WHERE NOT EXISTS (SELECT 1 FROM pii_detection_rules WHERE tenant_id = :tenant_id AND name = :name)
            """
        )
        params = {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "name": rule["name"], "pattern": rule["pattern"], "description": rule.get("description", "")}
        conn.execute(stmt, params)


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
