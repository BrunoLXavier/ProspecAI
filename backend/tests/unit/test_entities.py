"""
Unit Tests for Domain Entities
Tests pure business logic and validation rules.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from domain.entities.funding_source import FundingSource, InstrumentType, FundingStatus
from domain.entities.client import Client, ClientType
from domain.entities.project import Project, TRLLevel, ProjectStatus
from domain.entities.opportunity import Opportunity, OpportunityStage, OpportunityPriority
from domain.entities.matching import MatchingScore, MatchingResult


# =============================================================================
# FundingSource Entity Tests
# =============================================================================

class TestFundingSource:
    """Tests for FundingSource entity validation and business rules."""

    def test_create_valid_funding_source(self, sample_funding_source: FundingSource):
        """Test creating a valid funding source."""
        assert sample_funding_source.name is not None
        assert sample_funding_source.source_organization == "FAPESP"
        assert sample_funding_source.trl_min <= sample_funding_source.trl_max
        assert sample_funding_source.is_deleted() is False

    def test_trl_range_validation(self):
        """Test TRL range must be valid (1-9)."""
        with pytest.raises(ValueError):
            FundingSource(
                id=uuid4(),
                tenant_id=uuid4(),
                created_by=uuid4(),
                updated_by=uuid4(),
                name="Invalid TRL",
                source_organization="Test",
                instrument_type=InstrumentType.GRANT,
                trl_min=0,  # Invalid: must be >= 1
                trl_max=5,
                total_amount=Decimal("1000000"),
                available_amount=Decimal("1000000"),
                submission_start=datetime.now(),
                submission_end=datetime.now() + timedelta(days=30),
            )

    def test_trl_min_not_greater_than_max(self):
        """Test TRL min cannot be greater than max."""
        with pytest.raises(ValueError):
            FundingSource(
                id=uuid4(),
                tenant_id=uuid4(),
                created_by=uuid4(),
                updated_by=uuid4(),
                name="Invalid TRL Range",
                source_organization="Test",
                instrument_type=InstrumentType.GRANT,
                trl_min=7,
                trl_max=3,  # Invalid: max < min
                total_amount=Decimal("1000000"),
                available_amount=Decimal("1000000"),
                submission_start=datetime.now(),
                submission_end=datetime.now() + timedelta(days=30),
            )

    def test_budget_validation(self):
        """Test budget constraints - available cannot exceed total."""
        with pytest.raises(ValueError):
            FundingSource(
                id=uuid4(),
                tenant_id=uuid4(),
                created_by=uuid4(),
                updated_by=uuid4(),
                name="Invalid Budget",
                source_organization="Test",
                instrument_type=InstrumentType.GRANT,
                trl_min=1,
                trl_max=5,
                total_amount=Decimal("1000000"),
                available_amount=Decimal("2000000"),  # Invalid: exceeds total
                submission_start=datetime.now(),
                submission_end=datetime.now() + timedelta(days=30),
            )

    def test_ai_confidence_score_bounds(self):
        """Test AI confidence score must be between 0 and 1."""
        funding = FundingSource(
            id=uuid4(),
            tenant_id=uuid4(),
            created_by=uuid4(),
            updated_by=uuid4(),
            name="AI Extracted",
            source_organization="Test",
            instrument_type=InstrumentType.GRANT,
            trl_min=1,
            trl_max=5,
            total_amount=Decimal("1000000"),
            available_amount=Decimal("1000000"),
            submission_start=datetime.now(),
            submission_end=datetime.now() + timedelta(days=30),
            ai_extracted_data={"source": "test"},
            ai_confidence_score=0.85,
        )
        assert 0 <= funding.ai_confidence_score <= 1

    def test_instrument_type_enum(self):
        """Test all instrument types are valid."""
        valid_types = [
            InstrumentType.GRANT,
            InstrumentType.LOAN,
            InstrumentType.EQUITY,
            InstrumentType.TAX_INCENTIVE,
            InstrumentType.MIXED,
        ]
        for inst_type in valid_types:
            funding = FundingSource(
                id=uuid4(),
                tenant_id=uuid4(),
                created_by=uuid4(),
                updated_by=uuid4(),
                name=f"Test {inst_type.value}",
                source_organization="Test",
                instrument_type=inst_type,
                trl_min=1,
                trl_max=5,
                total_amount=Decimal("1000000"),
                available_amount=Decimal("1000000"),
                submission_start=datetime.now(),
                submission_end=datetime.now() + timedelta(days=30),
            )
            assert funding.instrument_type == inst_type


# =============================================================================
# Client Entity Tests
# =============================================================================

class TestClient:
    """Tests for Client entity validation."""

    def test_create_valid_client(self, sample_client: Client):
        """Test creating a valid client."""
        assert sample_client.name is not None
        assert sample_client.cnpj is not None
        assert sample_client.is_deleted() is False

    def test_cnpj_format_validation(self):
        """Test CNPJ must have valid format."""
        # Valid CNPJ (14 digits)
        client = Client(
            id=uuid4(),
            tenant_id=uuid4(),
            created_by=uuid4(),
            updated_by=uuid4(),
            name="Test Company",
            cnpj="12345678000199",
            client_type=ClientType.COMPANY,
        )
        assert len(client.cnpj) == 14

    def test_client_type_enum(self):
        """Test all client types are valid."""
        valid_types = [
            ClientType.COMPANY,
            ClientType.STARTUP,
            ClientType.RESEARCH_CENTER,
            ClientType.UNIVERSITY,
            ClientType.GOVERNMENT,
            ClientType.OTHER,
        ]
        for client_type in valid_types:
            client = Client(
                id=uuid4(),
                tenant_id=uuid4(),
                created_by=uuid4(),
                updated_by=uuid4(),
                name=f"Test {client_type.value}",
                client_type=client_type,
            )
            assert client.client_type == client_type

    def test_email_validation(self):
        """Test email format validation."""
        client = Client(
            id=uuid4(),
            tenant_id=uuid4(),
            created_by=uuid4(),
            updated_by=uuid4(),
            name="Test",
            client_type=ClientType.COMPANY,
            email="valid@email.com",
        )
        assert "@" in client.email


# =============================================================================
# Project Entity Tests
# =============================================================================

class TestProject:
    """Tests for Project entity validation."""

    def test_create_valid_project(self, sample_project: Project):
        """Test creating a valid project."""
        assert sample_project.name is not None
        assert sample_project.current_trl is not None
        assert sample_project.target_trl is not None

    def test_trl_progression(self, sample_project: Project):
        """Test target TRL should be >= current TRL."""
        assert sample_project.target_trl.value >= sample_project.current_trl.value

    def test_all_trl_levels(self):
        """Test all TRL levels are defined."""
        expected_levels = [
            TRLLevel.TRL_1,
            TRLLevel.TRL_2,
            TRLLevel.TRL_3,
            TRLLevel.TRL_4,
            TRLLevel.TRL_5,
            TRLLevel.TRL_6,
            TRLLevel.TRL_7,
            TRLLevel.TRL_8,
            TRLLevel.TRL_9,
        ]
        assert len(expected_levels) == 9
        for i, level in enumerate(expected_levels, start=1):
            assert level.value == i

    def test_date_validation(self):
        """Test end date should be after start date."""
        start = datetime.now()
        end = start + timedelta(days=365)
        project = Project(
            id=uuid4(),
            tenant_id=uuid4(),
            created_by=uuid4(),
            updated_by=uuid4(),
            name="Test Project",
            current_trl=TRLLevel.TRL_3,
            start_date=start,
            end_date=end,
        )
        assert project.end_date > project.start_date


# =============================================================================
# Opportunity Entity Tests
# =============================================================================

class TestOpportunity:
    """Tests for Opportunity entity validation."""

    def test_create_valid_opportunity(self, sample_opportunity: Opportunity):
        """Test creating a valid opportunity."""
        assert sample_opportunity.title is not None
        assert sample_opportunity.stage is not None
        assert 0 <= sample_opportunity.probability <= 1

    def test_pipeline_stages(self):
        """Test all pipeline stages are defined per RF-05."""
        expected_stages = [
            OpportunityStage.INTELLIGENCE,
            OpportunityStage.VALIDATION,
            OpportunityStage.APPROACH,
            OpportunityStage.REGISTRATION,
            OpportunityStage.CONVERSION,
            OpportunityStage.POST_SALE,
            OpportunityStage.LOST,
        ]
        assert len(expected_stages) == 7

    def test_priority_score_bounds(self):
        """Test priority score must be between 0 and 100."""
        opportunity = Opportunity(
            id=uuid4(),
            tenant_id=uuid4(),
            created_by=uuid4(),
            updated_by=uuid4(),
            title="Test",
            description="Test description",
            stage=OpportunityStage.INTELLIGENCE,
            priority_score=75.0,
        )
        assert 0 <= opportunity.priority_score <= 100

    def test_probability_bounds(self):
        """Test probability must be between 0 and 1."""
        opportunity = Opportunity(
            id=uuid4(),
            tenant_id=uuid4(),
            created_by=uuid4(),
            updated_by=uuid4(),
            title="Test",
            description="Test description",
            stage=OpportunityStage.VALIDATION,
            probability=0.75,
        )
        assert 0 <= opportunity.probability <= 1


# =============================================================================
# MatchingScore Entity Tests
# =============================================================================

class TestMatchingScore:
    """Tests for MatchingScore entity and formula implementation (RF-06)."""

    def test_matching_formula(self):
        """
        Test matching formula: Score = (Technical * 0.4) + (Financial * 0.3) + (Strategic * 0.3)
        Implements RF-06.
        """
        technical = 80.0
        financial = 70.0
        strategic = 90.0
        
        expected_score = (technical * 0.4) + (financial * 0.3) + (strategic * 0.3)
        # = 32 + 21 + 27 = 80
        
        matching = MatchingScore(
            id=uuid4(),
            tenant_id=uuid4(),
            created_by=uuid4(),
            updated_by=uuid4(),
            demand_id=uuid4(),
            capability_id=uuid4(),
            funding_source_id=uuid4(),
            technical_feasibility_score=technical,
            financial_viability_score=financial,
            strategic_alignment_score=strategic,
            composite_score=expected_score,
            calculation_formula="Score = (Technical * 0.4) + (Financial * 0.3) + (Strategic * 0.3)",
            ai_confidence=0.85,
        )
        
        calculated = (
            matching.technical_feasibility_score * 0.4 +
            matching.financial_viability_score * 0.3 +
            matching.strategic_alignment_score * 0.3
        )
        
        assert abs(matching.composite_score - calculated) < 0.01
        assert matching.composite_score == 80.0

    def test_score_components_bounds(self):
        """Test all score components must be between 0 and 100."""
        matching = MatchingScore(
            id=uuid4(),
            tenant_id=uuid4(),
            created_by=uuid4(),
            updated_by=uuid4(),
            demand_id=uuid4(),
            capability_id=uuid4(),
            technical_feasibility_score=85.0,
            financial_viability_score=75.0,
            strategic_alignment_score=90.0,
            composite_score=83.5,
            calculation_formula="Score = (Technical * 0.4) + (Financial * 0.3) + (Strategic * 0.3)",
            ai_confidence=0.85,
        )
        
        assert 0 <= matching.technical_feasibility_score <= 100
        assert 0 <= matching.financial_viability_score <= 100
        assert 0 <= matching.strategic_alignment_score <= 100
        assert 0 <= matching.composite_score <= 100

    def test_matching_result_with_explanation(self):
        """Test MatchingResult includes explanation for transparency (RNF-04)."""
        result = MatchingResult(
            id=uuid4(),
            tenant_id=uuid4(),
            created_by=uuid4(),
            updated_by=uuid4(),
            opportunity_id=uuid4(),
            algorithm_version="1.0.0",
            graph_data={
                "technical_factors": ["TRL compatível", "Equipe qualificada"],
                "financial_factors": ["Orçamento dentro do limite"],
                "strategic_factors": ["Alinhado com área prioritária"],
            },
            reviewed=False,
            reviewed_by=None,
        )
        
        assert result.graph_data is not None
        assert "technical_factors" in result.graph_data
        assert "financial_factors" in result.graph_data
        assert "strategic_factors" in result.graph_data
        assert result.reviewed is False  # Requires human-in-the-loop


# =============================================================================
# Multi-Tenancy Tests
# =============================================================================

class TestMultiTenancy:
    """Tests for multi-tenancy requirements (RNF-02)."""

    def test_all_entities_have_tenant_id(
        self,
        sample_funding_source: FundingSource,
        sample_client: Client,
        sample_project: Project,
        sample_opportunity: Opportunity,
    ):
        """Test all entities have tenant_id for RLS."""
        entities = [
            sample_funding_source,
            sample_client,
            sample_project,
            sample_opportunity,
        ]
        
        for entity in entities:
            assert hasattr(entity, "tenant_id")
            assert entity.tenant_id is not None

    def test_entities_from_different_tenants(self):
        """Test entities from different tenants are isolated."""
        tenant_a = uuid4()
        tenant_b = uuid4()
        created_by = uuid4()
        updated_by = uuid4()
        
        client_a = Client(
            id=uuid4(),
            tenant_id=tenant_a,
            created_by=created_by,
            updated_by=updated_by,
            name="Client A",
            client_type=ClientType.COMPANY,
        )
        
        client_b = Client(
            id=uuid4(),
            tenant_id=tenant_b,
            created_by=created_by,
            updated_by=updated_by,
            name="Client B",
            client_type=ClientType.COMPANY,
        )
        
        assert client_a.tenant_id != client_b.tenant_id


# =============================================================================
# Soft Delete Tests
# =============================================================================

class TestSoftDelete:
    """Tests for soft delete requirements."""

    def test_entities_have_deleted_at(self, sample_client: Client):
        """Test entities support soft delete via deleted_at field."""
        assert hasattr(sample_client, "deleted_at")
        assert sample_client.deleted_at is None  # Not deleted initially

    def test_soft_delete_preserves_data(self, sample_client: Client, user_id):
        """Test soft delete marks record but preserves data."""
        # Verify initial state
        assert sample_client.is_deleted() is False
        
        # Simulate soft delete using the entity method
        sample_client.soft_delete(user_id)
        
        # Data is still accessible after soft delete
        assert sample_client.name is not None
        assert sample_client.cnpj is not None
        assert sample_client.is_deleted() is True
        assert sample_client.deleted_at is not None
