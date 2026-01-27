"""
Dependency Injection Container
Manages dependency injection for repositories and use cases
"""
from typing import Optional
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.database.connection import get_session, get_db
from adapters.database.neo4j_connection import Neo4jConnection
from adapters.repositories import (
    FundingRepository,
    ProjectRepository,
    ClientRepository,
    InteractionRepository,
)
from adapters.repositories.feedback_repository import FeedbackRepository
from adapters.repositories.opportunity_repository import OpportunityRepository
from adapters.repositories.proposal_repository import ProposalRepository
from adapters.repositories.proposal_version_repository import ProposalVersionRepository
from adapters.repositories.matching_repository import MatchingRepository
from use_cases.manage_funding_use_case import ManageFundingUseCase
from use_cases.manage_portfolio_use_case import ManagePortfolioUseCase
from use_cases.manage_crm_use_case import ManageCRMUseCase
from use_cases.manage_pipeline_use_case import ManagePipelineUseCase
from use_cases.execute_matching_use_case import ExecuteMatchingUseCase
from use_cases.manage_proposals_use_case import ManageProposalsUseCase
from use_cases.manage_feedback_use_case import ManageFeedbackUseCase
from infrastructure.ai.lgpd_agent import LGPDAgent
import os


class NoOpAuditService:
    """Minimal audit service that performs no-op async methods.
    Used during development to satisfy use-case dependencies.
    """
    async def log_creation(self, *args, **kwargs):
        return None

    async def log_update(self, *args, **kwargs):
        return None

    async def log_delete(self, *args, **kwargs):
        return None


# Alias for compatibility with legacy imports
# Use `get_db` (dependency generator) as the FastAPI dependency so FastAPI
# can call it without trying to inspect the async_sessionmaker object which
# exposes internal keyword-only arguments that confuse Pydantic/Depends.
get_db_session = get_db


class DependencyContainer:
    """
    Dependency Injection container for the application
    Provides factory methods for use cases with injected dependencies
    """
    
    def __init__(self, session: AsyncSession, neo4j: Optional[Neo4jConnection] = None):
        self.session = session
        self.neo4j = neo4j
        
        # Initialize repositories
        self._funding_repo = FundingRepository(session)
        self._project_repo = ProjectRepository(session)
        self._client_repo = ClientRepository(session)
        self._interaction_repo = InteractionRepository(session)
        self._feedback_repo = FeedbackRepository(session)
        
        # New repositories with Neo4j integration
        self._opportunity_repo = OpportunityRepository(session, neo4j)
        self._proposal_repo = ProposalRepository(session, neo4j)
        self._proposal_version_repo = ProposalVersionRepository(session)
        self._matching_repo = MatchingRepository(session, neo4j)
        
        # AI services
        encryption_key = os.getenv("ENCRYPTION_KEY", "default-dev-key")
        self._lgpd_agent = LGPDAgent(encryption_key)
        # Simple audit service used until a full implementation is available
        self._audit_service = NoOpAuditService()
    
    # Repository getters
    @property
    def funding_repository(self) -> FundingRepository:
        return self._funding_repo
    
    @property
    def project_repository(self) -> ProjectRepository:
        return self._project_repo
    
    @property
    def client_repository(self) -> ClientRepository:
        return self._client_repo
    
    @property
    def interaction_repository(self) -> InteractionRepository:
        return self._interaction_repo
    
    @property
    def opportunity_repository(self) -> OpportunityRepository:
        return self._opportunity_repo
    
    @property
    def proposal_repository(self) -> ProposalRepository:
        return self._proposal_repo
    
    @property
    def matching_repository(self) -> MatchingRepository:
        return self._matching_repo
    
    @property
    def lgpd_agent(self) -> LGPDAgent:
        return self._lgpd_agent
    
    # Use case factories
    def get_manage_funding_use_case(self) -> ManageFundingUseCase:
        """
        Create ManageFundingUseCase with injected dependencies
        """
        return ManageFundingUseCase(
            funding_repository=self._funding_repo,
            ai_extractor=self._lgpd_agent,
            audit_service=self._audit_service,
        )
    
    def get_manage_portfolio_use_case(self) -> ManagePortfolioUseCase:
        """
        Create ManagePortfolioUseCase with injected dependencies
        """
        return ManagePortfolioUseCase(
            project_repository=self._project_repo,
        )

    def get_manage_feedback_use_case(self) -> ManageFeedbackUseCase:
        """
        Create ManageFeedbackUseCase with injected dependencies
        """
        return ManageFeedbackUseCase(
            feedback_repository=self._feedback_repo,
            file_service=None,
            audit_service=None,
        )
    
    def get_manage_crm_use_case(self) -> ManageCRMUseCase:
        """
        Create ManageCRMUseCase with injected dependencies
        """
        return ManageCRMUseCase(
            client_repository=self._client_repo,
            interaction_repository=self._interaction_repo,
        )
    
    def get_manage_pipeline_use_case(self) -> ManagePipelineUseCase:
        """
        Create ManagePipelineUseCase with injected dependencies
        """
        return ManagePipelineUseCase(
            opportunity_repository=self._opportunity_repo,
        )
    
    def get_execute_matching_use_case(self) -> ExecuteMatchingUseCase:
        """
        Create ExecuteMatchingUseCase with injected dependencies
        """
        return ExecuteMatchingUseCase(
            matching_repository=self._matching_repo,
            opportunity_repository=self._opportunity_repo,
            portfolio_repository=self._project_repo,
            funding_repository=self._funding_repo,
            neo4j_service=self.neo4j,
            audit_service=None,  # Add audit service when available
        )
    
    def get_manage_proposals_use_case(self) -> ManageProposalsUseCase:
        """
        Create ManageProposalsUseCase with injected dependencies
        """
        return ManageProposalsUseCase(
            proposal_repository=self._proposal_repo,
            version_repository=self._proposal_version_repo,
        )


@asynccontextmanager
async def get_container():
    """
    Async context manager for dependency container
    Manages database session lifecycle
    """
    async with get_session() as session:
        container = DependencyContainer(session)
        yield container
