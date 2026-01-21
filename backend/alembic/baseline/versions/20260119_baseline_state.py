"""Baseline schema + minimal seeds representing current system state

Revision ID: 20260119_baseline
Revises: 
Create Date: 2026-01-20 22:20:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260119_baseline'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # Ensure extensions
    try:
        conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))
    except Exception:
        pass
    try:
        conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS btree_gist;"))
    except Exception:
        pass

    # Create tenants table and indexes
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS tenants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(200) NOT NULL,
        slug varchar(100) NOT NULL UNIQUE,
        is_active boolean NOT NULL DEFAULT true,
        settings jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants (slug);"))
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='is_active') THEN
            EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants (is_active)';
        END IF;
    END
    $$;
    """))
    conn.execute(sa.text("ALTER TABLE IF EXISTS tenants ENABLE ROW LEVEL SECURITY;"))

    # Create roles
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) UNIQUE NOT NULL,
        description text,
        created_at timestamptz DEFAULT now()
    );
    """))

    # Create system_config
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS system_config (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,
        config_key varchar(50) NOT NULL,
        config_value jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE (tenant_id, config_key)
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_system_config_key ON system_config (config_key);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS system_config ENABLE ROW LEVEL SECURITY;"))

    # Create users
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,
        email varchar(255) NOT NULL,
        username varchar(50) NOT NULL,
        password_hash varchar(255) NOT NULL,
        first_name varchar(120),
        last_name varchar(120),
        full_name varchar(300) NULL,
        email_verified boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        last_login_at timestamptz NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        UNIQUE (tenant_id, email),
        UNIQUE (tenant_id, username)
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_users_username ON users (username);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;"))

    # Create user_roles
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        role_id varchar(50) NULL,
        role_name varchar(50) NULL,
        assigned_at timestamptz DEFAULT now(),
        assigned_by uuid NULL,
        UNIQUE (user_id, role_id)
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_user_roles_user_id ON user_roles (user_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;"))

    # Create refresh_tokens
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS refresh_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        token_hash varchar(255) NOT NULL UNIQUE,
        token_type varchar(30) NOT NULL,
        used boolean NOT NULL DEFAULT false,
        expires_at timestamptz NOT NULL,
        created_at timestamptz DEFAULT now(),
        created_by_ip varchar(45) NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id ON refresh_tokens (user_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS refresh_tokens ENABLE ROW LEVEL SECURITY;"))

    # Create login_attempts
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS login_attempts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(255) NOT NULL,
        ip_address inet NULL,
        success boolean NOT NULL,
        attempted_at timestamptz DEFAULT now(),
        tenant_id uuid NULL,
        lockout_until timestamptz NULL,
        failure_reason varchar(200) NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_login_attempts_email ON login_attempts (email);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS login_attempts ENABLE ROW LEVEL SECURITY;"))

    # Create feedbacks
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS feedbacks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        user_id uuid NOT NULL,
        feedback_type varchar(50) NOT NULL,
        severity varchar(20) NOT NULL,
        description varchar(500) NOT NULL,
        page_url text NOT NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_feedback_user_status ON feedbacks (user_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS feedbacks ENABLE ROW LEVEL SECURITY;"))

    # Create pii_detection_rules
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS pii_detection_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name varchar(200) NOT NULL,
        pattern text NOT NULL,
        description text NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_pii_detection_rules_tenant ON pii_detection_rules (tenant_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS pii_detection_rules ENABLE ROW LEVEL SECURITY;"))
    conn.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS uq_pii_detection_rules_tenant_name ON pii_detection_rules (tenant_id, name);"))

    # LLM configs
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS llm_configs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        provider varchar(50) NOT NULL,
        model_name varchar(100) NOT NULL,
        encrypted_api_key text NULL,
        api_base_url varchar(500) NULL,
        temperature double precision DEFAULT 0.7,
        max_tokens integer DEFAULT 2048,
        is_active boolean DEFAULT false,
        test_status varchar(20) DEFAULT 'untested',
        last_test_at timestamptz NULL,
        test_error_message text NULL,
        settings jsonb NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        version integer DEFAULT 1 NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_llm_configs_tenant_active ON llm_configs (tenant_id, is_active);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_llm_configs_provider ON llm_configs (provider);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS llm_configs ENABLE ROW LEVEL SECURITY;"))

    # Ingestion jobs
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS ingestion_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name varchar(200) NOT NULL,
        description text NULL,
        status varchar(30) NOT NULL DEFAULT 'pending',
        source_type varchar(50) NOT NULL,
        total_files integer DEFAULT 0,
        processed_files integer DEFAULT 0,
        total_records integer DEFAULT 0,
        processed_records integer DEFAULT 0,
        failed_records integer DEFAULT 0,
        pii_detected_count integer DEFAULT 0,
        pii_anonymized_count integer DEFAULT 0,
        progress_percentage double precision DEFAULT 0.0,
        current_step varchar(100) NULL,
        error_message text NULL,
        error_details jsonb NULL,
        started_at timestamptz NULL,
        completed_at timestamptz NULL,
        settings jsonb NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        version integer DEFAULT 1 NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_tenant_status ON ingestion_jobs (tenant_id, status);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_created ON ingestion_jobs (created_at);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS ingestion_jobs ENABLE ROW LEVEL SECURITY;"))

    # Ingestion sources
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS ingestion_sources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        job_id uuid NOT NULL,
        source_type varchar(50) NOT NULL,
        file_type varchar(30) NULL,
        file_name varchar(300) NULL,
        file_path varchar(1000) NULL,
        file_size_bytes bigint NULL,
        status varchar(30) NOT NULL DEFAULT 'pending',
        total_records integer DEFAULT 0,
        processed_records integer DEFAULT 0,
        pii_detection_id uuid NULL,
        error_message text NULL,
        metadata jsonb NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        version integer DEFAULT 1 NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id) REFERENCES ingestion_jobs(id) ON DELETE CASCADE
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_ingestion_sources_job ON ingestion_sources (job_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_ingestion_sources_tenant ON ingestion_sources (tenant_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS ingestion_sources ENABLE ROW LEVEL SECURITY;"))

    # PII detections
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS pii_detections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        source_id uuid NULL,
        source_type varchar(50) NOT NULL,
        original_text_encrypted text NULL,
        anonymized_text text NULL,
        entities jsonb NOT NULL,
        risk_level varchar(20) NOT NULL DEFAULT 'medium',
        anonymization_status varchar(30) NOT NULL DEFAULT 'pending_review',
        anonymization_strategy varchar(50) NULL,
        reviewed_by uuid NULL,
        reviewed_at timestamptz NULL,
        review_notes text NULL,
        auto_anonymize boolean DEFAULT false,
        metadata jsonb NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        version integer DEFAULT 1 NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_pii_detections_tenant_status ON pii_detections (tenant_id, anonymization_status);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_pii_detections_risk ON pii_detections (risk_level);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_pii_detections_source ON pii_detections (source_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_pii_detections_pending ON pii_detections (tenant_id, anonymization_status) WHERE anonymization_status = 'pending_review';"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS pii_detections ENABLE ROW LEVEL SECURITY;"))
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_ingestion_sources_pii_detection'
        ) THEN
            ALTER TABLE IF EXISTS ingestion_sources ADD CONSTRAINT fk_ingestion_sources_pii_detection FOREIGN KEY (pii_detection_id) REFERENCES pii_detections(id) ON DELETE SET NULL;
        END IF;
    END
    $$;
    """))

    # Ensure funding_sources has legacy/seed columns (safe checks)
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'funding_sources' AND relkind = 'r') THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_sources' AND column_name = 'description') THEN
                EXECUTE 'ALTER TABLE funding_sources ADD COLUMN description text NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_sources' AND column_name = 'instrument_type') THEN
                EXECUTE 'ALTER TABLE funding_sources ADD COLUMN instrument_type varchar(50) NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_sources' AND column_name = 'trl_min') THEN
                EXECUTE 'ALTER TABLE funding_sources ADD COLUMN trl_min integer NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_sources' AND column_name = 'trl_max') THEN
                EXECUTE 'ALTER TABLE funding_sources ADD COLUMN trl_max integer NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_sources' AND column_name = 'total_amount') THEN
                EXECUTE 'ALTER TABLE funding_sources ADD COLUMN total_amount numeric NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_sources' AND column_name = 'available_amount') THEN
                EXECUTE 'ALTER TABLE funding_sources ADD COLUMN available_amount numeric NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_sources' AND column_name = 'currency') THEN
                EXECUTE 'ALTER TABLE funding_sources ADD COLUMN currency varchar(10) NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_sources' AND column_name = 'submission_start') THEN
                EXECUTE 'ALTER TABLE funding_sources ADD COLUMN submission_start timestamptz NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_sources' AND column_name = 'submission_end') THEN
                EXECUTE 'ALTER TABLE funding_sources ADD COLUMN submission_end timestamptz NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_sources' AND column_name = 'status') THEN
                EXECUTE 'ALTER TABLE funding_sources ADD COLUMN status varchar(30) NULL DEFAULT ''draft''';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_sources' AND column_name = 'source_organization') THEN
                EXECUTE 'ALTER TABLE funding_sources ADD COLUMN source_organization varchar(300) NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_sources' AND column_name = 'created_by') THEN
                EXECUTE 'ALTER TABLE funding_sources ADD COLUMN created_by uuid NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_sources' AND column_name = 'updated_by') THEN
                EXECUTE 'ALTER TABLE funding_sources ADD COLUMN updated_by uuid NULL';
            END IF;
        END IF;
    END
    $$;
    """))

    # Create safe indexes for funding_sources after extensions are available
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'funding_sources' AND relkind = 'r') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'funding_sources' AND indexname = 'idx_funding_trl_range') THEN
                EXECUTE 'CREATE INDEX idx_funding_trl_range ON funding_sources USING gist (trl_range)';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'funding_sources' AND indexname = 'idx_funding_submission_start') THEN
                EXECUTE 'CREATE INDEX idx_funding_submission_start ON funding_sources (submission_start)';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'funding_sources' AND indexname = 'idx_funding_submission_end') THEN
                EXECUTE 'CREATE INDEX idx_funding_submission_end ON funding_sources (submission_end)';
            END IF;
        END IF;
    END
    $$;
    """))

    # Reports and statistics
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS report_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        template_id varchar(200) NOT NULL,
        name varchar(300) NOT NULL,
        description text NULL,
        sections jsonb NULL,
        default_format varchar(20) NOT NULL DEFAULT 'html',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_report_templates_tenant ON report_templates (tenant_id);"))
    conn.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS uq_report_templates_tenant_template ON report_templates (tenant_id, template_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS report_templates ENABLE ROW LEVEL SECURITY;"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS report_instances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        template_id varchar(200) NOT NULL,
        name varchar(300) NOT NULL,
        format varchar(20) NOT NULL DEFAULT 'pdf',
        status varchar(30) NOT NULL DEFAULT 'pending',
        created_by uuid NULL,
        updated_by uuid NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_report_instances_tenant ON report_instances (tenant_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS report_instances ENABLE ROW LEVEL SECURITY;"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS statistics_aggregates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        key varchar(200) NOT NULL,
        value jsonb NOT NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_statistics_aggregates_tenant ON statistics_aggregates (tenant_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS statistics_aggregates ENABLE ROW LEVEL SECURITY;"))

    # Audit logs and core domain tables
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid,
        tenant_id uuid NOT NULL,
        entity_type varchar(50) NOT NULL,
        entity_id uuid NOT NULL,
        action varchar(30) NOT NULL,
        timestamp timestamptz NOT NULL DEFAULT now(),
        user_id uuid NOT NULL,
        user_role varchar(30) NULL,
        before_state jsonb NULL,
        after_state jsonb NULL,
        session_id uuid NULL,
        ip_address inet NULL,
        user_agent text NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        version integer DEFAULT 1 NOT NULL,
        PRIMARY KEY (id, timestamp),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_audit_tenant_entity ON audit_logs (tenant_id, entity_type, entity_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs (timestamp);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs (user_id, timestamp);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;"))

    # Create RLS policies for tenant isolation and common checks
    # users
    conn.execute(sa.text("DROP POLICY IF EXISTS users_tenant_isolation ON users;"))
    conn.execute(sa.text(
        "CREATE POLICY users_tenant_isolation ON users FOR ALL USING (\n"
        "    tenant_id IS NULL OR tenant_id::text = current_setting('app.current_tenant', true)\n"
        "    OR tenant_id = current_setting('app.current_tenant_id', true)::uuid\n"
        "    OR current_setting('app.is_superadmin', true) = 'true'\n"
        ");"
    ))
    conn.execute(sa.text("ALTER TABLE IF EXISTS users FORCE ROW LEVEL SECURITY;"))

    # user_roles (uses users relation)
    conn.execute(sa.text("DROP POLICY IF EXISTS user_roles_tenant_isolation ON user_roles;"))
    conn.execute(sa.text(
        "CREATE POLICY user_roles_tenant_isolation ON user_roles FOR ALL USING (\n"
        "    user_id IN (SELECT id FROM users WHERE tenant_id IS NULL OR tenant_id::text = current_setting('app.current_tenant', true) OR tenant_id = current_setting('app.current_tenant_id', true)::uuid OR current_setting('app.is_superadmin', true) = 'true')\n"
        ");"
    ))
    conn.execute(sa.text("ALTER TABLE IF EXISTS user_roles FORCE ROW LEVEL SECURITY;"))

    # login_attempts
    conn.execute(sa.text("DROP POLICY IF EXISTS login_attempts_tenant_isolation ON login_attempts;"))
    conn.execute(sa.text(
        "CREATE POLICY login_attempts_tenant_isolation ON login_attempts FOR ALL USING (\n"
        "    tenant_id IS NULL OR tenant_id::text = current_setting('app.current_tenant', true) OR tenant_id = current_setting('app.current_tenant_id', true)::uuid OR current_setting('app.is_superadmin', true) = 'true'\n"
        ");"
    ))
    conn.execute(sa.text("ALTER TABLE IF EXISTS login_attempts FORCE ROW LEVEL SECURITY;"))

    # system_config
    conn.execute(sa.text("DROP POLICY IF EXISTS system_config_tenant_isolation ON system_config;"))
    conn.execute(sa.text(
        "CREATE POLICY system_config_tenant_isolation ON system_config FOR ALL USING (\n"
        "    tenant_id IS NULL OR tenant_id::text = current_setting('app.current_tenant', true) OR tenant_id = current_setting('app.current_tenant_id', true)::uuid OR current_setting('app.is_superadmin', true) = 'true'\n"
        ");"
    ))
    conn.execute(sa.text("ALTER TABLE IF EXISTS system_config FORCE ROW LEVEL SECURITY;"))

    # refresh_tokens
    conn.execute(sa.text("DROP POLICY IF EXISTS refresh_tokens_user_isolation ON refresh_tokens;"))
    conn.execute(sa.text(
        "CREATE POLICY refresh_tokens_user_isolation ON refresh_tokens FOR ALL USING (\n"
        "    user_id IN (SELECT id FROM users WHERE tenant_id IS NULL OR tenant_id::text = current_setting('app.current_tenant', true) OR tenant_id = current_setting('app.current_tenant_id', true)::uuid OR current_setting('app.is_superadmin', true) = 'true')\n"
        ");"
    ))
    conn.execute(sa.text("ALTER TABLE IF EXISTS refresh_tokens FORCE ROW LEVEL SECURITY;"))

    # feedbacks (from legacy feedback migration)
    conn.execute(sa.text("DROP POLICY IF EXISTS feedback_tenant_isolation ON feedbacks;"))
    conn.execute(sa.text(
        "CREATE POLICY feedback_tenant_isolation ON feedbacks USING (\n"
        "    tenant_id::text = current_setting('app.current_tenant', true) OR tenant_id = current_setting('app.current_tenant_id', true)::uuid OR current_setting('app.is_superadmin', true) = 'true'\n"
        ");"
    ))
    conn.execute(sa.text("DROP POLICY IF EXISTS feedback_user_insert ON feedbacks;"))
    conn.execute(sa.text(
        "CREATE POLICY feedback_user_insert ON feedbacks FOR INSERT WITH CHECK (\n"
        "    (user_id::text = current_setting('app.current_user', true) OR user_id = current_setting('app.current_user_id', true)::uuid)\n"
        "    AND (tenant_id::text = current_setting('app.current_tenant', true) OR tenant_id = current_setting('app.current_tenant_id', true)::uuid)\n"
        ");"
    ))
    conn.execute(sa.text("ALTER TABLE IF EXISTS feedbacks FORCE ROW LEVEL SECURITY;"))

    # tenant-scoped tables general policy helper: apply tenant isolation to other tables
    def_tbls = ['llm_configs','ingestion_jobs','ingestion_sources','pii_detections','report_templates','report_instances','statistics_aggregates','audit_logs','portfolios','projects','clients','funding_sources','proposals','proposal_versions','matching_scores','opportunities','interactions']
    for t in def_tbls:
        conn.execute(sa.text(f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_class WHERE relname = '{t}' AND relkind = 'r') THEN
                EXECUTE 'DROP POLICY IF EXISTS {t}_tenant_isolation ON {t}';
                EXECUTE 'CREATE POLICY {t}_tenant_isolation ON {t} FOR ALL USING (tenant_id IS NULL OR tenant_id::text = current_setting(''app.current_tenant'', true) OR tenant_id = current_setting(''app.current_tenant_id'', true)::uuid OR current_setting(''app.is_superadmin'', true) = ''true'')';
                EXECUTE 'ALTER TABLE {t} FORCE ROW LEVEL SECURITY';
            END IF;
        END
        $$;
        """))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS portfolios (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name varchar(300) NOT NULL,
        description text NULL,
        project_ids jsonb DEFAULT '[]'::jsonb,
        strategic_areas jsonb DEFAULT '[]'::jsonb,
        key_competencies jsonb DEFAULT '[]'::jsonb,
        total_budget numeric DEFAULT 0,
        active_projects_count integer DEFAULT 0,
        created_by uuid NULL,
        updated_by uuid NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    """))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS projects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        portfolio_id uuid NULL,
        name varchar(300) NOT NULL,
        description text NULL,
        status varchar(50) NOT NULL DEFAULT 'active',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_projects_portfolio_id ON projects (portfolio_id) WHERE portfolio_id IS NOT NULL;"))
    # Ensure legacy/seed columns expected by seeding scripts
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'projects' AND relkind = 'r') THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='title') THEN
                EXECUTE 'ALTER TABLE projects ADD COLUMN title varchar(300) NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='trl_current') THEN
                EXECUTE 'ALTER TABLE projects ADD COLUMN trl_current integer NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='trl_target') THEN
                EXECUTE 'ALTER TABLE projects ADD COLUMN trl_target integer NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='competencies') THEN
                EXECUTE 'ALTER TABLE projects ADD COLUMN competencies jsonb NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='team_members') THEN
                EXECUTE 'ALTER TABLE projects ADD COLUMN team_members jsonb NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='created_by') THEN
                EXECUTE 'ALTER TABLE projects ADD COLUMN created_by uuid NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='updated_by') THEN
                EXECUTE 'ALTER TABLE projects ADD COLUMN updated_by uuid NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='version') THEN
                EXECUTE 'ALTER TABLE projects ADD COLUMN version integer DEFAULT 1';
            END IF;
            EXECUTE 'CREATE INDEX IF NOT EXISTS idx_projects_title ON projects (title)';
        END IF;
    END
    $$;
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_projects_title ON projects (title);"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS clients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name varchar(300) NOT NULL,
        document_number varchar(100) NULL,
        metadata jsonb NULL,
        version integer DEFAULT 1 NOT NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        created_by uuid NULL,
        updated_by uuid NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    """))
    # Ensure clients has legacy/seed columns (safe checks)
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'clients' AND relkind = 'r') THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='client_type') THEN
                EXECUTE 'ALTER TABLE clients ADD COLUMN client_type varchar(100) NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='sector') THEN
                EXECUTE 'ALTER TABLE clients ADD COLUMN sector varchar(200) NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='version') THEN
                EXECUTE 'ALTER TABLE clients ADD COLUMN version integer DEFAULT 1';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='created_by') THEN
                EXECUTE 'ALTER TABLE clients ADD COLUMN created_by uuid NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='updated_by') THEN
                EXECUTE 'ALTER TABLE clients ADD COLUMN updated_by uuid NULL';
            END IF;
        END IF;
    END
    $$;
    """))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS funding_sources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name varchar(300) NOT NULL,
        type varchar(50) NULL,
        instrument_type varchar(50) NULL,
        trl_min integer NULL,
        trl_max integer NULL,
        total_amount numeric NULL,
        available_amount numeric NULL,
        currency varchar(10) NULL,
        submission_start timestamptz NULL,
        submission_end timestamptz NULL,
        status varchar(30) NULL DEFAULT 'draft',
        source_organization varchar(300) NULL,
        details jsonb NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    """))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS proposals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        title varchar(500) NOT NULL,
        description text NULL,
        owner_id uuid NULL,
        status varchar(50) NOT NULL DEFAULT 'draft',
        current_version integer DEFAULT 1,
        head_version_id uuid NULL,
        latest_adherence_score numeric(3,2) NULL,
        adherence_analysis jsonb NULL,
        version integer DEFAULT 1,
        last_ai_check timestamptz NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_proposals_tenant ON proposals (tenant_id);"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS proposal_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        proposal_id uuid NOT NULL,
        version integer NOT NULL,
        content jsonb NULL,
        created_at timestamptz DEFAULT now(),
        created_by uuid NULL,
        FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
    );
    """))
    conn.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS uq_proposal_versions_proposal_version ON proposal_versions (proposal_id, version);"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS matching_scores (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        proposal_id uuid NULL,
        score numeric(5,4) NULL,
        details jsonb NULL,
        created_at timestamptz DEFAULT now(),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_matching_scores_tenant ON matching_scores (tenant_id);"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS opportunities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        proposal_id uuid NULL,
        name varchar(300) NOT NULL,
        stage varchar(100) NULL,
        value numeric NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_opportunities_tenant ON opportunities (tenant_id);"))
    # Ensure opportunities has legacy/seed columns
    conn.execute(sa.text("ALTER TABLE IF EXISTS opportunities ADD COLUMN IF NOT EXISTS priority integer NULL;"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS opportunities ADD COLUMN IF NOT EXISTS priority_score numeric NULL;"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS opportunities ADD COLUMN IF NOT EXISTS probability_score numeric NULL;"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS opportunities ADD COLUMN IF NOT EXISTS estimated_value numeric NULL;"))
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'opportunities' AND relkind = 'r') THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='expected_close_date') THEN
                EXECUTE 'ALTER TABLE opportunities ADD COLUMN expected_close_date timestamptz NULL';
            END IF;
        END IF;
    END
    $$;
    """))
    conn.execute(sa.text("ALTER TABLE IF EXISTS opportunities ADD COLUMN IF NOT EXISTS assigned_to uuid NULL;"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS opportunities ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS interactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        user_id uuid NULL,
        target_id uuid NULL,
        target_type varchar(50) NULL,
        interaction_type varchar(50) NULL,
        payload jsonb NULL,
        created_at timestamptz DEFAULT now(),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    """))

    # Add missing tenant columns and useful indexes/constraints from legacy migrations (safe checks)
    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tenants' AND relkind = 'r') THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='status') THEN
                EXECUTE 'ALTER TABLE tenants ADD COLUMN status varchar(20) NOT NULL DEFAULT ''active''';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='subscription_tier') THEN
                EXECUTE 'ALTER TABLE tenants ADD COLUMN subscription_tier varchar(20) NOT NULL DEFAULT ''basic''';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='deleted_at') THEN
                EXECUTE 'ALTER TABLE tenants ADD COLUMN deleted_at timestamptz NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='created_by') THEN
                EXECUTE 'ALTER TABLE tenants ADD COLUMN created_by uuid NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='updated_by') THEN
                EXECUTE 'ALTER TABLE tenants ADD COLUMN updated_by uuid NULL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='version') THEN
                EXECUTE 'ALTER TABLE tenants ADD COLUMN version integer DEFAULT 1';
            END IF;
            EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants (status)';
        END IF;
    END
    $$;
    """))

    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'feedbacks' AND relkind = 'r') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='user_id') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='status') THEN
                EXECUTE 'CREATE INDEX IF NOT EXISTS idx_feedback_user_status ON feedbacks (user_id, status)';
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='status') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='severity') THEN
                EXECUTE 'CREATE INDEX IF NOT EXISTS idx_feedback_status_severity ON feedbacks (status, severity)';
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='feedback_type') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='status') THEN
                EXECUTE 'CREATE INDEX IF NOT EXISTS idx_feedback_type_status ON feedbacks (feedback_type, status)';
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='entity_type') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='entity_id') THEN
                EXECUTE 'CREATE INDEX IF NOT EXISTS idx_feedback_entity ON feedbacks (entity_type, entity_id)';
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='created_at') THEN
                EXECUTE 'CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedbacks (created_at)';
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='tenant_id') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='feedbacks' AND column_name='deleted_at') THEN
                EXECUTE 'CREATE INDEX IF NOT EXISTS idx_feedback_tenant_deleted ON feedbacks (tenant_id, deleted_at)';
            END IF;
        END IF;
    END
    $$;
    """))

    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_projects_portfolio_id ON projects (portfolio_id) WHERE portfolio_id IS NOT NULL;"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_created ON ingestion_jobs (created_at);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_proposals_tenant ON proposals (tenant_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_matching_scores_tenant ON matching_scores (tenant_id);"))

    conn.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_ingestion_sources_pii_detection'
        ) THEN
            ALTER TABLE IF EXISTS ingestion_sources ADD CONSTRAINT fk_ingestion_sources_pii_detection FOREIGN KEY (pii_detection_id) REFERENCES pii_detections(id) ON DELETE SET NULL;
        END IF;
    END
    $$;
    """))

    # Minimal seeds: roles, default tenant, system_config and admin user
    conn.execute(sa.text("INSERT INTO roles (name) VALUES ('admin') ON CONFLICT (name) DO NOTHING;"))
    conn.execute(sa.text("INSERT INTO roles (name) VALUES ('superadmin') ON CONFLICT (name) DO NOTHING;"))
    conn.execute(sa.text("INSERT INTO roles (name) VALUES ('developer') ON CONFLICT (name) DO NOTHING;"))

    # Tenant creation and complex seed logic deferred to seed scripts.
    conn.execute(sa.text("SELECT 1;"))

    conn.execute(sa.text("INSERT INTO system_config (id, tenant_id, config_key, config_value, created_at, updated_at) VALUES (gen_random_uuid(), NULL, 'email_config', '{}'::jsonb, now(), now()) ON CONFLICT (tenant_id, config_key) DO NOTHING;"))

    conn.execute(sa.text("""
    INSERT INTO users (id, tenant_id, email, username, password_hash, first_name, last_name, email_verified, is_active, created_at, updated_at)
    VALUES (
        'ba4f4bf9-2daf-4be4-81cb-69bc2b832209'::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid,
        'admin@prospecai.com',
        'admin',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4OoYwOjN4R1COKKS',
        'System',
        'Administrator',
        true,
        true,
        now(),
        now()
    ) ON CONFLICT (tenant_id, email) DO NOTHING;
    """))

    conn.execute(sa.text("INSERT INTO user_roles (id, user_id, role_id, role_name, assigned_at) SELECT gen_random_uuid(), u.id, 'admin', 'admin', now() FROM users u WHERE u.email = 'admin@prospecai.com' AND u.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid ON CONFLICT (user_id, role_id) DO NOTHING;"))
    conn.execute(sa.text("INSERT INTO user_roles (id, user_id, role_id, role_name, assigned_at) SELECT gen_random_uuid(), u.id, 'superadmin', 'superadmin', now() FROM users u WHERE u.email = 'admin@prospecai.com' AND u.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid ON CONFLICT (user_id, role_id) DO NOTHING;"))
    


def downgrade() -> None:
    # baseline downgrade: no-op to avoid accidental data loss
    conn = op.get_bind()
    conn.execute(sa.text("SELECT 1;"))
