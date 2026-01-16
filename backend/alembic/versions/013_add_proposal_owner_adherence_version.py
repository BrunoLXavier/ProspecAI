"""
Add owner_id, latest_adherence_score, adherence_analysis, and version to proposals

Revision ID: 013_add_proposal_owner_adherence_version
Revises: 012_add_proposal_head_version
Create Date: 2026-01-15 00:45:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '013_add_prop_owner_adhr'
down_revision = '012_add_proposal_head_version'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add owner_id
    op.add_column('proposals', sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=True))

    # Add latest_adherence_score
    op.add_column('proposals', sa.Column('latest_adherence_score', sa.Numeric(3, 2), nullable=True))

    # Add adherence_analysis JSONB
    op.add_column('proposals', sa.Column('adherence_analysis', postgresql.JSONB, nullable=True, server_default=sa.text("'{}'::jsonb")))
    op.alter_column('proposals', 'adherence_analysis', server_default=None)

    # Add version with default and backfill from version_count when possible
    op.add_column('proposals', sa.Column('version', sa.Integer(), nullable=False, server_default=sa.text('1')))
    op.execute("UPDATE proposals SET version = COALESCE(version_count, 1)")
    op.alter_column('proposals', 'version', server_default=None)


def downgrade() -> None:
    op.drop_column('proposals', 'version')
    op.drop_column('proposals', 'adherence_analysis')
    op.drop_column('proposals', 'latest_adherence_score')
    op.drop_column('proposals', 'owner_id')
