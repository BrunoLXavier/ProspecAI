# Domain Entities
from .funding_source import FundingSource, FundingStatus
# Alias for compatibility with legacy imports
FundingCategory = FundingSource
from .portfolio import Portfolio, Project
from .client import Client, Interaction
from .opportunity import Opportunity, OpportunityStage
from .matching import MatchingScore, MatchingResult
from .proposal import Proposal, ProposalVersion, ProposalStatus
from .audit import AuditLog
from .llm_config import LLMConfig, LLMProvider, LLMConfigStatus
from .ingestion import IngestionJob, IngestionSource, IngestionJobStatus, IngestionSourceType, FileType
from .pii_detection import (
    PIIDetection, PIIEntity, PIIType, PIIRiskLevel,
    AnonymizationStatus, AnonymizationStrategy
)
# User and Authentication
from .user import User, UserCreate, UserUpdate, UserLogin, PasswordReset, PasswordStrengthConfig, UserProfile
from .refresh_token import (
    RefreshToken, TokenType, 
    TokenAlreadyUsedException, TokenExpiredException, TokenInvalidException
)
from .system_config import (
    SystemConfig, EmailConfig, SecurityConfig, ContactFormConfig,
    EmailTemplates, EmailTemplate, EmailTemplateType,
    FormField, FormFieldType
)
from .feedback import (
    Feedback, FeedbackCreate, FeedbackResponse, FeedbackStatistics,
    FeedbackType, FeedbackSeverity, FeedbackStatus, AnnotationStroke
)
# Institute and Team Management
from .institute import (
    Institute, InstituteCreate, InstituteUpdate,
    InstituteStatus, OperationalStatus
)
from .team import Team, TeamCreate, TeamUpdate
from .infrastructure import (
    Infrastructure, InfrastructureCreate, InfrastructureUpdate,
    InfrastructureStatus
)
from .portfolio_project import (
    PortfolioProject, PortfolioProjectCreate, PortfolioProjectUpdate,
    PortfolioProjectStatus, SolutionCategory, CompanyType, TRLLevel
)

__all__ = [
    "FundingSource",
    "FundingStatus",
    "Portfolio",
    "Project",
    "Client",
    "Interaction",
    "Opportunity",
    "OpportunityStage",
    "MatchingScore",
    "MatchingResult",
    "Proposal",
    "ProposalVersion",
    "ProposalStatus",
    "AuditLog",
    # LLM Configuration
    "LLMConfig",
    "LLMProvider",
    "LLMConfigStatus",
    # Data Ingestion
    "IngestionJob",
    "IngestionSource",
    "IngestionJobStatus",
    "IngestionSourceType",
    "FileType",
    # PII Detection
    "PIIDetection",
    "PIIEntity",
    "PIIType",
    "PIIRiskLevel",
    "AnonymizationStatus",
    "AnonymizationStrategy",
    # User and Authentication
    "User",
    "UserCreate",
    "UserUpdate",
    "UserLogin",
    "PasswordReset",
    "PasswordStrengthConfig",
    "UserProfile",
    "RefreshToken",
    "TokenType",
    "TokenAlreadyUsedException",
    "TokenExpiredException",
    "TokenInvalidException",
    # System Configuration
    "SystemConfig",
    "EmailConfig",
    "SecurityConfig",
    "ContactFormConfig",
    "EmailTemplates",
    "EmailTemplate",
    "EmailTemplateType",
    "FormField",
    "FormFieldType",
    # User Feedback
    "Feedback",
    "FeedbackCreate",
    "FeedbackResponse",
    "FeedbackStatistics",
    "FeedbackType",
    "FeedbackSeverity",
    "FeedbackStatus",
    "AnnotationStroke",
    # Institute Management
    "Institute",
    "InstituteCreate",
    "InstituteUpdate",
    "InstituteStatus",
    "OperationalStatus",
    # Team Management
    "Team",
    "TeamCreate",
    "TeamUpdate",
    # Infrastructure Management
    "Infrastructure",
    "InfrastructureCreate",
    "InfrastructureUpdate",
    "InfrastructureStatus",
    # Portfolio Project Management
    "PortfolioProject",
    "PortfolioProjectCreate",
    "PortfolioProjectUpdate",
    "PortfolioProjectStatus",
    "SolutionCategory",
    "CompanyType",
    "TRLLevel",
]
