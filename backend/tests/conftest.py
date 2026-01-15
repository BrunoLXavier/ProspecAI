"""
Test Configuration
Pytest configuration and fixtures for ProspecAI

Features:
- In-memory SQLite for fast CI testing
- Mock repositories for unit tests
- Factory fixtures for entities
- Neo4j mock for graph queries
"""
import pytest
import asyncio
import os
from typing import AsyncGenerator, Generator, Dict, Any, List, Optional
from datetime import datetime, date
from uuid import UUID, uuid4
from unittest.mock import AsyncMock, MagicMock
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from main import app

# Use SQLite for fast in-memory testing in CI
USE_SQLITE = os.getenv("TEST_USE_SQLITE", "true").lower() == "true"
TEST_DATABASE_URL = (
    "sqlite+aiosqlite:///:memory:" if USE_SQLITE 
    else "postgresql+asyncpg://postgres:changeme@localhost:5432/prospecai_test"
)


# ============================================================================
# EVENT LOOP FIXTURE
# ============================================================================
@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ============================================================================
# IN-MEMORY DATABASE FOR FAST CI
# ============================================================================
@pytest.fixture(scope="function")
async def test_engine():
    """Create in-memory test database engine for fast CI"""
    from adapters.database.models_new import BaseModel
    
    connect_args = {"check_same_thread": False} if USE_SQLITE else {}
    
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=StaticPool,
        echo=False,
        connect_args=connect_args,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(BaseModel.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(BaseModel.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create database session for tests"""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session() as session:
        yield session
        await session.rollback()


# ============================================================================
# MOCK NEO4J CONNECTION
# ============================================================================
class MockNeo4jConnection:
    """Mock Neo4j connection for testing without real Neo4j instance"""
    
    def __init__(self):
        self.queries_executed = []
        self.mock_results = {}
    
    async def execute_query(
        self, 
        query: str, 
        parameters: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """Mock execute query - returns predefined results or empty list"""
        self.queries_executed.append({"query": query, "params": parameters})
        
        # Return mock results based on query patterns
        if "similar_wins" in query.lower():
            return [{"similar_wins": 2, "submissions": 5, "score": 75}]
        if "partner_count" in query.lower():
            return [{
                "partner_count": 3,
                "won_projects": 5,
                "submissions": 10,
                "top_partners": ["Partner A", "Partner B"]
            }]
        if "relationship_score" in query.lower():
            return [{"relationship_score": 65, "similar_wins": 2, "client_projects": 3}]
        
        return self.mock_results.get(query, [])
    
    def set_mock_result(self, query_pattern: str, result: List[Dict[str, Any]]):
        """Set mock result for specific query pattern"""
        self.mock_results[query_pattern] = result
    
    async def close(self):
        """Mock close connection"""
        pass


@pytest.fixture
def mock_neo4j():
    """Provide mock Neo4j connection"""
    return MockNeo4jConnection()


# ============================================================================
# MOCK CACHE MANAGER
# ============================================================================
class MockCacheManager:
    """In-memory cache for testing"""
    
    def __init__(self):
        self._cache: Dict[str, Any] = {}
    
    async def get(self, key: str) -> Optional[Any]:
        return self._cache.get(key)
    
    async def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        self._cache[key] = value
    
    async def delete(self, key: str) -> None:
        self._cache.pop(key, None)
    
    async def invalidate_pattern(self, pattern: str) -> int:
        keys_to_delete = [k for k in self._cache.keys() if pattern in k]
        for k in keys_to_delete:
            del self._cache[k]
        return len(keys_to_delete)
    
    def clear(self):
        self._cache.clear()


@pytest.fixture
def mock_cache():
    """Provide mock cache manager"""
    return MockCacheManager()


# ============================================================================
# ENTITY FACTORIES
# ============================================================================
@pytest.fixture
def tenant_id() -> UUID:
    """Provide test tenant ID as UUID"""
    return uuid4()


@pytest.fixture
def user_id() -> UUID:
    """Provide test user ID"""
    return uuid4()


@pytest.fixture
def created_by() -> UUID:
    """Provide creator user ID for audit fields"""
    return uuid4()


@pytest.fixture
def updated_by() -> UUID:
    """Provide updater user ID for audit fields"""
    return uuid4()


@pytest.fixture
def funding_source_factory(tenant_id, created_by, updated_by):
    """Factory for creating test funding sources"""
    def _create(
        name: str = "Test Funding",
        agency: str = "FINEP",
        minimum_value: float = 100000,
        maximum_value: float = 5000000,
        trl_min: int = 3,
        trl_max: int = 7,
        thematic_areas: List[str] = None
    ):
        return {
            "id": uuid4(),
            "tenant_id": tenant_id,
            "created_by": created_by,
            "updated_by": updated_by,
            "name": name,
            "agency": agency,
            "type": "grant",
            "instrument_type": "grant",
            "description": f"Test funding source: {name}",
            "minimum_value": minimum_value,
            "maximum_value": maximum_value,
            "total_amount": maximum_value,
            "available_amount": maximum_value,
            "currency": "BRL",
            "eligibility_criteria": {
                "trl_min": trl_min,
                "trl_max": trl_max,
                "required_competencies": ["AI", "Machine Learning"],
                "counterpart_percentage": 20
            },
            "thematic_areas": thematic_areas or ["Technology", "Innovation"],
            "submission_start": datetime.utcnow(),
            "submission_end": datetime(2026, 12, 31),
            "status": "open",
            "source_organization": agency,
            "trl_min": trl_min,
            "trl_max": trl_max,
            "ai_confidence_score": 0.85,
            "ai_extracted_data": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "deleted_at": None,
        }
    return _create


@pytest.fixture
def client_factory(tenant_id, created_by, updated_by):
    """Factory for creating test clients"""
    def _create(
        name: str = "Test Client",
        cnpj: str = "12345678000100",
        competencies: List[str] = None,
        sectors: List[str] = None
    ):
        return {
            "id": uuid4(),
            "tenant_id": tenant_id,
            "created_by": created_by,
            "updated_by": updated_by,
            "name": name,
            "cnpj": cnpj,
            "type": "company",
            "client_type": "company",
            "competencies": competencies or ["AI", "Data Science", "Cloud"],
            "sectors": sectors or ["Technology", "Manufacturing"],
            "sector": "Technology",
            "engagement_score": 0.8,
            "annual_revenue": 10000000,
            "completed_projects_count": 5,
            "email": "test@company.com",
            "phone": "+5511999999999",
            "address": {"city": "São Paulo", "state": "SP"},
            "contact_person": "John Doe",
            "website": "https://company.com",
            "interaction_ids": [],
            "detected_demands": [],
            "auto_filled_data": None,
            "auto_fill_confidence": None,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "deleted_at": None,
        }
    return _create


@pytest.fixture
def opportunity_factory(tenant_id, created_by, updated_by):
    """Factory for creating test opportunities"""
    def _create(
        title: str = "Test Opportunity",
        stage: str = "intelligence",
        estimated_value: float = 500000,
        client_id: UUID = None,
        funding_source_id: UUID = None
    ):
        return {
            "id": uuid4(),
            "tenant_id": tenant_id,
            "created_by": created_by,
            "updated_by": updated_by,
            "title": title,
            "description": f"Test opportunity: {title}",
            "stage": stage,
            "priority": "medium",
            "estimated_value": estimated_value,
            "client_id": client_id or uuid4(),
            "funding_source_id": funding_source_id,
            "portfolio_id": None,
            "priority_score": 75.0,
            "probability": 0.5,
            "probability_score": 0.5,
            "score_formula": "Score = (Tech * 0.4) + (Fin * 0.3) + (Strat * 0.3)",
            "stage_history": [],
            "team_members": [],
            "assigned_to": None,
            "expected_close_date": None,
            "actual_close_date": None,
            "ai_priority_factors": {},
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "deleted_at": None,
        }
    return _create


@pytest.fixture
def proposal_factory(tenant_id, created_by, updated_by):
    """Factory for creating test proposals"""
    def _create(
        title: str = "Test Proposal",
        status: str = "draft",
        current_version: int = 1,
        adherence_score: float = None
    ):
        return {
            "id": uuid4(),
            "tenant_id": tenant_id,
            "created_by": created_by,
            "updated_by": updated_by,
            "title": title,
            "description": f"Test proposal: {title}",
            "status": status,
            "current_version": current_version,
            "content": {"sections": ["intro", "methodology", "budget"]},
            "sections": {"intro": "Introduction text", "methodology": "Methodology"},
            "budget_data": {"total": 500000, "personnel": 200000, "equipment": 100000},
            "adherence_score": adherence_score or 0.75,
            "adherence_analysis": {"compliance": True, "gaps": []},
            "opportunity_id": None,
            "funding_source_id": None,
            "client_id": None,
            "collaborators": [],
            "attachments": [],
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "deleted_at": None,
        }
    return _create


@pytest.fixture
def matching_score_factory(tenant_id, created_by, updated_by):
    """Factory for creating test matching scores"""
    def _create(
        client_id: UUID = None,
        funding_source_id: UUID = None,
        composite_score: float = 75.0
    ):
        return {
            "id": uuid4(),
            "tenant_id": tenant_id,
            "created_by": created_by,
            "updated_by": updated_by,
            "demand_id": uuid4(),
            "capability_id": uuid4(),
            "client_id": client_id or uuid4(),
            "funding_source_id": funding_source_id or uuid4(),
            "technical_feasibility_score": 80.0,
            "financial_viability_score": 70.0,
            "strategic_alignment_score": 75.0,
            "technical_score": 80.0,
            "financial_score": 70.0,
            "strategic_score": 75.0,
            "composite_score": composite_score,
            "calculation_formula": "Score = (Tech * 0.4) + (Fin * 0.3) + (Strat * 0.3)",
            "calculation_details": {
                "technical": {"factors": ["TRL compatible", "Team qualified"]},
                "financial": {"factors": ["Budget aligned"]},
                "strategic": {"factors": ["Priority area"]}
            },
            "ai_confidence": 0.85,
            "confidence_level": 0.85,
            "human_validated": False,
            "validated_by": None,
            "validated_at": None,
            "validation_notes": None,
            "scoring_details": {
                "technical": {"factors": []},
                "financial": {"factors": []},
                "strategic": {"factors": []}
            },
            "trl_compatibility": {"compatible": True},
            "competency_overlap": [],
            "budget_alignment": {"fit_status": "aligned"},
            "graph_relationships": {"graph_available": False},
            "explanation": "Test matching explanation",
            "calculated_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "deleted_at": None,
        }
    return _create


@pytest.fixture
def project_factory(tenant_id, created_by, updated_by):
    """Factory for creating test projects"""
    def _create(
        title: str = "Test Project",
        status: str = "active",
        trl_current: int = 4,
        trl_target: int = 7
    ):
        return {
            "id": uuid4(),
            "tenant_id": tenant_id,
            "created_by": created_by,
            "updated_by": updated_by,
            "title": title,
            "name": title,
            "description": f"Test project: {title}",
            "status": status,
            "trl_current": trl_current,
            "trl_target": trl_target,
            "current_trl": trl_current,
            "target_trl": trl_target,
            "team_members": [],
            "competencies": ["AI", "Machine Learning"],
            "infrastructure": {"lab": True},
            "lessons_learned": [],
            "version": 1,
            "parent_version_id": None,
            "start_date": datetime.utcnow(),
            "end_date": datetime(2027, 12, 31),
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "deleted_at": None,
        }
    return _create


# ============================================================================
# MOCK REPOSITORIES
# ============================================================================
class MockBaseRepository:
    """Base mock repository with in-memory storage"""
    
    def __init__(self):
        self._storage: Dict[str, Dict[str, Any]] = {}
    
    async def get_by_id(self, tenant_id: str, entity_id: UUID) -> Optional[Dict]:
        key = f"{tenant_id}:{entity_id}"
        return self._storage.get(key)
    
    async def create(self, entity: Dict) -> Dict:
        key = f"{entity['tenant_id']}:{entity['id']}"
        self._storage[key] = entity
        return entity
    
    async def update(self, entity: Dict) -> Dict:
        key = f"{entity['tenant_id']}:{entity['id']}"
        self._storage[key] = entity
        return entity
    
    async def delete(self, tenant_id: str, entity_id: UUID) -> bool:
        key = f"{tenant_id}:{entity_id}"
        if key in self._storage:
            del self._storage[key]
            return True
        return False
    
    async def list_by_tenant(self, tenant_id: str, **kwargs) -> List[Dict]:
        return [v for k, v in self._storage.items() if k.startswith(tenant_id)]


@pytest.fixture
def mock_funding_repository():
    """Mock funding repository"""
    return MockBaseRepository()


@pytest.fixture
def mock_client_repository():
    """Mock client repository"""
    return MockBaseRepository()


@pytest.fixture
def mock_opportunity_repository():
    """Mock opportunity repository"""
    return MockBaseRepository()


@pytest.fixture
def mock_proposal_repository():
    """Mock proposal repository"""
    return MockBaseRepository()


@pytest.fixture
def mock_matching_repository():
    """Mock matching repository"""
    return MockBaseRepository()


# ============================================================================
# MOCK AI SERVICES
# ============================================================================
@pytest.fixture
def mock_lgpd_agent():
    """Mock LGPD agent for testing PII detection"""
    agent = MagicMock()
    agent.detect_and_mask_pii = AsyncMock(return_value={
        "masked_data": {},
        "pii_fields": [],
        "detection_method": "mock",
        "timestamp": datetime.utcnow().isoformat()
    })
    agent.detect_with_bertimbau = AsyncMock(return_value=[])
    return agent


# ============================================================================
# HTTPX TEST CLIENT
# ============================================================================
@pytest.fixture
async def test_client():
    """Create async test client for API testing"""
    from httpx import AsyncClient, ASGITransport
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client


# ============================================================================
# DEPENDENCY OVERRIDES
# ============================================================================
@pytest.fixture
def override_dependencies(db_session, mock_neo4j, mock_cache):
    """Override FastAPI dependencies for testing"""
    from adapters.database.connection import get_session
    from infrastructure.di_container import DependencyContainer
    
    async def _override_get_session():
        yield db_session
    
    app.dependency_overrides[get_session] = _override_get_session
    
    yield
    
    app.dependency_overrides.clear()


@pytest.fixture
def override_get_session(db_session):
    """Override get_session dependency for API tests - alias for compatibility."""
    from adapters.database.connection import get_session
    
    async def _override_get_session():
        yield db_session
    
    app.dependency_overrides[get_session] = _override_get_session
    
    yield
    
    app.dependency_overrides.clear()


# ============================================================================
# SAMPLE ENTITY FIXTURES FOR UNIT TESTS
# ============================================================================
@pytest.fixture
def sample_funding_source(tenant_id, created_by, updated_by):
    """Create a sample FundingSource entity for tests."""
    from domain.entities.funding_source import FundingSource, InstrumentType, FundingStatus
    from decimal import Decimal
    
    return FundingSource(
        id=uuid4(),
        tenant_id=tenant_id,
        created_by=created_by,
        updated_by=updated_by,
        name="FAPESP Research Grant 2026",
        description="Research grant for AI and Innovation",
        instrument_type=InstrumentType.GRANT,
        trl_min=3,
        trl_max=7,
        total_amount=Decimal("5000000.00"),
        available_amount=Decimal("5000000.00"),
        currency="BRL",
        submission_start=datetime.utcnow(),
        submission_end=datetime(2026, 12, 31),
        status=FundingStatus.OPEN,
        source_organization="FAPESP",
        url="https://fapesp.br/grants",
        ai_confidence_score=0.92,
        ai_extracted_data={"source": "web_scraping"},
    )


@pytest.fixture
def sample_client(tenant_id, created_by, updated_by):
    """Create a sample Client entity for tests."""
    from domain.entities.client import Client, ClientType
    
    return Client(
        id=uuid4(),
        tenant_id=tenant_id,
        created_by=created_by,
        updated_by=updated_by,
        name="TechCorp Industries",
        client_type=ClientType.COMPANY,
        cnpj="12345678000199",
        email="contact@techcorp.com",
        phone="+5511999999999",
        address={"city": "São Paulo", "state": "SP", "country": "Brazil"},
        contact_person="Maria Silva",
        sector="Technology",
        website="https://techcorp.com",
        interaction_ids=[],
        detected_demands=[],
        auto_filled_data=None,
        auto_fill_confidence=None,
    )


@pytest.fixture
def sample_project(tenant_id, created_by, updated_by):
    """Create a sample Project entity for tests."""
    from domain.entities.project import Project, TRLLevel, ProjectStatus
    
    return Project(
        id=uuid4(),
        tenant_id=tenant_id,
        created_by=created_by,
        updated_by=updated_by,
        name="AI-Powered Manufacturing",
        description="Implementing AI in manufacturing processes",
        status=ProjectStatus.ACTIVE,
        current_trl=TRLLevel.TRL_4,
        target_trl=TRLLevel.TRL_7,
        team_members=[],
        competencies=["AI", "Machine Learning", "Manufacturing"],
        infrastructure={"lab": True, "equipment": ["GPU Servers"]},
        lessons_learned=[],
        version=1,
        parent_version_id=None,
    )


@pytest.fixture
def sample_opportunity(tenant_id, created_by, updated_by):
    """Create a sample Opportunity entity for tests."""
    from domain.entities.opportunity import Opportunity, OpportunityStage, OpportunityPriority
    from decimal import Decimal
    
    return Opportunity(
        id=uuid4(),
        tenant_id=tenant_id,
        created_by=created_by,
        updated_by=updated_by,
        title="FAPESP AI Grant Opportunity",
        description="Opportunity to apply for FAPESP AI research grant",
        stage=OpportunityStage.INTELLIGENCE,
        priority=OpportunityPriority.HIGH,
        client_id=None,
        funding_source_id=None,
        portfolio_id=None,
        estimated_value=Decimal("2000000.00"),
        probability=0.7,
        expected_close_date=datetime(2026, 6, 30),
        priority_score=85.0,
        score_formula="Score = (Tech * 0.4) + (Fin * 0.3) + (Strat * 0.3)",
        stage_history=[],
        assigned_to=None,
    )


@pytest.fixture
def sample_matching_score(tenant_id, created_by, updated_by):
    """Create a sample MatchingScore entity for tests."""
    from domain.entities.matching import MatchingScore
    
    return MatchingScore(
        id=uuid4(),
        tenant_id=tenant_id,
        created_by=created_by,
        updated_by=updated_by,
        demand_id=uuid4(),
        capability_id=uuid4(),
        funding_source_id=uuid4(),
        technical_feasibility_score=85.0,
        financial_viability_score=78.0,
        strategic_alignment_score=90.0,
        composite_score=84.1,
        calculation_formula="Score = (Tech * 0.4) + (Fin * 0.3) + (Strat * 0.3)",
        calculation_details={
            "technical": {"factors": ["TRL compatible", "Team qualified"]},
            "financial": {"factors": ["Budget aligned", "Counterpart feasible"]},
            "strategic": {"factors": ["Priority area", "Strategic alignment"]}
        },
        human_validated=False,
        validated_by=None,
        validated_at=None,
        validation_notes=None,
        ai_confidence=0.88,
    )


@pytest.fixture
def sample_proposal(tenant_id, created_by, updated_by):
    """Create a sample Proposal entity for tests."""
    from domain.entities.proposal import Proposal, ProposalStatus
    
    return Proposal(
        id=uuid4(),
        tenant_id=tenant_id,
        created_by=created_by,
        updated_by=updated_by,
        title="AI Research Proposal",
        description="Proposal for AI research in manufacturing",
        status=ProposalStatus.DRAFT,
        opportunity_id=None,
        funding_source_id=None,
        client_id=None,
    )

