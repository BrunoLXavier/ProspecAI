"""add version column to opportunities

Revision ID: 20260131_opp_version
Revises: 20260130_opp_extra_cols
Create Date: 2026-01-31 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '20260131_opp_version'
down_revision = '20260130_opp_extra_cols'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add version column to opportunities table."""
    conn = op.get_bind()
    result = conn.execute(sa.text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'opportunities' 
          AND column_name = 'version'
    """))
    if result.fetchone() is None:
        op.add_column('opportunities',
            sa.Column('version', sa.Integer(), nullable=True, server_default='1')
        )
        print("✓ Added version column to opportunities")
    else:
        print("→ version column already exists in opportunities")


def downgrade() -> None:
    """Remove version column from opportunities table."""
    op.drop_column('opportunities', 'version')
