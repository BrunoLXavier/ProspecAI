"""add audit_logs missing columns

Revision ID: 004_add_audit_columns
Revises: 003_clean_rebuild
Create Date: 2026-01-16 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004_add_audit_columns'
# Re-point this legacy file to the real latest migration (015) so alembic
# does not treat it as an independent head. The upgrade is a no-op.
down_revision = '015_add_audit_columns'
branch_labels = None
depends_on = None


def upgrade():
    # No-op migration placeholder. Actual column additions are handled
    # by the properly sequenced migration 015_add_audit_columns.
    pass


def downgrade():
    # No-op
    pass
