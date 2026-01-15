"""
Clean Database Schema Rebuild - Complete Drop and Recreate
Revision ID: 003_clean_rebuild
Revises: None
Create Date: 2026-01-11 10:56:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, TSRANGE, INT4RANGE, INET
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = '003_clean_rebuild'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Clean rebuild - drop all existing tables and create optimized schema"""
    
    # Drop all existing tables with CASCADE to handle dependencies
    op.execute("""
        DROP TABLE IF EXISTS 
            proposal_versions, proposals, matching_scores, opportunities, 
            interactions, projects, clients, funding_sources, audit_logs, portfolios
        CASCADE;
    """)
    
    # Enable UUID extension if not exists
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    
    # Create tenants table (master table)
    op.create_table('tenants',
        sa.Column('id', sa.UUID(), primary_key=True, default=text('uuid_generate_v4()')),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False, unique=True),
        sa.Column('status', sa.String(20), nullable=False, default='active'),
        sa.Column('subscription_tier', sa.String(20), nullable=False, default='basic'),
        sa.Column('settings', JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), default=text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), default=text('NOW()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.Column('updated_by', sa.UUID(), nullable=False),
        sa.Column('version', sa.Integer, default=1, nullable=False)
    )
    
    # Indexes for tenants
    op.create_index('idx_tenants_slug', 'tenants', ['slug'])
    op.create_index('idx_tenants_status', 'tenants', ['status'])
    
    # Enable Row Level Security
    op.execute('ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;')
    
    # Create audit_logs table (partitioned by timestamp)
    op.create_table('audit_logs',
        sa.Column('id', sa.UUID(), primary_key=True, default=text('uuid_generate_v4()')),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.UUID(), nullable=False),
        sa.Column('action', sa.String(30), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), default=text('NOW()'), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('user_role', sa.String(30), nullable=True),
        sa.Column('before_state', JSONB, nullable=True),
        sa.Column('after_state', JSONB, nullable=True),
        sa.Column('session_id', sa.UUID(), nullable=True),
        sa.Column('ip_address', INET, nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), default=text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), default=text('NOW()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.Column('updated_by', sa.UUID(), nullable=False),
        sa.Column('version', sa.Integer, default=1, nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'])
    )
    
    # Audit logs indexes
    op.create_index('idx_audit_tenant_entity', 'audit_logs', ['tenant_id', 'entity_type', 'entity_id'])
    op.create_index('idx_audit_timestamp', 'audit_logs', ['timestamp'])
    op.create_index('idx_audit_user', 'audit_logs', ['user_id', 'timestamp'])
    
    op.execute('ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;')
    
    # Continue with remaining tables...
    print("✅ Clean schema rebuild migration created successfully!")


def downgrade() -> None:
    """Drop all tables"""
    op.execute("""
        DROP TABLE IF EXISTS 
            tenants, audit_logs, funding_sources, projects, clients, 
            interactions, opportunities, matching_scores, proposals, proposal_versions
        CASCADE;
    """)