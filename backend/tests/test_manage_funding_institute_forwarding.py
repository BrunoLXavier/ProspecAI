import pytest
import asyncio
from uuid import uuid4
from unittest.mock import AsyncMock

from use_cases.manage_funding import ManageFundingUseCase


@pytest.mark.asyncio
async def test_list_funding_forwards_institute_ids():
    # Arrange
    mock_repo = AsyncMock()
    # Mock return values
    sample_funding = object()
    mock_repo.find_by_criteria = AsyncMock(return_value=[sample_funding])
    mock_repo.count_by_criteria = AsyncMock(return_value=1)

    mock_ai = AsyncMock()
    mock_audit = AsyncMock()

    use_case = ManageFundingUseCase(
        funding_repository=mock_repo,
        ai_extractor=mock_ai,
        audit_service=mock_audit,
    )

    filters = {"status": "open"}
    institute_ids = [uuid4(), uuid4()]

    # Act
    results, total = await use_case.list_funding_sources_filtered(
        filters=filters,
        skip=0,
        limit=10,
        tenant_id=None,
        institute_ids=institute_ids,
    )

    # Assert
    mock_repo.find_by_criteria.assert_awaited()
    called_args, called_kwargs = mock_repo.find_by_criteria.call_args
    passed_criteria = called_args[0]
    assert "institute_ids" in passed_criteria
    assert passed_criteria["institute_ids"] == institute_ids
    assert results == [sample_funding]
    assert total == 1
