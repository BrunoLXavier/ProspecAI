"""
Unit Tests for Use Cases
Tests business logic in isolation with mocked repositories
"""
import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock

from domain.entities.funding_source import FundingSource, FundingStatus, InstrumentType
from domain.entities.portfolio import Project, ProjectStatus
from domain.entities.client import Client, ClientType
from use_cases.manage_funding import ManageFundingUseCase
from use_cases.manage_portfolio import ManagePortfolioUseCase
from use_cases.manage_crm import ManageCRMUseCase


class TestManageFundingUseCase:
    """
    Test Manage Funding Use Case
    Implements RF-02
    """
    
    @pytest.fixture
    def mock_funding_repository(self):
        """Create mock funding repository"""
        return AsyncMock()
    
    @pytest.fixture
    def mock_ai_extractor(self):
        """Create mock AI extractor"""
        return AsyncMock()
    
    @pytest.fixture
    def mock_audit_service(self):
        """Create mock audit service"""
        return AsyncMock()
    
    @pytest.fixture
    def use_case(self, mock_funding_repository, mock_ai_extractor, mock_audit_service):
        """Create use case with mock dependencies"""
        return ManageFundingUseCase(
            funding_repository=mock_funding_repository,
            ai_extractor=mock_ai_extractor,
            audit_service=mock_audit_service
        )
    
    @pytest.mark.asyncio
    async def test_create_funding_source(self, use_case, mock_funding_repository, mock_audit_service, tenant_id, created_by, updated_by):
        """Test creating a new funding source with proper parameters"""
        now = datetime.utcnow()
        
        # Prepare test data (for use case input)
        funding_data = {
            'name': 'FAPESP Research Grant',
            'source_organization': 'FAPESP',
            'instrument_type': InstrumentType.GRANT,
            'status': FundingStatus.OPEN,
            'trl_min': 1,
            'trl_max': 4,
            'total_amount': Decimal('5000000.00'),
            'available_amount': Decimal('5000000.00'),
            'submission_start': now,
            'submission_end': now + timedelta(days=90),
        }
        
        # Create expected entity that will be returned by repository
        expected_funding = FundingSource(
            id=uuid4(),
            tenant_id=tenant_id,
            created_by=created_by,
            updated_by=created_by,
            name=funding_data['name'],
            source_organization=funding_data['source_organization'],
            instrument_type=funding_data['instrument_type'],
            status=funding_data['status'],
            trl_min=funding_data['trl_min'],
            trl_max=funding_data['trl_max'],
            total_amount=funding_data['total_amount'],
            available_amount=funding_data['available_amount'],
            submission_start=funding_data['submission_start'],
            submission_end=funding_data['submission_end'],
        )
        
        mock_funding_repository.create.return_value = expected_funding
        
        # Execute use case with tenant_id and user_id as required
        result = await use_case.create_funding_source(
            funding_data=funding_data,
            tenant_id=tenant_id,
            user_id=created_by
        )
        
        # Assertions
        assert result.id is not None
        assert result.name == 'FAPESP Research Grant'
        assert result.instrument_type == InstrumentType.GRANT
        mock_funding_repository.create.assert_called_once()
        mock_audit_service.log_creation.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_open_funding_sources(self, use_case, mock_funding_repository, tenant_id, created_by, updated_by):
        """Test filtering funding sources by OPEN status"""
        now = datetime.utcnow()
        
        # Mock open funding sources
        source1 = FundingSource(
            id=uuid4(),
            tenant_id=tenant_id,
            created_by=created_by,
            updated_by=updated_by,
            name='Open Grant 1',
            source_organization='FAPESP',
            instrument_type=InstrumentType.GRANT,
            status=FundingStatus.OPEN,
            trl_min=1,
            trl_max=6,
            total_amount=Decimal('5000000.00'),
            available_amount=Decimal('5000000.00'),
            submission_start=now,
            submission_end=now + timedelta(days=90),
        )
        
        source2 = FundingSource(
            id=uuid4(),
            tenant_id=tenant_id,
            created_by=created_by,
            updated_by=updated_by,
            name='Open Loan 1',
            source_organization='FINEP',
            instrument_type=InstrumentType.LOAN,
            status=FundingStatus.OPEN,
            trl_min=3,
            trl_max=9,
            total_amount=Decimal('3000000.00'),
            available_amount=Decimal('3000000.00'),
            submission_start=now,
            submission_end=now + timedelta(days=60),
        )
        
        mock_funding_repository.find_by_criteria.return_value = [source1, source2]
        
        # Execute use case
        result = await use_case.get_open_funding_sources(tenant_id)
        
        # Assertions
        assert len(result) == 2
        assert all(s.status == FundingStatus.OPEN for s in result)
        mock_funding_repository.find_by_criteria.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_funding_source_with_ai_extraction(self, use_case, mock_funding_repository, mock_ai_extractor, mock_audit_service, tenant_id, created_by):
        """Test creating a funding source with AI extraction from edital text"""
        now = datetime.utcnow()
        
        # Base funding data with all required fields
        # AI will enrich some fields but required fields must be provided
        funding_data = {
            'name': 'AI Extracted Grant',
            'instrument_type': InstrumentType.GRANT,
            'trl_min': 1,
            'trl_max': 9,
            'total_amount': Decimal('1000000.00'),
            'available_amount': Decimal('1000000.00'),
            'submission_start': now,
            'submission_end': now + timedelta(days=90),
            'source_organization': 'Unknown',  # Will be overwritten by AI
        }
        
        # Mock AI extraction results - these will enrich/override some fields
        mock_ai_extractor.extract_funding_fields.return_value = {
            'extracted_fields': {
                'source_organization': 'CNPq',  # AI provides better data
                'description': 'Grant for AI research',
            },
            'confidence': 0.85
        }
        
        # Mock repository response
        expected_funding = FundingSource(
            id=uuid4(),
            tenant_id=tenant_id,
            created_by=created_by,
            updated_by=created_by,
            name='AI Extracted Grant',
            source_organization='CNPq',  # Enriched by AI
            instrument_type=InstrumentType.GRANT,
            status=FundingStatus.OPEN,
            trl_min=1,
            trl_max=9,
            total_amount=Decimal('1000000.00'),
            available_amount=Decimal('1000000.00'),
            submission_start=now,
            submission_end=now + timedelta(days=90),
        )
        mock_funding_repository.create.return_value = expected_funding
        
        # Execute use case with edital text
        result = await use_case.create_funding_source(
            funding_data=funding_data,
            tenant_id=tenant_id,
            user_id=created_by,
            edital_text="This is the edital text for CNPq grant with budget of R$ 1,000,000"
        )
        
        # Assertions
        mock_ai_extractor.extract_funding_fields.assert_called_once()
        mock_funding_repository.create.assert_called_once()


