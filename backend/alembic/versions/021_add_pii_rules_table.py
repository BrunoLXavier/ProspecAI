"""
Create table for PII detection rules used by seed runner

Revision ID: 021_add_pii_rules_table
Revises: 020_merge_heads
Create Date: 2026-01-19 23:56:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = '021_add_pii_rules_table'
down_revision: Union[str, None] = '020_merge_heads'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    exists = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pii_detection_rules')")).scalar()
    if not exists:
        op.create_table('pii_detection_rules',
            sa.Column('id', UUID(), primary_key=True, server_default=text('uuid_generate_v4()')),
            sa.Column('tenant_id', UUID(), nullable=False),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('pattern', sa.Text(), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE')
        )
        op.create_index('idx_pii_detection_rules_tenant', 'pii_detection_rules', ['tenant_id'])
        op.create_unique_constraint('uq_pii_detection_rules_tenant_name', 'pii_detection_rules', ['tenant_id','name'])
        op.execute('ALTER TABLE pii_detection_rules ENABLE ROW LEVEL SECURITY;')


def downgrade() -> None:
    op.drop_table('pii_detection_rules')
