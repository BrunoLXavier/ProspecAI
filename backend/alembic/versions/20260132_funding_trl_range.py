"""add trl_range column to funding_sources

Revision ID: 20260132_funding_trl_range
Revises: 20260131_opp_version
Create Date: 2026-01-31 01:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '20260132_funding_trl_range'
down_revision = '20260131_opp_version'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add trl_range column to funding_sources table."""
    conn = op.get_bind()
    result = conn.execute(sa.text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'funding_sources' 
          AND column_name = 'trl_range'
    """))
    if result.fetchone() is None:
        op.add_column('funding_sources',
            sa.Column('trl_range', sa.JSON(), nullable=True)
        )
        # Populate trl_range from trl_min and trl_max
        conn.execute(sa.text("""
            UPDATE funding_sources 
            SET trl_range = jsonb_build_array(trl_min, trl_max)
            WHERE trl_min IS NOT NULL AND trl_max IS NOT NULL
        """))
        print("✓ Added trl_range column to funding_sources and populated from trl_min/trl_max")
    else:
        print("→ trl_range column already exists in funding_sources")


def downgrade() -> None:
    """Remove trl_range column from funding_sources table."""
    op.drop_column('funding_sources', 'trl_range')
