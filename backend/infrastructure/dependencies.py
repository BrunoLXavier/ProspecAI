"""
FastAPI Dependencies
Provides dependency injection for routes
"""
from typing import AsyncGenerator, List
from uuid import UUID
from fastapi import Depends, Header, HTTPException, status
from typing import Optional
from infrastructure.jwt_service import get_jwt_service
from sqlalchemy.ext.asyncio import AsyncSession
import sqlalchemy as sa

from adapters.database.connection import get_session
from infrastructure.di_container import DependencyContainer, get_container
from use_cases.manage_funding_use_case import ManageFundingUseCase
from use_cases.manage_portfolio_use_case import ManagePortfolioUseCase
from use_cases.manage_crm_use_case import ManageCRMUseCase
from use_cases.manage_pipeline_use_case import ManagePipelineUseCase
from use_cases.execute_matching_use_case import ExecuteMatchingUseCase
from use_cases.manage_proposals_use_case import ManageProposalsUseCase
from services.institute_service import InstituteService

# Re-export get_container for routes that need it
__all__ = ['get_container', 'get_current_user_id', 'get_current_tenant_id', 'get_di_container', 'get_current_institute_ids', 'ensure_user_member_or_admin', '_check_user_member_or_admin', 'get_db_session']


async def get_current_user_id(
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> UUID:
    """
    Get current user ID from request headers.
    Raises 401 if header is missing or invalid. In production, replace
    this with a production-grade token validation (internal JWT or external IdP).
    """
    if not x_user_id:
        # Fallback: try to extract user id from Bearer token in Authorization header
        if authorization and authorization.lower().startswith("bearer "):
            token = authorization.split(None, 1)[1]
            jwt_service = get_jwt_service()
            user_id = jwt_service.get_user_id_from_token(token)
            if user_id:
                return user_id
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-User-ID header")
    try:
        return UUID(x_user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid X-User-ID header")


async def get_current_tenant_id(
    x_tenant_id: str | None = Header(default=None, alias="X-Tenant-ID")
) -> str:
    """
    Get current tenant ID from request headers.
    Raises 401 if header missing or invalid. Returns the raw string tenant ID.
    """
    if not x_tenant_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-Tenant-ID header")
    try:
        # Validate is a UUID string
        UUID(x_tenant_id)
        return x_tenant_id
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid X-Tenant-ID header")


async def get_current_institute_ids(
    x_institute_ids: Optional[str] = Header(default=None, alias="X-Institute-IDs")
) -> List[UUID]:
    """
    Parse the X-Institute-IDs header (comma-separated UUIDs) and return a list of UUIDs.
    This dependency only parses and validates format; membership validation must be
    performed server-side by services or routers (do not trust client-provided IDs).
    If header is not provided, returns an empty list.
    """
    if not x_institute_ids:
        return []
    ids: List[UUID] = []
    parts = [p.strip() for p in x_institute_ids.split(",") if p.strip()]
    for p in parts:
        try:
            ids.append(UUID(p))
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid institute id: {p}")
    return ids


# Session dependency for direct repository usage
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Provides raw database session for repository pattern.
    Use this when you need direct session access without the full DI container.
    """
    async for session in get_session():
        yield session


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


async def _check_user_member_or_admin(
    user_id: UUID,
    institute_ids: List[UUID],
    container: DependencyContainer,
) -> bool:
    """
    Internal function to check if user is admin or member of institutes.
    Raises HTTPException(403) when not allowed.
    """
    # If no institute_ids provided, allow (some routes may not require institute context)
    if not institute_ids:
        return True

    # Quick admin check
    try:
        r = await container.session.execute(sa.text("SELECT 1 FROM user_roles WHERE user_id = :user_id AND role_id = 'admin' LIMIT 1"), {'user_id': str(user_id)})
        if r.scalar() is not None:
            return True
    except Exception:
        # swallow DB errors here and continue to membership checks
        pass

    inst_service = InstituteService(container.session)
    for iid in institute_ids:
        try:
            if await inst_service.user_belongs_to_institute(user_id, iid):
                return True
        except Exception:
            # ignore per-institute errors and continue checking others
            continue

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not a member of the selected institute(s)")


async def ensure_user_member_or_admin(
    user_id: UUID = Depends(get_current_user_id),
    institute_ids: List[UUID] = Depends(get_current_institute_ids),
    container: DependencyContainer = Depends(get_di_container),
) -> bool:
    """
    Dependency version - use with Depends() in route declarations.
    Automatically resolves user_id and institute_ids from headers.
    """
    return await _check_user_member_or_admin(user_id, institute_ids, container)
