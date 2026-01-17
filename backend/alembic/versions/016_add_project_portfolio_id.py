"""
Add portfolio_id to projects

Revision ID: 016_add_project_portfolio_id
Revises: 015_add_audit_columns
Create Date: 2026-01-17 04:20:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision = '016_add_project_portfolio_id'
down_revision = '015_add_audit_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    table_exists = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='projects')")).scalar()
    if not table_exists:
        print("ℹ️ projects table does not exist; skipping migration 016.")
        return

    col_exists = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='projects' AND column_name='portfolio_id')")).scalar()
    if col_exists:
        print("ℹ️ projects.portfolio_id already exists; skipping.")
        return

    # Add `portfolio_id` UUID nullable column
    op.add_column(
        'projects',
        sa.Column('portfolio_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True)
    )

    # Create an index for faster lookups where portfolio_id is set
    try:
        op.create_index('idx_projects_portfolio_id', 'projects', ['portfolio_id'], postgresql_where=text('portfolio_id IS NOT NULL'))
    except Exception:
        # index creation is non-critical; continue
        pass


def downgrade() -> None:
    try:
        op.drop_index('idx_projects_portfolio_id', table_name='projects')
    except Exception:
        pass
    op.drop_column('projects', 'portfolio_id')
