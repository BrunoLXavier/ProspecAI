"""Add institute relations to projects/portfolios and create teams/infrastructures

Revision ID: 20260131_institute_relations
Revises: 20260130_institutes
Create Date: 2026-01-21 10:05:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260131_institute_relations'
down_revision = '20260130_institutes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # Add nullable institute_id columns to portfolios and projects
    try:
        conn.execute(sa.text("ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS institute_id uuid NULL;"))
    except Exception:
        pass
    try:
        conn.execute(sa.text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS institute_id uuid NULL;"))
    except Exception:
        pass

    # Create teams table
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS teams (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        institute_id uuid NOT NULL,
        name varchar(200) NOT NULL,
        description text NULL,
        member_ids jsonb DEFAULT '[]'::jsonb,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_teams_institute ON teams(institute_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS teams ENABLE ROW LEVEL SECURITY;"))

    # Create infrastructures table
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS infrastructures (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        institute_id uuid NOT NULL,
        name varchar(200) NOT NULL,
        description text NULL,
        capacity jsonb DEFAULT '{}'::jsonb,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_infrastructures_institute ON infrastructures(institute_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS infrastructures ENABLE ROW LEVEL SECURITY;"))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DROP TABLE IF EXISTS infrastructures;"))
    conn.execute(sa.text("DROP TABLE IF EXISTS teams;"))
    # remove columns if exist
    try:
        conn.execute(sa.text("ALTER TABLE projects DROP COLUMN IF EXISTS institute_id;"))
    except Exception:
        pass
    try:
        conn.execute(sa.text("ALTER TABLE portfolios DROP COLUMN IF EXISTS institute_id;"))
    except Exception:
        pass
