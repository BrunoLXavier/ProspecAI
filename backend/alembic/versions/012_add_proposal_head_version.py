"""
Add head_version_id column to proposals

Revision ID: 012_add_proposal_head_version
Revises: 011_add_proposal_current_version
Create Date: 2026-01-15 00:30:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision = '012_add_proposal_head_version'
down_revision = '011_add_proposal_current_version'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    table_exists = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='proposals')")).scalar()
    if not table_exists:
        print("ℹ️ proposals table does not exist; skipping migration 012.")
        return

    col_exists = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='proposals' AND column_name='head_version_id')")).scalar()
    if col_exists:
        print("ℹ️ proposals.head_version_id already exists; skipping.")
        return

    # Add `head_version_id` UUID column to proposals (nullable)
    op.add_column(
        'proposals',
        sa.Column('head_version_id', sa.Uuid(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('proposals', 'head_version_id')
