"""add start_date and end_date to projects if missing

Revision ID: 20260127_add_projects_start_end_dates
Revises: 20260126_add_projects_research_area
Create Date: 2026-01-21 13:30:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260127_projects_dates'
down_revision = '20260126_projects_area'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(sa.text('''
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='start_date') THEN
            ALTER TABLE projects ADD COLUMN start_date date NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='end_date') THEN
            ALTER TABLE projects ADD COLUMN end_date date NULL;
        END IF;
    END
    $$;
    '''))


def downgrade():
    conn = op.get_bind()
    conn.execute(sa.text('''
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='start_date') THEN
            ALTER TABLE projects DROP COLUMN IF EXISTS start_date;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='end_date') THEN
            ALTER TABLE projects DROP COLUMN IF EXISTS end_date;
        END IF;
    END
    $$;
    '''))
