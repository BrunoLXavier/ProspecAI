from __future__ import annotations

import uuid
import json
from typing import Iterable
from sqlalchemy import text


TABLE_RULES = 'pii_detection_rules'
TABLE_DETECTIONS = 'pii_detections'


DEFAULT_RULES = [
    {"name": "cnpj", "pattern": r"\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}", "description": "CNPJ pattern"},
    {"name": "cpf", "pattern": r"\d{3}\.\d{3}\.\d{3}-\d{2}", "description": "CPF pattern"},
    {"name": "email", "pattern": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "description": "Email pattern"},
    {"name": "phone", "pattern": r"\(\d{2}\)\s*\d{4,5}-\d{4}", "description": "Brazilian phone pattern"},
]

# Implements RF-01: Sample PII detections for testing LGPD compliance features
DEFAULT_DETECTIONS = [
    {
        "id": "d1000000-0000-0000-0000-000000000001",
        "source_type": "document",
        "file_name": "contrato_parceria_industria_x.pdf",
        "file_type": "pdf",
        "original_text_encrypted": "ENCRYPTED:Contato: João Silva, CPF 123.456.789-00, email joao@empresa.com",
        "anonymized_text": "Contato: [NOME_ANONIMIZADO], CPF [CPF_ANONIMIZADO], email [EMAIL_ANONIMIZADO]",
        "entities": [
            {"type": "CPF", "value": "[REDACTED]", "start": 30, "end": 44, "confidence": 0.98},
            {"type": "EMAIL", "value": "[REDACTED]", "start": 52, "end": 68, "confidence": 0.95},
            {"type": "PERSON", "value": "[REDACTED]", "start": 9, "end": 19, "confidence": 0.92}
        ],
        "total_entities": 3,
        "risk_level": "high",
        "overall_risk_level": "high",
        "anonymization_status": "pending_review",
    },
    {
        "id": "d1000000-0000-0000-0000-000000000002",
        "source_type": "spreadsheet",
        "file_name": "lista_fornecedores_2024.xlsx",
        "file_type": "xlsx",
        "original_text_encrypted": "ENCRYPTED:Fornecedor ABC Ltda, CNPJ 12.345.678/0001-90, Tel (11) 99999-8888",
        "anonymized_text": "Fornecedor ABC Ltda, CNPJ [CNPJ_ANONIMIZADO], Tel [TELEFONE_ANONIMIZADO]",
        "entities": [
            {"type": "CNPJ", "value": "[REDACTED]", "start": 27, "end": 45, "confidence": 0.99},
            {"type": "PHONE", "value": "[REDACTED]", "start": 52, "end": 67, "confidence": 0.94}
        ],
        "total_entities": 2,
        "risk_level": "medium",
        "overall_risk_level": "medium",
        "anonymization_status": "anonymized",
    },
    {
        "id": "d1000000-0000-0000-0000-000000000003",
        "source_type": "email",
        "file_name": "proposta_comercial_cliente_y.eml",
        "file_type": "eml",
        "original_text_encrypted": "ENCRYPTED:Proposta para Maria Santos, RG 12.345.678-9, endereço Rua das Flores 123",
        "anonymized_text": None,
        "entities": [
            {"type": "PERSON", "value": "[REDACTED]", "start": 13, "end": 25, "confidence": 0.91},
            {"type": "RG", "value": "[REDACTED]", "start": 31, "end": 43, "confidence": 0.88},
            {"type": "ADDRESS", "value": "[REDACTED]", "start": 55, "end": 73, "confidence": 0.85}
        ],
        "total_entities": 3,
        "risk_level": "high",
        "overall_risk_level": "high",
        "anonymization_status": "pending_review",
    },
    {
        "id": "d1000000-0000-0000-0000-000000000004",
        "source_type": "document",
        "file_name": "relatorio_projeto_inovacao.docx",
        "file_type": "docx",
        "original_text_encrypted": "ENCRYPTED:Responsável técnico: Dr. Carlos Ferreira, CRM 54321-SP",
        "anonymized_text": "Responsável técnico: [NOME_ANONIMIZADO], CRM [CRM_ANONIMIZADO]",
        "entities": [
            {"type": "PERSON", "value": "[REDACTED]", "start": 21, "end": 40, "confidence": 0.93},
            {"type": "CRM", "value": "[REDACTED]", "start": 46, "end": 58, "confidence": 0.96}
        ],
        "total_entities": 2,
        "risk_level": "medium",
        "overall_risk_level": "medium",
        "anonymization_status": "anonymized",
    },
    {
        "id": "d1000000-0000-0000-0000-000000000005",
        "source_type": "form",
        "file_name": "cadastro_pesquisador.json",
        "file_type": "json",
        "original_text_encrypted": "ENCRYPTED:{\"nome\":\"Ana Paula Lima\",\"cpf\":\"987.654.321-00\",\"email\":\"ana.lima@uni.br\"}",
        "anonymized_text": None,
        "entities": [
            {"type": "PERSON", "value": "[REDACTED]", "start": 9, "end": 24, "confidence": 0.94},
            {"type": "CPF", "value": "[REDACTED]", "start": 33, "end": 47, "confidence": 0.99},
            {"type": "EMAIL", "value": "[REDACTED]", "start": 58, "end": 74, "confidence": 0.97}
        ],
        "total_entities": 3,
        "risk_level": "high",
        "overall_risk_level": "high",
        "anonymization_status": "pending_review",
    },
    {
        "id": "d1000000-0000-0000-0000-000000000006",
        "source_type": "document",
        "file_name": "ata_reuniao_parceiros.pdf",
        "file_type": "pdf",
        "original_text_encrypted": "ENCRYPTED:Empresa XYZ, CNPJ 98.765.432/0001-10, representada por Pedro Oliveira",
        "anonymized_text": "Empresa XYZ, CNPJ [CNPJ_ANONIMIZADO], representada por [NOME_ANONIMIZADO]",
        "entities": [
            {"type": "CNPJ", "value": "[REDACTED]", "start": 18, "end": 36, "confidence": 0.98},
            {"type": "PERSON", "value": "[REDACTED]", "start": 55, "end": 68, "confidence": 0.89}
        ],
        "total_entities": 2,
        "risk_level": "medium",
        "overall_risk_level": "medium",
        "anonymization_status": "anonymized",
    },
    {
        "id": "d1000000-0000-0000-0000-000000000007",
        "source_type": "spreadsheet",
        "file_name": "banco_contatos_industria.csv",
        "file_type": "csv",
        "original_text_encrypted": None,
        "anonymized_text": None,
        "entities": [],
        "total_entities": 0,
        "risk_level": "low",
        "overall_risk_level": "low",
        "anonymization_status": "no_pii_detected",
    },
    {
        "id": "d1000000-0000-0000-0000-000000000008",
        "source_type": "document",
        "file_name": "termo_confidencialidade.pdf",
        "file_type": "pdf",
        "original_text_encrypted": "ENCRYPTED:Signatário: Roberto Mendes, CPF 111.222.333-44, Tel (21) 3333-4444",
        "anonymized_text": None,
        "entities": [
            {"type": "PERSON", "value": "[REDACTED]", "start": 12, "end": 26, "confidence": 0.92},
            {"type": "CPF", "value": "[REDACTED]", "start": 33, "end": 47, "confidence": 0.99},
            {"type": "PHONE", "value": "[REDACTED]", "start": 54, "end": 68, "confidence": 0.95}
        ],
        "total_entities": 3,
        "risk_level": "high",
        "overall_risk_level": "high",
        "anonymization_status": "pending_review",
    },
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def _has_columns(conn, table: str, cols: Iterable[str]) -> bool:
    rows = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = :t"), {"t": table}).fetchall()
    existing = {r[0] for r in rows}
    return all(c in existing for c in cols)


def seed_for_tenant(conn, tenant_id: str) -> None:
    # Seed pii_detection_rules
    if _table_exists(conn, TABLE_RULES):
        if _has_columns(conn, TABLE_RULES, ["name", "pattern"]):
            for rule in DEFAULT_RULES:
                stmt = text(
                    """
                    INSERT INTO pii_detection_rules (id, tenant_id, name, pattern, description, created_at, updated_at)
                    SELECT :id, :tenant_id, :name, :pattern, :description, now(), now()
                    WHERE NOT EXISTS (SELECT 1 FROM pii_detection_rules WHERE tenant_id = :tenant_id AND name = :name)
                    """
                )
                params = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    "name": rule["name"],
                    "pattern": rule["pattern"],
                    "description": rule.get("description", "")
                }
                conn.execute(stmt, params)
            print(f"Seeded {len(DEFAULT_RULES)} PII detection rules for tenant {tenant_id}")
        else:
            print(f"Skipping {TABLE_RULES} seed: expected columns missing")
    else:
        print(f"Skipping {TABLE_RULES} seed: table not present")
    
    # Seed pii_detections
    if _table_exists(conn, TABLE_DETECTIONS):
        if _has_columns(conn, TABLE_DETECTIONS, ["source_type", "file_name", "entities"]):
            creator = conn.execute(
                text("SELECT id FROM users WHERE tenant_id = :tenant_id LIMIT 1"),
                {"tenant_id": tenant_id}
            ).scalar()
            if not creator:
                creator = tenant_id
            
            for det in DEFAULT_DETECTIONS:
                stmt = text(
                    """
                    INSERT INTO pii_detections (
                        id, tenant_id, source_type, file_name, file_type,
                        original_text_encrypted, anonymized_text, entities, total_entities,
                        risk_level, overall_risk_level, anonymization_status,
                        created_at, updated_at, created_by, updated_by, version
                    )
                    SELECT 
                        :id, :tenant_id, :source_type, :file_name, :file_type,
                        :original_text_encrypted, :anonymized_text, :entities::jsonb, :total_entities,
                        :risk_level, :overall_risk_level, :anonymization_status,
                        now(), now(), :created_by, :created_by, 1
                    WHERE NOT EXISTS (
                        SELECT 1 FROM pii_detections WHERE id = :id
                    )
                    """
                )
                params = {
                    "id": det["id"],
                    "tenant_id": tenant_id,
                    "source_type": det["source_type"],
                    "file_name": det["file_name"],
                    "file_type": det["file_type"],
                    "original_text_encrypted": det.get("original_text_encrypted"),
                    "anonymized_text": det.get("anonymized_text"),
                    "entities": json.dumps(det["entities"]),
                    "total_entities": det["total_entities"],
                    "risk_level": det["risk_level"],
                    "overall_risk_level": det["overall_risk_level"],
                    "anonymization_status": det["anonymization_status"],
                    "created_by": str(creator),
                }
                conn.execute(stmt, params)
            print(f"Seeded {len(DEFAULT_DETECTIONS)} PII detections for tenant {tenant_id}")
        else:
            print(f"Skipping {TABLE_DETECTIONS} seed: expected columns missing")
    else:
        print(f"Skipping {TABLE_DETECTIONS} seed: table not present")


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
