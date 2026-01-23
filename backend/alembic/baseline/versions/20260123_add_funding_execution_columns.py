"""add execution_start/execution_end to funding_sources if missing

Revision ID: 20260123_add_funding_execution_columns
Revises: 20260122_add_pii_detection_columns
Create Date: 2026-01-21 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260123_add_funding_execution_columns'
down_revision = '20260122_communications'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funding_sources' AND column_name='execution_start') THEN
            ALTER TABLE funding_sources ADD COLUMN execution_start timestamptz NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funding_sources' AND column_name='execution_end') THEN
            ALTER TABLE funding_sources ADD COLUMN execution_end timestamptz NULL;
        END IF;
    END
    $$;
    """))


def downgrade():
    conn = op.get_bind()
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funding_sources' AND column_name='execution_end') THEN
            ALTER TABLE funding_sources DROP COLUMN IF EXISTS execution_end;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funding_sources' AND column_name='execution_start') THEN
            ALTER TABLE funding_sources DROP COLUMN IF EXISTS execution_start;
        END IF;
    END
    $$;
    """))
