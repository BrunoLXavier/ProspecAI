"""
Add last_ai_check column to proposals

Revision ID: 014_add_prop_last_ai
Revises: 013_add_prop_owner_adhr
Create Date: 2026-01-15 01:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision = '014_add_prop_last_ai'
down_revision = '013_add_prop_owner_adhr'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    table_exists = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='proposals')")).scalar()
    if not table_exists:
        print("ℹ️ proposals table does not exist; skipping migration 014.")
        return

    if conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='proposals' AND column_name='last_ai_check')")).scalar():
        print("ℹ️ proposals.last_ai_check already exists; skipping.")
        return

    op.add_column('proposals', sa.Column('last_ai_check', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('proposals', 'last_ai_check')
