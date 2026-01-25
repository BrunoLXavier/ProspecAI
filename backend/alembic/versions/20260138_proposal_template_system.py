"""Proposal Template System - Dynamic Fields and Auto-Fill

Implements RF-08: Dynamic proposal fields based on funding source type
- proposal_templates: Template definitions linked to funding sources
- proposal_field_templates: Field definitions for each template
- proposal_field_values: Normalized field value storage
- proposal_attachments: File attachments with extraction status
- auto_fill_suggestions: AI suggestions pending human confirmation

Revision ID: 20260138
Revises: 20260137_notifications_reports
Create Date: 2026-01-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '20260138'
down_revision = '20260137_notifications_reports'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create proposal_templates table
    op.create_table(
        'proposal_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=False),
        
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('template_type', sa.String(50), nullable=False, server_default='generic'),
        
        sa.Column('funding_source_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('is_default', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('version', sa.Integer, nullable=False, server_default='1'),
        
        sa.Column('sections', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('include_standard_fields', sa.Boolean, nullable=False, server_default='true'),
    )
    op.create_index('idx_template_type', 'proposal_templates', ['template_type'])
    op.create_index('idx_template_active_default', 'proposal_templates', ['is_active', 'is_default'])
    
    # Create proposal_field_templates table
    op.create_table(
        'proposal_field_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=False),
        
        sa.Column('template_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('field_key', sa.String(100), nullable=False),
        sa.Column('label', sa.String(200), nullable=False),
        sa.Column('field_type', sa.String(50), nullable=False),
        
        sa.Column('required', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('order', sa.Integer, nullable=False, server_default='0'),
        sa.Column('section', sa.String(100), nullable=False, server_default="'general'"),
        
        sa.Column('min_length', sa.Integer, nullable=True),
        sa.Column('max_length', sa.Integer, nullable=True),
        sa.Column('min_value', sa.Numeric(20, 4), nullable=True),
        sa.Column('max_value', sa.Numeric(20, 4), nullable=True),
        sa.Column('pattern', sa.String(500), nullable=True),
        
        sa.Column('options', postgresql.JSONB, nullable=True),
        sa.Column('depends_on_field', sa.String(100), nullable=True),
        sa.Column('depends_on_value', postgresql.JSONB, nullable=True),
        sa.Column('nested_fields', postgresql.JSONB, nullable=True),
        
        sa.Column('placeholder', sa.String(500), nullable=True),
        sa.Column('help_text', sa.Text, nullable=True),
        sa.Column('width', sa.String(20), nullable=False, server_default="'full'"),
        
        sa.Column('auto_fill_enabled', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('auto_fill_prompt', sa.Text, nullable=True),
    )
    op.create_index('idx_field_template_order', 'proposal_field_templates', ['template_id', 'order'])
    op.create_index('idx_field_template_section', 'proposal_field_templates', ['template_id', 'section'])
    op.create_unique_constraint('uq_template_field_key', 'proposal_field_templates', ['template_id', 'field_key'])
    
    # Create proposal_field_values table
    op.create_table(
        'proposal_field_values',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=False),
        
        sa.Column('proposal_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('version_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('field_key', sa.String(100), nullable=False),
        
        sa.Column('value', postgresql.JSONB, nullable=True),
        
        sa.Column('extracted_from_file', sa.String(500), nullable=True),
        sa.Column('extraction_confidence', sa.Numeric(3, 2), nullable=True),
        
        sa.Column('is_confirmed', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('confirmed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        
        sa.Column('previous_value', postgresql.JSONB, nullable=True),
    )
    op.create_index('idx_field_value_proposal_key', 'proposal_field_values', ['proposal_id', 'field_key'])
    op.create_index('idx_field_value_version_key', 'proposal_field_values', ['proposal_id', 'version_id', 'field_key'])
    op.create_index('idx_field_value_confirmed', 'proposal_field_values', ['proposal_id', 'is_confirmed'])
    
    # Create proposal_attachments table
    op.create_table(
        'proposal_attachments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=False),
        
        sa.Column('proposal_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('version_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        
        sa.Column('file_key', sa.String(500), nullable=False),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('file_type', sa.String(100), nullable=False),
        sa.Column('file_size', sa.Integer, nullable=False),
        
        sa.Column('extraction_status', sa.String(20), nullable=False, server_default="'pending'"),
        sa.Column('extraction_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('extraction_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('extraction_error', sa.Text, nullable=True),
        
        sa.Column('extracted_text', sa.Text, nullable=True),
        sa.Column('extracted_fields', postgresql.JSONB, nullable=True, server_default='{}'),
    )
    op.create_index('idx_attachment_proposal', 'proposal_attachments', ['proposal_id'])
    op.create_index('idx_attachment_status', 'proposal_attachments', ['extraction_status'])
    
    # Create auto_fill_suggestions table
    op.create_table(
        'auto_fill_suggestions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=False),
        
        sa.Column('proposal_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('attachment_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('field_key', sa.String(100), nullable=False),
        
        sa.Column('suggested_value', postgresql.JSONB, nullable=True),
        sa.Column('confidence_score', sa.Numeric(3, 2), nullable=False),
        
        sa.Column('source_text', sa.Text, nullable=True),
        sa.Column('source_page', sa.Integer, nullable=True),
        
        sa.Column('status', sa.String(20), nullable=False, server_default="'pending'"),
        
        sa.Column('decided_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_suggestion_proposal_status', 'auto_fill_suggestions', ['proposal_id', 'status'])
    op.create_index('idx_suggestion_attachment', 'auto_fill_suggestions', ['attachment_id'])
    
    # Add template_id column to proposals table
    op.add_column('proposals', sa.Column('template_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index('idx_proposal_template', 'proposals', ['template_id'])
    
    # Add changes_summary column to proposal_versions table
    op.add_column('proposal_versions', sa.Column('changes_summary', sa.Text, nullable=True))


def downgrade() -> None:
    # Remove changes_summary from proposal_versions
    op.drop_column('proposal_versions', 'changes_summary')
    
    # Remove template_id from proposals
    op.drop_index('idx_proposal_template', table_name='proposals')
    op.drop_column('proposals', 'template_id')
    
    # Drop auto_fill_suggestions
    op.drop_index('idx_suggestion_attachment', table_name='auto_fill_suggestions')
    op.drop_index('idx_suggestion_proposal_status', table_name='auto_fill_suggestions')
    op.drop_table('auto_fill_suggestions')
    
    # Drop proposal_attachments
    op.drop_index('idx_attachment_status', table_name='proposal_attachments')
    op.drop_index('idx_attachment_proposal', table_name='proposal_attachments')
    op.drop_table('proposal_attachments')
    
    # Drop proposal_field_values
    op.drop_index('idx_field_value_confirmed', table_name='proposal_field_values')
    op.drop_index('idx_field_value_version_key', table_name='proposal_field_values')
    op.drop_index('idx_field_value_proposal_key', table_name='proposal_field_values')
    op.drop_table('proposal_field_values')
    
    # Drop proposal_field_templates
    op.drop_constraint('uq_template_field_key', 'proposal_field_templates', type_='unique')
    op.drop_index('idx_field_template_section', table_name='proposal_field_templates')
    op.drop_index('idx_field_template_order', table_name='proposal_field_templates')
    op.drop_table('proposal_field_templates')
    
    # Drop proposal_templates
    op.drop_index('idx_template_active_default', table_name='proposal_templates')
    op.drop_index('idx_template_type', table_name='proposal_templates')
    op.drop_table('proposal_templates')
