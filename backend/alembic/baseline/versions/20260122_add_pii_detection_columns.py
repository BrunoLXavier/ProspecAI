"""add missing pii_detections columns expected by code

Revision ID: 20260122_add_pii_detection_columns
Revises: 20260121_add_pii_document_id
Create Date: 2026-01-21 00:10:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260122_add_pii_detection_columns'
down_revision = '20260121_add_pii_document_id'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(sa.text("""
    DO $$
    BEGIN
        -- ingestion_source_id
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='ingestion_source_id') THEN
            ALTER TABLE pii_detections ADD COLUMN ingestion_source_id uuid NULL;
            CREATE INDEX IF NOT EXISTS idx_pii_detections_ingestion_source_id ON pii_detections (ingestion_source_id);
        END IF;
        -- file_name and file_type
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='file_name') THEN
            ALTER TABLE pii_detections ADD COLUMN file_name varchar(300) NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='file_type') THEN
            ALTER TABLE pii_detections ADD COLUMN file_type varchar(50) NULL;
        END IF;
        -- total_entities, overall_risk_level, risk_summary
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='total_entities') THEN
            ALTER TABLE pii_detections ADD COLUMN total_entities integer DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='overall_risk_level') THEN
            ALTER TABLE pii_detections ADD COLUMN overall_risk_level varchar(20) DEFAULT 'low';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='risk_summary') THEN
            ALTER TABLE pii_detections ADD COLUMN risk_summary jsonb DEFAULT '{}'::jsonb;
        END IF;
        -- analysis metadata
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='analyzed_at') THEN
            ALTER TABLE pii_detections ADD COLUMN analyzed_at timestamptz NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='analysis_duration_ms') THEN
            ALTER TABLE pii_detections ADD COLUMN analysis_duration_ms integer DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='text_length') THEN
            ALTER TABLE pii_detections ADD COLUMN text_length integer DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='detection_methods') THEN
            ALTER TABLE pii_detections ADD COLUMN detection_methods jsonb DEFAULT '[]'::jsonb;
        END IF;
        -- reviewer_comment and anonymization tracking
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='reviewer_comment') THEN
            ALTER TABLE pii_detections ADD COLUMN reviewer_comment text NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='anonymized_by') THEN
            ALTER TABLE pii_detections ADD COLUMN anonymized_by uuid NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='anonymized_at') THEN
            ALTER TABLE pii_detections ADD COLUMN anonymized_at timestamptz NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='anonymization_error') THEN
            ALTER TABLE pii_detections ADD COLUMN anonymization_error text NULL;
        END IF;
    END
    $$;
    """))


def downgrade():
    conn = op.get_bind()
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='anonymization_error') THEN
            ALTER TABLE pii_detections DROP COLUMN IF EXISTS anonymization_error;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='anonymized_at') THEN
            ALTER TABLE pii_detections DROP COLUMN IF EXISTS anonymized_at;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='anonymized_by') THEN
            ALTER TABLE pii_detections DROP COLUMN IF EXISTS anonymized_by;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='reviewer_comment') THEN
            ALTER TABLE pii_detections DROP COLUMN IF EXISTS reviewer_comment;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='detection_methods') THEN
            ALTER TABLE pii_detections DROP COLUMN IF EXISTS detection_methods;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='text_length') THEN
            ALTER TABLE pii_detections DROP COLUMN IF EXISTS text_length;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='analysis_duration_ms') THEN
            ALTER TABLE pii_detections DROP COLUMN IF EXISTS analysis_duration_ms;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='analyzed_at') THEN
            ALTER TABLE pii_detections DROP COLUMN IF EXISTS analyzed_at;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='risk_summary') THEN
            ALTER TABLE pii_detections DROP COLUMN IF EXISTS risk_summary;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='overall_risk_level') THEN
            ALTER TABLE pii_detections DROP COLUMN IF EXISTS overall_risk_level;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='total_entities') THEN
            ALTER TABLE pii_detections DROP COLUMN IF EXISTS total_entities;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='file_type') THEN
            ALTER TABLE pii_detections DROP COLUMN IF EXISTS file_type;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='file_name') THEN
            ALTER TABLE pii_detections DROP COLUMN IF EXISTS file_name;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_detections' AND column_name='ingestion_source_id') THEN
            DROP INDEX IF EXISTS idx_pii_detections_ingestion_source_id;
            ALTER TABLE pii_detections DROP COLUMN IF EXISTS ingestion_source_id;
        END IF;
    END
    $$;
    """))
