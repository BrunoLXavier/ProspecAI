"""
Enhanced Database Models for ProspecAI - Clean Rebuild
Implements optimized schema with partitioning, indexes, and AI fields
Includes Row-Level Security (RLS) for multi-tenancy
"""
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Index, Integer,
    Numeric, String, Text, UUID, func, text, ARRAY, CheckConstraint, JSON
)
from sqlalchemy import Computed
from sqlalchemy import PrimaryKeyConstraint

# Prefer PostgreSQL-specific types when available, but provide SQLite-safe
# fallbacks for the test environment (in-memory SQLite). This prevents
# test-time DDL failures when creating metadata for models that reference
# Postgres-only types like JSONB, TSRANGE, INT4RANGE, INET or ARRAY.
try:
    from sqlalchemy.dialects.postgresql import JSONB, TSRANGE, INT4RANGE, INET
except Exception:
    # Fallbacks mapped to generic SQLAlchemy types that SQLite can handle
    JSONB = JSON
    # Range types and ARRAY are represented as JSON/Text in SQLite tests
    TSRANGE = JSON
    INT4RANGE = JSON
    INET = String(50)
    # Ensure ARRAY(...) usage maps to JSON for SQLite
    def ARRAY(item_type):
        return JSON
import os

# If running tests with in-memory SQLite, always use SQLite-safe types
if os.getenv("TEST_USE_SQLITE", "true").lower() == "true":
    JSONB = JSON
    TSRANGE = JSON
    INT4RANGE = JSON
    INET = String(50)
    def ARRAY(item_type):
        return JSON
    # SQLite does not have a native UUID type; provide callable shim returning String
    def UUID(*_args, **_kwargs):
        return String(36)
    # Avoid creating PostgreSQL-specific indexes in SQLite tests
    def Index(*_args, **_kwargs):
        return None
from sqlalchemy.orm import relationship, backref, declarative_base
from sqlalchemy.sql import expression


# Base class with common fields
class Base:
    """Base class with common audit fields"""
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)  # Soft delete
    created_by = Column(UUID(as_uuid=True), nullable=False)
    updated_by = Column(UUID(as_uuid=True), nullable=False)
    version = Column(Integer, default=1, nullable=False)  # Optimistic locking


# Declarative base for all models
BaseModel = declarative_base(cls=Base)


