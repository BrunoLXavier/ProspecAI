# Implements RF-04/RF-05/RF-08: Institute-scoped filtering for CRM, Pipeline, Proposals
"""Add institute_id to clients, opportunities, and proposals tables

Revision ID: 20260140_add_institute_id
Revises: 20260139_proposal_versions
Create Date: 2026-02-11
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260140_add_institute_id'
down_revision: Union[str, None] = '20260139_proposal_versions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add institute_id column to clients, opportunities, and proposals."""
    conn = op.get_bind()

    # --- clients ---
    conn.execute(sa.text("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'clients' AND column_name = 'institute_id'
            ) THEN
                ALTER TABLE clients ADD COLUMN institute_id uuid NULL;
            END IF;
        END $$;
    """))
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS idx_clients_institute_id ON clients (institute_id);"
    ))
    # FK to institutes (deferred so seed order doesn't matter)
    conn.execute(sa.text("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'fk_clients_institute_id'
            ) THEN
                ALTER TABLE clients
                    ADD CONSTRAINT fk_clients_institute_id
                    FOREIGN KEY (institute_id) REFERENCES institutes(id)
                    ON DELETE SET NULL;
            END IF;
        END $$;
    """))

    # --- opportunities ---
    conn.execute(sa.text("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'opportunities' AND column_name = 'institute_id'
            ) THEN
                ALTER TABLE opportunities ADD COLUMN institute_id uuid NULL;
            END IF;
        END $$;
    """))
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS idx_opportunities_institute_id ON opportunities (institute_id);"
    ))
    conn.execute(sa.text("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'fk_opportunities_institute_id'
            ) THEN
                ALTER TABLE opportunities
                    ADD CONSTRAINT fk_opportunities_institute_id
                    FOREIGN KEY (institute_id) REFERENCES institutes(id)
                    ON DELETE SET NULL;
            END IF;
        END $$;
    """))

    # --- proposals ---
    conn.execute(sa.text("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'proposals' AND column_name = 'institute_id'
            ) THEN
                ALTER TABLE proposals ADD COLUMN institute_id uuid NULL;
            END IF;
        END $$;
    """))
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS idx_proposals_institute_id ON proposals (institute_id);"
    ))
    conn.execute(sa.text("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'fk_proposals_institute_id'
            ) THEN
                ALTER TABLE proposals
                    ADD CONSTRAINT fk_proposals_institute_id
                    FOREIGN KEY (institute_id) REFERENCES institutes(id)
                    ON DELETE SET NULL;
            END IF;
        END $$;
    """))

    # --- Backfill existing opportunities from projects.institute_id ---
    conn.execute(sa.text("""
        UPDATE opportunities o
        SET institute_id = p.institute_id
        FROM projects p
        WHERE o.project_id = p.id
          AND o.institute_id IS NULL
          AND p.institute_id IS NOT NULL;
    """))

    print("Migration 20260140: Added institute_id to clients, opportunities, proposals")


def downgrade() -> None:
    """Remove institute_id columns."""
    conn = op.get_bind()

    for table in ('proposals', 'opportunities', 'clients'):
        conn.execute(sa.text(f"""
            DO $$ BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = '{table}' AND column_name = 'institute_id'
                ) THEN
                    ALTER TABLE {table} DROP COLUMN institute_id;
                END IF;
            END $$;
        """))
