# Implements RF-08: Git-like Versioning for Proposals
"""Add missing columns to proposal_versions table

Revision ID: 20260139_proposal_versions
Revises: 20260138_proposal_template_system
Create Date: 2026-01-25
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260139_proposal_versions'
down_revision: Union[str, None] = '20260138'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add missing columns to proposal_versions for RF-08 Git-like versioning:
    - tenant_id: Multi-tenant isolation
    - version_number: Renamed from 'version' for clarity
    - parent_version_id: Links to parent version in the chain
    - title: Snapshot of proposal title
    - content (Text): Replace JSONB with Text for main content
    - attachments: JSONB array of file references
    - author_id: Who created this version
    - commit_message: Git-like commit message
    - adherence_score: AI-calculated adherence score
    - adherence_details: AI analysis details
    - updated_at, deleted_at, updated_by: Standard audit fields
    """
    conn = op.get_bind()
    
    # Add new columns
    # tenant_id
    conn.execute(sa.text("""
        ALTER TABLE proposal_versions 
        ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
    """))
    
    # Rename version to version_number if it exists
    # Check if column exists first
    result = conn.execute(sa.text("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'proposal_versions' AND column_name = 'version';
    """))
    if result.fetchone():
        conn.execute(sa.text("""
            ALTER TABLE proposal_versions 
            RENAME COLUMN version TO version_number;
        """))
    
    # Add version_number if it doesn't exist
    conn.execute(sa.text("""
        ALTER TABLE proposal_versions 
        ADD COLUMN IF NOT EXISTS version_number integer;
    """))
    
    # parent_version_id
    conn.execute(sa.text("""
        ALTER TABLE proposal_versions 
        ADD COLUMN IF NOT EXISTS parent_version_id uuid REFERENCES proposal_versions(id);
    """))
    
    # title
    conn.execute(sa.text("""
        ALTER TABLE proposal_versions 
        ADD COLUMN IF NOT EXISTS title varchar(500);
    """))
    
    # attachments
    conn.execute(sa.text("""
        ALTER TABLE proposal_versions 
        ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
    """))
    
    # author_id (use created_by if exists)
    conn.execute(sa.text("""
        ALTER TABLE proposal_versions 
        ADD COLUMN IF NOT EXISTS author_id uuid;
    """))
    
    # commit_message
    conn.execute(sa.text("""
        ALTER TABLE proposal_versions 
        ADD COLUMN IF NOT EXISTS commit_message text;
    """))
    
    # adherence_score
    conn.execute(sa.text("""
        ALTER TABLE proposal_versions 
        ADD COLUMN IF NOT EXISTS adherence_score numeric(3,2);
    """))
    
    # adherence_details
    conn.execute(sa.text("""
        ALTER TABLE proposal_versions 
        ADD COLUMN IF NOT EXISTS adherence_details jsonb DEFAULT '{}'::jsonb;
    """))
    
    # updated_at
    conn.execute(sa.text("""
        ALTER TABLE proposal_versions 
        ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
    """))
    
    # deleted_at
    conn.execute(sa.text("""
        ALTER TABLE proposal_versions 
        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
    """))
    
    # updated_by
    conn.execute(sa.text("""
        ALTER TABLE proposal_versions 
        ADD COLUMN IF NOT EXISTS updated_by uuid;
    """))
    
    # version (for optimistic locking)
    conn.execute(sa.text("""
        ALTER TABLE proposal_versions 
        ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
    """))
    
    # Update tenant_id from proposals if null
    conn.execute(sa.text("""
        UPDATE proposal_versions pv
        SET tenant_id = p.tenant_id
        FROM proposals p
        WHERE pv.proposal_id = p.id AND pv.tenant_id IS NULL;
    """))
    
    # Update title from proposals if null
    conn.execute(sa.text("""
        UPDATE proposal_versions pv
        SET title = p.title
        FROM proposals p
        WHERE pv.proposal_id = p.id AND pv.title IS NULL;
    """))
    
    # Update author_id from created_by if null
    conn.execute(sa.text("""
        UPDATE proposal_versions 
        SET author_id = created_by
        WHERE author_id IS NULL AND created_by IS NOT NULL;
    """))
    
    # Note: content column remains as JSONB for backwards compatibility
    # The repository layer handles conversion to/from string as needed
    
    # Set default commit_message if null
    conn.execute(sa.text("""
        UPDATE proposal_versions 
        SET commit_message = 'Versão inicial'
        WHERE commit_message IS NULL;
    """))
    
    # Create indexes
    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS idx_proposal_versions_proposal 
        ON proposal_versions (proposal_id);
    """))
    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS idx_proposal_versions_tenant 
        ON proposal_versions (tenant_id);
    """))
    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS idx_proposal_versions_author 
        ON proposal_versions (author_id);
    """))
    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS idx_proposal_versions_parent 
        ON proposal_versions (parent_version_id);
    """))


def downgrade() -> None:
    """Remove the added columns"""
    conn = op.get_bind()
    
    # Drop indexes
    conn.execute(sa.text("DROP INDEX IF EXISTS idx_proposal_versions_parent;"))
    conn.execute(sa.text("DROP INDEX IF EXISTS idx_proposal_versions_author;"))
    conn.execute(sa.text("DROP INDEX IF EXISTS idx_proposal_versions_tenant;"))
    conn.execute(sa.text("DROP INDEX IF EXISTS idx_proposal_versions_proposal;"))
    
    # Drop columns
    conn.execute(sa.text("ALTER TABLE proposal_versions DROP COLUMN IF EXISTS version;"))
    conn.execute(sa.text("ALTER TABLE proposal_versions DROP COLUMN IF EXISTS updated_by;"))
    conn.execute(sa.text("ALTER TABLE proposal_versions DROP COLUMN IF EXISTS deleted_at;"))
    conn.execute(sa.text("ALTER TABLE proposal_versions DROP COLUMN IF EXISTS updated_at;"))
    conn.execute(sa.text("ALTER TABLE proposal_versions DROP COLUMN IF EXISTS adherence_details;"))
    conn.execute(sa.text("ALTER TABLE proposal_versions DROP COLUMN IF EXISTS adherence_score;"))
    conn.execute(sa.text("ALTER TABLE proposal_versions DROP COLUMN IF EXISTS commit_message;"))
    conn.execute(sa.text("ALTER TABLE proposal_versions DROP COLUMN IF EXISTS author_id;"))
    conn.execute(sa.text("ALTER TABLE proposal_versions DROP COLUMN IF EXISTS attachments;"))
    conn.execute(sa.text("ALTER TABLE proposal_versions DROP COLUMN IF EXISTS title;"))
    conn.execute(sa.text("ALTER TABLE proposal_versions DROP COLUMN IF EXISTS parent_version_id;"))
    conn.execute(sa.text("ALTER TABLE proposal_versions DROP COLUMN IF EXISTS tenant_id;"))
    
    # Rename version_number back to version
    result = conn.execute(sa.text("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'proposal_versions' AND column_name = 'version_number';
    """))
    if result.fetchone():
        conn.execute(sa.text("""
            ALTER TABLE proposal_versions 
            RENAME COLUMN version_number TO version;
        """))
