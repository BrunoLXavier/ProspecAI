"""Fix communications RLS and add linked entity support

Revision ID: 20260223_fix_communications_rls
Revises: 20260122_communications
Create Date: 2026-02-23 10:00:00

This migration fixes critical RLS violations by adding tenant_id to
communication_messages, communication_attachments, and meeting_minutes.
Also adds linked entity support for proposal/opportunity/client context,
participant management, and draft persistence.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260223_fix_communications_rls'
down_revision = '20260222_equipamentos'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # ==========================================================================
    # Fix RLS: Add tenant_id to communication_messages
    # ==========================================================================
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'communication_messages' AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE communication_messages ADD COLUMN tenant_id uuid;
        END IF;
    END $$;
    """))
    
    # Populate tenant_id from parent thread
    conn.execute(sa.text("""
    UPDATE communication_messages m
    SET tenant_id = t.tenant_id
    FROM communication_threads t
    WHERE m.thread_id = t.id AND m.tenant_id IS NULL;
    """))
    
    # Make tenant_id NOT NULL after population
    conn.execute(sa.text("""
    DO $$
    BEGIN
        ALTER TABLE communication_messages ALTER COLUMN tenant_id SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        -- Column might already be NOT NULL
        NULL;
    END $$;
    """))
    
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_messages_tenant ON communication_messages(tenant_id);"))

    # ==========================================================================
    # Fix RLS: Add tenant_id to communication_attachments
    # ==========================================================================
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'communication_attachments' AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE communication_attachments ADD COLUMN tenant_id uuid;
        END IF;
    END $$;
    """))
    
    # Populate tenant_id from parent thread
    conn.execute(sa.text("""
    UPDATE communication_attachments a
    SET tenant_id = t.tenant_id
    FROM communication_threads t
    WHERE a.thread_id = t.id AND a.tenant_id IS NULL;
    """))
    
    conn.execute(sa.text("""
    DO $$
    BEGIN
        ALTER TABLE communication_attachments ALTER COLUMN tenant_id SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END $$;
    """))
    
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_attachments_tenant ON communication_attachments(tenant_id);"))

    # ==========================================================================
    # Fix RLS: Add tenant_id to meeting_minutes
    # ==========================================================================
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'meeting_minutes' AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE meeting_minutes ADD COLUMN tenant_id uuid;
        END IF;
    END $$;
    """))
    
    # Populate tenant_id from parent thread
    conn.execute(sa.text("""
    UPDATE meeting_minutes m
    SET tenant_id = t.tenant_id
    FROM communication_threads t
    WHERE m.thread_id = t.id AND m.tenant_id IS NULL;
    """))
    
    conn.execute(sa.text("""
    DO $$
    BEGIN
        ALTER TABLE meeting_minutes ALTER COLUMN tenant_id SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END $$;
    """))
    
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_minutes_tenant ON meeting_minutes(tenant_id);"))
    
    # Add generated_by field to meeting_minutes
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'meeting_minutes' AND column_name = 'generated_by'
        ) THEN
            ALTER TABLE meeting_minutes ADD COLUMN generated_by uuid;
        END IF;
    END $$;
    """))

    # ==========================================================================
    # Add linked entity support to communication_threads
    # ==========================================================================
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'communication_threads' AND column_name = 'linked_entity_type'
        ) THEN
            ALTER TABLE communication_threads ADD COLUMN linked_entity_type varchar(50);
        END IF;
    END $$;
    """))
    
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'communication_threads' AND column_name = 'linked_entity_id'
        ) THEN
            ALTER TABLE communication_threads ADD COLUMN linked_entity_id uuid;
        END IF;
    END $$;
    """))
    
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_threads_linked_entity ON communication_threads(linked_entity_type, linked_entity_id);"))

    # ==========================================================================
    # Add is_auto_created flag for human-in-the-loop workflow
    # ==========================================================================
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'communication_threads' AND column_name = 'is_auto_created'
        ) THEN
            ALTER TABLE communication_threads ADD COLUMN is_auto_created boolean DEFAULT false;
        END IF;
    END $$;
    """))
    
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'communication_threads' AND column_name = 'auto_created_confirmed'
        ) THEN
            ALTER TABLE communication_threads ADD COLUMN auto_created_confirmed boolean DEFAULT false;
        END IF;
    END $$;
    """))
    
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'communication_messages' AND column_name = 'is_auto_created'
        ) THEN
            ALTER TABLE communication_messages ADD COLUMN is_auto_created boolean DEFAULT false;
        END IF;
    END $$;
    """))
    
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'communication_messages' AND column_name = 'auto_created_confirmed'
        ) THEN
            ALTER TABLE communication_messages ADD COLUMN auto_created_confirmed boolean DEFAULT false;
        END IF;
    END $$;
    """))

    # ==========================================================================
    # Add message type support (text, email, meeting, audio, video)
    # ==========================================================================
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'communication_messages' AND column_name = 'message_type'
        ) THEN
            ALTER TABLE communication_messages ADD COLUMN message_type varchar(50) DEFAULT 'text';
        END IF;
    END $$;
    """))
    
    # Add email-specific metadata
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'communication_messages' AND column_name = 'email_metadata'
        ) THEN
            ALTER TABLE communication_messages ADD COLUMN email_metadata jsonb DEFAULT '{}'::jsonb;
        END IF;
    END $$;
    """))

    # ==========================================================================
    # Create thread participants table
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS communication_thread_participants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        thread_id uuid NOT NULL,
        user_id uuid NOT NULL,
        role varchar(50) NOT NULL DEFAULT 'viewer',
        added_at timestamptz DEFAULT now(),
        added_by uuid,
        UNIQUE(thread_id, user_id)
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_participants_tenant ON communication_thread_participants(tenant_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_participants_thread ON communication_thread_participants(thread_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_participants_user ON communication_thread_participants(user_id);"))

    # ==========================================================================
    # Create drafts table for message persistence
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS communication_drafts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        thread_id uuid NOT NULL,
        user_id uuid NOT NULL,
        body text,
        attachments jsonb DEFAULT '[]'::jsonb,
        last_updated_at timestamptz DEFAULT now(),
        created_at timestamptz DEFAULT now(),
        UNIQUE(thread_id, user_id)
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_drafts_tenant ON communication_drafts(tenant_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_drafts_thread ON communication_drafts(thread_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_drafts_user ON communication_drafts(user_id);"))

    # ==========================================================================
    # Add foreign key constraints
    # ==========================================================================
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_comm_messages_thread'
        ) THEN
            ALTER TABLE communication_messages 
            ADD CONSTRAINT fk_comm_messages_thread 
            FOREIGN KEY (thread_id) REFERENCES communication_threads(id) ON DELETE CASCADE;
        END IF;
    END $$;
    """))
    
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_comm_attachments_thread'
        ) THEN
            ALTER TABLE communication_attachments 
            ADD CONSTRAINT fk_comm_attachments_thread 
            FOREIGN KEY (thread_id) REFERENCES communication_threads(id) ON DELETE CASCADE;
        END IF;
    END $$;
    """))
    
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_minutes_thread'
        ) THEN
            ALTER TABLE meeting_minutes 
            ADD CONSTRAINT fk_minutes_thread 
            FOREIGN KEY (thread_id) REFERENCES communication_threads(id) ON DELETE CASCADE;
        END IF;
    END $$;
    """))
    
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_comm_participants_thread'
        ) THEN
            ALTER TABLE communication_thread_participants 
            ADD CONSTRAINT fk_comm_participants_thread 
            FOREIGN KEY (thread_id) REFERENCES communication_threads(id) ON DELETE CASCADE;
        END IF;
    END $$;
    """))
    
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_comm_drafts_thread'
        ) THEN
            ALTER TABLE communication_drafts 
            ADD CONSTRAINT fk_comm_drafts_thread 
            FOREIGN KEY (thread_id) REFERENCES communication_threads(id) ON DELETE CASCADE;
        END IF;
    END $$;
    """))


