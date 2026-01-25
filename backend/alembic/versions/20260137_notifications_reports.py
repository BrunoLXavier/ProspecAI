"""Add notifications tables and enhance reports

Revision ID: 20260137_notifications_reports
Revises: 20260136_funding_ai_data
Create Date: 2026-01-24

Implements RF-07 (Notifications) and RF-09 (Dynamic Reports)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '20260137_notifications_reports'
down_revision = '20260136_funding_ai_data'
branch_labels = None
depends_on = None


def upgrade():
    # Get connection for checking table existence
    conn = op.get_bind()
    
    # ==========================================================================
    # NOTIFICATIONS TABLE (Create if not exists)
    # ==========================================================================
    result = conn.execute(sa.text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications')"))
    exists = result.scalar()
    
    if not exists:
        op.create_table(
            'notifications',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
            sa.Column('institute_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
            
            sa.Column('title', sa.String(300), nullable=False),
            sa.Column('body', sa.Text, nullable=False),
            sa.Column('notification_type', sa.String(50), nullable=False, server_default='info'),
            sa.Column('priority', sa.String(20), nullable=False, server_default='normal'),
            
            sa.Column('entity_type', sa.String(100), nullable=True),
            sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('action_url', sa.String(500), nullable=True),
            
            sa.Column('read', sa.Boolean, nullable=False, server_default='false'),
            sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('dismissed', sa.Boolean, nullable=False, server_default='false'),
            sa.Column('dismissed_at', sa.DateTime(timezone=True), nullable=True),
            
            sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
            
            sa.Column('channels', postgresql.JSONB, server_default='["in_app"]'),
            sa.Column('delivery_status', postgresql.JSONB, server_default='{}'),
            
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=False),
        )
        
        op.create_index('idx_notifications_user_read', 'notifications', ['user_id', 'read'])
        op.create_index('idx_notifications_user_type', 'notifications', ['user_id', 'notification_type'])
        op.create_index('idx_notifications_scheduled', 'notifications', ['scheduled_at'])
        op.create_index('idx_notifications_tenant_user', 'notifications', ['tenant_id', 'user_id'])

    # ==========================================================================
    # USER NOTIFICATION PREFERENCES TABLE (Create if not exists)
    # ==========================================================================
    result = conn.execute(sa.text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_notification_preferences')"))
    exists = result.scalar()
    
    if not exists:
        op.create_table(
            'user_notification_preferences',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
            
            sa.Column('type_preferences', postgresql.JSONB, server_default='{}'),
            
            sa.Column('email_enabled', sa.Boolean, nullable=False, server_default='true'),
            sa.Column('push_enabled', sa.Boolean, nullable=False, server_default='true'),
            sa.Column('in_app_enabled', sa.Boolean, nullable=False, server_default='true'),
            
            sa.Column('quiet_hours', postgresql.JSONB, nullable=True),
            sa.Column('email_digest_frequency', sa.String(20), server_default='immediate'),
            sa.Column('digest_time', sa.String(5), nullable=True),
            
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        
        op.create_unique_constraint('uq_notification_pref_user', 'user_notification_preferences', ['tenant_id', 'user_id'])

    # ==========================================================================
    # ENHANCE REPORT_TEMPLATES TABLE (Add new columns if missing)
    # ==========================================================================
    # Check which columns exist
    result = conn.execute(sa.text("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'report_templates'
    """))
    existing_columns = {row[0] for row in result.fetchall()}
    
    # Add missing columns one by one
    if 'visibility' not in existing_columns:
        op.add_column('report_templates', sa.Column('visibility', sa.String(20), server_default='private'))
    if 'institute_id' not in existing_columns:
        op.add_column('report_templates', sa.Column('institute_id', postgresql.UUID(as_uuid=True)))
    if 'query_config' not in existing_columns:
        op.add_column('report_templates', sa.Column('query_config', postgresql.JSONB, server_default=sa.text("'{}'")))
    if 'display_config' not in existing_columns:
        op.add_column('report_templates', sa.Column('display_config', postgresql.JSONB, server_default=sa.text("'{}'")))
    if 'output_formats' not in existing_columns:
        op.add_column('report_templates', sa.Column('output_formats', postgresql.JSONB, server_default=sa.text("'[\"html\", \"csv\", \"json\", \"pdf\", \"xlsx\"]'")))
    if 'schedule_cron' not in existing_columns:
        op.add_column('report_templates', sa.Column('schedule_cron', sa.String(100)))
    if 'schedule_enabled' not in existing_columns:
        op.add_column('report_templates', sa.Column('schedule_enabled', sa.Boolean, server_default=sa.text('false')))
    if 'schedule_recipients' not in existing_columns:
        op.add_column('report_templates', sa.Column('schedule_recipients', postgresql.JSONB, server_default=sa.text("'[]'")))
    if 'last_scheduled_run' not in existing_columns:
        op.add_column('report_templates', sa.Column('last_scheduled_run', sa.DateTime(timezone=True)))
    if 'category' not in existing_columns:
        op.add_column('report_templates', sa.Column('category', sa.String(100)))
    if 'tags' not in existing_columns:
        op.add_column('report_templates', sa.Column('tags', postgresql.JSONB, server_default=sa.text("'[]'")))
    if 'run_count' not in existing_columns:
        op.add_column('report_templates', sa.Column('run_count', sa.Integer, server_default=sa.text('0')))
    if 'last_run_at' not in existing_columns:
        op.add_column('report_templates', sa.Column('last_run_at', sa.DateTime(timezone=True)))
    if 'deleted_at' not in existing_columns:
        op.add_column('report_templates', sa.Column('deleted_at', sa.DateTime(timezone=True)))
    if 'created_by' not in existing_columns:
        op.add_column('report_templates', sa.Column('created_by', postgresql.UUID(as_uuid=True)))
    if 'updated_by' not in existing_columns:
        op.add_column('report_templates', sa.Column('updated_by', postgresql.UUID(as_uuid=True)))

    # ==========================================================================
    # ENHANCE REPORT_INSTANCES TABLE (Add new columns if missing)
    # ==========================================================================
    result = conn.execute(sa.text("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'report_instances'
    """))
    existing_columns = {row[0] for row in result.fetchall()}
    
    if 'format' not in existing_columns:
        op.add_column('report_instances', sa.Column('format', sa.String(20), server_default='html'))
    if 'status' not in existing_columns:
        op.add_column('report_instances', sa.Column('status', sa.String(20), server_default='pending'))
    if 'parameters' not in existing_columns:
        op.add_column('report_instances', sa.Column('parameters', postgresql.JSONB, server_default=sa.text("'{}'")))
    if 'file_path' not in existing_columns:
        op.add_column('report_instances', sa.Column('file_path', sa.String(500)))
    if 'file_size' not in existing_columns:
        op.add_column('report_instances', sa.Column('file_size', sa.Integer))
    if 'row_count' not in existing_columns:
        op.add_column('report_instances', sa.Column('row_count', sa.Integer))
    if 'started_at' not in existing_columns:
        op.add_column('report_instances', sa.Column('started_at', sa.DateTime(timezone=True)))
    if 'completed_at' not in existing_columns:
        op.add_column('report_instances', sa.Column('completed_at', sa.DateTime(timezone=True)))
    if 'error_message' not in existing_columns:
        op.add_column('report_instances', sa.Column('error_message', sa.Text))
    if 'expires_at' not in existing_columns:
        op.add_column('report_instances', sa.Column('expires_at', sa.DateTime(timezone=True)))
    if 'deleted_at' not in existing_columns:
        op.add_column('report_instances', sa.Column('deleted_at', sa.DateTime(timezone=True)))
    if 'created_by' not in existing_columns:
        op.add_column('report_instances', sa.Column('created_by', postgresql.UUID(as_uuid=True)))
    if 'updated_by' not in existing_columns:
        op.add_column('report_instances', sa.Column('updated_by', postgresql.UUID(as_uuid=True)))

    # ==========================================================================
    # REPORTABLE TABLES METADATA (Create if not exists)
    # ==========================================================================
    result = conn.execute(sa.text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reportable_tables')"))
    exists = result.scalar()
    
    if not exists:
        op.create_table(
            'reportable_tables',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            
            sa.Column('table_name', sa.String(100), nullable=False, unique=True),
            sa.Column('display_name', sa.String(200), nullable=False),
            sa.Column('description', sa.Text, nullable=True),
            
            sa.Column('fields', postgresql.JSONB, nullable=False, server_default='[]'),
            sa.Column('relationships', postgresql.JSONB, server_default='[]'),
            
            sa.Column('requires_permission', sa.String(100), nullable=True),
            sa.Column('display_order', sa.Integer, server_default='0'),
            sa.Column('enabled', sa.Boolean, nullable=False, server_default='true'),
            
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        
        op.create_index('idx_reportable_enabled', 'reportable_tables', ['enabled'])


def downgrade():
    conn = op.get_bind()
    
    # Drop new tables
    result = conn.execute(sa.text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reportable_tables')"))
    if result.scalar():
        op.drop_table('reportable_tables')
    
    result = conn.execute(sa.text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_notification_preferences')"))
    if result.scalar():
        op.drop_table('user_notification_preferences')
    
    result = conn.execute(sa.text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications')"))
    if result.scalar():
        op.drop_table('notifications')
    
    # Remove added columns from report_templates (keeping original structure)
    columns_to_remove = [
        'visibility', 'institute_id', 'query_config', 'display_config', 
        'output_formats', 'schedule_cron', 'schedule_enabled', 'schedule_recipients',
        'last_scheduled_run', 'category', 'tags', 'run_count', 'last_run_at', 
        'deleted_at', 'created_by', 'updated_by'
    ]
    for col in columns_to_remove:
        try:
            op.drop_column('report_templates', col)
        except Exception:
            pass
    
    columns_to_remove = [
        'format', 'status', 'parameters', 'file_path', 'file_size', 'row_count',
        'started_at', 'completed_at', 'error_message', 'expires_at', 
        'deleted_at', 'created_by', 'updated_by'
    ]
    for col in columns_to_remove:
        try:
            op.drop_column('report_instances', col)
        except Exception:
            pass
