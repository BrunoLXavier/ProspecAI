"""Add missing columns: probability_score and execution_period.

Revision ID: 20260128_add_missing_columns2
Revises: 20260127_institution
Create Date: 2026-01-28

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260128_add_missing_columns2'
down_revision = '20260127_institution'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add probability_score to opportunities (if not exists)
    op.execute("""
        ALTER TABLE opportunities 
        ADD COLUMN IF NOT EXISTS probability_score numeric(3, 2) DEFAULT 0.5;
    """)
    print("✓ Added probability_score column to opportunities")
    
    # Add execution_period to funding_sources (if not exists)
    op.execute("""
        ALTER TABLE funding_sources 
        ADD COLUMN IF NOT EXISTS execution_period varchar(300) DEFAULT '';
    """)
    print("✓ Added execution_period column to funding_sources")


def downgrade() -> None:
    op.execute("ALTER TABLE opportunities DROP COLUMN IF EXISTS probability_score;")
    op.execute("ALTER TABLE funding_sources DROP COLUMN IF EXISTS execution_period;")
