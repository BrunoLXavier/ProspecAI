"""add ai_extracted_data column to funding_sources

Revision ID: 20260136_funding_ai_data
Revises: 20260135_funding_feedback_fixes
Create Date: 2026-01-24
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260136_funding_ai_data'
down_revision = '20260135_funding_feedback_fixes'
branch_labels = None
depends_on = None


def upgrade():
    """Add ai_extracted_data column to funding_sources table."""
    # Check if column already exists
    conn = op.get_bind()
    result = conn.execute(sa.text("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'funding_sources'
          AND column_name = 'ai_extracted_data'
    """))
    if result.fetchone() is None:
        op.add_column('funding_sources', 
            sa.Column('ai_extracted_data', sa.JSON(), nullable=True)
        )
        print("✓ Added ai_extracted_data column to funding_sources")
    else:
        print("→ ai_extracted_data column already exists in funding_sources")


def downgrade():
    """Remove ai_extracted_data column from funding_sources table."""
    op.drop_column('funding_sources', 'ai_extracted_data')
