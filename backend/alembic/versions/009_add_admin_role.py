"""Add admin role for admin user

Revision ID: 009_add_admin_role
Revises: 008_add_feedback_table
Create Date: 2026-01-15 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = '009_add_admin_role'
down_revision: Union[str, None] = '008_add_feedback_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Ensure the admin role exists for the known admin user.

    This migration is idempotent: it inserts the specific role row only if it
    does not already exist.
    """
    op.execute(text("""
    INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_by)
    SELECT '922e0383-e517-41e9-a1f3-1013d0e94b91'::uuid,
           '5c66e647-6015-4c98-83cf-77de29680ccd'::uuid,
           'admin',
           '00000000-0000-0000-0000-000000000001'::uuid,
           NULL
    WHERE NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = '5c66e647-6015-4c98-83cf-77de29680ccd'::uuid
          AND role_id = 'admin'
          AND tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    );
    """))


def downgrade() -> None:
    op.execute(text("""
    DELETE FROM user_roles
    WHERE user_id = '5c66e647-6015-4c98-83cf-77de29680ccd'::uuid
      AND role_id = 'admin'
      AND tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND id = '922e0383-e517-41e9-a1f3-1013d0e94b91'::uuid
    """))
