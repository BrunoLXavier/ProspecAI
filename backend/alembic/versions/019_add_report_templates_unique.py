"""
Add unique constraint/index for report_templates (tenant_id, template_id)

Revision ID: 019_add_report_templates_unique
Revises: 018_add_reports_tables
Create Date: 2026-01-19 23:50:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = '019_add_report_templates_unique'
down_revision: Union[str, None] = '018_add_reports_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    # Create a unique index if it doesn't exist
    exists = conn.execute(text("SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='report_templates' AND indexname='uq_report_templates_tenant_template')")).scalar()
    if not exists:
        op.create_index('uq_report_templates_tenant_template', 'report_templates', ['tenant_id', 'template_id'], unique=True)
    print('✅ Created unique index for report_templates (tenant_id, template_id)')


def downgrade() -> None:
    op.drop_index('uq_report_templates_tenant_template', table_name='report_templates')
