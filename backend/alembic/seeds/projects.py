import uuid
from typing import Iterable, List
from sqlalchemy import text

TABLE_NAME = "projects"

DEFAULT_PROJECTS = [
    {
        "title": "AI for Predictive Maintenance",
        "description": "Applying ML to predict equipment failures",
        "status": "active",
        "trl_current": 4,
        "trl_target": 6,
        "competencies": ["AI", "Sensors"],
        "portfolio_name": "Strategic Research Portfolio",
    },
    {
        "title": "Smart Building Energy Manager",
        "description": "Optimization platform for building energy consumption",
        "status": "active",
        "trl_current": 5,
        "trl_target": 7,
        "competencies": ["IoT", "Energy"],
        "portfolio_name": "Innovation Pilots",
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

    # Insert projects if not present (unique by tenant_id + title)
    for p in DEFAULT_PROJECTS:
        stmt = text(
            """
            INSERT INTO projects (id, tenant_id, title, description, status, trl_current, trl_target, competencies, team_members, version, created_by, updated_by, created_at, updated_at)
            SELECT :id, :tenant_id, :title, :description, :status, :trl_current, :trl_target, CAST(:competencies AS jsonb), CAST(:team_members AS jsonb), :version, :created_by, :updated_by, now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM projects WHERE tenant_id = :tenant_id AND title = :title
            )
            """
        )
        params = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "title": p["title"],
            "description": p.get("description", ""),
            "status": p.get("status", "active"),
            "trl_current": p.get("trl_current", 1),
            "trl_target": p.get("trl_target", None),
            "competencies": str(p.get("competencies", [])).replace("'", '"'),
            "team_members": str([]),
            "version": 1,
            "created_by": creator,
            "updated_by": creator,
        }
        conn.execute(stmt, params)

    # Note: Portfolio.project_ids left empty; association can be computed later by a background job.


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> List[str]:
    seeded = []
    for t in tenant_ids:
        seed_for_tenant(conn, t)
        seeded.append(t)
    return seeded
