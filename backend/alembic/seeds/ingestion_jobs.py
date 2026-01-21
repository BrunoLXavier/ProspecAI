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
    # Inspect existing columns and build an insert statement that only targets present columns
    col_res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = :t"), {"t": TABLE_NAME})
    present_cols = {r[0] for r in col_res.fetchall()}

    base_cols = ["id", "tenant_id", "name", "description", "status", "total_files", "total_records"]
    # Ensure source_type is provided if the table requires it
    if "source_type" in present_cols and "source_type" not in base_cols:
        base_cols.insert(5, "source_type")
    optional_cols = ["total_pii_entities", "highest_risk_level", "progress_percent"]

    for j in DEFAULT_JOBS:
        # Build columns to insert based on what's present in the DB
        cols_to_insert = [c for c in base_cols if c in present_cols]
        for oc in optional_cols:
            if oc in present_cols:
                cols_to_insert.append(oc)
        # Include version column if present (some migrations set NOT NULL without server default)
        if "version" in present_cols:
            cols_to_insert.append("version")
        # created_by/updated_by are commonly present; include if available
        if "created_by" in present_cols:
            cols_to_insert.append("created_by")
        if "updated_by" in present_cols and "updated_by" not in cols_to_insert:
            cols_to_insert.append("updated_by")

        if not cols_to_insert:
            # Nothing to insert
            continue

        # Build SQL dynamically: exclude created_at/updated_at and append now() timestamps
        insert_cols_sql = ", ".join(cols_to_insert + ["created_at", "updated_at"]) if True else ""
        select_placeholders = ", ".join([f":{c}" for c in cols_to_insert] + ["now()", "now()"])

        stmt = text(f"""
            INSERT INTO ingestion_jobs ({insert_cols_sql})
            SELECT {select_placeholders}
            WHERE NOT EXISTS (
                SELECT 1 FROM ingestion_jobs WHERE tenant_id = :tenant_id AND name = :name
            )
            """)

        params = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": j["name"],
            "description": j.get("description", ""),
            "status": j.get("status", "pending"),
            "total_files": j.get("total_files", 0),
            "total_records": j.get("total_records", 0),
            "created_by": creator,
            "updated_by": creator,
        }

        # Provide a sensible default for source_type when required by schema
        if "source_type" in cols_to_insert and "source_type" not in params:
            params["source_type"] = j.get("source_type", "file")

        # Add optional params only when columns exist
        if "total_pii_entities" in cols_to_insert:
            params["total_pii_entities"] = j.get("total_pii_entities", 0)
        if "highest_risk_level" in cols_to_insert:
            params["highest_risk_level"] = j.get("highest_risk_level", None)
        if "progress_percent" in cols_to_insert:
            params["progress_percent"] = j.get("progress_percent", 0.0)

        if "version" in cols_to_insert and "version" not in params:
            params["version"] = 1

        conn.execute(stmt, params)

    # Insert a couple of ingestion_sources for completed job
    # Fetch job id for Initial Dataset Import
    job_id = conn.execute(text("SELECT id FROM ingestion_jobs WHERE tenant_id = :tenant_id AND name = :name"), {"tenant_id": tenant_id, "name": "Initial Dataset Import"}).scalar()
    if job_id:
        # Only insert sources if ingestion_sources table exists
        r = conn.execute(text("SELECT to_regclass(:t)"), {"t": "ingestion_sources"}).scalar()
        if not r:
            print("Skipping ingestion_sources inserts: ingestion_sources table not present")
            return

        # Build ingestion_sources insert dynamically to match actual schema
        src_cols_res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = :t"), {"t": "ingestion_sources"})
        src_present = {r[0] for r in src_cols_res.fetchall()}

        src_base = ["id", "tenant_id", "job_id"]
        # Map seed keys to potential DB columns
        mapping = [
            ("source_type", "source_type"),
            ("file_name", "file_name"),
            ("file_type", "file_type"),
            # file_size may be named file_size_bytes in current schema
            ("file_size", "file_size"),
            ("storage_bucket", "storage_bucket"),
            ("storage_key", "storage_key"),
            ("status", "status"),
            ("record_count", "record_count"),
        ]

        src_cols_to_insert = list(src_base)
        for seed_key, db_col in mapping:
            if db_col in src_present:
                src_cols_to_insert.append(db_col)
            else:
                # fallback alternatives
                if seed_key == "file_size" and "file_size_bytes" in src_present:
                    src_cols_to_insert.append("file_size_bytes")
                if seed_key == "record_count" and "total_records" in src_present:
                    src_cols_to_insert.append("total_records")

        if "created_by" in src_present:
            src_cols_to_insert.append("created_by")
        if "updated_by" in src_present:
            src_cols_to_insert.append("updated_by")
        if "version" in src_present:
            src_cols_to_insert.append("version")

        # If file_name is not present we can't safely insert sources
        if "file_name" not in src_present:
            print("Skipping ingestion_sources inserts: file_name column not present")
            return

        insert_cols_sql = ", ".join(src_cols_to_insert + ["created_at", "updated_at"]) if True else ""
        select_placeholders = ", ".join([f":{c}" for c in src_cols_to_insert] + ["now()", "now()"])
        src_stmt = text(f"""
            INSERT INTO ingestion_sources ({insert_cols_sql})
            SELECT {select_placeholders}
            WHERE NOT EXISTS (
                SELECT 1 FROM ingestion_sources WHERE tenant_id = :tenant_id AND job_id = :job_id AND file_name = :file_name
            )
            """)

        sources = [
            {"file_name": "historical_customers.csv", "file_type": "csv", "file_size": 245760, "record_count": 8500},
            {"file_name": "historical_projects.csv", "file_type": "csv", "file_size": 512000, "record_count": 4000},
        ]
        for s in sources:
            params = {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "job_id": job_id}
            # fill mapped fields
            if "source_type" in src_present:
                params["source_type"] = "file"
            if "file_name" in src_present:
                params["file_name"] = s["file_name"]
            if "file_type" in src_present:
                params["file_type"] = s.get("file_type")
            if "file_size" in src_present:
                params["file_size"] = s.get("file_size")
            elif "file_size_bytes" in src_present:
                params["file_size_bytes"] = s.get("file_size")
            if "storage_bucket" in src_present:
                params["storage_bucket"] = None
            if "storage_key" in src_present:
                params["storage_key"] = None
            if "status" in src_present:
                params["status"] = "processed"
            if "record_count" in src_present:
                params["record_count"] = s.get("record_count")
            elif "total_records" in src_present:
                params["total_records"] = s.get("record_count")
            if "created_by" in src_present:
                params["created_by"] = creator
            if "updated_by" in src_present:
                params["updated_by"] = creator
            if "version" in src_present:
                params["version"] = 1

            conn.execute(src_stmt, params)


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> List[str]:
    seeded = []
    for t in tenant_ids:
        seed_for_tenant(conn, t)
        seeded.append(t)
    return seeded
