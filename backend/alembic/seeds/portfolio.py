import uuid
from typing import Iterable
from sqlalchemy import text

TABLE_NAME = "portfolios"

DEFAULT_PORTFOLIOS = [
    {
        "name": "Strategic Research Portfolio",
        "description": "Projects focused on strategic R&D initiatives",
        "strategic_areas": ["Energy", "Health", "Industry 4.0"],
        "key_competencies": ["AI", "IoT", "Materials"],
        "total_budget": 2000000,
        "active_projects_count": 3,
    },
    {
        "name": "Innovation Pilots",
        "description": "Small pilot projects and proofs of concept",
        "strategic_areas": ["Smart Cities", "Mobility"],
        "key_competencies": ["Embedded", "Sensors"],
        "total_budget": 500000,
        "active_projects_count": 2,
    },
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def seed_for_tenant(conn, tenant_id: str) -> None:
    if not _table_exists(conn, TABLE_NAME):
        print(f"Skipping {TABLE_NAME} seed: table not present")
        return

    # Determine a sensible created_by / updated_by (use an existing user for the tenant if available)
    creator = conn.execute(text("SELECT id FROM users WHERE tenant_id = :tenant_id LIMIT 1"), {"tenant_id": tenant_id}).scalar()
    if not creator:
        creator = tenant_id

    for p in DEFAULT_PORTFOLIOS:
        stmt = text(
            """
            INSERT INTO portfolios (id, tenant_id, name, description, project_ids, strategic_areas, key_competencies, total_budget, active_projects_count, created_by, updated_by, created_at, updated_at)
            SELECT :id, :tenant_id, :name, :description, CAST(:project_ids AS jsonb), CAST(:strategic_areas AS jsonb), CAST(:key_competencies AS jsonb), :total_budget, :active_projects_count, :created_by, :updated_by, now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM portfolios WHERE tenant_id = :tenant_id AND name = :name
            )
            """
        )
        params = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": p["name"],
            "description": p.get("description", ""),
            "project_ids": '[]',
            "strategic_areas": str(p.get("strategic_areas", [])).replace("'", '"'),
            "key_competencies": str(p.get("key_competencies", [])).replace("'", '"'),
            "total_budget": p.get("total_budget", 0),
            "active_projects_count": p.get("active_projects_count", 0),
            "created_by": creator,
            "updated_by": creator,
        }
        conn.execute(stmt, params)


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
