"""Add stage_changed_at column to opportunities.

Revision ID: 20260129_stage_changed
Revises: 20260128_add_missing_columns2
Create Date: 2026-01-29

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260129_stage_changed'
down_revision = '20260128_add_missing_columns2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE opportunities 
        ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz NULL;
    """)
    print("✓ Added stage_changed_at column to opportunities")


def downgrade() -> None:
    op.execute("ALTER TABLE opportunities DROP COLUMN IF EXISTS stage_changed_at;")
