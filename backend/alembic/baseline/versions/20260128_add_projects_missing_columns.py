"""add missing project columns (budget, objectives, methodology, expected_results, infrastructure, parent_version_id)

Revision ID: 20260128_add_projects_missing_columns
Revises: 20260127_add_projects_start_end_dates
Create Date: 2026-01-21 13:45:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260128_add_projects_missing_columns'
down_revision = '20260127_add_projects_start_end_dates'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(sa.text('''
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='budget') THEN
            ALTER TABLE projects ADD COLUMN budget numeric(20,2) NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='objectives') THEN
            ALTER TABLE projects ADD COLUMN objectives jsonb NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='methodology') THEN
            ALTER TABLE projects ADD COLUMN methodology text NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='expected_results') THEN
            ALTER TABLE projects ADD COLUMN expected_results jsonb NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='infrastructure') THEN
            ALTER TABLE projects ADD COLUMN infrastructure jsonb NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='parent_version_id') THEN
            ALTER TABLE projects ADD COLUMN parent_version_id uuid NULL;
        END IF;
    END
    $$;
    '''))


def downgrade():
    conn = op.get_bind()
    conn.execute(sa.text('''
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='budget') THEN
            ALTER TABLE projects DROP COLUMN IF EXISTS budget;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='objectives') THEN
            ALTER TABLE projects DROP COLUMN IF EXISTS objectives;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='methodology') THEN
            ALTER TABLE projects DROP COLUMN IF EXISTS methodology;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='expected_results') THEN
            ALTER TABLE projects DROP COLUMN IF EXISTS expected_results;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='infrastructure') THEN
            ALTER TABLE projects DROP COLUMN IF EXISTS infrastructure;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='parent_version_id') THEN
            ALTER TABLE projects DROP COLUMN IF EXISTS parent_version_id;
        END IF;
    END
    $$;
    '''))