class TenantModel(BaseModel):
    """Enhanced multi-tenant base with improved auditing"""
    __tablename__ = 'tenants'
    
    name = Column(String(200), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    status = Column(String(20), default='active', nullable=False)
    subscription_tier = Column(String(20), default='basic', nullable=False)
    settings = Column(JSONB, default=dict)
    
    # Indexes
    __table_args__ = (
        Index('idx_tenants_slug', 'slug'),
        Index('idx_tenants_status', 'status'),
    )



class AuditLogModel(BaseModel):
    """Enhanced audit logs with performance optimization and partitioning"""
    __tablename__ = 'audit_logs'
    # Override inherited primary key to use composite PK with timestamp (required for partitioning)
    id = Column(UUID(as_uuid=True), nullable=False)

    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id'), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    action = Column(String(30), nullable=False)  # CREATE, UPDATE, DELETE, ACCESS
    user_id = Column(UUID(as_uuid=True), nullable=False)
    user_role = Column(String(30))
    timestamp = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    before_state = Column(JSONB)
    after_state = Column(JSONB) 
    session_id = Column(UUID(as_uuid=True))
    ip_address = Column(INET)
    user_agent = Column(Text)
    
    # Relationship
    tenant = relationship("TenantModel")
    
    # Indexes for performance
    __table_args__ = (
        PrimaryKeyConstraint('id', 'timestamp'),
        Index('idx_audit_tenant_entity', 'tenant_id', 'entity_type', 'entity_id'),
        Index('idx_audit_timestamp', 'timestamp'),
        Index('idx_audit_user', 'user_id', 'timestamp'),
        # PostgreSQL table partitioning by timestamp (handled in migration)
        {'postgresql_partition_by': 'RANGE (timestamp)'}
    )


class FundingSourceModel(BaseModel):
    """Enhanced funding sources with AI processing capabilities"""
    __tablename__ = 'funding_sources'
    
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id'), nullable=False)
    
    # Core fields
    name = Column(String(500), nullable=False)
    institution = Column(String(300), nullable=False)
    instrument_type = Column(String(50), nullable=False)  # grant, loan, investment
    status = Column(String(30), default='draft', nullable=False)
    
    # Financial data (encrypted at application level)
    total_amount = Column(Numeric(20, 2), nullable=False)
    currency = Column(String(3), default='BRL', nullable=False)
    
    # Timeline
    submission_start = Column(DateTime(timezone=True), nullable=False)
    submission_end = Column(DateTime(timezone=True), nullable=False)
    execution_period = Column(TSRANGE)
    
    # Technical requirements
    trl_range = Column(INT4RANGE, nullable=False)  # TRL range as PostgreSQL range type
    
    # Content for AI processing
    description = Column(Text)
    requirements = Column(Text)
    eligibility_criteria = Column(Text)
    source_url = Column(Text)
    
    # AI Processing Results
    ai_extraction_status = Column(String(20), default='pending')  # pending, processing, completed, error
    ai_extracted_fields = Column(JSONB, default=dict)
    ai_confidence_score = Column(Numeric(3, 2))  # 0.00 to 1.00
    ai_processed_at = Column(DateTime(timezone=True))
    
    # LGPD compliance tracking
    contains_pii = Column(Boolean, default=False)
    pii_anonymized = Column(Boolean, default=False)
    lgpd_categories = Column(ARRAY(String), default=list)
    
    # Relationships
    tenant = relationship("TenantModel")
    opportunities = relationship("OpportunityModel", back_populates="funding_source")
    matching_scores = relationship("MatchingScoreModel", back_populates="funding_source")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('total_amount > 0', name='chk_funding_positive_amount'),
        CheckConstraint('submission_start < submission_end', name='chk_funding_valid_dates'),
        CheckConstraint('ai_confidence_score >= 0 AND ai_confidence_score <= 1', name='chk_funding_confidence_range'),
        
        # Performance indexes
        Index('idx_funding_tenant_status', 'tenant_id', 'status'),
        Index('idx_funding_search', text("to_tsvector('portuguese', name || ' ' || COALESCE(description, ''))"), postgresql_using='gin'),
        Index('idx_funding_ai_extracted', 'ai_extracted_fields', postgresql_using='gin', postgresql_where=text("ai_extraction_status = 'completed'")),
        Index('idx_funding_amount_range', 'total_amount', 'currency'),
        # Partial index for active records only
        Index('idx_funding_active', 'tenant_id', 'status', 'submission_end', postgresql_where=text("deleted_at IS NULL AND status = 'active'")),
    )


class ProjectModel(BaseModel):
    """Enhanced projects with portfolio capabilities and competency tracking"""
    __tablename__ = 'projects'
    
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id'), nullable=False)
    portfolio_id = Column(UUID(as_uuid=True), ForeignKey('projects.id'))  # Self-referencing for portfolio grouping
    
    # Core project data
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(30), default='planning', nullable=False)  # planning, active, completed, on_hold, cancelled
    priority_level = Column(String(20), default='medium')  # low, medium, high, critical
    
    # Technical maturity
    current_trl = Column(Integer)
    target_trl = Column(Integer)
    trl_history = Column(JSONB, default=list)  # Track TRL progression over time
    
    # Team and resources
    team_composition = Column(JSONB, default=dict)
    core_competencies = Column(ARRAY(String), default=list)
    required_infrastructure = Column(JSONB, default=dict)
    
    # Knowledge management (RF-03)
    lessons_learned = Column(JSONB, default=list)
    success_metrics = Column(JSONB, default=dict)
    risk_assessment = Column(JSONB, default=dict)
    
    # Relationships
    tenant = relationship("TenantModel")
    opportunities = relationship("OpportunityModel", back_populates="project")
    matching_scores = relationship("MatchingScoreModel", back_populates="project")
    # Self-referential parent/children relationship for portfolio grouping
    # (wired after class definitions to avoid name-resolution issues)
    
    # Constraints and indexes
    __table_args__ = (
        CheckConstraint('current_trl >= 1 AND current_trl <= 9', name='chk_project_current_trl_range'),
        CheckConstraint('target_trl >= 1 AND target_trl <= 9', name='chk_project_target_trl_range'),
        CheckConstraint('current_trl <= target_trl', name='chk_project_trl_progression'),
        
        Index('idx_projects_tenant_status', 'tenant_id', 'status'),
        Index('idx_projects_trl', 'current_trl', 'target_trl'),
        Index('idx_projects_competencies', 'core_competencies', postgresql_using='gin'),
        Index('idx_projects_search', text("to_tsvector('portuguese', title || ' ' || description)"), postgresql_using='gin'),
        Index('idx_projects_portfolio', 'portfolio_id', postgresql_where=text("portfolio_id IS NOT NULL")),
        Index('idx_projects_priority', 'tenant_id', 'priority_level', 'status'),
    )


