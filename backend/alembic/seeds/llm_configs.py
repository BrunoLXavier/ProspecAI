import os
import uuid
from typing import Iterable
from sqlalchemy import text


TABLE_NAME = "llm_configs"


DEFAULT_CONFIGS = [
    {"provider": "local", "model_name": "bert-base"},
    {"provider": "openai", "model_name": "gpt-4-turbo-preview"},
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def seed_for_tenant(conn, tenant_id: str) -> None:
    if not _table_exists(conn, TABLE_NAME):
        print(f"Skipping {TABLE_NAME} seed: table not present")
        return

    for cfg in DEFAULT_CONFIGS:
        # Adapt to actual table schema (some migrations add NOT NULL `version` without server default)
        col_res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = :t"), {"t": TABLE_NAME})
        present_cols = {r[0] for r in col_res.fetchall()}

        cols = ["id", "tenant_id", "provider", "model_name"]
        if "created_by" in present_cols:
            cols.append("created_by")
        if "updated_by" in present_cols and "updated_by" not in cols:
            cols.append("updated_by")
        if "version" in present_cols:
            cols.append("version")

        insert_cols_sql = ", ".join(cols + ["created_at", "updated_at"])
        select_placeholders = ", ".join([f":{c}" for c in cols] + ["now()", "now()"])

        stmt = text(f"""
            INSERT INTO llm_configs ({insert_cols_sql})
            SELECT {select_placeholders}
            WHERE NOT EXISTS (SELECT 1 FROM llm_configs WHERE tenant_id = :tenant_id AND provider = :provider AND model_name = :model_name)
            """)

        params = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "provider": cfg["provider"],
            "model_name": cfg["model_name"],
        }
        if "created_by" in present_cols:
            params["created_by"] = os.getenv("SEED_CREATED_BY", "00000000-0000-0000-0000-000000000000")
        if "updated_by" in present_cols:
            params["updated_by"] = os.getenv("SEED_CREATED_BY", "00000000-0000-0000-0000-000000000000")
        if "version" in present_cols:
            params["version"] = 1

        conn.execute(stmt, params)


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
