"""Add equipamentos JSON column to infrastructures

Revision ID: 20260222_add_equipamentos_infrastructures
Revises: 20260202_institute_management
Create Date: 2026-02-22 10:00:00

This migration adds a JSON column `equipamentos` to the `infrastructures` table to
store structured equipment data related to each infrastructure.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260222_equipamentos'
down_revision = '20260202_institute_management'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # Add column if it does not already exist (idempotent)
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'infrastructures' AND column_name = 'equipamentos'
        ) THEN
            ALTER TABLE infrastructures ADD COLUMN equipamentos json DEFAULT '[]'::json;
        END IF;
    END
    $$;
    """))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'infrastructures' AND column_name = 'equipamentos'
        ) THEN
            ALTER TABLE infrastructures DROP COLUMN equipamentos;
        END IF;
    END
    $$;
    """))
