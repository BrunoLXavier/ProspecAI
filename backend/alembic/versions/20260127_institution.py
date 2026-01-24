"""Add funding_sources.institution

Revision ID: 20260127_institution
Revises: 20260126_add_missing_columns
Create Date: 2026-01-24 13:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '20260127_institution'
down_revision = '20260126_add_missing_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    try:
        conn.execute(sa.text("""
        ALTER TABLE funding_sources
        ADD COLUMN IF NOT EXISTS institution varchar(300) NOT NULL DEFAULT '';
        """))
        print("✓ Added institution column to funding_sources")
    except Exception as e:
        print(f"⚠ Error: {e}")


def downgrade() -> None:
    conn = op.get_bind()
    try:
        conn.execute(sa.text("""
        ALTER TABLE funding_sources DROP COLUMN IF EXISTS institution;
        """))
    except Exception as e:
        print(f"⚠ Error: {e}")
