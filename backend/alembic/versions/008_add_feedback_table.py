"""
Add feedback table for user feedback with screenshots and annotations

Revision ID: 008_add_feedback_table
Revises: 007_fix_tenants_and_pii_seeds
Create Date: 2026-01-14 10:00:00.000000

This migration creates:
1. feedbacks table with full audit trail
2. Indices for efficient querying
3. RLS policy for multi-tenant isolation
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = '008_add_feedback_table'
down_revision: Union[str, None] = '007_fix_tenants_and_pii_seeds'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create feedbacks table with indices and RLS."""

    # If the table already exists (e.g. created manually), skip to avoid
    # failing the migration. This keeps the migration idempotent.
    if op.get_context().dialect.has_table(op.get_context().bind, 'feedbacks'):
        return

    # ==========================================================================
    # CREATE FEEDBACKS TABLE
    # ==========================================================================
    
    op.create_table('feedbacks',
        # Primary key and tenant
        sa.Column('id', UUID(), primary_key=True, server_default=text('uuid_generate_v4()')),
        sa.Column('tenant_id', UUID(), nullable=False, index=True),
        
        # User identification
        sa.Column('user_id', UUID(), nullable=False, index=True),
        
        # Feedback content
        sa.Column('feedback_type', sa.String(50), nullable=False),  # bug_report, feature_request, ui_feedback, etc.
        sa.Column('severity', sa.String(20), nullable=False),  # low, medium, high, critical
        sa.Column('description', sa.String(500), nullable=False),  # Max 500 characters
        
        # Page context
        sa.Column('page_url', sa.Text(), nullable=False),
        sa.Column('page_title', sa.String(500), nullable=True),
        sa.Column('entity_type', sa.String(50), nullable=True),  # proposal, funding, crm, etc.
        sa.Column('entity_id', UUID(), nullable=True),
        
        # Screenshot and annotations stored in MinIO
        sa.Column('screenshot_url', sa.Text(), nullable=True),  # Original screenshot URL
        sa.Column('annotation_image_url', sa.Text(), nullable=True),  # Annotated screenshot PNG URL
        sa.Column('annotation_data', JSONB, nullable=True),  # JSON strokes for traceability
        
        # Browser/device context
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('screen_width', sa.Integer(), nullable=True),
        sa.Column('screen_height', sa.Integer(), nullable=True),
        
        # Status and workflow
        sa.Column('status', sa.String(20), nullable=False, server_default='open'),
        
        # Admin response
        sa.Column('response', sa.Text(), nullable=True),
        sa.Column('responded_by', UUID(), nullable=True),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        
        # Resolution
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        
        # Audit fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', UUID(), nullable=False),
        sa.Column('updated_by', UUID(), nullable=False),
    )
    
    # ==========================================================================
    # CREATE INDICES FOR PERFORMANCE
    # ==========================================================================
    
    # Composite indices for common query patterns
    op.create_index('idx_feedback_user_status', 'feedbacks', ['user_id', 'status'])
    op.create_index('idx_feedback_status_severity', 'feedbacks', ['status', 'severity'])
    op.create_index('idx_feedback_type_status', 'feedbacks', ['feedback_type', 'status'])
    op.create_index('idx_feedback_entity', 'feedbacks', ['entity_type', 'entity_id'])
    op.create_index('idx_feedback_created_at', 'feedbacks', ['created_at'])
    op.create_index('idx_feedback_tenant_deleted', 'feedbacks', ['tenant_id', 'deleted_at'])
    
    # ==========================================================================
    # ENABLE ROW-LEVEL SECURITY
    # ==========================================================================
    
    op.execute('ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;')
    
    # RLS Policy: Users can see their own feedback, admins can see all
    op.execute(text("""
        CREATE POLICY feedback_tenant_isolation ON feedbacks
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    """))
    
    # RLS Policy: Users can only insert their own feedback
    op.execute(text("""
        CREATE POLICY feedback_user_insert ON feedbacks
        FOR INSERT
        WITH CHECK (
            user_id = current_setting('app.current_user_id', true)::uuid
            AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
        );
    """))
    
    print("✅ Feedbacks table created successfully with RLS enabled!")


def downgrade() -> None:
    """Drop feedbacks table and related objects."""
    
    # Drop RLS policies
    op.execute('DROP POLICY IF EXISTS feedback_tenant_isolation ON feedbacks;')
    op.execute('DROP POLICY IF EXISTS feedback_user_insert ON feedbacks;')
    
    # Drop indices
    op.drop_index('idx_feedback_user_status', table_name='feedbacks')
    op.drop_index('idx_feedback_status_severity', table_name='feedbacks')
    op.drop_index('idx_feedback_type_status', table_name='feedbacks')
    op.drop_index('idx_feedback_entity', table_name='feedbacks')
    op.drop_index('idx_feedback_created_at', table_name='feedbacks')
    op.drop_index('idx_feedback_tenant_deleted', table_name='feedbacks')
    
    # Drop table
    op.drop_table('feedbacks')
    
    print("⬇️ Feedbacks table dropped successfully!")
