import uuid
from typing import Iterable, List
from sqlalchemy import text

TABLE_NAME = "report_instances"

DEFAULT_INSTANCES = [
    {
        "template_id": "portfolio_overview",
        "name": "Initial Portfolio Overview",
        "format": "pdf",
        "status": "generated",
    },
    {
        "template_id": "matching_analysis",
        "name": "Sample Matching Analysis",
        "format": "html",
        "status": "generated",
    },
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def seed_for_tenant(conn, tenant_id: str) -> None:
    if not _table_exists(conn, TABLE_NAME):
        print(f"Skipping {TABLE_NAME} seed: table not present")
        return

    creator = conn.execute(text("SELECT id FROM users WHERE tenant_id = :tenant_id LIMIT 1"), {"tenant_id": tenant_id}).scalar()
    if not creator:
        creator = tenant_id

    for inst in DEFAULT_INSTANCES:
        stmt = text(
            """
            INSERT INTO report_instances (id, tenant_id, template_id, name, format, status, created_by, updated_by, created_at, updated_at)
            SELECT :id, :tenant_id, :template_id, :name, :format, :status, :created_by, :updated_by, now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM report_instances WHERE tenant_id = :tenant_id AND name = :name
            )
            """
        )
        params = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "template_id": inst["template_id"],
            "name": inst["name"],
            "format": inst.get("format", "pdf"),
            "status": inst.get("status", "pending"),
            "created_by": creator,
            "updated_by": creator,
        }
        conn.execute(stmt, params)


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> List[str]:
    seeded = []
    for t in tenant_ids:
        seed_for_tenant(conn, t)
        seeded.append(t)
    return seeded
