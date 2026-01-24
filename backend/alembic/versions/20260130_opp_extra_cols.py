"""Add team_members, ai_priority_factors, matching_scores to opportunities.

Revision ID: 20260130_opp_extra_cols
Revises: 20260129_stage_changed
Create Date: 2026-01-30

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260130_opp_extra_cols'
down_revision = '20260129_stage_changed'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE opportunities 
        ADD COLUMN IF NOT EXISTS team_members jsonb DEFAULT '[]'::jsonb;
    """)
    print("✓ Added team_members column to opportunities")
    
    op.execute("""
        ALTER TABLE opportunities 
        ADD COLUMN IF NOT EXISTS ai_priority_factors jsonb DEFAULT '{}'::jsonb;
    """)
    print("✓ Added ai_priority_factors column to opportunities")
    
    op.execute("""
        ALTER TABLE opportunities 
        ADD COLUMN IF NOT EXISTS matching_scores jsonb DEFAULT '{}'::jsonb;
    """)
    print("✓ Added matching_scores column to opportunities")


def downgrade() -> None:
    op.execute("ALTER TABLE opportunities DROP COLUMN IF EXISTS team_members;")
    op.execute("ALTER TABLE opportunities DROP COLUMN IF EXISTS ai_priority_factors;")
    op.execute("ALTER TABLE opportunities DROP COLUMN IF EXISTS matching_scores;")
