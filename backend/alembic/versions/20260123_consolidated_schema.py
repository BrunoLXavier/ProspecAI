"""Consolidated schema migration - integrates all migrations up to 20260123

This is the master migration that creates the entire ProspecAI database schema.
It consolidates all previous migrations (20260119_baseline through 20260223_fix_communications_rls)
into a single idempotent script for fresh deployments.

Revision ID: 20260123_consolidated
Revises: 
Create Date: 2026-01-23 12:00:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260123_consolidated'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # ==========================================================================
    # EXTENSIONS
    # ==========================================================================
    try:
        conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))
    except Exception:
        pass
    try:
        conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS btree_gist;"))
    except Exception:
        pass

    # ==========================================================================
    # CORE TABLES: tenants, roles, system_config
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS tenants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(200) NOT NULL,
        slug varchar(100) NOT NULL UNIQUE,
        is_active boolean NOT NULL DEFAULT true,
        status varchar(20) NOT NULL DEFAULT 'active',
        subscription_tier varchar(20) NOT NULL DEFAULT 'basic',
        settings jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        version integer DEFAULT 1
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants (slug);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants (status);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS tenants ENABLE ROW LEVEL SECURITY;"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) UNIQUE NOT NULL,
        description text,
        permissions jsonb DEFAULT '{}'::jsonb,
        is_system boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
    );
    """))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS system_config (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,
        config_key varchar(50) NOT NULL,
        config_value jsonb NOT NULL DEFAULT '{}'::jsonb,
        email_config jsonb DEFAULT '{}'::jsonb,
        security_config jsonb DEFAULT '{}'::jsonb,
        contact_form_config jsonb DEFAULT '{}'::jsonb,
        email_templates jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE (tenant_id, config_key)
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_system_config_key ON system_config (config_key);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS system_config ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # USERS AND AUTH
    # ==========================================================================
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
        cpf varchar(14) NULL,
        perfil varchar(50) DEFAULT 'Visitante' NOT NULL,
        pais_emissor_documento varchar(100) DEFAULT 'Brasil' NOT NULL,
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
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_user_perfil ON users(perfil);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;"))

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

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS login_attempts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(255) NOT NULL,
        ip_address inet NULL,
        success boolean NOT NULL,
        timestamp timestamptz DEFAULT now() NOT NULL,
        tenant_id uuid NULL,
        lockout_until timestamptz NULL,
        failure_reason varchar(200) NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_login_attempts_email ON login_attempts (email);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_login_email_timestamp ON login_attempts (email, timestamp);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS login_attempts ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # INSTITUTES AND USER-INSTITUTE ASSOCIATIONS
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS institutes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name varchar(300) NOT NULL,
        nome varchar(200) NOT NULL,
        isi_sigla varchar(100) NOT NULL,
        code varchar(100),
        description text,
        descricao text NOT NULL DEFAULT '',
        nome_fantasia varchar(150) NULL,
        endereco_rua varchar(500) DEFAULT '' NOT NULL,
        endereco_numero varchar(20) NULL,
        endereco_complemento varchar(200) NULL,
        endereco_bairro varchar(200) DEFAULT '' NOT NULL,
        endereco_cep varchar(10) DEFAULT '' NOT NULL,
        endereco_cidade varchar(200) DEFAULT '' NOT NULL,
        endereco_uf varchar(2) DEFAULT 'SP' NOT NULL,
        area_predial_m2 integer NULL,
        status_operacional varchar(50) DEFAULT 'Operacional' NOT NULL,
        status varchar(50) DEFAULT 'Ativo' NOT NULL,
        maturidade_gestao varchar(10) NULL,
        maturidade_base_tecnologica numeric(3,1) NULL,
        maturidade_produtos_servicos numeric(3,1) NULL,
        maturidade_cooperacao numeric(3,1) NULL,
        credenciamento_cati boolean DEFAULT false,
        credenciamento_ed boolean DEFAULT false,
        logo_url varchar(1000) NULL,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        UNIQUE (tenant_id, name)
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_institutes_tenant ON institutes(tenant_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_institutes_status ON institutes(status, status_operacional);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_institutes_cidade_uf ON institutes(endereco_cidade, endereco_uf);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS institutes ENABLE ROW LEVEL SECURITY;"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS user_institutes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        institute_id uuid NOT NULL,
        tenant_id uuid NOT NULL,
        role varchar(80) NULL,
        assigned_at timestamptz DEFAULT now() NOT NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        UNIQUE (user_id, institute_id)
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_user_institutes_user ON user_institutes(user_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_user_institutes_institute ON user_institutes(institute_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS user_institutes ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # TEAMS
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS teams (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        usuario_id uuid NOT NULL,
        instituto_id uuid NOT NULL,
        name varchar(200) NULL,
        description text NULL,
        cargo varchar(200) NOT NULL DEFAULT '',
        funcao_principal varchar(500) NOT NULL DEFAULT '',
        vinculo_principal boolean DEFAULT false,
        email_profissional varchar(255) NULL,
        telefone_celular varchar(20) NULL,
        linkedin_url varchar(500) NULL,
        lattes_url varchar(500) NULL,
        orcid_id varchar(50) NULL,
        researchgate_url varchar(500) NULL,
        scopus_author_id varchar(50) NULL,
        web_of_science_researcher_id varchar(50) NULL,
        foto_perfil_url varchar(1000) NULL,
        data_vinculo_inicio timestamptz NULL,
        data_vinculo_fim timestamptz NULL,
        member_ids jsonb DEFAULT '[]'::jsonb,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        UNIQUE (usuario_id, instituto_id)
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_teams_institute ON teams(instituto_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_teams_usuario ON teams(usuario_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_teams_vinculo_principal ON teams(vinculo_principal);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS teams ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # INFRASTRUCTURES
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS infrastructures (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        instituto_id uuid NOT NULL,
        institute_id uuid NULL,
        name varchar(200) NULL,
        nome varchar(300) NOT NULL DEFAULT '',
        description text NULL,
        descricao text NOT NULL DEFAULT '',
        email_laboratorio varchar(255) DEFAULT '' NOT NULL,
        email_responsavel varchar(255) DEFAULT '' NOT NULL,
        telefone varchar(20) NULL,
        site_url varchar(500) NULL,
        endereco_completo text NULL,
        area_predial_m2 integer NOT NULL DEFAULT 0,
        status_isi varchar(50) DEFAULT 'Operacional' NOT NULL,
        maturidade_gestao varchar(10) NULL,
        maturidade_base_tecnologica numeric(3,1) NULL,
        maturidade_produtos_servicos numeric(3,1) NULL,
        maturidade_cooperacao numeric(3,1) NULL,
        maturidade_regulatoria numeric(3,1) NULL,
        maturidade_laboratorial numeric(3,1) NULL,
        plataformas_tecnologicas jsonb DEFAULT '[]'::jsonb,
        areas_conhecimento jsonb DEFAULT '[]'::jsonb,
        macroareas_pesquisa jsonb DEFAULT '[]'::jsonb,
        midias jsonb DEFAULT '[]'::jsonb,
        equipamentos json DEFAULT '[]'::json,
        capacity jsonb DEFAULT '{}'::jsonb,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_infrastructures_institute ON infrastructures(instituto_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_infrastructures_status ON infrastructures(status_isi);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS infrastructures ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # FUNDING SOURCES
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS funding_sources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name varchar(300) NOT NULL,
        description text NULL,
        type varchar(50) NULL,
        instrument_type varchar(50) NULL,
        trl_min integer NULL,
        trl_max integer NULL,
        total_amount numeric NULL,
        available_amount numeric NULL,
        currency varchar(10) NULL DEFAULT 'BRL',
        submission_start timestamptz NULL,
        submission_end timestamptz NULL,
        execution_start timestamptz NULL,
        execution_end timestamptz NULL,
        status varchar(30) NULL DEFAULT 'draft',
        source_organization varchar(300) NULL,
        url varchar(1000) NULL,
        details jsonb NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_funding_submission_start ON funding_sources (submission_start);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_funding_submission_end ON funding_sources (submission_end);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS funding_sources ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # PORTFOLIOS AND PROJECTS
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS portfolios (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        institute_id uuid NULL,
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
        updated_at timestamptz DEFAULT now()
    );
    """))
    conn.execute(sa.text("ALTER TABLE IF EXISTS portfolios ENABLE ROW LEVEL SECURITY;"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS projects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        portfolio_id uuid NULL,
        institute_id uuid NULL,
        name varchar(300) NOT NULL DEFAULT '',
        title varchar(300) NULL,
        description text NULL,
        status varchar(50) NOT NULL DEFAULT 'active',
        trl_current integer NULL,
        trl_target integer NULL,
        research_area varchar(300) NULL,
        start_date date NULL,
        end_date date NULL,
        budget numeric(20,2) NULL,
        objectives jsonb NULL,
        methodology text NULL,
        expected_results jsonb NULL,
        infrastructure jsonb NULL,
        parent_version_id uuid NULL,
        competencies jsonb NULL,
        team_members jsonb NULL,
        version integer DEFAULT 1,
        created_by uuid NULL,
        updated_by uuid NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_projects_portfolio_id ON projects (portfolio_id) WHERE portfolio_id IS NOT NULL;"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_projects_title ON projects (title);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # PORTFOLIO PROJECTS (detailed institutional projects)
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS portfolio_projects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        instituto_id uuid NOT NULL,
        nome varchar(500) NOT NULL,
        descricao text NOT NULL DEFAULT '',
        trl_saida integer NOT NULL DEFAULT 1,
        trl_entrada integer NULL,
        id_projeto_sgt varchar(100) NULL,
        categoria_solucao_resultante varchar(50) NULL,
        areas_conhecimento jsonb DEFAULT '[]'::jsonb,
        macroareas_pesquisa jsonb DEFAULT '[]'::jsonb,
        modalidade_fomento varchar(200) NULL,
        edital_fomento varchar(500) NULL,
        parceiros jsonb DEFAULT '[]'::jsonb,
        tematicas jsonb DEFAULT '[]'::jsonb,
        plataformas_tecnologicas jsonb DEFAULT '[]'::jsonb,
        informacoes_criticas text NULL,
        empresa_atendida_tipo varchar(50) NULL,
        empresa_atendida_nome varchar(500) NULL,
        empresa_atendida_cnpj varchar(20) NULL,
        empresa_atendida_pais varchar(100) NULL,
        empresa_atendida_cidade varchar(200) NULL,
        empresa_atendida_uf varchar(2) NULL,
        empresa_atendida_setor_cnae varchar(50) NULL,
        empresa_atendida_depoimento text NULL,
        status varchar(50) DEFAULT 'Ativo' NOT NULL,
        pode_ser_divulgado boolean DEFAULT true,
        midias jsonb DEFAULT '[]'::jsonb,
        data_inicio timestamptz NULL,
        data_fim timestamptz NULL,
        valor_total numeric(20,2) NULL,
        equipe_ids jsonb DEFAULT '[]'::jsonb,
        infraestrutura_ids jsonb DEFAULT '[]'::jsonb,
        indicadores jsonb DEFAULT '{}'::jsonb,
        licoes_aprendidas text NULL,
        team_members jsonb DEFAULT '[]'::jsonb,
        competencies jsonb DEFAULT '[]'::jsonb,
        start_date timestamptz NULL,
        end_date timestamptz NULL,
        budget numeric(20,2) NULL,
        lessons_learned jsonb DEFAULT '[]'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_portfolio_projects_institute ON portfolio_projects(instituto_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_portfolio_projects_status ON portfolio_projects(status);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_portfolio_projects_trl ON portfolio_projects(trl_entrada, trl_saida);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS portfolio_projects ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # CRM: CLIENTS, INTERACTIONS, OPPORTUNITIES
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS clients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name varchar(300) NOT NULL,
        document_number varchar(100) NULL,
        client_type varchar(100) NULL,
        sector varchar(200) NULL,
        metadata jsonb NULL,
        version integer DEFAULT 1 NOT NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        created_by uuid NULL,
        updated_by uuid NULL
    );
    """))
    conn.execute(sa.text("ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS interactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        user_id uuid NULL,
        target_id uuid NULL,
        target_type varchar(50) NULL,
        interaction_type varchar(50) NULL,
        payload jsonb NULL,
        created_at timestamptz DEFAULT now()
    );
    """))
    conn.execute(sa.text("ALTER TABLE IF EXISTS interactions ENABLE ROW LEVEL SECURITY;"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS opportunities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        proposal_id uuid NULL,
        client_id uuid NULL,
        funding_source_id uuid NULL,
        name varchar(300) NOT NULL DEFAULT '',
        title varchar(300) NULL,
        description text NULL,
        stage varchar(100) NULL DEFAULT 'intelligence',
        value numeric NULL,
        priority integer NULL,
        priority_score numeric NULL,
        probability_score numeric NULL,
        estimated_value numeric NULL,
        expected_close_date timestamptz NULL,
        assigned_to uuid NULL,
        version integer DEFAULT 1,
        created_by uuid NULL,
        updated_by uuid NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_opportunities_tenant ON opportunities (tenant_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS opportunities ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # PROPOSALS
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS proposals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        opportunity_id uuid NULL,
        funding_source_id uuid NULL,
        title varchar(500) NOT NULL,
        description text NULL,
        owner_id uuid NULL,
        current_status varchar(30) NOT NULL DEFAULT 'draft',
        current_version integer DEFAULT 1,
        head_version_id uuid NULL,
        latest_adherence_score numeric(3,2) NULL,
        adherence_analysis jsonb NULL,
        version integer DEFAULT 1,
        last_ai_check timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_proposals_tenant ON proposals (tenant_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS proposals ENABLE ROW LEVEL SECURITY;"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS proposal_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        proposal_id uuid NOT NULL,
        version integer NOT NULL,
        content jsonb NULL,
        created_at timestamptz DEFAULT now(),
        created_by uuid NULL
    );
    """))
    conn.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS uq_proposal_versions_proposal_version ON proposal_versions (proposal_id, version);"))

    # ==========================================================================
    # MATCHING SCORES
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS matching_scores (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        opportunity_id uuid NOT NULL,
        project_id uuid NOT NULL,
        funding_source_id uuid NULL,
        technical_score numeric(5,2) NOT NULL,
        financial_score numeric(5,2) NOT NULL,
        strategic_score numeric(5,2) NOT NULL,
        composite_score numeric(5,2) NOT NULL,
        algorithm_version varchar(10) NOT NULL DEFAULT '1.0',
        calculation_details jsonb NOT NULL,
        confidence_level numeric(3,2) NOT NULL,
        validation_status varchar(20) NOT NULL DEFAULT 'pending',
        validated_by uuid NULL,
        validated_at timestamptz NULL,
        validation_notes text NULL,
        human_override_score numeric(5,2) NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        version integer DEFAULT 1 NOT NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_matching_scores_tenant ON matching_scores (tenant_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS matching_scores ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # FEEDBACKS
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS feedbacks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        user_id uuid NOT NULL,
        feedback_type varchar(50) NOT NULL,
        severity varchar(20) NOT NULL,
        description varchar(500) NOT NULL,
        page_url text NOT NULL,
        page_title varchar(500),
        entity_type varchar(50),
        entity_id uuid,
        screenshot_url text,
        annotation_image_url text,
        annotation_data jsonb,
        user_agent text,
        screen_width integer,
        screen_height integer,
        status varchar(20) DEFAULT 'open' NOT NULL,
        response text,
        responded_by uuid,
        responded_at timestamptz,
        resolved_at timestamptz,
        resolution_notes text,
        created_by uuid,
        updated_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_feedback_user_status ON feedbacks (user_id, status);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_feedback_status_severity ON feedbacks (status, severity);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_feedback_type_status ON feedbacks (feedback_type, status);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_feedback_entity ON feedbacks (entity_type, entity_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedbacks (created_at);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_feedback_tenant_deleted ON feedbacks (tenant_id, deleted_at);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS feedbacks ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # LLM CONFIGS
    # ==========================================================================
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
        version integer DEFAULT 1 NOT NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_llm_configs_tenant_active ON llm_configs (tenant_id, is_active);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_llm_configs_provider ON llm_configs (provider);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS llm_configs ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # INGESTION
    # ==========================================================================
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
        version integer DEFAULT 1 NOT NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_tenant_status ON ingestion_jobs (tenant_id, status);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_created ON ingestion_jobs (created_at);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS ingestion_jobs ENABLE ROW LEVEL SECURITY;"))

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
        version integer DEFAULT 1 NOT NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_ingestion_sources_job ON ingestion_sources (job_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_ingestion_sources_tenant ON ingestion_sources (tenant_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS ingestion_sources ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # PII DETECTIONS
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS pii_detections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        source_id uuid NULL,
        document_id uuid NULL,
        ingestion_source_id uuid NULL,
        source_type varchar(50) NOT NULL,
        file_name varchar(300) NULL,
        file_type varchar(50) NULL,
        original_text_encrypted text NULL,
        anonymized_text text NULL,
        entities jsonb NOT NULL DEFAULT '[]'::jsonb,
        total_entities integer DEFAULT 0,
        risk_level varchar(20) NOT NULL DEFAULT 'medium',
        overall_risk_level varchar(20) DEFAULT 'low',
        risk_summary jsonb DEFAULT '{}'::jsonb,
        anonymization_status varchar(30) NOT NULL DEFAULT 'pending_review',
        anonymization_strategy varchar(50) NULL,
        anonymization_error text NULL,
        anonymized_by uuid NULL,
        anonymized_at timestamptz NULL,
        reviewed_by uuid NULL,
        reviewed_at timestamptz NULL,
        review_notes text NULL,
        reviewer_comment text NULL,
        analyzed_at timestamptz NULL,
        analysis_duration_ms integer DEFAULT 0,
        text_length integer DEFAULT 0,
        detection_methods jsonb DEFAULT '[]'::jsonb,
        auto_anonymize boolean DEFAULT false,
        metadata jsonb NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        version integer DEFAULT 1 NOT NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_pii_detections_tenant_status ON pii_detections (tenant_id, anonymization_status);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_pii_detections_risk ON pii_detections (risk_level);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_pii_detections_source ON pii_detections (source_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_pii_detections_document_id ON pii_detections (document_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_pii_detections_ingestion_source_id ON pii_detections (ingestion_source_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_pii_detections_pending ON pii_detections (tenant_id, anonymization_status) WHERE anonymization_status = 'pending_review';"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS pii_detections ENABLE ROW LEVEL SECURITY;"))

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
    conn.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS uq_pii_detection_rules_tenant_name ON pii_detection_rules (tenant_id, name);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS pii_detection_rules ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # REPORTS
    # ==========================================================================
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
        updated_at timestamptz DEFAULT now()
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
        updated_at timestamptz DEFAULT now()
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
        updated_at timestamptz DEFAULT now()
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_statistics_aggregates_tenant ON statistics_aggregates (tenant_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS statistics_aggregates ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # AUDIT LOGS
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid DEFAULT gen_random_uuid(),
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
        PRIMARY KEY (id, timestamp)
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_audit_tenant_entity ON audit_logs (tenant_id, entity_type, entity_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs (timestamp);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs (user_id, timestamp);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # COMMUNICATIONS
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS communication_threads (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        subject varchar(500),
        linked_entity_type varchar(50) NULL,
        linked_entity_id uuid NULL,
        is_auto_created boolean DEFAULT false,
        auto_created_confirmed boolean DEFAULT false,
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
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_threads_linked_entity ON communication_threads(linked_entity_type, linked_entity_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS communication_threads ENABLE ROW LEVEL SECURITY;"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS communication_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        thread_id uuid NOT NULL,
        author varchar(200) NOT NULL,
        author_name varchar(300),
        body text NOT NULL,
        message_type varchar(50) DEFAULT 'text',
        is_auto_created boolean DEFAULT false,
        auto_created_confirmed boolean DEFAULT false,
        email_metadata jsonb DEFAULT '{}'::jsonb,
        attachments jsonb DEFAULT '[]'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_messages_tenant ON communication_messages(tenant_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_messages_thread ON communication_messages(thread_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_messages_created_at ON communication_messages(created_at);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS communication_messages ENABLE ROW LEVEL SECURITY;"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS communication_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
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
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_attachments_tenant ON communication_attachments(tenant_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_attachments_thread ON communication_attachments(thread_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_comm_attachments_message ON communication_attachments(message_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS communication_attachments ENABLE ROW LEVEL SECURITY;"))

    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS meeting_minutes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        thread_id uuid NOT NULL,
        title varchar(500),
        content text,
        status varchar(50) NOT NULL DEFAULT 'pending',
        generated_at timestamptz NULL,
        generated_by uuid NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_minutes_tenant ON meeting_minutes(tenant_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_minutes_thread ON meeting_minutes(thread_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_minutes_status ON meeting_minutes(status);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS meeting_minutes ENABLE ROW LEVEL SECURITY;"))

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
    conn.execute(sa.text("ALTER TABLE IF EXISTS communication_thread_participants ENABLE ROW LEVEL SECURITY;"))

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
    conn.execute(sa.text("ALTER TABLE IF EXISTS communication_drafts ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # NOTIFICATION TEMPLATES
    # ==========================================================================
    conn.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS notification_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name varchar(200) NOT NULL,
        subject varchar(500) NOT NULL,
        body text NOT NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_notification_templates_tenant ON notification_templates(tenant_id);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS notification_templates ENABLE ROW LEVEL SECURITY;"))

    # ==========================================================================
    # FOREIGN KEY CONSTRAINTS
    # ==========================================================================
    # Add foreign keys idempotently
    fk_statements = [
        ("fk_ingestion_sources_pii_detection", "ingestion_sources", "pii_detection_id", "pii_detections", "id", "SET NULL"),
        ("fk_comm_messages_thread", "communication_messages", "thread_id", "communication_threads", "id", "CASCADE"),
        ("fk_comm_attachments_thread", "communication_attachments", "thread_id", "communication_threads", "id", "CASCADE"),
        ("fk_minutes_thread", "meeting_minutes", "thread_id", "communication_threads", "id", "CASCADE"),
        ("fk_comm_participants_thread", "communication_thread_participants", "thread_id", "communication_threads", "id", "CASCADE"),
        ("fk_comm_drafts_thread", "communication_drafts", "thread_id", "communication_threads", "id", "CASCADE"),
    ]
    for fk_name, table, column, ref_table, ref_column, on_delete in fk_statements:
        conn.execute(sa.text(f"""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = '{fk_name}'
            ) THEN
                ALTER TABLE {table} 
                ADD CONSTRAINT {fk_name} 
                FOREIGN KEY ({column}) REFERENCES {ref_table}({ref_column}) ON DELETE {on_delete};
            END IF;
        END $$;
        """))

    # ==========================================================================
    # RLS POLICIES
    # ==========================================================================
    # Users policy
    conn.execute(sa.text("DROP POLICY IF EXISTS users_tenant_isolation ON users;"))
    conn.execute(sa.text("""
    CREATE POLICY users_tenant_isolation ON users FOR ALL USING (
        tenant_id IS NULL 
        OR tenant_id::text = current_setting('app.current_tenant', true)
        OR tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.is_superadmin', true) = 'true'
    );
    """))
    conn.execute(sa.text("ALTER TABLE IF EXISTS users FORCE ROW LEVEL SECURITY;"))

    # User roles policy
    conn.execute(sa.text("DROP POLICY IF EXISTS user_roles_tenant_isolation ON user_roles;"))
    conn.execute(sa.text("""
    CREATE POLICY user_roles_tenant_isolation ON user_roles FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE tenant_id IS NULL 
            OR tenant_id::text = current_setting('app.current_tenant', true) 
            OR tenant_id = current_setting('app.current_tenant_id', true)::uuid 
            OR current_setting('app.is_superadmin', true) = 'true'
        )
    );
    """))
    conn.execute(sa.text("ALTER TABLE IF EXISTS user_roles FORCE ROW LEVEL SECURITY;"))

    # Generic tenant isolation policies for all tenant-scoped tables
    # Note: 'tenants' table uses 'id' as identifier, not 'tenant_id'
    # Note: 'refresh_tokens' uses 'user_id' instead of 'tenant_id'
    tenant_tables_with_tenant_id = [
        'system_config', 'login_attempts',
        'institutes', 'user_institutes', 'teams', 'infrastructures',
        'funding_sources', 'portfolios', 'projects', 'portfolio_projects',
        'clients', 'interactions', 'opportunities', 'proposals', 'matching_scores',
        'feedbacks', 'llm_configs', 'ingestion_jobs', 'ingestion_sources',
        'pii_detections', 'pii_detection_rules', 'report_templates', 'report_instances',
        'statistics_aggregates', 'audit_logs',
        'communication_threads', 'communication_messages', 'communication_attachments',
        'meeting_minutes', 'communication_thread_participants', 'communication_drafts',
        'notification_templates'
    ]
    for t in tenant_tables_with_tenant_id:
        conn.execute(sa.text(f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_class WHERE relname = '{t}' AND relkind = 'r') THEN
                EXECUTE 'DROP POLICY IF EXISTS {t}_tenant_isolation ON {t}';
                EXECUTE 'CREATE POLICY {t}_tenant_isolation ON {t} FOR ALL USING (
                    tenant_id IS NULL 
                    OR tenant_id::text = current_setting(''app.current_tenant'', true) 
                    OR tenant_id = current_setting(''app.current_tenant_id'', true)::uuid 
                    OR current_setting(''app.is_superadmin'', true) = ''true''
                )';
                EXECUTE 'ALTER TABLE {t} FORCE ROW LEVEL SECURITY';
            END IF;
        END $$;
        """))

    # Special policy for tenants table (uses 'id' instead of 'tenant_id')
    conn.execute(sa.text("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tenants' AND relkind = 'r') THEN
                EXECUTE 'DROP POLICY IF EXISTS tenants_tenant_isolation ON tenants';
                EXECUTE 'CREATE POLICY tenants_tenant_isolation ON tenants FOR ALL USING (
                    id IS NULL 
                    OR id::text = current_setting(''app.current_tenant'', true) 
                    OR id = current_setting(''app.current_tenant_id'', true)::uuid 
                    OR current_setting(''app.is_superadmin'', true) = ''true''
                )';
                EXECUTE 'ALTER TABLE tenants FORCE ROW LEVEL SECURITY';
            END IF;
        END $$;
    """))

    # Special policy for refresh_tokens table (uses 'user_id' instead of 'tenant_id')
    conn.execute(sa.text("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'refresh_tokens' AND relkind = 'r') THEN
                EXECUTE 'DROP POLICY IF EXISTS refresh_tokens_user_isolation ON refresh_tokens';
                EXECUTE 'CREATE POLICY refresh_tokens_user_isolation ON refresh_tokens FOR ALL USING (
                    user_id IN (
                        SELECT id FROM users WHERE tenant_id IS NULL 
                        OR tenant_id::text = current_setting(''app.current_tenant'', true) 
                        OR tenant_id = current_setting(''app.current_tenant_id'', true)::uuid 
                        OR current_setting(''app.is_superadmin'', true) = ''true''
                    )
                )';
                EXECUTE 'ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY';
            END IF;
        END $$;
    """))

    # ==========================================================================
    # SEED DEFAULT ROLES
    # ==========================================================================
    conn.execute(sa.text("INSERT INTO roles (name, description, is_system) VALUES ('admin', 'Full system access', true) ON CONFLICT (name) DO NOTHING;"))
    conn.execute(sa.text("INSERT INTO roles (name, description, is_system) VALUES ('superadmin', 'Super administrator with cross-tenant access', true) ON CONFLICT (name) DO NOTHING;"))
    conn.execute(sa.text("INSERT INTO roles (name, description, is_system) VALUES ('manager', 'Can manage projects and team', true) ON CONFLICT (name) DO NOTHING;"))
    conn.execute(sa.text("INSERT INTO roles (name, description, is_system) VALUES ('analyst', 'Read access and report generation', true) ON CONFLICT (name) DO NOTHING;"))
    conn.execute(sa.text("INSERT INTO roles (name, description, is_system) VALUES ('viewer', 'Read-only access', true) ON CONFLICT (name) DO NOTHING;"))
    conn.execute(sa.text("INSERT INTO roles (name, description, is_system) VALUES ('developer', 'Developer access for testing', true) ON CONFLICT (name) DO NOTHING;"))

    # ==========================================================================
    # SEED DEFAULT TENANT
    # ==========================================================================
    conn.execute(sa.text("""
    INSERT INTO tenants (id, name, slug, is_active, status, subscription_tier, created_at, updated_at)
    VALUES (
        '00000000-0000-0000-0000-000000000001'::uuid,
        'Default Tenant',
        'default',
        true,
        'active',
        'enterprise',
        now(),
        now()
    ) ON CONFLICT (slug) DO NOTHING;
    """))

    # ==========================================================================
    # SEED ADMIN USER (admin@prospecai.com / Admin@123)
    # Password hash for 'Admin@123' using bcrypt
    # ==========================================================================
    # Hash generated with: bcrypt.hashpw(b'Admin@123', bcrypt.gensalt(12))
    ADMIN_HASH = '$2b$12$LRulWbk7Ol7LHQwVn.8MqOFtpjtRcgZk3Qbsxa7l9q.nv9nv0QR1K'
    
    conn.execute(sa.text(f"""
    INSERT INTO users (id, tenant_id, email, username, password_hash, first_name, last_name, full_name, email_verified, is_active, perfil, created_at, updated_at)
    VALUES (
        'ba4f4bf9-2daf-4be4-81cb-69bc2b832209'::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid,
        'admin@prospecai.com',
        'admin',
        '{ADMIN_HASH}',
        'System',
        'Administrator',
        'System Administrator',
        true,
        true,
        'Administrador',
        now(),
        now()
    ) ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
    """))

    # Assign admin roles
    conn.execute(sa.text("""
    INSERT INTO user_roles (id, user_id, role_id, role_name, assigned_at)
    SELECT gen_random_uuid(), u.id, 'admin', 'admin', now() FROM users u 
    WHERE u.email = 'admin@prospecai.com' AND u.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid 
    ON CONFLICT (user_id, role_id) DO NOTHING;
    """))

    conn.execute(sa.text("""
    INSERT INTO user_roles (id, user_id, role_id, role_name, assigned_at)
    SELECT gen_random_uuid(), u.id, 'superadmin', 'superadmin', now() FROM users u 
    WHERE u.email = 'admin@prospecai.com' AND u.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid 
    ON CONFLICT (user_id, role_id) DO NOTHING;
    """))

    # Seed default system config
    conn.execute(sa.text("""
    INSERT INTO system_config (id, tenant_id, config_key, config_value, created_at, updated_at) 
    VALUES (gen_random_uuid(), NULL, 'merged', '{}'::jsonb, now(), now()) 
    ON CONFLICT (tenant_id, config_key) DO NOTHING;
    """))


def downgrade() -> None:
    # Downgrade is intentionally a no-op to avoid accidental data loss
    conn = op.get_bind()
    conn.execute(sa.text("SELECT 1;"))
