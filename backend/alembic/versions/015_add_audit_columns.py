"""add audit_logs missing columns (idempotent)

Revision ID: 015_add_audit_columns
Revises: 014_add_prop_last_ai
Create Date: 2026-01-16 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '015_add_audit_columns'
down_revision = '014_add_prop_last_ai'
branch_labels = None
depends_on = None


def upgrade():
    # Add optional columns that may be present in newer schemas. Be defensive
    conn = op.get_bind()
    # notes
    if not conn.execute(sa.text("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='notes')")).scalar():
        op.add_column('audit_logs', sa.Column('notes', sa.Text(), nullable=True))
    # diff
    if not conn.execute(sa.text("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='diff')")).scalar():
        op.add_column('audit_logs', sa.Column('diff', sa.JSON(), nullable=True))
    # success
    if not conn.execute(sa.text("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='success')")).scalar():
        op.add_column('audit_logs', sa.Column('success', sa.Boolean(), nullable=False, server_default=sa.text('true')))
        # remove server_default to match model behavior
        op.alter_column('audit_logs', 'success', server_default=None)
    # user_role
    if not conn.execute(sa.text("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='user_role')")).scalar():
        op.add_column('audit_logs', sa.Column('user_role', sa.String(length=50), nullable=True))


def downgrade():
    conn = op.get_bind()
    if conn.execute(sa.text("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='user_role')")).scalar():
        op.drop_column('audit_logs', 'user_role')
    if conn.execute(sa.text("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='success')")).scalar():
        op.drop_column('audit_logs', 'success')
    if conn.execute(sa.text("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='diff')")).scalar():
        op.drop_column('audit_logs', 'diff')
    if conn.execute(sa.text("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='notes')")).scalar():
        op.drop_column('audit_logs', 'notes')
