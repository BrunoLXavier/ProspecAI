import uuid
from typing import Iterable, List
from sqlalchemy import text

TABLE_NAME = "ingestion_jobs"

# Implements RF-01: Sample ingestion jobs for data pipeline demonstration
DEFAULT_JOBS = [
    {
        "id": "ij000000-0000-0000-0000-000000000001",
        "name": "Initial Dataset Import",
        "description": "Bulk import of historical datasets for analytics",
        "status": "completed",
        "source_type": "file_upload",
        "total_files": 12,
        "processed_files": 12,
        "total_records": 12500,
        "processed_records": 12500,
        "failed_records": 0,
        "pii_detected_count": 42,
        "pii_anonymized_count": 38,
        "progress_percentage": 100.0,
        "current_step": "completed",
    },
    {
        "id": "ij000000-0000-0000-0000-000000000002",
        "name": "Weekly CRM Sync",
        "description": "Scheduled ingestion from CRM export",
        "status": "pending",
        "source_type": "api_integration",
        "total_files": 1,
        "processed_files": 0,
        "total_records": 320,
        "processed_records": 0,
        "failed_records": 0,
        "pii_detected_count": 0,
        "pii_anonymized_count": 0,
        "progress_percentage": 0.0,
        "current_step": "queued",
    },
    {
        "id": "ij000000-0000-0000-0000-000000000003",
        "name": "Partner Database Integration",
        "description": "Ingestão de dados de parceiros industriais via API REST",
        "status": "processing",
        "source_type": "api_integration",
        "total_files": 5,
        "processed_files": 3,
        "total_records": 8750,
        "processed_records": 5200,
        "failed_records": 12,
        "pii_detected_count": 156,
        "pii_anonymized_count": 89,
        "progress_percentage": 59.4,
        "current_step": "processing_file_4",
    },
    {
        "id": "ij000000-0000-0000-0000-000000000004",
        "name": "Research Papers Import",
        "description": "Importação de artigos científicos e publicações acadêmicas",
        "status": "completed",
        "source_type": "file_upload",
        "total_files": 45,
        "processed_files": 45,
        "total_records": 2300,
        "processed_records": 2300,
        "failed_records": 0,
        "pii_detected_count": 67,
        "pii_anonymized_count": 67,
        "progress_percentage": 100.0,
        "current_step": "completed",
    },
    {
        "id": "ij000000-0000-0000-0000-000000000005",
        "name": "Government Funding Data",
        "description": "Dados de editais de fomento governamental (FINEP, CNPq)",
        "status": "completed",
        "source_type": "web_scraping",
        "total_files": 3,
        "processed_files": 3,
        "total_records": 890,
        "processed_records": 890,
        "failed_records": 2,
        "pii_detected_count": 23,
        "pii_anonymized_count": 23,
        "progress_percentage": 100.0,
        "current_step": "completed",
    },
    {
        "id": "ij000000-0000-0000-0000-000000000006",
        "name": "Historic Proposals Archive",
        "description": "Digitalização de propostas históricas do arquivo físico",
        "status": "failed",
        "source_type": "file_upload",
        "total_files": 120,
        "processed_files": 78,
        "total_records": 15000,
        "processed_records": 9750,
        "failed_records": 234,
        "pii_detected_count": 412,
        "pii_anonymized_count": 298,
        "progress_percentage": 65.0,
        "current_step": "error_recovery",
        "error_message": "OCR processing failed on corrupted PDF files",
    },
    {
        "id": "ij000000-0000-0000-0000-000000000007",
        "name": "Industry Contact Import",
        "description": "Importação de contatos industriais do CRM legado",
        "status": "completed",
        "source_type": "database_migration",
        "total_files": 1,
        "processed_files": 1,
        "total_records": 4500,
        "processed_records": 4500,
        "failed_records": 0,
        "pii_detected_count": 4500,
        "pii_anonymized_count": 4500,
        "progress_percentage": 100.0,
        "current_step": "completed",
    },
    {
        "id": "ij000000-0000-0000-0000-000000000008",
        "name": "Monthly Funding Update",
        "description": "Atualização mensal de oportunidades de fomento",
        "status": "pending",
        "source_type": "scheduled_sync",
        "total_files": 0,
        "processed_files": 0,
        "total_records": 0,
        "processed_records": 0,
        "failed_records": 0,
        "pii_detected_count": 0,
        "pii_anonymized_count": 0,
        "progress_percentage": 0.0,
        "current_step": "scheduled",
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
        job_id = j.get("id", str(uuid.uuid4()))
        
        stmt = text("""
            INSERT INTO ingestion_jobs (
                id, tenant_id, name, description, status, source_type,
                total_files, processed_files, total_records, processed_records, failed_records,
                pii_detected_count, pii_anonymized_count, progress_percentage, current_step,
                error_message, created_at, updated_at, created_by, updated_by, version
            )
            SELECT 
                :id, :tenant_id, :name, :description, :status, :source_type,
                :total_files, :processed_files, :total_records, :processed_records, :failed_records,
                :pii_detected_count, :pii_anonymized_count, :progress_percentage, :current_step,
                :error_message, now(), now(), :created_by, :created_by, 1
            WHERE NOT EXISTS (
                SELECT 1 FROM ingestion_jobs WHERE id = :id
            )
        """)

        params = {
            "id": job_id,
            "tenant_id": tenant_id,
            "name": j["name"],
            "description": j.get("description", ""),
            "status": j.get("status", "pending"),
            "source_type": j.get("source_type", "file_upload"),
            "total_files": j.get("total_files", 0),
            "processed_files": j.get("processed_files", 0),
            "total_records": j.get("total_records", 0),
            "processed_records": j.get("processed_records", 0),
            "failed_records": j.get("failed_records", 0),
            "pii_detected_count": j.get("pii_detected_count", 0),
            "pii_anonymized_count": j.get("pii_anonymized_count", 0),
            "progress_percentage": j.get("progress_percentage", 0.0),
            "current_step": j.get("current_step"),
            "error_message": j.get("error_message"),
            "created_by": str(creator),
        }

        conn.execute(stmt, params)
    
    print(f"Seeded {len(DEFAULT_JOBS)} ingestion jobs for tenant {tenant_id}")


def seed_for_tenants(conn, tenant_ids) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
