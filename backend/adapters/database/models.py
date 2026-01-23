# Database Models for PostgreSQL with SQLAlchemy
# Implements RNF-02: Row-Level Security (RLS) and Multi-tenancy
from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Numeric, Text, JSON, Enum as SQLEnum, Index, ForeignKey, UniqueConstraint, PrimaryKeyConstraint, text
import os
from sqlalchemy.dialects import postgresql
try:
    PGUUID = postgresql.UUID
    INET = postgresql.INET
except Exception:
    from sqlalchemy import String
    def PGUUID(*_args, **_kwargs):
        return String(36)
    INET = String(50)

# If tests run using in-memory SQLite, map PG types to SQLite-friendly types
if os.getenv("TEST_USE_SQLITE", "true").lower() == "true":
    from sqlalchemy import String
    def PGUUID(*_args, **_kwargs):
        return String(36)
    INET = String(50)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import synonym
from sqlalchemy.sql import func

Base = declarative_base()


class BaseModel(Base):
    """
    Base model with common fields for all tables.
    Implements multi-tenancy via tenant_id and soft delete.
    """
    __abstract__ = True
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    created_by = Column(PGUUID(as_uuid=True), nullable=False)
    updated_by = Column(PGUUID(as_uuid=True), nullable=False)
    
    __table_args__ = ()


class FundingSourceModel(BaseModel):
    """PostgreSQL model for funding sources."""
    __tablename__ = "funding_sources"
    
    name = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    institution = Column(String(300), nullable=False, server_default="")
    instrument_type = Column(String(50), nullable=False)
    
    trl_min = Column(Integer, nullable=False)
    trl_max = Column(Integer, nullable=False)
    
    # Encrypted fields (via application layer)
    total_amount = Column(Numeric(20, 2), nullable=False)
    available_amount = Column(Numeric(20, 2), nullable=False, server_default=text('0'))
    currency = Column(String(3), default="BRL")
    
    submission_start = Column(DateTime(timezone=True), nullable=False)
    submission_end = Column(DateTime(timezone=True), nullable=False)
    execution_start = Column(DateTime(timezone=True), nullable=True)
    execution_end = Column(DateTime(timezone=True), nullable=True)
    
    status = Column(String(50), nullable=False)
    source_organization = Column(String(500), nullable=False)
    url = Column(Text, nullable=True)
    
    # Compatibility fields used by enhanced schema and repositories
    execution_period = Column(JSON, nullable=True)
    trl_range = Column(JSON, nullable=True)
    requirements = Column(Text, nullable=True)
    eligibility_criteria = Column(Text, nullable=True)
    source_url = Column(Text, nullable=True)

    # AI fields stored as JSON-like structures for SQLite tests
    ai_extraction_status = Column(String(20), default='pending', server_default="'pending'")
    ai_extracted_fields = Column(JSON, default=dict, nullable=True, server_default='{}')
    ai_processed_at = Column(DateTime(timezone=True), nullable=True)
    contains_pii = Column(Boolean, default=False, server_default=text('0'))
    pii_anonymized = Column(Boolean, default=False, server_default=text('0'))
    lgpd_categories = Column(JSON, default=list, nullable=True, server_default='[]')

    # AI fields stored as JSONB in Postgres (fallback to JSON for SQLite)
    ai_extracted_data = Column(JSON, nullable=True)
    ai_confidence_score = Column(Numeric(3, 2), nullable=True)

    # Versioning for optimistic concurrency and repository expectations
    version = Column(Integer, default=1, server_default=text('1'), nullable=False)
    
    __table_args__ = (
        Index('idx_funding_status_dates', 'status', 'submission_start', 'submission_end'),
        Index('idx_funding_trl', 'trl_min', 'trl_max'),
    )


