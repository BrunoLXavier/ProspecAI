"""Create institutes and user_institutes tables

Revision ID: 20260130_institutes
Revises: 20260119_baseline
Create Date: 2026-01-21 10:00:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260130_institutes'
down_revision = '20260128_add_projects_missing_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # Create institutes table (tenant-scoped)
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS institutes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name varchar(300) NOT NULL,
        code varchar(100),
        description text,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        UNIQUE (tenant_id, name)
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_institutes_tenant ON institutes(tenant_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS institutes ENABLE ROW LEVEL SECURITY;"))

    # Create user_institutes association table
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS user_institutes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        institute_id uuid NOT NULL,
        tenant_id uuid NOT NULL,
        role varchar(80) NULL,
        assigned_at timestamptz DEFAULT now() NOT NULL,
        UNIQUE (user_id, institute_id)
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_user_institutes_user ON user_institutes(user_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_user_institutes_institute ON user_institutes(institute_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS user_institutes ENABLE ROW LEVEL SECURITY;"))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DROP TABLE IF EXISTS user_institutes;"))
    conn.execute(sa.text("DROP TABLE IF EXISTS institutes;"))
