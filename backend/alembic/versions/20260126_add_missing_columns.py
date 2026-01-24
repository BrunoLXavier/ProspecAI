"""Add missing columns to various tables

This migration adds missing columns that are referenced by ORM models but
don't exist in the database schema.

Columns being added:
- opportunities.probability: Probability score for opportunities
- funding_sources.deleted_at: Soft delete timestamp (missing from BaseModel inheritance)
- projects.deleted_at: Soft delete timestamp (missing from BaseModel inheritance)

Revision ID: 20260126_add_missing_columns
Revises: 20260125_add_opportunity_fields
Create Date: 2026-01-24 12:00:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260126_add_missing_columns'
down_revision = '20260125_add_opportunity_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # Add probability column to opportunities
    try:
        conn.execute(sa.text("""
        ALTER TABLE opportunities
        ADD COLUMN IF NOT EXISTS probability numeric(3, 2) DEFAULT 0.5;
        """))
        print("✓ Added probability column to opportunities")
    except Exception as e:
        print(f"⚠ Error adding probability to opportunities: {e}")
    
    # Add deleted_at to funding_sources
    try:
        conn.execute(sa.text("""
        ALTER TABLE funding_sources
        ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
        """))
        print("✓ Added deleted_at column to funding_sources")
    except Exception as e:
        print(f"⚠ Error adding deleted_at to funding_sources: {e}")
    
    # Add deleted_at to projects
    try:
        conn.execute(sa.text("""
        ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
        """))
        print("✓ Added deleted_at column to projects")
    except Exception as e:
        print(f"⚠ Error adding deleted_at to projects: {e}")


def downgrade() -> None:
    conn = op.get_bind()
    
    try:
        conn.execute(sa.text("""
        ALTER TABLE opportunities DROP COLUMN IF EXISTS probability;
        ALTER TABLE funding_sources DROP COLUMN IF EXISTS deleted_at;
        ALTER TABLE projects DROP COLUMN IF EXISTS deleted_at;
        """))
        print("✓ Removed added columns")
    except Exception as e:
        print(f"⚠ Error removing columns: {e}")
