"""Add missing columns to clients table for CRM functionality

Revision ID: 20260133_clients_missing_cols
Revises: 20260132_funding_trl_range
Create Date: 2026-01-24 01:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision = '20260133_clients_missing_cols'
down_revision = '20260132_funding_trl_range'
branch_labels = None
depends_on = None


def upgrade():
    # Add all missing columns to clients table
    # Implements RF-04: CRM Inteligente
    
    # Size category for client classification
    op.add_column('clients', sa.Column('size_category', sa.String(100), nullable=True))
    
    # Encrypted PII fields for LGPD compliance
    op.add_column('clients', sa.Column('cnpj_encrypted', sa.Text(), nullable=True))
    op.add_column('clients', sa.Column('email_encrypted', sa.Text(), nullable=True))
    op.add_column('clients', sa.Column('phone_encrypted', sa.Text(), nullable=True))
    
    # Address data as JSON
    op.add_column('clients', sa.Column('address_data', JSON, nullable=True))
    
    # Auto-fill metadata for intelligent form completion
    op.add_column('clients', sa.Column('cnpj_data_source', sa.String(100), nullable=True))
    op.add_column('clients', sa.Column('auto_fill_confidence', sa.Numeric(3, 2), nullable=True))
    op.add_column('clients', sa.Column('auto_filled_at', sa.DateTime(timezone=True), nullable=True))
    
    # AI-detected demands and interaction patterns
    op.add_column('clients', sa.Column('detected_demands', JSON, nullable=True))
    op.add_column('clients', sa.Column('interaction_patterns', JSON, nullable=True))
    
    # Engagement score for client relationship tracking
    op.add_column('clients', sa.Column('engagement_score', sa.Numeric(5, 2), nullable=True))
    
    # Soft delete support
    op.add_column('clients', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    
    # Create index for client type filtering
    op.create_index('idx_client_type', 'clients', ['client_type'])
    op.create_index('idx_clients_cnpj', 'clients', ['cnpj_encrypted'])


def downgrade():
    op.drop_index('idx_clients_cnpj', table_name='clients')
    op.drop_index('idx_client_type', table_name='clients')
    op.drop_column('clients', 'deleted_at')
    op.drop_column('clients', 'engagement_score')
    op.drop_column('clients', 'interaction_patterns')
    op.drop_column('clients', 'detected_demands')
    op.drop_column('clients', 'auto_filled_at')
    op.drop_column('clients', 'auto_fill_confidence')
    op.drop_column('clients', 'cnpj_data_source')
    op.drop_column('clients', 'address_data')
    op.drop_column('clients', 'phone_encrypted')
    op.drop_column('clients', 'email_encrypted')
    op.drop_column('clients', 'cnpj_encrypted')
    op.drop_column('clients', 'size_category')
