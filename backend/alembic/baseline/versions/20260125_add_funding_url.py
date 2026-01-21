"""add url to funding_sources if missing

Revision ID: 20260125_add_funding_url
Revises: 20260124_feedback_deleted_at
Create Date: 2026-01-21 12:45:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260125_funding_url'
down_revision = '20260124_feedback_deleted_at'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funding_sources' AND column_name='url') THEN
            ALTER TABLE funding_sources ADD COLUMN url varchar(1000) NULL;
        END IF;
    END
    $$;
    """))


def downgrade():
    conn = op.get_bind()
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funding_sources' AND column_name='url') THEN
            ALTER TABLE funding_sources DROP COLUMN IF EXISTS url;
        END IF;
    END
    $$;
    """))