class ClientModel(BaseModel):
    """Enhanced CRM with AI insights and auto-fill capabilities"""
    __tablename__ = 'clients'
    
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id'), nullable=False)
    
    # Basic info
    name = Column(String(500), nullable=False)
    client_type = Column(String(50), nullable=False)  # company, individual, government, ngo
    sector = Column(String(100))
    size_category = Column(String(20))  # micro, small, medium, large
    
    # Contact data (encrypted at application level)
    cnpj_encrypted = Column(Text)  # AES encrypted CNPJ
    email_encrypted = Column(Text)  # AES encrypted email
    phone_encrypted = Column(Text)  # AES encrypted phone
    address_data = Column(JSONB, default=dict)
    
    # Auto-fill data (RF-04)
    cnpj_data_source = Column(String(50))  # 'receita_ws', 'manual', 'api'
    auto_fill_confidence = Column(Numeric(3, 2))
    auto_filled_at = Column(DateTime(timezone=True))
    
    # AI insights
    detected_demands = Column(JSONB, default=list)
    interaction_patterns = Column(JSONB, default=dict)
    engagement_score = Column(Numeric(3, 2))  # 0.00 to 1.00
    
    # Relationships
    tenant = relationship("TenantModel")
    opportunities = relationship("OpportunityModel", back_populates="client")
    interactions = relationship("InteractionModel", back_populates="client")
    
    # Constraints and indexes
    __table_args__ = (
        CheckConstraint('engagement_score >= 0 AND engagement_score <= 1', name='chk_client_engagement_range'),
        CheckConstraint('auto_fill_confidence >= 0 AND auto_fill_confidence <= 1', name='chk_client_autofill_range'),
        
        Index('idx_clients_tenant_type', 'tenant_id', 'client_type'),
        Index('idx_clients_sector', 'sector'),
        Index('idx_clients_demands', 'detected_demands', postgresql_using='gin'),
        Index('idx_clients_engagement', 'engagement_score', postgresql_where=text("engagement_score IS NOT NULL")),
        Index('idx_clients_name_search', text("to_tsvector('portuguese', name)"), postgresql_using='gin'),
    )


class InteractionModel(BaseModel):
    """Client interactions for CRM tracking"""
    __tablename__ = 'interactions'
    
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id'), nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey('clients.id'), nullable=False)
    
    interaction_type = Column(String(50), nullable=False)  # call, email, meeting, demo, proposal
    subject = Column(String(500))
    description = Column(Text)
    interaction_date = Column(DateTime(timezone=True), default=func.now())
    duration_minutes = Column(Integer)
    outcome = Column(String(100))
    next_action = Column(Text)
    participants = Column(JSONB, default=list)
    
    # AI analysis
    sentiment_score = Column(Numeric(3, 2))  # -1.00 to 1.00
    key_topics = Column(ARRAY(String), default=list)
    
    # Relationships
    tenant = relationship("TenantModel")
    client = relationship("ClientModel", back_populates="interactions")
    
    # Indexes
    __table_args__ = (
        Index('idx_interactions_client_date', 'client_id', 'interaction_date'),
        Index('idx_interactions_type', 'interaction_type'),
        Index('idx_interactions_sentiment', 'sentiment_score', postgresql_where=text("sentiment_score IS NOT NULL")),
        # Removed non-immutable function from index predicate (NOW()) to avoid creation errors.
        Index('idx_interactions_recent', 'tenant_id', 'interaction_date'),
    )