class TestManagePortfolioUseCase:
    """
    Test Manage Portfolio Use Case
    Implements RF-03
    """
    
    @pytest.fixture
    def mock_portfolio_repository(self):
        """Create mock portfolio repository"""
        return AsyncMock()
    
    @pytest.fixture
    def mock_project_repository(self):
        """Create mock project repository"""
        return AsyncMock()
    
    @pytest.fixture
    def mock_audit_service(self):
        """Create mock audit service"""
        return AsyncMock()
    
    @pytest.fixture
    def use_case(self, mock_portfolio_repository, mock_project_repository, mock_audit_service):
        """Create use case with mock dependencies"""
        return ManagePortfolioUseCase(
            portfolio_repository=mock_portfolio_repository,
            project_repository=mock_project_repository,
            audit_service=mock_audit_service
        )
    
    @pytest.mark.asyncio
    async def test_create_project(self, use_case, mock_project_repository, mock_audit_service, tenant_id, created_by, updated_by):
        """Test creating a new project"""
        project_data = {
            'title': 'AI Innovation Project',
            'description': 'Develop AI solution for industry',
            'trl_current': 3,
            'trl_target': 7,
        }
        
        # Mock repository response
        expected_project = Project(
            id=uuid4(),
            tenant_id=tenant_id,
            created_by=created_by,
            updated_by=created_by,
            title=project_data['title'],
            description=project_data['description'],
            trl_current=project_data['trl_current'],
            trl_target=project_data['trl_target'],
            status=ProjectStatus.ACTIVE,
        )
        mock_project_repository.create.return_value = expected_project
        
        # Execute use case
        result = await use_case.create_project(
            project_data=project_data,
            tenant_id=tenant_id,
            user_id=created_by
        )
        
        # Assertions
        assert result.id is not None
        assert result.title == 'AI Innovation Project'
        mock_project_repository.create.assert_called_once()
        mock_audit_service.log_creation.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_project_without_trl_raises_error(self, use_case, tenant_id, created_by):
        """Test that creating a project without trl_current raises ValueError per RF-03"""
        project_data = {
            'title': 'Missing TRL Project',
            'description': 'No TRL provided',
        }
        
        with pytest.raises(ValueError, match="trl_current is mandatory"):
            await use_case.create_project(
                project_data=project_data,
                tenant_id=tenant_id,
                user_id=created_by
            )


