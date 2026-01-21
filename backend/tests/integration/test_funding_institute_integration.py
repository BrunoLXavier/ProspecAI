import pytest
from uuid import uuid4
from datetime import datetime, timedelta
from sqlalchemy import text

from adapters.repositories.funding_repository import FundingRepository


@pytest.mark.asyncio
async def test_funding_filtered_by_institute(db_session, tenant_id, created_by, updated_by):
    # Arrange: create a project linked to an institute, a funding source, and an opportunity linking them
    institute_id = uuid4()
    project_id = uuid4()
    funding_id = uuid4()
    opportunity_id = uuid4()

    # Insert project (legacy table schema)
    await db_session.execute(text(
        """
        INSERT INTO projects (id, tenant_id, title, description, status, institute_id, trl_current, trl_target, created_by, updated_by, created_at, updated_at)
        VALUES (:id, :tenant_id, :title, :description, :status, :institute_id, :trl_current, :trl_target, :created_by, :updated_by, :now, :now)
        """
    ), {
        'id': str(project_id),
        'tenant_id': str(tenant_id),
        'title': 'Test Project',
        'description': 'Project for institute filtering',
        'status': 'active',
        'institute_id': str(institute_id),
        'trl_current': 3,
        'trl_target': 5,
        'created_by': str(created_by),
        'updated_by': str(updated_by),
        'now': datetime.utcnow()
    })

    # Insert funding source (legacy table schema)
    await db_session.execute(text(
        """
        INSERT INTO funding_sources (id, tenant_id, name, description, instrument_type, trl_min, trl_max, total_amount, submission_start, submission_end, status, source_organization, created_by, updated_by, created_at, updated_at)
        VALUES (:id, :tenant_id, :name, :description, :instrument_type, :trl_min, :trl_max, :total_amount, :submission_start, :submission_end, :status, :source_org, :created_by, :updated_by, :now, :now)
        """
    ), {
        'id': str(funding_id),
        'tenant_id': str(tenant_id),
        'name': 'Institute-linked Funding',
        'description': 'Funding linked to a project',
        'instrument_type': 'grant',
        'trl_min': 3,
        'trl_max': 7,
        'total_amount': 1000000,
        'submission_start': datetime.utcnow(),
        'submission_end': datetime.utcnow() + timedelta(days=30),
        'status': 'open',
        'source_org': 'Agency X',
        'created_by': str(created_by),
        'updated_by': str(updated_by),
        'now': datetime.utcnow()
    })

    # Insert opportunity linking funding and project
    await db_session.execute(text(
        """
        INSERT INTO opportunities (id, tenant_id, title, description, stage, funding_source_id, project_id, created_by, updated_by, created_at, updated_at)
        VALUES (:id, :tenant_id, :title, :description, :stage, :funding_id, :project_id, :created_by, :updated_by, :now, :now)
        """
    ), {
        'id': str(opportunity_id),
        'tenant_id': str(tenant_id),
        'title': 'Linked Opportunity',
        'description': 'Links funding to project',
        'stage': 'intelligence',
        'funding_id': str(funding_id),
        'project_id': str(project_id),
        'created_by': str(created_by),
        'updated_by': str(updated_by),
        'now': datetime.utcnow()
    })

    await db_session.commit()

    # Act: query funding repository with institute scoping
    repo = FundingRepository(db_session)
    results = await repo.find_by_criteria({'tenant_id': str(tenant_id), 'institute_ids': [str(institute_id)]}, skip=0, limit=10)

    # Assert
    assert isinstance(results, list)
    assert any(getattr(r, 'id', None) == funding_id or str(getattr(r, 'id', None)) == str(funding_id) for r in results)