class OpportunityModel(BaseModel):
    """Enhanced pipeline with AI scoring and collaboration"""
    __tablename__ = 'opportunities'
    
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id'), nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey('clients.id'))
    funding_source_id = Column(UUID(as_uuid=True), ForeignKey('funding_sources.id'))
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id'))
    
    # Core opportunity data
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    stage = Column(String(30), default='intelligence', nullable=False)  # intelligence, qualification, proposal, negotiation, closed
    
    # Scoring and prioritization
    priority_score = Column(Numeric(5, 2), default=0)
    probability_score = Column(Numeric(3, 2), default=0.5)
    estimated_value = Column(Numeric(20, 2))
    
    # Timeline tracking
    expected_close_date = Column(DateTime(timezone=True))
    stage_changed_at = Column(DateTime(timezone=True), default=func.now())
    stage_history = Column(JSONB, default=list)
    
    # Assignment and collaboration
    assigned_to = Column(UUID(as_uuid=True))
    team_members = Column(ARRAY(UUID), default=list)
    
    # AI analysis
    ai_priority_factors = Column(JSONB, default=dict)
    matching_scores = Column(JSONB, default=dict)
    
    # Relationships
    tenant = relationship("TenantModel")
    client = relationship("ClientModel", back_populates="opportunities")
    funding_source = relationship("FundingSourceModel", back_populates="opportunities")
    project = relationship("ProjectModel", back_populates="opportunities")
    proposals = relationship("ProposalModel", back_populates="opportunity")
    scores = relationship("MatchingScoreModel", back_populates="opportunity")
    
    # Constraints and indexes
    __table_args__ = (
        CheckConstraint('priority_score >= 0', name='chk_opp_priority_positive'),
        CheckConstraint('probability_score >= 0 AND probability_score <= 1', name='chk_opp_probability_range'),
        
        Index('idx_opportunities_tenant_stage', 'tenant_id', 'stage'),
        Index('idx_opportunities_pipeline', 'tenant_id', 'stage', text('priority_score DESC')),
        Index('idx_opportunities_timeline', 'tenant_id', 'expected_close_date'),
        Index('idx_opportunities_assigned', 'assigned_to', postgresql_where=text("assigned_to IS NOT NULL")),
        Index('idx_opportunities_client', 'client_id'),
    )


