"""Add missing proposal fields to match domain entity

This migration adds the missing fields to the proposals table that are
defined in the Proposal domain entity but were missing from the initial schema.

Fields being added:
- current_version_id: Reference to current version
- content: JSON content of proposal
- sections: JSON sections structure
- executive_summary: Executive summary text
- technical_content: Technical details
- budget_data: Budget information
- collaborators: List of collaborators
- locked_by: User who locked the proposal
- locked_at: When proposal was locked
- attachments: File attachments list
- submitted_at: When proposal was submitted
- tags: Tags for the proposal
- lessons_learned: Lessons learned JSON
- last_adherence_check: Last time adherence was checked

Revision ID: 20260124_add_proposal_fields
Revises: 20260123_consolidated
Create Date: 2026-01-24 10:00:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260124_add_proposal_fields'
down_revision = '20260123_consolidated'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # Add missing columns to proposals table
    try:
        conn.execute(sa.text("""
        ALTER TABLE proposals
        ADD COLUMN IF NOT EXISTS current_version_id uuid NULL,
        ADD COLUMN IF NOT EXISTS content jsonb NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS sections jsonb NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS executive_summary text NULL,
        ADD COLUMN IF NOT EXISTS technical_content text NULL,
        ADD COLUMN IF NOT EXISTS budget_data jsonb NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS collaborators jsonb NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS locked_by uuid NULL,
        ADD COLUMN IF NOT EXISTS locked_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS attachments jsonb NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS submitted_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS tags jsonb NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS lessons_learned jsonb NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS last_adherence_check timestamptz NULL;
        """))
        print("✓ Added missing columns to proposals table")
    except Exception as e:
        print(f"⚠ Error adding columns to proposals: {e}")
    
    # Rename last_ai_check to be consistent (if it exists and we're not using last_adherence_check)
    try:
        conn.execute(sa.text("SELECT last_ai_check FROM proposals LIMIT 1;"))
        # Column exists, so we can alias it in application code
        print("✓ last_ai_check column already exists")
    except Exception:
        pass


def downgrade() -> None:
    conn = op.get_bind()
    
    # Remove the added columns
    try:
        conn.execute(sa.text("""
        ALTER TABLE proposals
        DROP COLUMN IF EXISTS current_version_id,
        DROP COLUMN IF EXISTS content,
        DROP COLUMN IF EXISTS sections,
        DROP COLUMN IF EXISTS executive_summary,
        DROP COLUMN IF EXISTS technical_content,
        DROP COLUMN IF EXISTS budget_data,
        DROP COLUMN IF EXISTS collaborators,
        DROP COLUMN IF EXISTS locked_by,
        DROP COLUMN IF EXISTS locked_at,
        DROP COLUMN IF EXISTS attachments,
        DROP COLUMN IF EXISTS submitted_at,
        DROP COLUMN IF EXISTS tags,
        DROP COLUMN IF EXISTS lessons_learned,
        DROP COLUMN IF EXISTS last_adherence_check;
        """))
        print("✓ Removed proposal columns")
    except Exception as e:
        print(f"⚠ Error removing columns: {e}")
