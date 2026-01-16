from __future__ import annotations

import os
import uuid
from typing import Iterable
from sqlalchemy import text


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


DEFAULT_NOTIFS = [
    {"name": "new_opportunity", "subject": "New opportunity available", "body": "A new opportunity was posted."},
]


def seed_clients(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "clients"):
        return
    clients = [
        {"name": "Acme Research Ltd", "client_type": "company", "sector": "Renewable Energy"},
        {"name": "Universidade Fictícia", "client_type": "government", "sector": "Education"},
        {"name": "Prefeitura Exemplo", "client_type": "government", "sector": "Public Services"},
    ]
    created_by = os.getenv("SEED_CREATED_BY", "00000000-0000-0000-0000-000000000000")
    for c in clients:
        stmt = text(
            """
            INSERT INTO clients (id, tenant_id, name, client_type, sector, created_by, updated_by, created_at, updated_at)
            SELECT :id, :tenant_id, :name, :client_type, :sector, :created_by, :updated_by, now(), now()
            WHERE NOT EXISTS (SELECT 1 FROM clients WHERE tenant_id = :tenant_id AND name = :name)
            """
        )
        conn.execute(
            stmt,
            {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "name": c["name"],
                "client_type": c["client_type"],
                "sector": c["sector"],
                "created_by": created_by,
                "updated_by": created_by,
            },
        )


def seed_opportunities(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "opportunities"):
        return
    # link to any existing client by name
    examples = [
        {"title": "Projeto piloto de baterias", "description": "Opportunity to pilot battery management.", "client_name": "Acme Research Ltd"},
        {"title": "Serviço de análise de dados", "description": "Analytics service to municipality.", "client_name": "Universidade Fictícia"},
    ]
    for o in examples:
        # try to find a client id
        r = conn.execute(text("SELECT id FROM clients WHERE tenant_id = :t AND name = :n"), {"t": tenant_id, "n": o["client_name"]}).fetchone()
        client_id = r[0] if r else None
        created_by = os.getenv("SEED_CREATED_BY", "00000000-0000-0000-0000-000000000000")
        # include priority (required) with a sensible default
        stmt = text(
            """
            INSERT INTO opportunities (id, tenant_id, title, description, client_id, stage, priority, created_by, updated_by, created_at, updated_at)
            SELECT :id, :tenant_id, :title, :description, :client_id, 'intelligence', :priority, :created_by, :updated_by, now(), now()
            WHERE NOT EXISTS (SELECT 1 FROM opportunities WHERE tenant_id = :tenant_id AND title = :title)
            """
        )
        conn.execute(
            stmt,
            {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "title": o["title"],
                "description": o["description"],
                "client_id": client_id,
                "priority": 50,
                "created_by": created_by,
                "updated_by": created_by,
            },
        )


def seed_notifications(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "notification_templates"):
        return
    for n in DEFAULT_NOTIFS:
        created_by = os.getenv("SEED_CREATED_BY", "00000000-0000-0000-0000-000000000000")
        stmt = text(
            """
            INSERT INTO notification_templates (id, tenant_id, name, subject, body, created_by, updated_by, created_at, updated_at)
            SELECT :id, :tenant_id, :name, :subject, :body, :created_by, :updated_by, now(), now()
            WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE tenant_id = :tenant_id AND name = :name)
            """
        )
        conn.execute(
            stmt,
            {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "name": n["name"],
                "subject": n["subject"],
                "body": n["body"],
                "created_by": created_by,
                "updated_by": created_by,
            },
        )


def seed_for_tenant(conn, tenant_id: str) -> None:
    seed_clients(conn, tenant_id)
    seed_opportunities(conn, tenant_id)
    seed_notifications(conn, tenant_id)


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
