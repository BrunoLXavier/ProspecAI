"""
Fix missing tenants table and seed PII detection data

Revision ID: 007_fix_tenants_and_pii_seeds
Revises: 006_auth_tables_integration
Create Date: 2026-01-13 16:00:00.000000

This migration fixes:
1. Creates missing tenants table
2. Seeds default tenant
3. Seeds sample PII detection data for testing
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import text
import uuid
from datetime import datetime, timedelta

# revision identifiers, used by Alembic.
revision: str = '007_fix_tenants_and_pii_seeds'
down_revision: Union[str, None] = '006_auth_tables_integration'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Default tenant
DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001'


def upgrade() -> None:
    """Create tenants table and seed PII data."""
    
    # ==========================================================================
    # ENABLE UUID EXTENSION
    # ==========================================================================
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    
    # ==========================================================================
    # CREATE TENANTS TABLE (if not exists)
    # ==========================================================================
    
    # Check if tenants table exists
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tenants')"
    ))
    tenants_exists = result.scalar()
    
    if not tenants_exists:
        op.create_table('tenants',
            sa.Column('id', UUID(), primary_key=True, server_default=text('uuid_generate_v4()')),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('slug', sa.String(100), nullable=False, unique=True),
            sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
            sa.Column('subscription_tier', sa.String(50), nullable=True, default='basic'),
            sa.Column('settings', JSONB, nullable=True, server_default='{}'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
            sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        )
        
        # Create indexes
        op.create_index('idx_tenants_slug', 'tenants', ['slug'])
        op.create_index('idx_tenants_active', 'tenants', ['is_active'])
        
        # Enable RLS
        op.execute('ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;')
        
        print("✅ Tenants table created successfully!")
    else:
        print("ℹ️ Tenants table already exists, skipping creation.")
    
    # Ensure `is_active` column exists — some DBs may have a tenants table without this column
    is_active_exists = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='tenants' AND column_name='is_active')")).scalar()
    if not is_active_exists:
        op.add_column('tenants', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')))
        try:
            op.create_index('idx_tenants_active', 'tenants', ['is_active'])
        except Exception:
            # index may already exist in some schemas; ignore
            pass
        print("✅ Added missing 'is_active' column to tenants and backfilled defaults.")
    
    # ==========================================================================
    # SEED DEFAULT TENANT
    # ==========================================================================
    # Inspect NOT NULL columns without defaults and set safe defaults before inserting
    problematic = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='tenants' AND is_nullable='NO' AND column_default IS NULL")).fetchall()
    skip_cols = {'id', 'name', 'slug', 'created_at', 'updated_at'}
    for col_name, data_type in problematic:
        if col_name in skip_cols:
            continue
        # Determine a safe default based on data type
        if data_type in ('character varying', 'text'):
            default_sql = "'active'"
        elif data_type in ('uuid'):
            default_sql = f"'{DEFAULT_TENANT_ID}'::uuid"
        elif data_type in ('integer', 'bigint', 'smallint'):
            default_sql = '0'
        elif data_type.startswith('timestamp'):
            default_sql = 'NOW()'
        elif data_type == 'boolean':
            default_sql = 'true'
        else:
            default_sql = "'active'"

        # Apply default and backfill existing rows
        op.execute(text(f"ALTER TABLE tenants ALTER COLUMN {col_name} SET DEFAULT {default_sql};"))
        conn.execute(text(f"UPDATE tenants SET {col_name} = {default_sql} WHERE {col_name} IS NULL;"))
        op.execute(text(f"ALTER TABLE tenants ALTER COLUMN {col_name} SET NOT NULL;"))

    # Now perform a minimal, safe insert using known columns
    insert_sql = f"INSERT INTO tenants (id, name, slug, is_active, subscription_tier, created_at, updated_at) VALUES ('{DEFAULT_TENANT_ID}'::uuid, 'SENAI ProspecAI', 'senai-prospecai', true, 'enterprise', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;"
    conn.execute(text(insert_sql))
    
    print("✅ Default tenant seeded!")
    
    # ==========================================================================
    # UPDATE EXISTING TABLES WITH tenant_id IF NULL
    # ==========================================================================
    
    # Update users with default tenant if null
    op.execute(text(f"""
        UPDATE users SET tenant_id = '{DEFAULT_TENANT_ID}'::uuid WHERE tenant_id IS NULL;
    """))
    
    # ==========================================================================
    # SEED PII DETECTION DATA FOR TESTING
    # ==========================================================================
    
    # Generate sample PII detection records
    pii_seeds = [
        {
            'id': str(uuid.uuid4()),
            'file_name': 'proposta_cliente_alfa.pdf',
            'file_type': 'pdf',
            'overall_risk_level': 'high',
            'anonymization_status': 'pending_review',
            'total_entities': 3,
            'entities': [
                {'id': str(uuid.uuid4()), 'pii_type': 'cpf', 'original_value': '123.456.789-00', 'start_position': 45, 'end_position': 59, 'confidence': 0.98, 'risk_level': 'high', 'detection_method': 'pattern'},
                {'id': str(uuid.uuid4()), 'pii_type': 'person', 'original_value': 'João da Silva Santos', 'start_position': 10, 'end_position': 30, 'confidence': 0.95, 'risk_level': 'medium', 'detection_method': 'ner'},
                {'id': str(uuid.uuid4()), 'pii_type': 'email', 'original_value': 'joao.silva@email.com', 'start_position': 120, 'end_position': 140, 'confidence': 0.99, 'risk_level': 'medium', 'detection_method': 'pattern'},
            ],
        },
        {
            'id': str(uuid.uuid4()),
            'file_name': 'contrato_empresa_beta.docx',
            'file_type': 'docx',
            'overall_risk_level': 'critical',
            'anonymization_status': 'pending_review',
            'total_entities': 2,
            'entities': [
                {'id': str(uuid.uuid4()), 'pii_type': 'cnpj', 'original_value': '12.345.678/0001-90', 'start_position': 200, 'end_position': 218, 'confidence': 0.97, 'risk_level': 'high', 'detection_method': 'pattern'},
                {'id': str(uuid.uuid4()), 'pii_type': 'phone', 'original_value': '(11) 98765-4321', 'start_position': 340, 'end_position': 355, 'confidence': 0.92, 'risk_level': 'medium', 'detection_method': 'pattern'},
            ],
        },
        {
            'id': str(uuid.uuid4()),
            'file_name': 'planilha_funcionarios.xlsx',
            'file_type': 'xlsx',
            'overall_risk_level': 'critical',
            'anonymization_status': 'pending_review',
            'total_entities': 4,
            'entities': [
                {'id': str(uuid.uuid4()), 'pii_type': 'credit_card', 'original_value': '4111 **** **** 1234', 'start_position': 500, 'end_position': 519, 'confidence': 0.99, 'risk_level': 'critical', 'detection_method': 'pattern'},
                {'id': str(uuid.uuid4()), 'pii_type': 'cpf', 'original_value': '987.654.321-00', 'start_position': 15, 'end_position': 29, 'confidence': 0.96, 'risk_level': 'high', 'detection_method': 'pattern'},
                {'id': str(uuid.uuid4()), 'pii_type': 'person', 'original_value': 'Maria Oliveira Santos', 'start_position': 50, 'end_position': 71, 'confidence': 0.97, 'risk_level': 'medium', 'detection_method': 'ner'},
                {'id': str(uuid.uuid4()), 'pii_type': 'email', 'original_value': 'maria.santos@empresa.com.br', 'start_position': 130, 'end_position': 157, 'confidence': 0.99, 'risk_level': 'medium', 'detection_method': 'pattern'},
            ],
        },
        {
            'id': str(uuid.uuid4()),
            'file_name': 'relatorio_pesquisa.pdf',
            'file_type': 'pdf',
            'overall_risk_level': 'low',
            'anonymization_status': 'approved',
            'anonymization_strategy': 'pseudonymize',
            'total_entities': 1,
            'entities': [
                {'id': str(uuid.uuid4()), 'pii_type': 'address', 'original_value': 'Rua das Flores, 123, São Paulo - SP', 'start_position': 80, 'end_position': 115, 'confidence': 0.88, 'risk_level': 'low', 'detection_method': 'ner'},
            ],
        },
        {
            'id': str(uuid.uuid4()),
            'file_name': 'cadastro_parceiro.json',
            'file_type': 'json',
            'overall_risk_level': 'high',
            'anonymization_status': 'anonymized',
            'anonymization_strategy': 'mask',
            'total_entities': 2,
            'entities': [
                {'id': str(uuid.uuid4()), 'pii_type': 'rg', 'original_value': '12.345.678-9', 'start_position': 25, 'end_position': 37, 'confidence': 0.91, 'risk_level': 'high', 'detection_method': 'pattern'},
                {'id': str(uuid.uuid4()), 'pii_type': 'date_of_birth', 'original_value': '15/03/1985', 'start_position': 60, 'end_position': 70, 'confidence': 0.85, 'risk_level': 'medium', 'detection_method': 'pattern'},
            ],
        },
        {
            'id': str(uuid.uuid4()),
            'file_name': 'log_acesso_sistema.csv',
            'file_type': 'csv',
            'overall_risk_level': 'low',
            'anonymization_status': 'rejected',
            'total_entities': 1,
            'entities': [
                {'id': str(uuid.uuid4()), 'pii_type': 'ip_address', 'original_value': '192.168.1.100', 'start_position': 150, 'end_position': 163, 'confidence': 0.94, 'risk_level': 'low', 'detection_method': 'pattern'},
            ],
        },
        {
            'id': str(uuid.uuid4()),
            'file_name': 'export_banco_dados.sql',
            'file_type': 'sql',
            'overall_risk_level': 'critical',
            'anonymization_status': 'pending_review',
            'total_entities': 4,
            'entities': [
                {'id': str(uuid.uuid4()), 'pii_type': 'cpf', 'original_value': '456.789.123-45', 'start_position': 30, 'end_position': 44, 'confidence': 0.97, 'risk_level': 'high', 'detection_method': 'pattern'},
                {'id': str(uuid.uuid4()), 'pii_type': 'phone', 'original_value': '(21) 99876-5432', 'start_position': 90, 'end_position': 105, 'confidence': 0.94, 'risk_level': 'medium', 'detection_method': 'pattern'},
                {'id': str(uuid.uuid4()), 'pii_type': 'bank_account', 'original_value': 'Ag: 1234 / CC: 56789-0', 'start_position': 200, 'end_position': 222, 'confidence': 0.93, 'risk_level': 'critical', 'detection_method': 'pattern'},
                {'id': str(uuid.uuid4()), 'pii_type': 'person', 'original_value': 'Carlos Alberto Pereira', 'start_position': 5, 'end_position': 27, 'confidence': 0.94, 'risk_level': 'medium', 'detection_method': 'ner'},
            ],
        },
        {
            'id': str(uuid.uuid4()),
            'file_name': 'ficha_inscricao.pdf',
            'file_type': 'pdf',
            'overall_risk_level': 'medium',
            'anonymization_status': 'approved',
            'anonymization_strategy': 'pseudonymize',
            'total_entities': 2,
            'entities': [
                {'id': str(uuid.uuid4()), 'pii_type': 'person', 'original_value': 'Ana Paula Costa', 'start_position': 10, 'end_position': 25, 'confidence': 0.96, 'risk_level': 'medium', 'detection_method': 'ner'},
                {'id': str(uuid.uuid4()), 'pii_type': 'address', 'original_value': 'Av. Brasil, 500, Apto 301, Rio de Janeiro - RJ', 'start_position': 45, 'end_position': 92, 'confidence': 0.89, 'risk_level': 'low', 'detection_method': 'ner'},
            ],
        },
        {
            'id': str(uuid.uuid4()),
            'file_name': 'dados_api_externa.json',
            'file_type': 'json',
            'overall_risk_level': 'low',
            'anonymization_status': 'approved',
            'anonymization_strategy': 'hash',
            'total_entities': 2,
            'entities': [
                {'id': str(uuid.uuid4()), 'pii_type': 'ip_address', 'original_value': '200.158.10.55', 'start_position': 80, 'end_position': 93, 'confidence': 0.95, 'risk_level': 'low', 'detection_method': 'pattern'},
                {'id': str(uuid.uuid4()), 'pii_type': 'ip_address', 'original_value': '189.40.120.200', 'start_position': 120, 'end_position': 134, 'confidence': 0.95, 'risk_level': 'low', 'detection_method': 'pattern'},
            ],
        },
        {
            'id': str(uuid.uuid4()),
            'file_name': 'formulario_pagamento.pdf',
            'file_type': 'pdf',
            'overall_risk_level': 'critical',
            'anonymization_status': 'pending_review',
            'total_entities': 2,
            'entities': [
                {'id': str(uuid.uuid4()), 'pii_type': 'credit_card', 'original_value': '5500 **** **** 5678', 'start_position': 150, 'end_position': 169, 'confidence': 0.99, 'risk_level': 'critical', 'detection_method': 'pattern'},
                {'id': str(uuid.uuid4()), 'pii_type': 'person', 'original_value': 'Roberto Fernandes Lima', 'start_position': 20, 'end_position': 42, 'confidence': 0.94, 'risk_level': 'medium', 'detection_method': 'ner'},
            ],
        },
        {
            'id': str(uuid.uuid4()),
            'file_name': 'proposta_comercial.docx',
            'file_type': 'docx',
            'overall_risk_level': 'low',
            'anonymization_status': 'rejected',
            'total_entities': 2,
            'entities': [
                {'id': str(uuid.uuid4()), 'pii_type': 'address', 'original_value': 'Rua XV de Novembro, 1500, Curitiba - PR, 80020-310', 'start_position': 200, 'end_position': 250, 'confidence': 0.87, 'risk_level': 'low', 'detection_method': 'ner'},
                {'id': str(uuid.uuid4()), 'pii_type': 'phone', 'original_value': '(41) 3333-4444', 'start_position': 280, 'end_position': 295, 'confidence': 0.93, 'risk_level': 'medium', 'detection_method': 'pattern'},
            ],
        },
        {
            'id': str(uuid.uuid4()),
            'file_name': 'contrato_servicos.pdf',
            'file_type': 'pdf',
            'overall_risk_level': 'high',
            'anonymization_status': 'anonymized',
            'anonymization_strategy': 'remove',
            'total_entities': 1,
            'entities': [
                {'id': str(uuid.uuid4()), 'pii_type': 'bank_account', 'original_value': 'Banco: 001 / Ag: 5678 / CC: 12345-6', 'start_position': 300, 'end_position': 335, 'confidence': 0.92, 'risk_level': 'critical', 'detection_method': 'pattern'},
            ],
        },
        {
            'id': str(uuid.uuid4()),
            'file_name': 'cadastro_clientes_lote.xlsx',
            'file_type': 'xlsx',
            'overall_risk_level': 'medium',
            'anonymization_status': 'pending_review',
            'total_entities': 3,
            'entities': [
                {'id': str(uuid.uuid4()), 'pii_type': 'cnpj', 'original_value': '98.765.432/0001-10', 'start_position': 100, 'end_position': 118, 'confidence': 0.98, 'risk_level': 'high', 'detection_method': 'pattern'},
                {'id': str(uuid.uuid4()), 'pii_type': 'email', 'original_value': 'contato@empresa.com.br', 'start_position': 150, 'end_position': 172, 'confidence': 0.99, 'risk_level': 'medium', 'detection_method': 'pattern'},
                {'id': str(uuid.uuid4()), 'pii_type': 'phone', 'original_value': '(31) 3456-7890', 'start_position': 200, 'end_position': 215, 'confidence': 0.91, 'risk_level': 'medium', 'detection_method': 'pattern'},
            ],
        },
        {
            'id': str(uuid.uuid4()),
            'file_name': 'importacao_legado.csv',
            'file_type': 'csv',
            'overall_risk_level': 'high',
            'anonymization_status': 'anonymization_failed',
            'total_entities': 3,
            'entities': [
                {'id': str(uuid.uuid4()), 'pii_type': 'cpf', 'original_value': '111.222.333-44', 'start_position': 10, 'end_position': 24, 'confidence': 0.96, 'risk_level': 'high', 'detection_method': 'pattern'},
                {'id': str(uuid.uuid4()), 'pii_type': 'rg', 'original_value': '98.765.432-1', 'start_position': 40, 'end_position': 52, 'confidence': 0.88, 'risk_level': 'high', 'detection_method': 'pattern'},
                {'id': str(uuid.uuid4()), 'pii_type': 'date_of_birth', 'original_value': '01/01/1990', 'start_position': 65, 'end_position': 75, 'confidence': 0.90, 'risk_level': 'medium', 'detection_method': 'pattern'},
            ],
        },
        {
            'id': str(uuid.uuid4()),
            'file_name': 'email_marketing_lista.csv',
            'file_type': 'csv',
            'overall_risk_level': 'medium',
            'anonymization_status': 'anonymized',
            'anonymization_strategy': 'mask',
            'total_entities': 2,
            'entities': [
                {'id': str(uuid.uuid4()), 'pii_type': 'email', 'original_value': 'cliente1@dominio.com', 'start_position': 5, 'end_position': 25, 'confidence': 0.99, 'risk_level': 'medium', 'detection_method': 'pattern'},
                {'id': str(uuid.uuid4()), 'pii_type': 'person', 'original_value': 'Fernando Souza', 'start_position': 30, 'end_position': 44, 'confidence': 0.93, 'risk_level': 'medium', 'detection_method': 'ner'},
            ],
        },
    ]
    
    import json
    
    for pii in pii_seeds:
        entities_json = json.dumps(pii['entities']).replace("'", "''")
        
        # Determine reviewed fields based on status
        reviewed_by = f"'{DEFAULT_TENANT_ID}'::uuid" if pii['anonymization_status'] in ['approved', 'rejected', 'anonymized', 'failed'] else "NULL"
        reviewed_at = "NOW() - INTERVAL '2 hours'" if pii['anonymization_status'] in ['approved', 'rejected', 'anonymized', 'failed'] else "NULL"
        reviewer_comment = "'Revisão manual realizada'" if pii['anonymization_status'] in ['approved', 'rejected'] else "NULL"
        
        anonymized_by = f"'{DEFAULT_TENANT_ID}'::uuid" if pii['anonymization_status'] == 'anonymized' else "NULL"
        anonymized_at = "NOW() - INTERVAL '1 hour'" if pii['anonymization_status'] == 'anonymized' else "NULL"
        anonymization_error = "'Erro ao processar arquivo - formato inválido'" if pii['anonymization_status'] == 'failed' else "NULL"
        
        strategy = f"'{pii.get('anonymization_strategy', 'mask')}'" if pii.get('anonymization_strategy') else "NULL"
        
        op.execute(text(f"""
            INSERT INTO pii_detections (
                id, tenant_id, file_name, file_type, overall_risk_level, 
                anonymization_status, anonymization_strategy, total_entities,
                entities, analyzed_at, analysis_duration_ms, text_length,
                detection_methods, risk_summary, reviewed_by, reviewed_at,
                reviewer_comment, anonymized_by, anonymized_at, anonymization_error,
                created_at, updated_at, created_by, updated_by
            ) VALUES (
                '{pii['id']}'::uuid,
                '{DEFAULT_TENANT_ID}'::uuid,
                '{pii['file_name']}',
                '{pii['file_type']}',
                '{pii['overall_risk_level']}',
                '{pii['anonymization_status']}',
                {strategy},
                {pii['total_entities']},
                '{entities_json}'::json,
                NOW() - INTERVAL '{len(pii_seeds)} hours',
                {150 + len(pii['entities']) * 50},
                {1000 + len(pii['entities']) * 200},
                '["pattern", "ner"]'::json,
                '{{"high": {sum(1 for e in pii["entities"] if e["risk_level"] == "high")}, "medium": {sum(1 for e in pii["entities"] if e["risk_level"] == "medium")}, "low": {sum(1 for e in pii["entities"] if e["risk_level"] == "low")}, "critical": {sum(1 for e in pii["entities"] if e["risk_level"] == "critical")}}}'::json,
                {reviewed_by},
                {reviewed_at},
                {reviewer_comment},
                {anonymized_by},
                {anonymized_at},
                {anonymization_error},
                NOW() - INTERVAL '{len(pii_seeds) + 1} hours',
                NOW(),
                '{DEFAULT_TENANT_ID}'::uuid,
                '{DEFAULT_TENANT_ID}'::uuid
            )
            ON CONFLICT (id) DO NOTHING;
        """))
    
    print(f"✅ {len(pii_seeds)} PII detection records seeded successfully!")


def downgrade() -> None:
    """Remove seeded data."""
    
    # Remove seeded PII detections
    op.execute(text(f"""
        DELETE FROM pii_detections WHERE tenant_id = '{DEFAULT_TENANT_ID}'::uuid;
    """))
    
    # Remove default tenant
    op.execute(text(f"""
        DELETE FROM tenants WHERE id = '{DEFAULT_TENANT_ID}'::uuid;
    """))
    
    # Drop tenants table if it was created by this migration
    # op.drop_table('tenants')  # Commented to avoid breaking other data
    
    print("✅ Seeded data removed!")
