"""
Add LLM Config, Ingestion Jobs, and PII Detection tables
Revision ID: 004_llm_ingestion_pii
Revises: 003_clean_rebuild
Create Date: 2026-01-12 12:00:00.000000

Implements: RF-01 (LGPD Agent), RF-07 (Chatbot)
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = '004_llm_ingestion_pii'
down_revision: Union[str, None] = '003_clean_rebuild'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create LLM Config, Ingestion, and PII Detection tables."""
    # If this migration has already been partially applied (tables exist), skip to avoid DuplicateTable errors
    conn = op.get_bind()
    exists = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'llm_configs')")).scalar()
    if exists:
        print("ℹ️ llm_configs table already exists; skipping migration 004 to avoid DuplicateTable")
        return
    
    # ==========================================================================
    # LLM CONFIGURATION TABLE
    # Stores encrypted API keys and provider settings for AI features
    # ==========================================================================
    op.create_table('llm_configs',
        sa.Column('id', UUID(), primary_key=True, server_default=text('uuid_generate_v4()')),
        sa.Column('tenant_id', UUID(), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),  # openai, ollama, azure, google
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('encrypted_api_key', sa.Text(), nullable=True),  # Fernet encrypted
        sa.Column('api_base_url', sa.String(500), nullable=True),  # For Ollama/Azure
        sa.Column('temperature', sa.Float(), default=0.7),
        sa.Column('max_tokens', sa.Integer(), default=2048),
        sa.Column('is_active', sa.Boolean(), default=False),
        sa.Column('test_status', sa.String(20), default='untested'),  # untested, success, failed
        sa.Column('last_test_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('test_error_message', sa.Text(), nullable=True),
        sa.Column('settings', JSONB, nullable=True),  # Additional provider-specific settings
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', UUID(), nullable=True),
        sa.Column('updated_by', UUID(), nullable=True),
        sa.Column('version', sa.Integer(), default=1, nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE')
    )
    
    # Indexes for llm_configs
    op.create_index('idx_llm_configs_tenant_active', 'llm_configs', ['tenant_id', 'is_active'])
    op.create_index('idx_llm_configs_provider', 'llm_configs', ['provider'])
    
    # Row Level Security
    op.execute('ALTER TABLE llm_configs ENABLE ROW LEVEL SECURITY;')
    
    # ==========================================================================
    # INGESTION JOBS TABLE
    # Tracks batch data ingestion jobs with progress monitoring
    # ==========================================================================
    op.create_table('ingestion_jobs',
        sa.Column('id', UUID(), primary_key=True, server_default=text('uuid_generate_v4()')),
        sa.Column('tenant_id', UUID(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, default='pending'),
        # Status: pending, validating, processing, pii_detection, completed, failed, cancelled
        sa.Column('source_type', sa.String(50), nullable=False),  # csv, excel, json, api, database
        sa.Column('total_files', sa.Integer(), default=0),
        sa.Column('processed_files', sa.Integer(), default=0),
        sa.Column('total_records', sa.Integer(), default=0),
        sa.Column('processed_records', sa.Integer(), default=0),
        sa.Column('failed_records', sa.Integer(), default=0),
        sa.Column('pii_detected_count', sa.Integer(), default=0),
        sa.Column('pii_anonymized_count', sa.Integer(), default=0),
        sa.Column('progress_percentage', sa.Float(), default=0.0),
        sa.Column('current_step', sa.String(100), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_details', JSONB, nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('settings', JSONB, nullable=True),  # Job-specific settings
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', UUID(), nullable=True),
        sa.Column('updated_by', UUID(), nullable=True),
        sa.Column('version', sa.Integer(), default=1, nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE')
    )
    
    # Indexes for ingestion_jobs
    op.create_index('idx_ingestion_jobs_tenant_status', 'ingestion_jobs', ['tenant_id', 'status'])
    op.create_index('idx_ingestion_jobs_created', 'ingestion_jobs', ['created_at'])
    
    # Row Level Security
    op.execute('ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;')
    
    # ==========================================================================
    # INGESTION SOURCES TABLE
    # Individual files/sources within an ingestion job
    # ==========================================================================
    op.create_table('ingestion_sources',
        sa.Column('id', UUID(), primary_key=True, server_default=text('uuid_generate_v4()')),
        sa.Column('tenant_id', UUID(), nullable=False),
        sa.Column('job_id', UUID(), nullable=False),
        sa.Column('source_type', sa.String(50), nullable=False),  # csv, excel, json, api
        sa.Column('file_type', sa.String(30), nullable=True),  # csv, xlsx, json, parquet
        sa.Column('file_name', sa.String(300), nullable=True),
        sa.Column('file_path', sa.String(1000), nullable=True),  # MinIO path
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, default='pending'),
        # Status: pending, processing, completed, failed
        sa.Column('total_records', sa.Integer(), default=0),
        sa.Column('processed_records', sa.Integer(), default=0),
        sa.Column('pii_detection_id', UUID(), nullable=True),  # Link to PII detection
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('metadata', JSONB, nullable=True),  # File metadata, column mappings
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', UUID(), nullable=True),
        sa.Column('updated_by', UUID(), nullable=True),
        sa.Column('version', sa.Integer(), default=1, nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['job_id'], ['ingestion_jobs.id'], ondelete='CASCADE')
    )
    
    # Indexes for ingestion_sources
    op.create_index('idx_ingestion_sources_job', 'ingestion_sources', ['job_id'])
    op.create_index('idx_ingestion_sources_tenant', 'ingestion_sources', ['tenant_id'])
    
    # Row Level Security
    op.execute('ALTER TABLE ingestion_sources ENABLE ROW LEVEL SECURITY;')
    
    # ==========================================================================
    # PII DETECTION TABLE
    # Stores PII analysis results for human review workflow
    # ==========================================================================
    op.create_table('pii_detections',
        sa.Column('id', UUID(), primary_key=True, server_default=text('uuid_generate_v4()')),
        sa.Column('tenant_id', UUID(), nullable=False),
        sa.Column('source_id', UUID(), nullable=True),  # Link to ingestion source
        sa.Column('source_type', sa.String(50), nullable=False),  # ingestion, manual, chatbot
        sa.Column('original_text_encrypted', sa.Text(), nullable=True),  # Fernet encrypted
        sa.Column('anonymized_text', sa.Text(), nullable=True),
        sa.Column('entities', JSONB, nullable=False),  # Array of detected PII entities
        # Entity structure: {type, value, start, end, confidence, suggested_strategy}
        sa.Column('risk_level', sa.String(20), nullable=False, default='medium'),  # low, medium, high, critical
        sa.Column('anonymization_status', sa.String(30), nullable=False, default='pending_review'),
        # Status: pending_review, approved, rejected, anonymized, failed
        sa.Column('anonymization_strategy', sa.String(50), nullable=True),  # mask, pseudonymize, remove, hash
        sa.Column('reviewed_by', UUID(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('auto_anonymize', sa.Boolean(), default=False),  # For low-risk auto-processing
        sa.Column('metadata', JSONB, nullable=True),  # Additional context
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', UUID(), nullable=True),
        sa.Column('updated_by', UUID(), nullable=True),
        sa.Column('version', sa.Integer(), default=1, nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE')
    )
    
    # Indexes for pii_detections
    op.create_index('idx_pii_detections_tenant_status', 'pii_detections', ['tenant_id', 'anonymization_status'])
    op.create_index('idx_pii_detections_risk', 'pii_detections', ['risk_level'])
    op.create_index('idx_pii_detections_source', 'pii_detections', ['source_id'])
    op.create_index('idx_pii_detections_pending', 'pii_detections', 
                    ['tenant_id', 'anonymization_status'],
                    postgresql_where=text("anonymization_status = 'pending_review'"))
    
    # Row Level Security
    op.execute('ALTER TABLE pii_detections ENABLE ROW LEVEL SECURITY;')
    
    # Add foreign key from ingestion_sources to pii_detections (circular reference)
    op.create_foreign_key(
        'fk_ingestion_sources_pii_detection',
        'ingestion_sources', 'pii_detections',
        ['pii_detection_id'], ['id'],
        ondelete='SET NULL'
    )
    
    print("✅ LLM Config, Ingestion, and PII Detection tables created successfully!")


def downgrade() -> None:
    """Drop the new tables."""
    # Drop foreign key first
    op.drop_constraint('fk_ingestion_sources_pii_detection', 'ingestion_sources', type_='foreignkey')
    
    # Drop tables in reverse order
    op.drop_table('pii_detections')
    op.drop_table('ingestion_sources')
    op.drop_table('ingestion_jobs')
    op.drop_table('llm_configs')
    
    print("✅ LLM Config, Ingestion, and PII Detection tables dropped!")
