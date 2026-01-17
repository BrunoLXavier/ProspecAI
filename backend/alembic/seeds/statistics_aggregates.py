from typing import Iterable, List
import uuid
from sqlalchemy import text

TABLE_NAME = "statistics_aggregates"

# This seed creates simple precomputed rows used by analytics endpoints.
DEFAULT_AGGREGATES = [
    {"key": "portfolio_by_trl", "value": '{"1":0,"2":0,"3":0,"4":1,"5":1,"6":0,"7":0,"8":0,"9":0}'},
    {"key": "ingestion_summary", "value": '{"jobs_total":2,"records_total":12820}'},
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def seed_for_tenant(conn, tenant_id: str) -> None:
    if not _table_exists(conn, TABLE_NAME):
        print(f"Skipping {TABLE_NAME} seed: table not present")
        return

    for agg in DEFAULT_AGGREGATES:
        stmt = text(
            """
            INSERT INTO statistics_aggregates (id, tenant_id, key, value, created_at, updated_at)
            SELECT :id, :tenant_id, :key, :value::jsonb, now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM statistics_aggregates WHERE tenant_id = :tenant_id AND key = :key
            )
            """
        )
        params = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "key": agg["key"],
            "value": agg["value"],
        }
        conn.execute(stmt, params)


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> List[str]:
    seeded = []
    for t in tenant_ids:
        seed_for_tenant(conn, t)
        seeded.append(t)
    return seeded