class MatchingScoreModel(BaseModel):
    """Enhanced matching with human validation and explainability"""
    __tablename__ = 'matching_scores'
    
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id'), nullable=False)
    opportunity_id = Column(UUID(as_uuid=True), ForeignKey('opportunities.id'), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id'), nullable=False) 
    funding_source_id = Column(UUID(as_uuid=True), ForeignKey('funding_sources.id'))
    
    # Core scoring components
    technical_score = Column(Numeric(5, 2), nullable=False)
    financial_score = Column(Numeric(5, 2), nullable=False)
    strategic_score = Column(Numeric(5, 2), nullable=False)
    
    # Computed composite score (stored for performance)
    composite_score = Column(
        Numeric(5, 2),
        Computed("(technical_score * 0.4) + (financial_score * 0.3) + (strategic_score * 0.3)", persisted=True),
        nullable=False,
    )
    
    # Scoring methodology
    algorithm_version = Column(String(10), default='1.0', nullable=False)
    calculation_details = Column(JSONB, nullable=False)
    confidence_level = Column(Numeric(3, 2), nullable=False)
    
    # Human validation (required by business rules)
    validation_status = Column(String(20), default='pending')  # pending, validated, rejected, expired
    validated_by = Column(UUID(as_uuid=True))
    validated_at = Column(DateTime(timezone=True))
    validation_notes = Column(Text)
    human_override_score = Column(Numeric(5, 2))
    
    # Relationships
    tenant = relationship("TenantModel")
    opportunity = relationship("OpportunityModel", back_populates="scores")
    project = relationship("ProjectModel", back_populates="matching_scores")
    funding_source = relationship("FundingSourceModel", back_populates="matching_scores")
    
    # Constraints and indexes
    __table_args__ = (
        CheckConstraint('technical_score >= 0 AND technical_score <= 100', name='chk_match_technical_range'),
        CheckConstraint('financial_score >= 0 AND financial_score <= 100', name='chk_match_financial_range'),
        CheckConstraint('strategic_score >= 0 AND strategic_score <= 100', name='chk_match_strategic_range'),
        CheckConstraint('confidence_level >= 0 AND confidence_level <= 1', name='chk_match_confidence_range'),
        
        Index('idx_matching_tenant_scores', 'tenant_id', text('composite_score DESC')),
        Index('idx_matching_validation', 'validation_status', 'validated_at'),
        Index('idx_matching_opportunity', 'opportunity_id'),
        Index('idx_matching_algorithm', 'algorithm_version'),
    )


class ProposalModel(BaseModel):
    """Enhanced proposals with version control and real-time collaboration"""
    __tablename__ = 'proposals'
    
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id'), nullable=False)
    opportunity_id = Column(UUID(as_uuid=True), ForeignKey('opportunities.id'))
    funding_source_id = Column(UUID(as_uuid=True), ForeignKey('funding_sources.id'))
    
    # Core proposal info
    title = Column(String(500), nullable=False)
    current_status = Column(String(30), default='draft')  # draft, review, submitted, accepted, rejected
    
    # Version control (Git-like)
    current_version = Column(Integer, default=1)
    head_version_id = Column(UUID(as_uuid=True))  # Points to latest ProposalVersionModel
    
    # Collaboration
    owner_id = Column(UUID(as_uuid=True), nullable=False)
    collaborators = Column(ARRAY(UUID), default=list)
    
    # AI Analysis
    latest_adherence_score = Column(Numeric(3, 2))
    adherence_analysis = Column(JSONB, default=dict)
    last_ai_check = Column(DateTime(timezone=True))
    
    # Relationships
    tenant = relationship("TenantModel")
    opportunity = relationship("OpportunityModel", back_populates="proposals")
    funding_source = relationship("FundingSourceModel")
    versions = relationship("ProposalVersionModel", back_populates="proposal", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_proposals_tenant_status', 'tenant_id', 'current_status'),
        Index('idx_proposals_opportunity', 'opportunity_id'),
        Index('idx_proposals_owner', 'owner_id'),
        Index('idx_proposals_collaborators', 'collaborators', postgresql_using='gin'),
        Index('idx_proposals_adherence', 'latest_adherence_score', postgresql_where=text("latest_adherence_score IS NOT NULL")),
    )


class ProposalVersionModel(BaseModel):
    """Git-like versioning for proposals with AI analysis per version"""
    __tablename__ = 'proposal_versions'
    
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id'), nullable=False)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey('proposals.id'), nullable=False)
    
    # Version info
    version_number = Column(Integer, nullable=False)
    parent_version_id = Column(UUID(as_uuid=True), ForeignKey('proposal_versions.id'))
    
    # Content
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    attachments = Column(JSONB, default=list)
    
    # Version metadata
    author_id = Column(UUID(as_uuid=True), nullable=False)
    commit_message = Column(Text, nullable=False)
    changes_summary = Column(JSONB, default=dict)
    
    # AI Analysis for this version
    adherence_score = Column(Numeric(3, 2))
    adherence_details = Column(JSONB, default=dict)
    
    # Relationships
    tenant = relationship("TenantModel")
    proposal = relationship("ProposalModel", back_populates="versions")
    
    # Constraints and indexes
    __table_args__ = (
        CheckConstraint('version_number > 0', name='chk_version_positive'),
        CheckConstraint('adherence_score >= 0 AND adherence_score <= 1', name='chk_version_adherence_range'),
        
        # Unique constraint for version numbers per proposal
        Index('idx_proposal_version_unique', 'proposal_id', 'version_number', unique=True),
        Index('idx_proposal_versions_proposal', 'proposal_id'),
        Index('idx_proposal_versions_author', 'author_id'),
        Index('idx_proposal_versions_parent', 'parent_version_id'),
    )
    # Self-referential parent/children relationship for version history
    # (wired after class definitions to avoid name-resolution issues)



# Enable Row-Level Security (RLS) for multi-tenancy
# This will be implemented in the Alembic migration
RLS_POLICIES = [
    "ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;",
    """
    CREATE POLICY tenant_isolation ON {table}
        FOR ALL TO authenticated_user
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
    """,
    """
    CREATE POLICY admin_full_access ON {table}
        FOR ALL TO admin_role
        USING (true);
    """,
    """
    CREATE POLICY hide_deleted ON {table}
        FOR SELECT TO authenticated_user
        USING (deleted_at IS NULL);
    """
]
