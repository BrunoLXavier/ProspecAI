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
        stmt = text(
            """
            INSERT INTO llm_configs (id, tenant_id, provider, model_name, created_by, updated_by, created_at, updated_at)
            SELECT :id, :tenant_id, :provider, :model_name, :created_by, :updated_by, now(), now()
            WHERE NOT EXISTS (SELECT 1 FROM llm_configs WHERE tenant_id = :tenant_id AND provider = :provider AND model_name = :model_name)
            """
        )
        params = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "provider": cfg["provider"],
            "model_name": cfg["model_name"],
            "created_by": os.getenv("SEED_CREATED_BY", "00000000-0000-0000-0000-000000000000"),
            "updated_by": os.getenv("SEED_CREATED_BY", "00000000-0000-0000-0000-000000000000"),
        }
        conn.execute(stmt, params)


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
