from __future__ import annotations

import os
import uuid
from typing import Iterable, List

from sqlalchemy import text


SEED_CREATED_BY = os.getenv("SEED_CREATED_BY", "00000000-0000-0000-0000-000000000000")


DEFAULT_FUNDINGS = [
    {
        "name": "Seed Grant Program",
        "description": "Seed funding for early-stage projects.",
        "is_active": True,
    },
    {
        "name": "Innovation Voucher",
        "description": "Small grants for company-university collaboration.",
        "is_active": True,
    },
    {
        "name": "Prototype Support",
        "description": "Funding to build proof-of-concept prototypes.",
        "is_active": True,
    },
]


def seed_for_tenant(conn, tenant_id: str) -> List[str]:
    # Skip if the funding_sources table hasn't been created by migrations
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": "funding_sources"}).scalar()
    if not r:
        print("Skipping funding seed: funding_sources table not present")
        return []

    seeded = []
    for f in DEFAULT_FUNDINGS:
        # Insert seed funding matching the current schema
        # detect whether schema uses an 'institution' column (older schema) or trl_min/trl_max
        has_institution = conn.execute(text("SELECT 1 FROM information_schema.columns WHERE table_name='funding_sources' AND column_name='institution';")).scalar()
        has_trl_min = conn.execute(text("SELECT 1 FROM information_schema.columns WHERE table_name='funding_sources' AND column_name='trl_min';")).scalar()
        # Prefer the branch that writes 'institution' when that column exists (legacy schema)
        if has_institution:
            conn.execute(
                text(
                    """
                    INSERT INTO funding_sources (
                        id, tenant_id, name, institution, description, instrument_type, trl_range,
                        total_amount, available_amount, currency, submission_start, submission_end,
                        status, source_organization, created_by, updated_by, created_at, updated_at, version
                    )
                    SELECT
                        :id, :tenant_id, :name, :institution, :description, :instrument_type, int4range(:trl_min, :trl_max, '[]'),
                        :total_amount, :available_amount, :currency, now(), now() + interval '90 days',
                        :status, :source_organization, :created_by, :updated_by, now(), now(), :version
                    WHERE NOT EXISTS (
                        SELECT 1 FROM funding_sources WHERE tenant_id = :tenant_id AND name = :name
                    )
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    "name": f["name"],
                    "description": f.get("description", ""),
                    "institution": f.get("institution", f.get("source_organization", "Seed Org")),
                    "instrument_type": "grant",
                    "trl_min": 1,
                    "trl_max": 4,
                    "total_amount": 50000.00,
                    "available_amount": 50000.00,
                    "currency": "BRL",
                    "status": "open",
                    "source_organization": "Seed Org",
                    "created_by": SEED_CREATED_BY,
                    "updated_by": SEED_CREATED_BY,
                    "version": 1,
                },
            )
        elif has_trl_min:
            conn.execute(
                text(
                    """
                    INSERT INTO funding_sources (
                        id, tenant_id, name, description, instrument_type, trl_min, trl_max,
                        total_amount, available_amount, currency, submission_start, submission_end,
                        status, source_organization, created_by, updated_by, created_at, updated_at
                    )
                    SELECT
                        :id, :tenant_id, :name, :description, :instrument_type, :trl_min, :trl_max,
                        :total_amount, :available_amount, :currency, now(), now() + interval '90 days',
                        :status, :source_organization, :created_by, :updated_by, now(), now()
                    WHERE NOT EXISTS (
                        SELECT 1 FROM funding_sources WHERE tenant_id = :tenant_id AND name = :name
                    )
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    "name": f["name"],
                    "description": f.get("description", ""),
                    "instrument_type": "grant",
                    "trl_min": 1,
                    "trl_max": 4,
                    "total_amount": 50000.00,
                    "available_amount": 50000.00,
                    "currency": "BRL",
                    "status": "open",
                    "source_organization": "Seed Org",
                    "created_by": SEED_CREATED_BY,
                    "updated_by": SEED_CREATED_BY,
                },
            )
        else:
            # fallback: some schemas use a trl_range (int4range) column instead of trl_min/trl_max
            conn.execute(
                text(
                    """
                    INSERT INTO funding_sources (
                        id, tenant_id, name, description, instrument_type, trl_range,
                        total_amount, available_amount, currency, submission_start, submission_end,
                        status, source_organization, created_by, updated_by, created_at, updated_at
                    )
                    SELECT
                        :id, :tenant_id, :name, :description, :instrument_type, int4range(:trl_min, :trl_max, '[]'),
                        :total_amount, :available_amount, :currency, now(), now() + interval '90 days',
                        :status, :source_organization, :created_by, :updated_by, now(), now()
                    WHERE NOT EXISTS (
                        SELECT 1 FROM funding_sources WHERE tenant_id = :tenant_id AND name = :name
                    )
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    "name": f["name"],
                    "description": f.get("description", ""),
                    "instrument_type": "grant",
                    "trl_min": 1,
                    "trl_max": 4,
                    "total_amount": 50000.00,
                    "available_amount": 50000.00,
                    "currency": "BRL",
                    "status": "open",
                    "source_organization": "Seed Org",
                    "created_by": SEED_CREATED_BY,
                    "updated_by": SEED_CREATED_BY,
                },
            )
        seeded.append(f["name"])
    return seeded


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> List[str]:
    all_seeded = []
    for t in tenant_ids:
        seeded = seed_for_tenant(conn, t)
        all_seeded.extend(seeded)
    return all_seeded

