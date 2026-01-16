"""
Add current_status column to proposals

Revision ID: 010_add_proposal_current_status
Revises: 009_add_admin_role
Create Date: 2026-01-15 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '010_add_proposal_current_status'
down_revision = '009_add_admin_role'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add `current_status` with a sensible default, then remove server_default
    op.add_column(
        'proposals',
        sa.Column('current_status', sa.String(length=30), nullable=False, server_default='draft')
    )
    # Remove server_default to match model's behavior (default handled in application)
    op.alter_column('proposals', 'current_status', server_default=None)


def downgrade() -> None:
    op.drop_column('proposals', 'current_status')
