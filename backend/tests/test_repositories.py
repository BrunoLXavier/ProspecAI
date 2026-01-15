"""
Integration Tests for Repositories
Tests database interactions with real test database
"""
import pytest
from sqlalchemy import select
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from adapters.database.models import (
    FundingSourceModel,
    ClientModel,
)
from adapters.repositories.funding_repository import FundingRepository
from adapters.repositories.crm_repository import CRMRepository
from domain.entities.funding_source import FundingSource, FundingStatus, InstrumentType
from domain.entities.client import Client, ClientType


@pytest.mark.skip(reason="Requires PostgreSQL - JSONB columns not supported in SQLite")
class TestFundingRepository:
    """
    Test Funding Repository database operations
    """
    
    @pytest.mark.asyncio
    async def test_create_funding_source(self, db_session, tenant_id, created_by, updated_by):
        """Test creating funding source in database"""
        repo = FundingRepository(session=db_session)
        
        funding = FundingSource(
            id=uuid4(),
            tenant_id=tenant_id,
            created_by=created_by,
            updated_by=updated_by,
            name='Test Fund',
            description='Test funding source',
            instrument_type=InstrumentType.GRANT,
            status=FundingStatus.OPEN,
            submission_start=datetime.utcnow(),
            submission_end=datetime.utcnow() + timedelta(days=90),
            total_amount=Decimal('1000000.00'),
            available_amount=Decimal('1000000.00'),
            currency='BRL',
            source_organization='Test Agency',
            trl_min=3,
            trl_max=9,
        )
        
        result = await repo.create(funding)
        
        assert result.id is not None
        assert result.name == 'Test Fund'
        
        # Verify in database
        stmt = select(FundingSourceModel).where(FundingSourceModel.id == result.id)
        db_result = await db_session.execute(stmt)
        db_funding = db_result.scalar_one_or_none()
        
        if db_funding:
            assert db_funding.name == 'Test Fund'
            assert db_funding.tenant_id == tenant_id
    
    @pytest.mark.asyncio
    async def test_get_by_id(self, db_session, tenant_id, created_by, updated_by):
        """Test getting funding source by ID"""
        repo = FundingRepository(session=db_session)
        
        # Create test funding
        funding = FundingSource(
            id=uuid4(),
            tenant_id=tenant_id,
            created_by=created_by,
            updated_by=updated_by,
            name='Test Fund',
            description='Test funding source',
            instrument_type=InstrumentType.LOAN,
            status=FundingStatus.OPEN,
            submission_start=datetime.utcnow(),
            submission_end=datetime.utcnow() + timedelta(days=90),
            total_amount=Decimal('500000.00'),
            available_amount=Decimal('500000.00'),
            currency='BRL',
            source_organization='Test Agency',
            trl_min=1,
            trl_max=5,
        )
        created = await repo.create(funding)
        
        # Retrieve by ID
        retrieved = await repo.get_by_id(str(tenant_id), created.id)
        
        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.name == 'Test Fund'
    
    @pytest.mark.asyncio
    async def test_update_funding_source(self, db_session, tenant_id, created_by, updated_by):
        """Test updating funding source"""
        repo = FundingRepository(session=db_session)
        
        # Create funding
        funding = FundingSource(
            id=uuid4(),
            tenant_id=tenant_id,
            created_by=created_by,
            updated_by=updated_by,
            name='Original Name',
            description='Test funding source',
            instrument_type=InstrumentType.GRANT,
            status=FundingStatus.OPEN,
            submission_start=datetime.utcnow(),
            submission_end=datetime.utcnow() + timedelta(days=90),
            total_amount=Decimal('1000000.00'),
            available_amount=Decimal('1000000.00'),
            currency='BRL',
            source_organization='Test Agency',
            trl_min=3,
            trl_max=9,
        )
        created = await repo.create(funding)
        
        # Update
        created.name = 'Updated Name'
        created.status = FundingStatus.CLOSED
        updated = await repo.update(created)
        
        assert updated.name == 'Updated Name'
        assert updated.status == FundingStatus.CLOSED
    
    @pytest.mark.asyncio
    async def test_delete_funding_source(self, db_session, tenant_id, created_by, updated_by):
        """Test soft delete of funding source"""
        repo = FundingRepository(session=db_session)
        
        # Create funding
        funding = FundingSource(
            id=uuid4(),
            tenant_id=tenant_id,
            created_by=created_by,
            updated_by=updated_by,
            name='To Delete',
            description='Test funding source',
            instrument_type=InstrumentType.TAX_INCENTIVE,
            status=FundingStatus.OPEN,
            submission_start=datetime.utcnow(),
            submission_end=datetime.utcnow() + timedelta(days=90),
            total_amount=Decimal('2000000.00'),
            available_amount=Decimal('2000000.00'),
            currency='BRL',
            source_organization='Test Agency',
            trl_min=1,
            trl_max=9,
        )
        created = await repo.create(funding)
        
        # Delete
        await repo.delete(str(tenant_id), created.id)
        
        # Verify soft delete
        deleted = await repo.get_by_id(str(tenant_id), created.id)
        # Should return None or have deleted_at set
        assert deleted is None or deleted.deleted_at is not None