class ProjectModel(BaseModel):
    """PostgreSQL model for projects."""
    __tablename__ = "projects"
    
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), nullable=False)
    # Optional link to a containing portfolio (nullable)
    portfolio_id = Column(PGUUID(as_uuid=True), nullable=True)
    # Optional link to an owning institute (nullable during migration)
    institute_id = Column(PGUUID(as_uuid=True), nullable=True, index=True)
    
    trl_current = Column(Integer, nullable=False)
    trl_target = Column(Integer, nullable=True)
    # Business fields used by repository/use-cases
    research_area = Column(String(200), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    budget = Column(Numeric(20, 2), nullable=True)
    objectives = Column(JSON, default=list)
    methodology = Column(Text, nullable=True)
    expected_results = Column(JSON, default=list)
    trl_history = Column(JSON, default=list)
    
    team_members = Column(JSON, default=list)
    competencies = Column(JSON, default=list)
    infrastructure = Column(JSON, nullable=True)
    lessons_learned = Column(JSON, default=list)
    
    version = Column(Integer, default=1, server_default=text('1'), nullable=False)
    parent_version_id = Column(PGUUID(as_uuid=True), nullable=True)
    
    __table_args__ = (
        Index('idx_project_trl', 'trl_current'),
        Index('idx_project_status', 'status'),
    )


class PortfolioModel(BaseModel):
    """PostgreSQL model for portfolios."""
    __tablename__ = "portfolios"
    
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    project_ids = Column(JSON, default=list)
    strategic_areas = Column(JSON, default=list)
    key_competencies = Column(JSON, default=list)
    
    total_budget = Column(Numeric(20, 2), nullable=True)
    active_projects_count = Column(Integer, default=0)
    # Optional owning institute
    institute_id = Column(PGUUID(as_uuid=True), nullable=True, index=True)

    __table_args__ = (
        Index('idx_tenant_deleted', 'tenant_id', 'deleted_at'),
    )


class PortfolioProjectModel(BaseModel):
    """
    PostgreSQL model for portfolio projects (enhanced).
    Implements RF-03: Portfólio Institucional
    """
    __tablename__ = "portfolio_projects"
    
    # Required fields
    instituto_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    nome = Column(String(500), nullable=False)
    descricao = Column(Text, nullable=False)
    trl_saida = Column(Integer, nullable=False)
    
    # Optional identification
    id_projeto_sgt = Column(String(100), nullable=True)
    
    # Classification
    categoria_solucao_resultante = Column(String(50), nullable=True)
    areas_conhecimento = Column(JSON, default=list)
    macroareas_pesquisa = Column(JSON, default=list)
    
    # Funding
    modalidade_fomento = Column(String(200), nullable=True)
    
    # TRL tracking
    trl_entrada = Column(Integer, nullable=True)
    
    # Partnerships and themes
    parceiros = Column(JSON, default=list)
    tematicas = Column(JSON, default=list)
    
    # Critical information
    informacoes_criticas = Column(Text, nullable=True)
    
    # Company served info
    empresa_atendida_tipo = Column(String(50), nullable=True)
    empresa_atendida_nome = Column(String(500), nullable=True)
    empresa_atendida_pais = Column(String(100), nullable=True)
    empresa_atendida_setor_cnae = Column(String(50), nullable=True)
    empresa_atendida_depoimento = Column(Text, nullable=True)
    
    # Visibility
    status = Column(String(50), nullable=False, default='Ativo')
    pode_ser_divulgado = Column(Boolean, default=True)
    
    # Media files
    midias = Column(JSON, default=list)
    # Equipment list stored as JSON objects
    equipamentos = Column(JSON, default=list)
    
    # Legacy compatibility with Project model
    team_members = Column(JSON, default=list)
    competencies = Column(JSON, default=list)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    budget = Column(Numeric(20, 2), nullable=True)
    lessons_learned = Column(JSON, default=list)

    __table_args__ = (
        Index('idx_portfolio_projects_institute', 'instituto_id'),
        Index('idx_portfolio_projects_status', 'status'),
        Index('idx_portfolio_projects_trl', 'trl_entrada', 'trl_saida'),
    )


class InstituteModel(BaseModel):
    """
    Model for institutes (tenant-scoped).
    Implements RF-03: Portfólio Institucional
    """
    __tablename__ = "institutes"

    # Required fields
    nome = Column(String(200), nullable=False)
    isi_sigla = Column(String(100), nullable=False)
    endereco_rua = Column(String(500), nullable=False)
    endereco_bairro = Column(String(200), nullable=False)
    endereco_cep = Column(String(10), nullable=False)
    endereco_cidade = Column(String(200), nullable=False)
    endereco_uf = Column(String(2), nullable=False)
    descricao = Column(Text, nullable=False)
    
    # Optional fields
    nome_fantasia = Column(String(150), nullable=True)
    endereco_numero = Column(String(20), nullable=True)
    endereco_complemento = Column(String(200), nullable=True)
    area_predial_m2 = Column(Integer, nullable=True)
    
    # Status fields
    status_operacional = Column(String(50), nullable=False, default='Operacional')
    status = Column(String(50), nullable=False, default='Ativo')
    
    # Maturity fields
    maturidade_gestao = Column(String(10), nullable=True)
    maturidade_base_tecnologica = Column(Numeric(3, 1), nullable=True)
    maturidade_produtos_servicos = Column(Numeric(3, 1), nullable=True)
    maturidade_cooperacao = Column(Numeric(3, 1), nullable=True)
    
    # Accreditation
    credenciamento_cati = Column(Boolean, default=False)
    credenciamento_ed = Column(Boolean, default=False)
    
    # Logo
    logo_url = Column(String(1000), nullable=True)
    
    # Legacy compatibility
    name = Column(String(300), nullable=True)  # Alias for nome
    code = Column(String(100), nullable=True)  # Alias for isi_sigla
    description = Column(Text, nullable=True)  # Alias for descricao
    metadata_ = Column('metadata', JSON, default=dict)
    meta = synonym('metadata_')

    __table_args__ = (
        Index('idx_institutes_tenant', 'tenant_id'),
        Index('idx_institutes_status', 'status', 'status_operacional'),
        Index('idx_institutes_cidade_uf', 'endereco_cidade', 'endereco_uf'),
        UniqueConstraint('tenant_id', 'nome', name='uq_institutes_tenant_name'),
    )


class UserInstituteModel(BaseModel):
    """Association model linking users to institutes."""
    __tablename__ = "user_institutes"

    user_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    institute_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    role = Column(String(80), nullable=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('user_id', 'institute_id', name='uq_user_institutes_user_institute'),
    )


class TeamModel(BaseModel):
    """
    Model for teams (Equipe) - links users to institutes.
    Implements RF-03: Portfólio Institucional
    """
    __tablename__ = "teams"

    # Required fields
    usuario_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    instituto_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    cargo = Column(String(200), nullable=False)
    funcao_principal = Column(String(500), nullable=False)
    
    # Optional professional info
    vinculo_principal = Column(Boolean, default=False)
    email_profissional = Column(String(255), nullable=True)
    telefone_celular = Column(String(20), nullable=True)
    
    # Academic profiles
    linkedin_url = Column(String(500), nullable=True)
    lattes_url = Column(String(500), nullable=True)
    orcid_id = Column(String(50), nullable=True)
    researchgate_url = Column(String(500), nullable=True)
    scopus_author_id = Column(String(50), nullable=True)
    web_of_science_researcher_id = Column(String(50), nullable=True)
    
    # Profile photo
    foto_perfil_url = Column(String(1000), nullable=True)
    
    # Link dates
    data_vinculo_inicio = Column(DateTime(timezone=True), nullable=True)
    data_vinculo_fim = Column(DateTime(timezone=True), nullable=True)
    
    # Legacy compatibility
    name = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    member_ids = Column(JSON, default=list)
    metadata_ = Column('metadata', JSON, default=dict)
    meta = synonym('metadata_')

    __table_args__ = (
        Index('idx_teams_institute', 'instituto_id'),
        Index('idx_teams_usuario', 'usuario_id'),
        Index('idx_teams_vinculo_principal', 'vinculo_principal'),
        UniqueConstraint('usuario_id', 'instituto_id', name='uq_teams_usuario_instituto'),
    )


class InfrastructureModel(BaseModel):
    """
    Model for infrastructure items (labs, equipment) tied to an institute.
    Implements RF-03: Portfólio Institucional
    """
    __tablename__ = "infrastructures"

    # Required fields
    instituto_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    nome = Column(String(300), nullable=False)
    descricao = Column(Text, nullable=False)
    email_laboratorio = Column(String(255), nullable=False)
    email_responsavel = Column(String(255), nullable=False)
    area_predial_m2 = Column(Integer, nullable=False)
    
    # Status
    status_isi = Column(String(50), nullable=False, default='Operacional')
    
    # Maturity fields
    maturidade_gestao = Column(String(10), nullable=True)
    maturidade_base_tecnologica = Column(Numeric(3, 1), nullable=True)
    maturidade_produtos_servicos = Column(Numeric(3, 1), nullable=True)
    maturidade_cooperacao = Column(Numeric(3, 1), nullable=True)
    
    # Technology platforms and areas (stored as JSON arrays)
    plataformas_tecnologicas = Column(JSON, default=list)
    areas_conhecimento = Column(JSON, default=list)
    macroareas_pesquisa = Column(JSON, default=list)
    
    # Media files
    midias = Column(JSON, default=list)
    
    # Legacy compatibility
    name = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    capacity = Column(JSON, default=dict)
    metadata_ = Column('metadata', JSON, default=dict)
    meta = synonym('metadata_')

    __table_args__ = (
        Index('idx_infrastructures_institute', 'instituto_id'),
        Index('idx_infrastructures_status', 'status_isi'),
    )


class ClientModel(BaseModel):
    """PostgreSQL model for CRM clients."""
    __tablename__ = "clients"
    
    name = Column(String(500), nullable=False)
    client_type = Column(String(50), nullable=False)
    sector = Column(String(200), nullable=True)
    size_category = Column(String(100), nullable=True)

    # Encrypted PII fields - map to actual DB column names used in deployed
    # schemas (e.g. *_encrypted suffix)
    cnpj = Column('cnpj_encrypted', Text, nullable=True, index=True)
    email = Column('email_encrypted', Text, nullable=True)
    phone = Column('phone_encrypted', Text, nullable=True)

    # Address stored as JSON under a different column name
    address = Column('address_data', JSON, nullable=True)

    # Auto-fill metadata (timestamp and confidence are present in DB)
    cnpj_data_source = Column('cnpj_data_source', String(100), nullable=True)
    auto_fill_confidence = Column('auto_fill_confidence', Numeric(3, 2), nullable=True)
    auto_filled_at = Column('auto_filled_at', DateTime(timezone=True), nullable=True)

    detected_demands = Column('detected_demands', JSON, default=list)
    # Historical interaction patterns stored under `interaction_patterns`
    interaction_ids = Column('interaction_patterns', JSON, default=list)
    engagement_score = Column('engagement_score', Numeric(5, 2), nullable=True)

    __table_args__ = (
        Index('idx_client_type', 'client_type'),
    )


class InteractionModel(BaseModel):
    """PostgreSQL model for client interactions."""
    __tablename__ = "interactions"
    
    client_id = Column(String(36), nullable=False, index=True)
    interaction_type = Column(String(50), nullable=False)
    subject = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    interaction_date = Column(DateTime(timezone=True), nullable=False)
    
    participants = Column(JSON, default=list)
    attachments = Column(JSON, default=list)
    
    implicit_demands = Column(JSON, nullable=True)
    ai_confidence = Column(Numeric(3, 2), nullable=True)


class OpportunityModel(BaseModel):
    """PostgreSQL model for opportunities."""
    __tablename__ = "opportunities"
    
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    
    stage = Column(String(50), nullable=False, index=True)
    priority = Column(String(50), nullable=False, server_default=text("''"))
    
    client_id = Column(PGUUID(as_uuid=True), nullable=True)
    funding_source_id = Column(PGUUID(as_uuid=True), nullable=True)
    project_id = Column(PGUUID(as_uuid=True), nullable=True)
    portfolio_id = Column(PGUUID(as_uuid=True), nullable=True)
    
    estimated_value = Column(Numeric(20, 2), nullable=True)
    probability = Column(Numeric(3, 2), default=0.5)
    
    expected_close_date = Column(DateTime(timezone=True), nullable=True)
    actual_close_date = Column(DateTime(timezone=True), nullable=True)
    
    priority_score = Column(Numeric(5, 2), default=0.0)
    score_formula = Column(Text, nullable=True)
    
    stage_history = Column(JSON, default=list)
    assigned_to = Column(PGUUID(as_uuid=True), nullable=True)
    
    __table_args__ = (
        Index('idx_opportunity_stage_priority', 'stage', 'priority_score'),
    )


class MatchingScoreModel(BaseModel):
    """PostgreSQL model for matching scores."""
    __tablename__ = "matching_scores"
    
    demand_id = Column(PGUUID(as_uuid=True), nullable=False)
    capability_id = Column(PGUUID(as_uuid=True), nullable=False)
    funding_source_id = Column(PGUUID(as_uuid=True), nullable=True)
    
    technical_feasibility_score = Column(Numeric(5, 2), nullable=False)
    financial_viability_score = Column(Numeric(5, 2), nullable=False)
    strategic_alignment_score = Column(Numeric(5, 2), nullable=False)
    composite_score = Column(Numeric(5, 2), nullable=False, index=True)
    
    calculation_formula = Column(Text, nullable=False)
    calculation_details = Column(JSON, default=dict)
    
    human_validated = Column(Boolean, default=False)
    validated_by = Column(PGUUID(as_uuid=True), nullable=True)
    validated_at = Column(DateTime(timezone=True), nullable=True)
    validation_notes = Column(Text, nullable=True)
    
    ai_confidence = Column(Numeric(3, 2), nullable=False)


class ProposalModel(BaseModel):
    """PostgreSQL model for proposals."""
    __tablename__ = "proposals"
    
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, index=True)
    
    opportunity_id = Column(PGUUID(as_uuid=True), nullable=True)
    funding_source_id = Column(PGUUID(as_uuid=True), nullable=True)
    client_id = Column(PGUUID(as_uuid=True), nullable=True)
    
    current_version_id = Column(PGUUID(as_uuid=True), nullable=True)
    version_count = Column(Integer, default=0)
    
    collaborators = Column(JSON, default=list)
    
    last_adherence_check = Column(DateTime(timezone=True), nullable=True)
    adherence_to_funding = Column(Numeric(3, 2), nullable=True)
    
    tags = Column(JSON, default=list)
    lessons_learned = Column(JSON, default=list)


