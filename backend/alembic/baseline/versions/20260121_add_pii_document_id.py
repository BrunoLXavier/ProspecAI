"""add pii_detections.document_id

Revision ID: 20260121_add_pii_document_id
Revises: 20260120_baseline_state
Create Date: 2026-01-21 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260121_add_pii_document_id'
down_revision = '20260120_baseline'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    # add column if not exists
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_name = 'pii_detections' AND column_name = 'document_id'
        ) THEN
            ALTER TABLE pii_detections ADD COLUMN document_id uuid NULL;
            CREATE INDEX IF NOT EXISTS idx_pii_detections_document_id ON pii_detections (document_id);
        END IF;
    END
    $$;
    """))


def downgrade():
    conn = op.get_bind()
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_name = 'pii_detections' AND column_name = 'document_id'
        ) THEN
            DROP INDEX IF EXISTS idx_pii_detections_document_id;
            ALTER TABLE pii_detections DROP COLUMN IF EXISTS document_id;
        END IF;
    END
    $$;
    """))
