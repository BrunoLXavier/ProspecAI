"""
FastAPI Dependencies
Provides dependency injection for routes
"""
from typing import AsyncGenerator
from uuid import UUID
from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.database.connection import get_session
from infrastructure.di_container import DependencyContainer, get_container
from use_cases.manage_funding import ManageFundingUseCase
from use_cases.manage_portfolio import ManagePortfolioUseCase
from use_cases.manage_crm import ManageCRMUseCase
from use_cases.manage_pipeline import ManagePipelineUseCase
from use_cases.execute_matching import ExecuteMatchingUseCase
from use_cases.manage_proposals import ManageProposalsUseCase

# Re-export get_container for routes that need it
__all__ = ['get_container', 'get_current_user_id', 'get_current_tenant_id', 'get_di_container']


async def get_current_user_id(
    x_user_id: str = Header(default="00000000-0000-0000-0000-000000000001", alias="X-User-ID")
) -> UUID:
    """
    Get current user ID from request headers
    In production, this would validate against Keycloak token
    """
    try:
        return UUID(x_user_id)
    except ValueError:
        return UUID("00000000-0000-0000-0000-000000000001")


async def get_current_tenant_id(
    x_tenant_id: str = Header(default="00000000-0000-0000-0000-000000000001", alias="X-Tenant-ID")
) -> str:
    """
    Get current tenant ID from request headers (string).
    Many route handlers expect a string tenant_id and convert to UUID themselves.
    """
    try:
        # Return string representation for compatibility with existing handlers
        UUID(x_tenant_id)
        return x_tenant_id
    except Exception:
        return "00000000-0000-0000-0000-000000000001"


async def get_di_container(
    session: AsyncSession = Depends(get_session)
) -> AsyncGenerator[DependencyContainer, None]:
    """
    Provides dependency injection container
    """
    container = DependencyContainer(session)
    yield container


# Use case dependencies
async def get_funding_use_case(
    container: DependencyContainer = Depends(get_di_container)
) -> ManageFundingUseCase:
    """Get ManageFundingUseCase with dependencies"""
    return container.get_manage_funding_use_case()


async def get_portfolio_use_case(
    container: DependencyContainer = Depends(get_di_container)
) -> ManagePortfolioUseCase:
    """Get ManagePortfolioUseCase with dependencies"""
    return container.get_manage_portfolio_use_case()


async def get_crm_use_case(
    container: DependencyContainer = Depends(get_di_container)
) -> ManageCRMUseCase:
    """Get ManageCRMUseCase with dependencies"""
    return container.get_manage_crm_use_case()


async def get_pipeline_use_case(
    container: DependencyContainer = Depends(get_di_container)
) -> ManagePipelineUseCase:
    """Get ManagePipelineUseCase with dependencies"""
    return container.get_manage_pipeline_use_case()


async def get_matching_use_case(
    container: DependencyContainer = Depends(get_di_container)
) -> ExecuteMatchingUseCase:
    """Get ExecuteMatchingUseCase with dependencies"""
    return container.get_execute_matching_use_case()


async def get_proposals_use_case(
    container: DependencyContainer = Depends(get_di_container)
) -> ManageProposalsUseCase:
    """Get ManageProposalsUseCase with dependencies"""
    return container.get_manage_proposals_use_case()
