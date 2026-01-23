"""add deleted_at to feedbacks if missing

Revision ID: 20260124_add_feedback_deleted_at
Revises: 20260123_add_funding_execution_columns
Create Date: 2026-01-21 12:30:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260124_add_feedback_deleted_at'
down_revision = '20260123_funding_exec'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='deleted_at') THEN
            ALTER TABLE feedbacks ADD COLUMN deleted_at timestamptz NULL;
            CREATE INDEX IF NOT EXISTS idx_feedbacks_deleted_at ON feedbacks (deleted_at);
        END IF;
    END
    $$;
    """))


def downgrade():
    conn = op.get_bind()
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='deleted_at') THEN
            DROP INDEX IF EXISTS idx_feedbacks_deleted_at;
            ALTER TABLE feedbacks DROP COLUMN IF EXISTS deleted_at;
        END IF;
    END
    $$;
    """))
