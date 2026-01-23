"""Add communications tables

Revision ID: 20260122_communications
Revises: 20260222_add_equipamentos_infrastructures
Create Date: 2026-01-22 12:00:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260122_communications'
down_revision = '20260122_pii_detections'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS communication_threads (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        subject varchar(500),
        metadata jsonb DEFAULT '{}'::jsonb,
        last_message_preview text,
        last_message_at timestamptz NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_threads_tenant ON communication_threads(tenant_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_threads_last_message_at ON communication_threads(last_message_at);"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS communication_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id uuid NOT NULL,
        author varchar(200) NOT NULL,
        author_name varchar(300),
        body text NOT NULL,
        attachments jsonb DEFAULT '[]'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_messages_thread ON communication_messages(thread_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_messages_created_at ON communication_messages(created_at);"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS communication_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id uuid NOT NULL,
        message_id uuid NULL,
        filename varchar(1000) NOT NULL,
        object_name varchar(1000) NOT NULL,
        bucket varchar(100) NOT NULL,
        url text,
        content_type varchar(200),
        size integer,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_attachments_thread ON communication_attachments(thread_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_attachments_message ON communication_attachments(message_id);"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS meeting_minutes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id uuid NOT NULL,
        title varchar(500),
        content text,
        status varchar(50) NOT NULL DEFAULT 'pending',
        generated_at timestamptz NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_minutes_thread ON meeting_minutes(thread_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_minutes_status ON meeting_minutes(status);"))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DROP TABLE IF EXISTS meeting_minutes;"))
    conn.execute(sa.text("DROP TABLE IF EXISTS communication_attachments;"))
    conn.execute(sa.text("DROP TABLE IF EXISTS communication_messages;"))
    conn.execute(sa.text("DROP TABLE IF EXISTS communication_threads;"))