@pytest.mark.skip(reason="Requires PostgreSQL - JSONB columns not supported in SQLite")
class TestCRMRepository:
    """
    Test CRM Repository database operations
    """
    
    @pytest.mark.asyncio
    async def test_create_client(self, db_session, tenant_id, created_by, updated_by):
        """Test creating client in database"""
        repo = CRMRepository(session=db_session)
        
        client = Client(
            id=uuid4(),
            tenant_id=tenant_id,
            created_by=created_by,
            updated_by=updated_by,
            name='Test Company',
            client_type=ClientType.COMPANY,
            cnpj='12345678000190',
            email='test@company.com',
            sector='Technology',
        )
        
        result = await repo.create(client)
        
        assert result.id is not None
        assert result.name == 'Test Company'
        
        # Verify in database
        stmt = select(ClientModel).where(ClientModel.id == result.id)
        db_result = await db_session.execute(stmt)
        db_client = db_result.scalar_one_or_none()
        
        if db_client:
            assert db_client.name == 'Test Company'
            assert db_client.cnpj == '12345678000190'
    
    @pytest.mark.asyncio
    async def test_get_client_by_id(self, db_session, tenant_id, created_by, updated_by):
        """Test getting client by ID"""
        repo = CRMRepository(session=db_session)
        
        # Create client first
        client = Client(
            id=uuid4(),
            tenant_id=tenant_id,
            created_by=created_by,
            updated_by=updated_by,
            name='Test Company',
            client_type=ClientType.STARTUP,
            email='test@startup.com',
            sector='Tech',
        )
        created_client = await repo.create(client)
        
        # Retrieve by ID
        retrieved = await repo.get_by_id(str(tenant_id), created_client.id)
        
        assert retrieved is not None
        assert retrieved.id == created_client.id
        assert retrieved.name == 'Test Company'
    
    @pytest.mark.asyncio
    async def test_update_client(self, db_session, tenant_id, created_by, updated_by):
        """Test updating client"""
        repo = CRMRepository(session=db_session)
        
        # Create client
        client = Client(
            id=uuid4(),
            tenant_id=tenant_id,
            created_by=created_by,
            updated_by=updated_by,
            name='Original Name',
            client_type=ClientType.UNIVERSITY,
            email='test@university.edu',
            sector='Education',
        )
        created = await repo.create(client)
        
        # Update
        created.name = 'Updated Name'
        created.sector = 'Research'
        updated = await repo.update(created)
        
        assert updated.name == 'Updated Name'
        assert updated.sector == 'Research'
    
    @pytest.mark.asyncio
    async def test_list_clients_by_tenant(self, db_session, tenant_id, created_by, updated_by):
        """Test listing clients by tenant"""
        repo = CRMRepository(session=db_session)
        
        # Create multiple clients
        client1 = Client(
            id=uuid4(),
            tenant_id=tenant_id,
            created_by=created_by,
            updated_by=updated_by,
            name='Company A',
            client_type=ClientType.COMPANY,
            email='a@company.com',
        )
        
        client2 = Client(
            id=uuid4(),
            tenant_id=tenant_id,
            created_by=created_by,
            updated_by=updated_by,
            name='Company B',
            client_type=ClientType.RESEARCH_CENTER,
            email='b@research.org',
        )
        
        await repo.create(client1)
        await repo.create(client2)
        
        # List clients
        clients = await repo.list_by_tenant(str(tenant_id))
        
        assert len(clients) >= 2
        assert all(c.tenant_id == tenant_id for c in clients)
