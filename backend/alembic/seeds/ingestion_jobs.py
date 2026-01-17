import uuid
from typing import Iterable, List
from sqlalchemy import text

TABLE_NAME = "ingestion_jobs"

DEFAULT_JOBS = [
    {
        "name": "Initial Dataset Import",
        "description": "Bulk import of historical datasets for analytics",
        "status": "completed",
        "total_files": 12,
        "total_records": 12500,
        "total_pii_entities": 42,
        "highest_risk_level": "medium",
        "progress_percent": 100.0,
    },
    {
        "name": "Weekly CRM Sync",
        "description": "Scheduled ingestion from CRM export",
        "status": "pending",
        "total_files": 1,
        "total_records": 320,
        "total_pii_entities": 5,
        "highest_risk_level": "low",
        "progress_percent": 0.0,
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

    for j in DEFAULT_JOBS:
        stmt = text(
            """
            INSERT INTO ingestion_jobs (id, tenant_id, name, description, status, total_files, total_records, total_pii_entities, highest_risk_level, progress_percent, created_by, updated_by, created_at, updated_at)
            SELECT :id, :tenant_id, :name, :description, :status, :total_files, :total_records, :total_pii_entities, :highest_risk_level, :progress_percent, :created_by, :updated_by, now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM ingestion_jobs WHERE tenant_id = :tenant_id AND name = :name
            )
            """
        )
        params = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": j["name"],
            "description": j.get("description", ""),
            "status": j.get("status", "pending"),
            "total_files": j.get("total_files", 0),
            "total_records": j.get("total_records", 0),
            "total_pii_entities": j.get("total_pii_entities", 0),
            "highest_risk_level": j.get("highest_risk_level", None),
            "progress_percent": j.get("progress_percent", 0.0),
            "created_by": creator,
            "updated_by": creator,
        }
        conn.execute(stmt, params)

    # Insert a couple of ingestion_sources for completed job
    # Fetch job id for Initial Dataset Import
    job_id = conn.execute(text("SELECT id FROM ingestion_jobs WHERE tenant_id = :tenant_id AND name = :name"), {"tenant_id": tenant_id, "name": "Initial Dataset Import"}).scalar()
    if job_id:
        src_stmt = text(
            """
            INSERT INTO ingestion_sources (id, tenant_id, job_id, source_type, file_name, file_type, file_size, storage_bucket, storage_key, status, record_count, created_by, updated_by, created_at, updated_at)
            SELECT :id, :tenant_id, :job_id, :source_type, :file_name, :file_type, :file_size, :storage_bucket, :storage_key, :status, :record_count, :created_by, :updated_by, now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM ingestion_sources WHERE tenant_id = :tenant_id AND job_id = :job_id AND file_name = :file_name
            )
            """
        )
        sources = [
            {"file_name": "historical_customers.csv", "file_type": "csv", "file_size": 245760, "record_count": 8500},
            {"file_name": "historical_projects.csv", "file_type": "csv", "file_size": 512000, "record_count": 4000},
        ]
        for s in sources:
            conn.execute(src_stmt, {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "job_id": job_id,
                "source_type": "file",
                "file_name": s["file_name"],
                "file_type": s["file_type"],
                "file_size": s["file_size"],
                "storage_bucket": None,
                "storage_key": None,
                "status": "processed",
                "record_count": s["record_count"],
                "created_by": creator,
                "updated_by": creator,
            })


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> List[str]:
    seeded = []
    for t in tenant_ids:
        seed_for_tenant(conn, t)
        seeded.append(t)
    return seeded
