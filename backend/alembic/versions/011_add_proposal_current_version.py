"""
Add current_version column to proposals

Revision ID: 011_add_proposal_current_version
Revises: 010_add_proposal_current_status
Create Date: 2026-01-15 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '011_add_proposal_current_version'
down_revision = '010_add_proposal_current_status'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add `current_version` integer with a server default of 1 to avoid NOT NULL issues
    op.add_column(
        'proposals',
        sa.Column('current_version', sa.Integer(), nullable=False, server_default=sa.text('1'))
    )

    # Backfill from existing version_count if present
    op.execute("UPDATE proposals SET current_version = COALESCE(version_count, 1)")

    # Remove server_default to leave application-level default handling
    op.alter_column('proposals', 'current_version', server_default=None)


def downgrade() -> None:
    op.drop_column('proposals', 'current_version')
