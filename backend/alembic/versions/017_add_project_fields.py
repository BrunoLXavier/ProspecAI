"""
Add project business fields

Revision ID: 017_add_project_fields
Revises: 016_add_project_portfolio_id
Create Date: 2026-01-17 04:25:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision = '017_add_project_fields'
down_revision = '016_add_project_portfolio_id'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    table_exists = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='projects')")).scalar()
    if not table_exists:
        print("ℹ️ projects table does not exist; skipping migration 017.")
        return

    # Add columns only if they do not exist
    def add_col_if_missing(col_name, col_type_sql):
        col_exists = conn.execute(text(f"SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='projects' AND column_name='{col_name}')")).scalar()
        if not col_exists:
            op.add_column('projects', sa.Column(col_name, col_type_sql, nullable=True))

    add_col_if_missing('research_area', sa.String(length=200))
    add_col_if_missing('start_date', sa.DateTime(timezone=True))
    add_col_if_missing('end_date', sa.DateTime(timezone=True))
    add_col_if_missing('budget', sa.Numeric(20,2))
    add_col_if_missing('objectives', sa.JSON())
    add_col_if_missing('methodology', sa.Text())
    add_col_if_missing('expected_results', sa.JSON())
    add_col_if_missing('trl_history', sa.JSON())


def downgrade() -> None:
    for c in ['research_area','start_date','end_date','budget','objectives','methodology','expected_results','trl_history']:
        try:
            op.drop_column('projects', c)
        except Exception:
            pass