class TestManageCRMUseCase:
    """
    Test Manage CRM Use Case
    Implements RF-04
    """
    
    @pytest.fixture
    def mock_client_repository(self):
        """Create mock client repository"""
        return AsyncMock()
    
    @pytest.fixture
    def mock_interaction_repository(self):
        """Create mock interaction repository"""
        return AsyncMock()
    
    @pytest.fixture
    def mock_cnpj_api_client(self):
        """Create mock CNPJ API client"""
        return AsyncMock()
    
    @pytest.fixture
    def mock_nlp_service(self):
        """Create mock NLP service"""
        return AsyncMock()
    
    @pytest.fixture
    def mock_audit_service(self):
        """Create mock audit service"""
        return AsyncMock()
    
    @pytest.fixture
    def use_case(self, mock_client_repository, mock_interaction_repository, mock_cnpj_api_client, mock_nlp_service, mock_audit_service):
        """Create use case with mock dependencies"""
        return ManageCRMUseCase(
            client_repository=mock_client_repository,
            interaction_repository=mock_interaction_repository,
            cnpj_api_client=mock_cnpj_api_client,
            nlp_service=mock_nlp_service,
            audit_service=mock_audit_service
        )
    
    @pytest.mark.asyncio
    async def test_create_client_from_cnpj(self, use_case, mock_client_repository, mock_cnpj_api_client, mock_audit_service, tenant_id, created_by, updated_by):
        """Test creating a new client from CNPJ auto-fill (RF-04 requirement)"""
        cnpj = '12345678000190'
        
        # Mock CNPJ API response matching the actual API structure
        cnpj_data = {
            'nome': 'Empresa LTDA',
            'email': 'contato@empresa.com',
            'confidence': 0.95,
        }
        mock_cnpj_api_client.fetch_cnpj.return_value = cnpj_data
        
        # Mock repository response
        expected_client = Client(
            id=uuid4(),
            tenant_id=tenant_id,
            created_by=created_by,
            updated_by=created_by,
            name='Empresa LTDA',
            client_type=ClientType.COMPANY,
            cnpj=cnpj,
            email='contato@empresa.com',
            sector='Technology',
        )
        mock_client_repository.create.return_value = expected_client
        
        # Execute use case with proper arguments including client_type in additional_data
        result = await use_case.create_client_from_cnpj(
            cnpj=cnpj,
            tenant_id=tenant_id,
            user_id=created_by,
            additional_data={'client_type': ClientType.COMPANY}
        )
        
        # Assertions
        assert result.name == 'Empresa LTDA'
        assert result.cnpj == cnpj
        mock_cnpj_api_client.fetch_cnpj.assert_called_once_with(cnpj)
        mock_client_repository.create.assert_called_once()
        mock_audit_service.log_creation.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_client_with_interactions(self, use_case, mock_client_repository, mock_interaction_repository, tenant_id, created_by, updated_by):
        """Test fetching client with all interactions"""
        client_id = uuid4()
        interaction_id = str(uuid4())
        
        # Mock existing client with interactions
        mock_client = Client(
            id=client_id,
            tenant_id=tenant_id,
            created_by=created_by,
            updated_by=updated_by,
            name='Empresa LTDA',
            client_type=ClientType.COMPANY,
            cnpj='12345678000190',
            email='contato@empresa.com',
            sector='Technology',
        )
        # Set interaction_ids directly
        mock_client.interaction_ids = [interaction_id]
        # detected_demands is List[Dict[str, Any]]
        mock_client.detected_demands = [
            {'demand': 'AI development', 'confidence': 0.8},
            {'demand': 'Data analytics', 'confidence': 0.75}
        ]
        
        mock_client_repository.get_by_id.return_value = mock_client
        
        # Mock interaction response
        mock_interaction = MagicMock()
        mock_interaction.id = interaction_id
        mock_interaction_repository.get_by_id.return_value = mock_interaction
        
        # Execute use case
        result = await use_case.get_client_with_interactions(
            client_id=client_id,
            tenant_id=tenant_id
        )
        
        # Assertions
        assert result['client'].name == 'Empresa LTDA'
        assert len(result['interactions']) == 1
        assert 'detected_demands' in result
        mock_client_repository.get_by_id.assert_called_once_with(client_id, tenant_id)
