"""add missing feedbacks columns

Revision ID: 20260120_add_feedback_columns
Revises: 20260119_baseline
Create Date: 2026-01-20 23:59:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260120_add_feedback_columns'
down_revision = '20260119_baseline'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Idempotent ALTER TABLE statements to add columns that might be missing
    conn = op.get_bind()
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='page_title') THEN
            ALTER TABLE feedbacks ADD COLUMN page_title varchar(500);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='entity_type') THEN
            ALTER TABLE feedbacks ADD COLUMN entity_type varchar(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='entity_id') THEN
            ALTER TABLE feedbacks ADD COLUMN entity_id uuid;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='screenshot_url') THEN
            ALTER TABLE feedbacks ADD COLUMN screenshot_url text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='annotation_image_url') THEN
            ALTER TABLE feedbacks ADD COLUMN annotation_image_url text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='annotation_data') THEN
            ALTER TABLE feedbacks ADD COLUMN annotation_data jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='user_agent') THEN
            ALTER TABLE feedbacks ADD COLUMN user_agent text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='screen_width') THEN
            ALTER TABLE feedbacks ADD COLUMN screen_width integer;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='screen_height') THEN
            ALTER TABLE feedbacks ADD COLUMN screen_height integer;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='status') THEN
            ALTER TABLE feedbacks ADD COLUMN status varchar(20) DEFAULT 'open' NOT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='response') THEN
            ALTER TABLE feedbacks ADD COLUMN response text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='responded_by') THEN
            ALTER TABLE feedbacks ADD COLUMN responded_by uuid;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='responded_at') THEN
            ALTER TABLE feedbacks ADD COLUMN responded_at timestamptz;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='resolved_at') THEN
            ALTER TABLE feedbacks ADD COLUMN resolved_at timestamptz;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='resolution_notes') THEN
            ALTER TABLE feedbacks ADD COLUMN resolution_notes text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='created_by') THEN
            ALTER TABLE feedbacks ADD COLUMN created_by uuid;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='updated_by') THEN
            ALTER TABLE feedbacks ADD COLUMN updated_by uuid;
        END IF;

        -- Create indexes if missing
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname='idx_feedback_status_severity') THEN
            EXECUTE 'CREATE INDEX idx_feedback_status_severity ON feedbacks (status, severity)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname='idx_feedback_type_status') THEN
            EXECUTE 'CREATE INDEX idx_feedback_type_status ON feedbacks (feedback_type, status)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname='idx_feedback_entity') THEN
            EXECUTE 'CREATE INDEX idx_feedback_entity ON feedbacks (entity_type, entity_id)';
        END IF;
    END$$;
    """))


def downgrade() -> None:
    # No-op: do not drop columns in downgrade to avoid data loss
    pass
