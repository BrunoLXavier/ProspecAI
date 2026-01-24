"""Add missing columns to projects table

Revision ID: 20260134_projects_missing_cols
Revises: 20260133_clients_missing_cols
Create Date: 2026-01-24 01:15:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision = '20260134_projects_missing_cols'
down_revision = '20260133_clients_missing_cols'
branch_labels = None
depends_on = None


def upgrade():
    # Add missing columns to projects table
    # Implements RF-03: Portfólio institucional e lições aprendidas
    
    # TRL history tracking
    op.add_column('projects', sa.Column('trl_history', JSON, nullable=True))
    
    # Lessons learned for knowledge management
    op.add_column('projects', sa.Column('lessons_learned', JSON, nullable=True))


def downgrade():
    op.drop_column('projects', 'lessons_learned')
    op.drop_column('projects', 'trl_history')
