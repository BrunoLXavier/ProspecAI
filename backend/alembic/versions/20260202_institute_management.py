"""Add institute management columns and new tables

Revision ID: 20260202_institute_management
Revises: 20260201_add_typed_columns
Create Date: 2026-02-02 10:00:00

This migration adds:
- Extended columns to institutes table
- Extended columns to user_institutes table  
- Extended columns to teams table
- Extended columns to infrastructures table
- portfolio_projects table (new)
- Extended columns to users table (cpf, perfil, pais_emissor_documento)
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260202_institute_management'
down_revision = '20260201_add_typed_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # ===========================================
    # USERS TABLE UPDATES
    # ===========================================
    # Add cpf, perfil, pais_emissor_documento if not exists
    conn.execute(sa.text("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'users' AND column_name = 'cpf') THEN
                ALTER TABLE users ADD COLUMN cpf varchar(14) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'users' AND column_name = 'pais_emissor_documento') THEN
                ALTER TABLE users ADD COLUMN pais_emissor_documento varchar(100) DEFAULT 'Brasil' NOT NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'users' AND column_name = 'perfil') THEN
                ALTER TABLE users ADD COLUMN perfil varchar(50) DEFAULT 'Visitante' NOT NULL;
            END IF;
        END $$;
    """))
    
    # Add index for perfil
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_user_perfil ON users(perfil);"))
    
    # ===========================================
    # INSTITUTES TABLE UPDATES
    # ===========================================
    conn.execute(sa.text("""
        DO $$
        BEGIN
            -- Required fields
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'nome') THEN
                ALTER TABLE institutes ADD COLUMN nome varchar(200);
                UPDATE institutes SET nome = name WHERE nome IS NULL;
                ALTER TABLE institutes ALTER COLUMN nome SET NOT NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'isi_sigla') THEN
                ALTER TABLE institutes ADD COLUMN isi_sigla varchar(100);
                UPDATE institutes SET isi_sigla = code WHERE isi_sigla IS NULL AND code IS NOT NULL;
                UPDATE institutes SET isi_sigla = COALESCE(code, nome) WHERE isi_sigla IS NULL;
                ALTER TABLE institutes ALTER COLUMN isi_sigla SET NOT NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'endereco_rua') THEN
                ALTER TABLE institutes ADD COLUMN endereco_rua varchar(500) DEFAULT '' NOT NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'endereco_bairro') THEN
                ALTER TABLE institutes ADD COLUMN endereco_bairro varchar(200) DEFAULT '' NOT NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'endereco_cep') THEN
                ALTER TABLE institutes ADD COLUMN endereco_cep varchar(10) DEFAULT '' NOT NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'endereco_cidade') THEN
                ALTER TABLE institutes ADD COLUMN endereco_cidade varchar(200) DEFAULT '' NOT NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'endereco_uf') THEN
                ALTER TABLE institutes ADD COLUMN endereco_uf varchar(2) DEFAULT 'SP' NOT NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'descricao') THEN
                ALTER TABLE institutes ADD COLUMN descricao text;
                UPDATE institutes SET descricao = description WHERE descricao IS NULL;
                UPDATE institutes SET descricao = '' WHERE descricao IS NULL;
                ALTER TABLE institutes ALTER COLUMN descricao SET NOT NULL;
            END IF;
            
            -- Optional fields
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'nome_fantasia') THEN
                ALTER TABLE institutes ADD COLUMN nome_fantasia varchar(150) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'endereco_numero') THEN
                ALTER TABLE institutes ADD COLUMN endereco_numero varchar(20) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'endereco_complemento') THEN
                ALTER TABLE institutes ADD COLUMN endereco_complemento varchar(200) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'area_predial_m2') THEN
                ALTER TABLE institutes ADD COLUMN area_predial_m2 integer NULL;
            END IF;
            
            -- Status fields
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'status_operacional') THEN
                ALTER TABLE institutes ADD COLUMN status_operacional varchar(50) DEFAULT 'Operacional' NOT NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'status') THEN
                ALTER TABLE institutes ADD COLUMN status varchar(50) DEFAULT 'Ativo' NOT NULL;
            END IF;
            
            -- Maturity fields
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'maturidade_gestao') THEN
                ALTER TABLE institutes ADD COLUMN maturidade_gestao varchar(10) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'maturidade_base_tecnologica') THEN
                ALTER TABLE institutes ADD COLUMN maturidade_base_tecnologica numeric(3,1) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'maturidade_produtos_servicos') THEN
                ALTER TABLE institutes ADD COLUMN maturidade_produtos_servicos numeric(3,1) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'maturidade_cooperacao') THEN
                ALTER TABLE institutes ADD COLUMN maturidade_cooperacao numeric(3,1) NULL;
            END IF;
            
            -- Accreditation
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'credenciamento_cati') THEN
                ALTER TABLE institutes ADD COLUMN credenciamento_cati boolean DEFAULT false;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'credenciamento_ed') THEN
                ALTER TABLE institutes ADD COLUMN credenciamento_ed boolean DEFAULT false;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'institutes' AND column_name = 'logo_url') THEN
                ALTER TABLE institutes ADD COLUMN logo_url varchar(1000) NULL;
            END IF;
        END $$;
    """))
    
    # Add indexes
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_institutes_status ON institutes(status, status_operacional);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_institutes_cidade_uf ON institutes(endereco_cidade, endereco_uf);"))
    
    # ===========================================
    # USER_INSTITUTES TABLE UPDATES  
    # ===========================================
    conn.execute(sa.text("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'user_institutes' AND column_name = 'deleted_at') THEN
                ALTER TABLE user_institutes ADD COLUMN deleted_at timestamptz NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'user_institutes' AND column_name = 'created_by') THEN
                ALTER TABLE user_institutes ADD COLUMN created_by uuid NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'user_institutes' AND column_name = 'updated_by') THEN
                ALTER TABLE user_institutes ADD COLUMN updated_by uuid NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'user_institutes' AND column_name = 'created_at') THEN
                ALTER TABLE user_institutes ADD COLUMN created_at timestamptz DEFAULT now();
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'user_institutes' AND column_name = 'updated_at') THEN
                ALTER TABLE user_institutes ADD COLUMN updated_at timestamptz DEFAULT now();
            END IF;
        END $$;
    """))
    
    # ===========================================
    # TEAMS TABLE (create or update)
    # ===========================================
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS teams (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL,
            usuario_id uuid NOT NULL,
            instituto_id uuid NOT NULL,
            cargo varchar(200) NOT NULL,
            funcao_principal varchar(500) NOT NULL,
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
            name varchar(200) NULL,
            description text NULL,
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
    
    # Add teams columns if table already existed with minimal structure
    conn.execute(sa.text("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'teams' AND column_name = 'usuario_id') THEN
                ALTER TABLE teams ADD COLUMN usuario_id uuid;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'teams' AND column_name = 'instituto_id') THEN
                ALTER TABLE teams ADD COLUMN instituto_id uuid;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'teams' AND column_name = 'cargo') THEN
                ALTER TABLE teams ADD COLUMN cargo varchar(200);
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'teams' AND column_name = 'funcao_principal') THEN
                ALTER TABLE teams ADD COLUMN funcao_principal varchar(500);
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'teams' AND column_name = 'vinculo_principal') THEN
                ALTER TABLE teams ADD COLUMN vinculo_principal boolean DEFAULT false;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'teams' AND column_name = 'email_profissional') THEN
                ALTER TABLE teams ADD COLUMN email_profissional varchar(255) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'teams' AND column_name = 'telefone_celular') THEN
                ALTER TABLE teams ADD COLUMN telefone_celular varchar(20) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'teams' AND column_name = 'linkedin_url') THEN
                ALTER TABLE teams ADD COLUMN linkedin_url varchar(500) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'teams' AND column_name = 'lattes_url') THEN
                ALTER TABLE teams ADD COLUMN lattes_url varchar(500) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'teams' AND column_name = 'orcid_id') THEN
                ALTER TABLE teams ADD COLUMN orcid_id varchar(50) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'teams' AND column_name = 'researchgate_url') THEN
                ALTER TABLE teams ADD COLUMN researchgate_url varchar(500) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'teams' AND column_name = 'scopus_author_id') THEN
                ALTER TABLE teams ADD COLUMN scopus_author_id varchar(50) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'teams' AND column_name = 'web_of_science_researcher_id') THEN
                ALTER TABLE teams ADD COLUMN web_of_science_researcher_id varchar(50) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'teams' AND column_name = 'foto_perfil_url') THEN
                ALTER TABLE teams ADD COLUMN foto_perfil_url varchar(1000) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'teams' AND column_name = 'data_vinculo_inicio') THEN
                ALTER TABLE teams ADD COLUMN data_vinculo_inicio timestamptz NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'teams' AND column_name = 'data_vinculo_fim') THEN
                ALTER TABLE teams ADD COLUMN data_vinculo_fim timestamptz NULL;
            END IF;
        END $$;
    """))
    
    # Indexes for teams
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_teams_institute ON teams(instituto_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_teams_usuario ON teams(usuario_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_teams_vinculo_principal ON teams(vinculo_principal);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS teams ENABLE ROW LEVEL SECURITY;"))
    
    # ===========================================
    # INFRASTRUCTURES TABLE (create or update)
    # ===========================================
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS infrastructures (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL,
            instituto_id uuid NOT NULL,
            nome varchar(300) NOT NULL,
            descricao text NOT NULL,
            email_laboratorio varchar(255) NOT NULL,
            email_responsavel varchar(255) NOT NULL,
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
            name varchar(200) NULL,
            description text NULL,
            capacity jsonb DEFAULT '{}'::jsonb,
            metadata jsonb DEFAULT '{}'::jsonb,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            deleted_at timestamptz NULL,
            created_by uuid NULL,
            updated_by uuid NULL
        );
    """))
    
    # Add infrastructures columns if table already existed
    conn.execute(sa.text("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'instituto_id') THEN
                ALTER TABLE infrastructures ADD COLUMN instituto_id uuid;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'nome') THEN
                ALTER TABLE infrastructures ADD COLUMN nome varchar(300);
                UPDATE infrastructures SET nome = name WHERE nome IS NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'descricao') THEN
                ALTER TABLE infrastructures ADD COLUMN descricao text;
                UPDATE infrastructures SET descricao = description WHERE descricao IS NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'email_laboratorio') THEN
                ALTER TABLE infrastructures ADD COLUMN email_laboratorio varchar(255) DEFAULT '';
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'email_responsavel') THEN
                ALTER TABLE infrastructures ADD COLUMN email_responsavel varchar(255) DEFAULT '';
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'telefone') THEN
                ALTER TABLE infrastructures ADD COLUMN telefone varchar(20) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'site_url') THEN
                ALTER TABLE infrastructures ADD COLUMN site_url varchar(500) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'endereco_completo') THEN
                ALTER TABLE infrastructures ADD COLUMN endereco_completo text NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'area_predial_m2') THEN
                ALTER TABLE infrastructures ADD COLUMN area_predial_m2 integer DEFAULT 0;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'status_isi') THEN
                ALTER TABLE infrastructures ADD COLUMN status_isi varchar(50) DEFAULT 'Operacional';
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'maturidade_gestao') THEN
                ALTER TABLE infrastructures ADD COLUMN maturidade_gestao varchar(10) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'maturidade_regulatoria') THEN
                ALTER TABLE infrastructures ADD COLUMN maturidade_regulatoria numeric(3,1) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'maturidade_laboratorial') THEN
                ALTER TABLE infrastructures ADD COLUMN maturidade_laboratorial numeric(3,1) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'plataformas_tecnologicas') THEN
                ALTER TABLE infrastructures ADD COLUMN plataformas_tecnologicas jsonb DEFAULT '[]'::jsonb;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'areas_conhecimento') THEN
                ALTER TABLE infrastructures ADD COLUMN areas_conhecimento jsonb DEFAULT '[]'::jsonb;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'macroareas_pesquisa') THEN
                ALTER TABLE infrastructures ADD COLUMN macroareas_pesquisa jsonb DEFAULT '[]'::jsonb;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'infrastructures' AND column_name = 'midias') THEN
                ALTER TABLE infrastructures ADD COLUMN midias jsonb DEFAULT '[]'::jsonb;
            END IF;
        END $$;
    """))
    
    # Indexes for infrastructures
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_infrastructures_institute ON infrastructures(instituto_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_infrastructures_status ON infrastructures(status_isi);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS infrastructures ENABLE ROW LEVEL SECURITY;"))
    
    # ===========================================
    # PORTFOLIO_PROJECTS TABLE (create or update)
    # ===========================================
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS portfolio_projects (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL,
            instituto_id uuid NOT NULL,
            nome varchar(500) NOT NULL,
            descricao text NOT NULL,
            trl_saida integer NOT NULL DEFAULT 1,
            id_projeto_sgt varchar(100) NULL,
            categoria_solucao_resultante varchar(50) NULL,
            areas_conhecimento jsonb DEFAULT '[]'::jsonb,
            macroareas_pesquisa jsonb DEFAULT '[]'::jsonb,
            modalidade_fomento varchar(200) NULL,
            edital_fomento varchar(500) NULL,
            trl_entrada integer NULL,
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
    
    # Add portfolio_projects columns if table already existed
    conn.execute(sa.text("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'portfolio_projects' AND column_name = 'edital_fomento') THEN
                ALTER TABLE portfolio_projects ADD COLUMN edital_fomento varchar(500) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'portfolio_projects' AND column_name = 'empresa_atendida_cnpj') THEN
                ALTER TABLE portfolio_projects ADD COLUMN empresa_atendida_cnpj varchar(20) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'portfolio_projects' AND column_name = 'empresa_atendida_cidade') THEN
                ALTER TABLE portfolio_projects ADD COLUMN empresa_atendida_cidade varchar(200) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'portfolio_projects' AND column_name = 'empresa_atendida_uf') THEN
                ALTER TABLE portfolio_projects ADD COLUMN empresa_atendida_uf varchar(2) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'portfolio_projects' AND column_name = 'data_inicio') THEN
                ALTER TABLE portfolio_projects ADD COLUMN data_inicio timestamptz NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'portfolio_projects' AND column_name = 'data_fim') THEN
                ALTER TABLE portfolio_projects ADD COLUMN data_fim timestamptz NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'portfolio_projects' AND column_name = 'valor_total') THEN
                ALTER TABLE portfolio_projects ADD COLUMN valor_total numeric(20,2) NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'portfolio_projects' AND column_name = 'equipe_ids') THEN
                ALTER TABLE portfolio_projects ADD COLUMN equipe_ids jsonb DEFAULT '[]'::jsonb;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'portfolio_projects' AND column_name = 'infraestrutura_ids') THEN
                ALTER TABLE portfolio_projects ADD COLUMN infraestrutura_ids jsonb DEFAULT '[]'::jsonb;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'portfolio_projects' AND column_name = 'indicadores') THEN
                ALTER TABLE portfolio_projects ADD COLUMN indicadores jsonb DEFAULT '{}'::jsonb;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'portfolio_projects' AND column_name = 'licoes_aprendidas') THEN
                ALTER TABLE portfolio_projects ADD COLUMN licoes_aprendidas text NULL;
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'portfolio_projects' AND column_name = 'plataformas_tecnologicas') THEN
                ALTER TABLE portfolio_projects ADD COLUMN plataformas_tecnologicas jsonb DEFAULT '[]'::jsonb;
            END IF;
        END $$;
    """))
    
    # Indexes for portfolio_projects
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_portfolio_projects_institute ON portfolio_projects(instituto_id);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_portfolio_projects_status ON portfolio_projects(status);"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_portfolio_projects_trl ON portfolio_projects(trl_entrada, trl_saida);"))
    conn.execute(sa.text("ALTER TABLE IF EXISTS portfolio_projects ENABLE ROW LEVEL SECURITY;"))


def downgrade() -> None:
    # We don't drop columns in downgrade to preserve data
    # Only drop new tables if they were created by this migration
    pass