class ProposalVersionModel(BaseModel):
    """PostgreSQL model for proposal versions."""
    __tablename__ = "proposal_versions"
    
    proposal_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    parent_version_id = Column(PGUUID(as_uuid=True), nullable=True)
    
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    attachments = Column(JSON, default=list)
    
    author_id = Column(PGUUID(as_uuid=True), nullable=False)
    commit_message = Column(Text, nullable=False)
    
    adherence_score = Column(Numeric(3, 2), nullable=True)
    adherence_analysis = Column(JSON, nullable=True)
    
    __table_args__ = (
        Index('idx_version_proposal_number', 'proposal_id', 'version_number'),
    )


class AuditLogModel(BaseModel):
    """PostgreSQL model for audit logs."""
    __tablename__ = "audit_logs"
    # Override id to avoid inheriting primary_key=True from BaseModel
    id = Column(PGUUID(as_uuid=True), nullable=False)

    action = Column(String(50), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(PGUUID(as_uuid=True), nullable=False)
    
    user_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    user_role = Column(String(50), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    before_state = Column(JSON, nullable=True)
    after_state = Column(JSON, nullable=True)
    diff = Column(JSON, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    session_id = Column(String(100), nullable=True)
    request_id = Column(String(100), nullable=True)
    
    notes = Column(Text, nullable=True)
    success = Column(Boolean, default=True)
    # Extended fields (align with enhanced schema)
    execution_period = Column(JSON, nullable=True)
    trl_range = Column(JSON, nullable=True)
    requirements = Column(Text, nullable=True)
    eligibility_criteria = Column(Text, nullable=True)
    source_url = Column(Text, nullable=True)
    ai_extraction_status = Column(String(20), default='pending', server_default="'pending'")
    ai_extracted_fields = Column(JSON, default=dict, nullable=True, server_default='{}')
    ai_processed_at = Column(DateTime(timezone=True), nullable=True)
    contains_pii = Column(Boolean, default=False, server_default=text('0'))
    pii_anonymized = Column(Boolean, default=False, server_default=text('0'))
    lgpd_categories = Column(JSON, default=list, nullable=True, server_default='[]')
    error_message = Column(Text, nullable=True)
    
    __table_args__ = (
        PrimaryKeyConstraint('id', 'timestamp'),
        Index('idx_audit_entity', 'entity_type', 'entity_id'),
        Index('idx_audit_user_timestamp', 'user_id', 'timestamp'),
    )

# Alias for compatibility with legacy imports
MatchResultModel = MatchingScoreModel


class LLMConfigModel(BaseModel):
    """
    PostgreSQL model for LLM provider configuration.
    Implements RF-07: Analytics and Chatbot Assistant
    """
    __tablename__ = "llm_configs"
    
    provider = Column(String(50), nullable=False)  # openai, ollama, azure, google
    model_name = Column(String(200), nullable=False)
    
    # Encrypted API key (Fernet encryption)
    encrypted_api_key = Column(Text, nullable=True)
    
    # Provider-specific settings
    base_url = Column(Text, nullable=True)
    temperature = Column(Numeric(3, 2), default=0.3)
    max_tokens = Column(Integer, default=4096)
    
    # Status tracking
    status = Column(String(50), default="unconfigured")
    last_test_at = Column(DateTime(timezone=True), nullable=True)
    last_test_success = Column(Boolean, default=False)
    last_error_message = Column(Text, nullable=True)
    
    is_active = Column(Boolean, default=True)
    
    __table_args__ = (
        Index('idx_llm_config_tenant_active', 'tenant_id', 'is_active'),
    )


class IngestionJobModel(BaseModel):
    """
    PostgreSQL model for data ingestion jobs.
    Implements RF-01: Data Ingestion and Multi-source Orchestration
    """
    __tablename__ = "ingestion_jobs"
    
    name = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    
    # Status tracking
    status = Column(String(50), nullable=False, default="pending")
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # File statistics
    total_files = Column(Integer, default=0)
    processed_files = Column(Integer, default=0)
    failed_files = Column(Integer, default=0)
    total_size = Column(Integer, default=0)  # bytes
    
    # Record statistics
    total_records = Column(Integer, default=0)
    valid_records = Column(Integer, default=0)
    invalid_records = Column(Integer, default=0)
    
    # PII summary
    total_pii_entities = Column(Integer, default=0)
    pending_pii_review = Column(Integer, default=0)
    highest_risk_level = Column(String(50), nullable=True)
    
    # Progress tracking
    current_file = Column(String(500), nullable=True)
    progress_percent = Column(Numeric(5, 2), default=0.0)
    estimated_time_remaining = Column(Integer, nullable=True)
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    error_details = Column(JSON, default=dict)
    
    __table_args__ = (
        Index('idx_ingestion_job_status', 'status'),
        Index('idx_ingestion_job_tenant_created', 'tenant_id', 'created_at'),
    )


class IngestionSourceModel(BaseModel):
    """
    PostgreSQL model for ingestion source files.
    Implements RF-01.03: Data lineage tracking
    """
    __tablename__ = "ingestion_sources"
    
    job_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    
    # Source identification
    source_type = Column(String(50), nullable=False)
    file_name = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=True)
    file_size = Column(Integer, default=0)
    
    # Storage location
    storage_bucket = Column(String(100), nullable=True)
    storage_key = Column(String(500), nullable=True)
    
    # Processing status
    status = Column(String(50), nullable=False, default="pending")
    processed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Data statistics
    record_count = Column(Integer, default=0)
    valid_records = Column(Integer, default=0)
    invalid_records = Column(Integer, default=0)
    
    # PII detection reference
    pii_detection_id = Column(PGUUID(as_uuid=True), nullable=True)
    pii_entities_count = Column(Integer, default=0)
    pii_risk_level = Column(String(50), nullable=True)
    
    # Metadata
    original_metadata = Column(JSON, default=dict)
    
    __table_args__ = (
        Index('idx_source_job_status', 'job_id', 'status'),
    )


class PIIDetectionModel(BaseModel):
    """
    PostgreSQL model for PII detection results.
    Implements RF-01.02: LGPD Agent for PII detection and masking
    """
    __tablename__ = "pii_detections"
    
    # Source document reference
    document_id = Column(PGUUID(as_uuid=True), nullable=True)
    ingestion_source_id = Column(PGUUID(as_uuid=True), nullable=True, index=True)
    file_name = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=True)
    
    # Detection results (JSONB for flexibility)
    entities = Column(JSON, default=list)
    total_entities = Column(Integer, default=0)
    
    # Risk assessment
    overall_risk_level = Column(String(50), nullable=False, default="low")
    risk_summary = Column(JSON, default=dict)
    
    # Analysis metadata
    analyzed_at = Column(DateTime(timezone=True), nullable=False)
    analysis_duration_ms = Column(Integer, default=0)
    text_length = Column(Integer, default=0)
    detection_methods = Column(JSON, default=list)
    
    # Encrypted content storage
    original_text_encrypted = Column(Text, nullable=True)
    anonymized_text = Column(Text, nullable=True)
    
    # Manual review workflow
    anonymization_status = Column(String(50), nullable=False, default="pending_review")
    anonymization_strategy = Column(String(50), nullable=True)
    
    # Review tracking
    reviewed_by = Column(PGUUID(as_uuid=True), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewer_comment = Column(Text, nullable=True)
    
    # Anonymization execution
    anonymized_by = Column(PGUUID(as_uuid=True), nullable=True)
    anonymized_at = Column(DateTime(timezone=True), nullable=True)
    anonymization_error = Column(Text, nullable=True)
    
    __table_args__ = (
        Index('idx_pii_status_risk', 'anonymization_status', 'overall_risk_level'),
        Index('idx_pii_tenant_analyzed', 'tenant_id', 'analyzed_at'),
    )


# =============================================================================
# Authentication Models
# =============================================================================

class UserModel(Base):
    """
    PostgreSQL model for users.
    Implements RNF-02: RBAC with Row-Level Security
    
    Note: Uses Base instead of BaseModel to have custom fields
    """
    __tablename__ = "users"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    
    email = Column(String(255), nullable=False)
    username = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    
    # New fields for institute management
    cpf = Column(String(14), nullable=True, unique=False)  # 11 digits or formatted
    pais_emissor_documento = Column(String(100), nullable=False, default='Brasil')
    perfil = Column(String(50), nullable=False, default='Visitante')
    
    is_active = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    __table_args__ = (
        UniqueConstraint('tenant_id', 'email', name='uq_user_tenant_email'),
        UniqueConstraint('tenant_id', 'username', name='uq_user_tenant_username'),
        Index('idx_user_tenant_email', 'tenant_id', 'email'),
        Index('idx_user_tenant_username', 'tenant_id', 'username'),
        Index('idx_user_active', 'is_active', 'deleted_at'),
        Index('idx_user_perfil', 'perfil'),
    )


class RefreshTokenModel(Base):
    """
    PostgreSQL model for refresh tokens, password reset tokens, and email verification tokens.
    Implements secure token storage with one-time use tracking.
    """
    __tablename__ = "refresh_tokens"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    token_hash = Column(String(64), unique=True, nullable=False)  # SHA-256 hash
    token_type = Column(String(30), nullable=False)  # access, refresh, password_reset, email_verification
    
    used = Column(Boolean, default=False, nullable=False)  # For one-time tokens
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by_ip = Column(INET, nullable=True)
    
    __table_args__ = (
        Index('idx_token_user_type', 'user_id', 'token_type'),
        Index('idx_token_expires', 'expires_at'),
    )


class UserRoleModel(Base):
    """
    PostgreSQL model for user-role associations.
    Implements RNF-02: RBAC with multi-tenant support.
    """
    __tablename__ = "user_roles"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    role_id = Column(String(50), nullable=False)  # References role ID in acl.json
    tenant_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    assigned_by = Column(PGUUID(as_uuid=True), nullable=True)
    
    __table_args__ = (
        UniqueConstraint('user_id', 'role_id', 'tenant_id', name='uq_user_role_tenant'),
        Index('idx_user_role_tenant', 'tenant_id', 'role_id'),
    )


class LoginAttemptModel(Base):
    """
    PostgreSQL model for tracking login attempts.
    Implements rate limiting for authentication security.
    """
    __tablename__ = "login_attempts"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    
    email = Column(String(255), nullable=False, index=True)
    ip_address = Column(INET, nullable=True)
    
    success = Column(Boolean, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    lockout_until = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(String(100), nullable=True)
    
    __table_args__ = (
        Index('idx_login_email_timestamp', 'email', 'timestamp'),
    )


class SystemConfigModel(Base):
    """
    PostgreSQL model for system configuration.
    Stores email, security, contact form settings per tenant.
    
    All sensitive fields (SMTP password) are stored encrypted.
    """
    __tablename__ = "system_config"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(PGUUID(as_uuid=True), nullable=False, unique=True, index=True)
    
    # Configuration stored as JSONB
    email_config = Column(JSON, default=dict)  # SMTP settings with encrypted password
    security_config = Column(JSON, default=dict)  # Rate limiting, password requirements
    contact_form_config = Column(JSON, default=dict)  # Form fields, recipients
    email_templates = Column(JSON, default=dict)  # Email templates with Jinja2 support
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class FeedbackModel(BaseModel):
    """
    PostgreSQL model for user feedback with screenshots and annotations.
    Implements user feedback collection with visual context.
    
    Features:
    - Screenshot capture with yellow marker annotations
    - 500 character description limit
    - Full audit trail with user identification
    - Admin response workflow
    """
    __tablename__ = "feedbacks"
    
    # User identification
    user_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    
    # Feedback content
    feedback_type = Column(String(50), nullable=False, index=True)  # bug_report, feature_request, ui_feedback, etc.
    severity = Column(String(20), nullable=False, index=True)  # low, medium, high, critical
    description = Column(String(500), nullable=False)  # Max 500 characters
    
    # Page context
    page_url = Column(Text, nullable=False)
    page_title = Column(String(500), nullable=True)
    entity_type = Column(String(50), nullable=True)  # proposal, funding, crm, etc.
    entity_id = Column(PGUUID(as_uuid=True), nullable=True)
    
    # Screenshot and annotations stored in MinIO
    screenshot_url = Column(Text, nullable=True)  # Original screenshot URL
    annotation_image_url = Column(Text, nullable=True)  # Annotated screenshot PNG URL
    annotation_data = Column(JSON, nullable=True)  # JSON strokes for traceability
    
    # Browser/device context
    user_agent = Column(Text, nullable=True)
    screen_width = Column(Integer, nullable=True)
    screen_height = Column(Integer, nullable=True)
    
    # Status and workflow
    status = Column(String(20), default="open", nullable=False, index=True)  # open, in_review, acknowledged, resolved, closed
    
    # Admin response
    response = Column(Text, nullable=True)
    responded_by = Column(PGUUID(as_uuid=True), nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Resolution
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    __table_args__ = (
        Index('idx_feedback_user_status', 'user_id', 'status'),
        Index('idx_feedback_status_severity', 'status', 'severity'),
        Index('idx_feedback_type_status', 'feedback_type', 'status'),
        Index('idx_feedback_entity', 'entity_type', 'entity_id'),
        Index('idx_feedback_created_at', 'created_at'),
    )



# ---------------------------------------------------------------------------
# Communications models
# ---------------------------------------------------------------------------


class CommunicationThreadModel(BaseModel):
    __tablename__ = "communication_threads"

    subject = Column(String(500), nullable=True)
    metadata_ = Column('metadata', JSON, default=dict)
    meta = synonym('metadata_')
    last_message_preview = Column(Text, nullable=True)
    last_message_at = Column(DateTime(timezone=True), nullable=True)
    
    # Linked entity for context (proposal, opportunity, client)
    linked_entity_type = Column(String(50), nullable=True)  # 'proposal', 'opportunity', 'client'
    linked_entity_id = Column(PGUUID(as_uuid=True), nullable=True)
    
    # Human-in-the-loop flags for auto-created content
    is_auto_created = Column(Boolean, default=False)
    auto_created_confirmed = Column(Boolean, default=False)

    __table_args__ = (
        Index('idx_comm_threads_tenant', 'tenant_id'),
        Index('idx_comm_threads_last_message_at', 'last_message_at'),
        Index('idx_comm_threads_linked_entity', 'linked_entity_type', 'linked_entity_id'),
    )


class CommunicationMessageModel(BaseModel):
    __tablename__ = "communication_messages"

    thread_id = Column(PGUUID(as_uuid=True), ForeignKey('communication_threads.id', ondelete='CASCADE'), nullable=False, index=True)
    author = Column(String(200), nullable=False)
    author_name = Column(String(300), nullable=True)
    body = Column(Text, nullable=False)
    attachments = Column(JSON, default=list)
    
    # Message type: text, email, meeting, audio, video
    message_type = Column(String(50), default='text')
    
    # Email-specific metadata (from, to, cc, subject, etc.)
    email_metadata = Column(JSON, default=dict)
    
    # Human-in-the-loop flags
    is_auto_created = Column(Boolean, default=False)
    auto_created_confirmed = Column(Boolean, default=False)

    __table_args__ = (
        Index('idx_comm_messages_thread', 'thread_id'),
        Index('idx_comm_messages_created_at', 'created_at'),
        Index('idx_comm_messages_tenant', 'tenant_id'),
    )


class CommunicationAttachmentModel(BaseModel):
    __tablename__ = "communication_attachments"

    thread_id = Column(PGUUID(as_uuid=True), ForeignKey('communication_threads.id', ondelete='CASCADE'), nullable=False, index=True)
    message_id = Column(PGUUID(as_uuid=True), nullable=True, index=True)
    filename = Column(String(1000), nullable=False)
    object_name = Column(String(1000), nullable=False)
    bucket = Column(String(100), nullable=False)
    url = Column(Text, nullable=True)
    content_type = Column(String(200), nullable=True)
    size = Column(Integer, nullable=True)

    __table_args__ = (
        Index('idx_comm_attachments_thread', 'thread_id'),
        Index('idx_comm_attachments_message', 'message_id'),
        Index('idx_comm_attachments_tenant', 'tenant_id'),
    )


class MeetingMinutesModel(BaseModel):
    __tablename__ = "meeting_minutes"

    thread_id = Column(PGUUID(as_uuid=True), ForeignKey('communication_threads.id', ondelete='CASCADE'), nullable=False, index=True)
    title = Column(String(500), nullable=True)
    content = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default='pending')
    generated_at = Column(DateTime(timezone=True), nullable=True)
    generated_by = Column(PGUUID(as_uuid=True), nullable=True)

    __table_args__ = (
        Index('idx_minutes_thread', 'thread_id'),
        Index('idx_minutes_status', 'status'),
        Index('idx_minutes_tenant', 'tenant_id'),
    )


class CommunicationThreadParticipantModel(Base):
    """Thread participants with roles (owner, editor, viewer)."""
    __tablename__ = "communication_thread_participants"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    thread_id = Column(PGUUID(as_uuid=True), ForeignKey('communication_threads.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    role = Column(String(50), nullable=False, default='viewer')  # owner, editor, viewer
    added_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    added_by = Column(PGUUID(as_uuid=True), nullable=True)

    __table_args__ = (
        UniqueConstraint('thread_id', 'user_id', name='uq_thread_participant'),
        Index('idx_comm_participants_tenant', 'tenant_id'),
        Index('idx_comm_participants_thread', 'thread_id'),
        Index('idx_comm_participants_user', 'user_id'),
    )


class CommunicationDraftModel(Base):
    """Draft messages for persistence."""
    __tablename__ = "communication_drafts"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    thread_id = Column(PGUUID(as_uuid=True), ForeignKey('communication_threads.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    body = Column(Text, nullable=True)
    attachments = Column(JSON, default=list)
    last_updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('thread_id', 'user_id', name='uq_draft_thread_user'),
        Index('idx_comm_drafts_tenant', 'tenant_id'),
        Index('idx_comm_drafts_thread', 'thread_id'),
        Index('idx_comm_drafts_user', 'user_id'),
    )



