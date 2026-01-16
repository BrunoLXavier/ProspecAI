"""
Add head_version_id column to proposals

Revision ID: 012_add_proposal_head_version
Revises: 011_add_proposal_current_version
Create Date: 2026-01-15 00:30:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '012_add_proposal_head_version'
down_revision = '011_add_proposal_current_version'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add `head_version_id` UUID column to proposals (nullable)
    op.add_column(
        'proposals',
        sa.Column('head_version_id', sa.Uuid(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('proposals', 'head_version_id')
