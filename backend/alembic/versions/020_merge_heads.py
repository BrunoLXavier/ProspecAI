"""
Merge multiple migration heads into a single linear history

Revision ID: 020_merge_heads
Revises: 004_add_audit_columns, 019_add_report_templates_unique
Create Date: 2026-01-19 23:55:00.000000
"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision = '020_merge_heads'
down_revision = ('004_add_audit_columns', '019_add_report_templates_unique')
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This is a merge migration to consolidate multiple heads.
    pass


def downgrade() -> None:
    # No-op downgrade for merge
    pass
