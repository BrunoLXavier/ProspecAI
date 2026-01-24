"""Add missing columns to funding_sources and create feedbacks table

Revision ID: 20260135_funding_feedback_fixes
Revises: 20260134_projects_missing_cols
Create Date: 2026-01-24 01:30:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision = '20260135_funding_feedback_fixes'
down_revision = '20260134_projects_missing_cols'
branch_labels = None
depends_on = None


def upgrade():
    # =====================================================
    # 1. Add missing columns to funding_sources table
    # =====================================================
    
    # Requirements and eligibility
    op.add_column('funding_sources', sa.Column('requirements', sa.Text(), nullable=True))
    op.add_column('funding_sources', sa.Column('eligibility_criteria', sa.Text(), nullable=True))
    op.add_column('funding_sources', sa.Column('source_url', sa.Text(), nullable=True))
    
    # AI extraction fields
    op.add_column('funding_sources', sa.Column('ai_extraction_status', sa.String(20), 
                                                server_default='pending', nullable=True))
    op.add_column('funding_sources', sa.Column('ai_extracted_fields', JSON, nullable=True))
    op.add_column('funding_sources', sa.Column('ai_confidence_score', sa.Numeric(3, 2), nullable=True))
    op.add_column('funding_sources', sa.Column('ai_processed_at', sa.DateTime(timezone=True), nullable=True))
    
    # LGPD/PII fields
    op.add_column('funding_sources', sa.Column('contains_pii', sa.Boolean(), 
                                                server_default='false', nullable=True))
    op.add_column('funding_sources', sa.Column('pii_anonymized', sa.Boolean(), 
                                                server_default='false', nullable=True))
    op.add_column('funding_sources', sa.Column('lgpd_categories', JSON, nullable=True))
    
    # Version for optimistic concurrency
    op.add_column('funding_sources', sa.Column('version', sa.Integer(), 
                                                server_default='1', nullable=False))


def downgrade():
    # Drop funding_sources columns
    op.drop_column('funding_sources', 'version')
    op.drop_column('funding_sources', 'lgpd_categories')
    op.drop_column('funding_sources', 'pii_anonymized')
    op.drop_column('funding_sources', 'contains_pii')
    op.drop_column('funding_sources', 'ai_processed_at')
    op.drop_column('funding_sources', 'ai_confidence_score')
    op.drop_column('funding_sources', 'ai_extracted_fields')
    op.drop_column('funding_sources', 'ai_extraction_status')
    op.drop_column('funding_sources', 'source_url')
    op.drop_column('funding_sources', 'eligibility_criteria')
    op.drop_column('funding_sources', 'requirements')
