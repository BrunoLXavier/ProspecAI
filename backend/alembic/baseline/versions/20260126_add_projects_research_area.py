"""add research_area to projects if missing

Revision ID: 20260126_add_projects_research_area
Revises: 20260125_add_funding_url
Create Date: 2026-01-21 12:55:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260126_add_projects_research_area'
down_revision = '20260125_add_funding_url'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='research_area') THEN
            ALTER TABLE projects ADD COLUMN research_area varchar(300) NULL;
        END IF;
    END
    $$;
    """))


def downgrade():
    conn = op.get_bind()
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='research_area') THEN
            ALTER TABLE projects DROP COLUMN IF EXISTS research_area;
        END IF;
    END
    $$;
    """))
