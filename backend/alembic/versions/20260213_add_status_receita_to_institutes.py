"""add status_receita to institutes

Revision ID: add_status_receita_institutes
Revises: 
Create Date: 2026-02-13 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_status_receita_institutes'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add nullable status_receita column to institutes
    op.add_column('institutes', sa.Column('status_receita', sa.String(length=50), nullable=True))
    try:
        op.create_index('idx_institutes_status_receita', 'institutes', ['status_receita'])
    except Exception:
        pass


def downgrade():
    try:
        op.drop_index('idx_institutes_status_receita', table_name='institutes')
    except Exception:
        pass
    op.drop_column('institutes', 'status_receita')
