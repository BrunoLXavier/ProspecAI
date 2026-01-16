"""
Add last_ai_check column to proposals

Revision ID: 014_add_prop_last_ai
Revises: 013_add_prop_owner_adhr
Create Date: 2026-01-15 01:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '014_add_prop_last_ai'
down_revision = '013_add_prop_owner_adhr'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('proposals', sa.Column('last_ai_check', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('proposals', 'last_ai_check')