def downgrade() -> None:
    conn = op.get_bind()
    
    # Drop foreign keys
    conn.execute(sa.text("ALTER TABLE communication_drafts DROP CONSTRAINT IF EXISTS fk_comm_drafts_thread;"))
    conn.execute(sa.text("ALTER TABLE communication_thread_participants DROP CONSTRAINT IF EXISTS fk_comm_participants_thread;"))
    conn.execute(sa.text("ALTER TABLE meeting_minutes DROP CONSTRAINT IF EXISTS fk_minutes_thread;"))
    conn.execute(sa.text("ALTER TABLE communication_attachments DROP CONSTRAINT IF EXISTS fk_comm_attachments_thread;"))
    conn.execute(sa.text("ALTER TABLE communication_messages DROP CONSTRAINT IF EXISTS fk_comm_messages_thread;"))
    
    # Drop new tables
    conn.execute(sa.text("DROP TABLE IF EXISTS communication_drafts;"))
    conn.execute(sa.text("DROP TABLE IF EXISTS communication_thread_participants;"))
    
    # Drop new columns (we don't remove tenant_id as it's now required for RLS)
    conn.execute(sa.text("ALTER TABLE communication_messages DROP COLUMN IF EXISTS email_metadata;"))
    conn.execute(sa.text("ALTER TABLE communication_messages DROP COLUMN IF EXISTS message_type;"))
    conn.execute(sa.text("ALTER TABLE communication_messages DROP COLUMN IF EXISTS auto_created_confirmed;"))
    conn.execute(sa.text("ALTER TABLE communication_messages DROP COLUMN IF EXISTS is_auto_created;"))
    conn.execute(sa.text("ALTER TABLE communication_threads DROP COLUMN IF EXISTS auto_created_confirmed;"))
    conn.execute(sa.text("ALTER TABLE communication_threads DROP COLUMN IF EXISTS is_auto_created;"))
    conn.execute(sa.text("ALTER TABLE communication_threads DROP COLUMN IF EXISTS linked_entity_id;"))
    conn.execute(sa.text("ALTER TABLE communication_threads DROP COLUMN IF EXISTS linked_entity_type;"))
    conn.execute(sa.text("ALTER TABLE meeting_minutes DROP COLUMN IF EXISTS generated_by;"))
