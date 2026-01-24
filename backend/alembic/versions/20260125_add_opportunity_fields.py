"""Add missing opportunity fields to match domain entity

This migration adds the missing fields to the opportunities table that are
defined in the OpportunityModel but were missing from the initial schema.

Fields being added:
- project_id: Reference to portfolio project
- portfolio_id: Reference to portfolio
- score_formula: Formula for score calculation
- stage_history: History of stage transitions
- actual_close_date: Actual closing date

Revision ID: 20260125_add_opportunity_fields
Revises: 20260124_add_proposal_fields
Create Date: 2026-01-24 11:00:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260125_add_opportunity_fields'
down_revision = '20260124_add_proposal_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # Add missing columns to opportunities table
    try:
        conn.execute(sa.text("""
        ALTER TABLE opportunities
        ADD COLUMN IF NOT EXISTS project_id uuid NULL,
        ADD COLUMN IF NOT EXISTS portfolio_id uuid NULL,
        ADD COLUMN IF NOT EXISTS score_formula text NULL,
        ADD COLUMN IF NOT EXISTS stage_history jsonb NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS actual_close_date timestamptz NULL;
        """))
        print("✓ Added missing columns to opportunities table")
    except Exception as e:
        print(f"⚠ Error adding columns to opportunities: {e}")


def downgrade() -> None:
    conn = op.get_bind()
    
    # Remove the added columns
    try:
        conn.execute(sa.text("""
        ALTER TABLE opportunities
        DROP COLUMN IF EXISTS project_id,
        DROP COLUMN IF EXISTS portfolio_id,
        DROP COLUMN IF EXISTS score_formula,
        DROP COLUMN IF EXISTS stage_history,
        DROP COLUMN IF EXISTS actual_close_date;
        """))
        print("✓ Removed opportunity columns")
    except Exception as e:
        print(f"⚠ Error removing columns: {e}")
