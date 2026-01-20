import uuid
import json
from typing import Iterable
from sqlalchemy import text


TABLE_NAME = "report_templates"


DEFAULT_TEMPLATES = [
    {"template_id": "proposal_summary", "name": "Proposal Summary", "sections": ["header", "executive_summary", "objectives", "budget"], "default_format": "html"},
    {"template_id": "matching_analysis", "name": "Matching Analysis", "sections": ["summary", "matches", "scores"], "default_format": "pdf"},
    {"template_id": "portfolio_overview", "name": "Portfolio Overview", "sections": ["projects", "status", "lessons_learned"], "default_format": "pdf"},
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def seed_for_tenant(conn, tenant_id: str) -> None:
    if not _table_exists(conn, TABLE_NAME):
        print(f"Skipping {TABLE_NAME} seed: table not present")
        return

    for t in DEFAULT_TEMPLATES:
        # Prepare JSON for sections explicitly and inline into SQL to avoid param-style mismatch
        sections_json = json.dumps(t["sections"])
        stmt_str = (
            "INSERT INTO report_templates (id, tenant_id, template_id, name, description, sections, default_format, created_at, updated_at) "
            "VALUES ('{id}', '{tenant_id}', '{template_id}', :name, :description, '{sections}'::jsonb, :default_format, now(), now()) "
            "ON CONFLICT (tenant_id, template_id) DO NOTHING"
        ).format(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            template_id=t["template_id"],
            sections=sections_json.replace("'", "''")
        )
        params = {
            "name": t["name"],
            "description": t.get("description", ""),
            "default_format": t["default_format"],
        }
        conn.execute(text(stmt_str), params)


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
