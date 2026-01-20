"""
Add report templates, report instances and statistics aggregates tables

Revision ID: 018_add_reports_tables
Revises: 017_add_project_fields
Create Date: 2026-01-19 23:40:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = '018_add_reports_tables'
down_revision: Union[str, None] = '017_add_project_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # report_templates
    exists = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'report_templates')")).scalar()
    if not exists:
        op.create_table('report_templates',
            sa.Column('id', UUID(), primary_key=True, server_default=text('uuid_generate_v4()')),
            sa.Column('tenant_id', UUID(), nullable=False),
            sa.Column('template_id', sa.String(200), nullable=False),
            sa.Column('name', sa.String(300), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('sections', JSONB, nullable=True),
            sa.Column('default_format', sa.String(20), nullable=False, server_default=text("'html'")),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE')
        )
        op.create_index('idx_report_templates_tenant', 'report_templates', ['tenant_id'])
        op.create_unique_constraint('uq_report_templates_tenant_template', 'report_templates', ['tenant_id','template_id'])
        op.execute('ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;')

    # report_instances
    exists = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'report_instances')")).scalar()
    if not exists:
        op.create_table('report_instances',
            sa.Column('id', UUID(), primary_key=True, server_default=text('uuid_generate_v4()')),
            sa.Column('tenant_id', UUID(), nullable=False),
            sa.Column('template_id', sa.String(200), nullable=False),
            sa.Column('name', sa.String(300), nullable=False),
            sa.Column('format', sa.String(20), nullable=False, server_default=text("'pdf'")),
            sa.Column('status', sa.String(30), nullable=False, server_default=text("'pending'")),
            sa.Column('created_by', UUID(), nullable=True),
            sa.Column('updated_by', UUID(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE')
        )
        op.create_index('idx_report_instances_tenant', 'report_instances', ['tenant_id'])
        op.execute('ALTER TABLE report_instances ENABLE ROW LEVEL SECURITY;')

    # statistics_aggregates
    exists = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'statistics_aggregates')")).scalar()
    if not exists:
        op.create_table('statistics_aggregates',
            sa.Column('id', UUID(), primary_key=True, server_default=text('uuid_generate_v4()')),
            sa.Column('tenant_id', UUID(), nullable=False),
            sa.Column('key', sa.String(200), nullable=False),
            sa.Column('value', JSONB, nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=text('NOW()'), nullable=False),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE')
        )
        op.create_index('idx_statistics_aggregates_tenant', 'statistics_aggregates', ['tenant_id'])
        op.execute('ALTER TABLE statistics_aggregates ENABLE ROW LEVEL SECURITY;')

    print('✅ Reports and statistics tables created (if missing).')


def downgrade() -> None:
    op.drop_table('statistics_aggregates')
    op.drop_table('report_instances')
    op.drop_table('report_templates')
