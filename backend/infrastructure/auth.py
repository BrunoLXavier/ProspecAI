"""
Authentication infrastructure (internal JWT)
Uses the local `JWTService` for token generation and validation.
Implements RNF-02: Security with JWT
"""
import os
from typing import Optional
from datetime import datetime

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from .jwt_service import get_jwt_service

# =============================================================================
# Configuration
# =============================================================================

OAUTH_TOKEN_URL = os.getenv("OAUTH_TOKEN_URL", "/api/v1/auth/token")

# =============================================================================
# Models
# =============================================================================

class CurrentUser(BaseModel):
    """Current authenticated user context"""
    id: str
    email: Optional[str] = None
    username: Optional[str] = None
    name: Optional[str] = None
    tenant_id: str
    roles: list[str] = []
    permissions: list[str] = []


# =============================================================================
# Security Schemes
# =============================================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=OAUTH_TOKEN_URL,
    auto_error=False
)

http_bearer = HTTPBearer(auto_error=False)


# =============================================================================
# Token Validation (internal JWT)
# =============================================================================

async def decode_token(token: str):
    """Decode and validate JWT token using local JWTService."""
    jwt_service = get_jwt_service()
    validated = jwt_service.validate_access_token(token)
    if not validated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return validated


def extract_roles(payload) -> list[str]:
    """Extract roles from token payload (supports pydantic or dict)."""
    if hasattr(payload, "roles"):
        return list(getattr(payload, "roles") or [])
    if isinstance(payload, dict):
        return list(payload.get("roles", []) or [])
    return []


def extract_tenant_id(payload) -> str:
    """Extract tenant ID from token claims or use default."""
    if hasattr(payload, "tenant_id") and getattr(payload, "tenant_id"):
        return getattr(payload, "tenant_id")
    if isinstance(payload, dict) and payload.get("tenant_id"):
        return payload.get("tenant_id")
    if hasattr(payload, "email") and getattr(payload, "email"):
        email = getattr(payload, "email")
        if "@" in email:
            domain = email.split("@")[1]
            return f"tenant-{domain.split('.')[0]}"
    return "default-tenant"


# =============================================================================
# Dependency Functions
# =============================================================================

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
) -> CurrentUser:
    """
    FastAPI dependency to get current authenticated user.
    Use in protected routes: current_user: CurrentUser = Depends(get_current_user)

    Behavior:
    - If DEV_BYPASS_AUTH=true: Returns mock dev user without JWT validation
    - Otherwise: Requires valid internal JWT token
    """
    # Check if dev bypass is enabled
    dev_bypass = os.getenv("DEV_BYPASS_AUTH", "false").lower() == "true"
    env = os.getenv("ENVIRONMENT", "development")

    if env == "production" and dev_bypass:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Dev auth bypass cannot be used in production"
        )

    # Use mock auth in development if bypass is enabled
    if dev_bypass:
        seed_admin_id = os.getenv("SEED_ADMIN_ID", "00000000-0000-0000-0000-000000000001")
        seed_tenant_id = os.getenv("SEED_TENANT_ID", "00000000-0000-0000-0000-000000000000")
        return CurrentUser(
            id=seed_admin_id,
            email=os.getenv("SEED_ADMIN_EMAIL", "dev@prospecai.com"),
            username=os.getenv("SEED_ADMIN_USERNAME", "developer"),
            name="Development User",
            tenant_id=seed_tenant_id,
            roles=["admin", "user"],
            permissions=["*"],
        )

    # Otherwise, require real authentication
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = await decode_token(token)

    roles = extract_roles(payload)
    tenant_id = extract_tenant_id(payload)

    return CurrentUser(
        id=getattr(payload, "sub", None) or str(getattr(payload, "sub", "")),
        email=getattr(payload, "email", None),
        username=getattr(payload, "username", None) or getattr(payload, "preferred_username", None),
        name=getattr(payload, "name", None),
        tenant_id=tenant_id,
        roles=roles,
        permissions=[],  # Can be extended with fine-grained permissions
    )


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
) -> Optional[CurrentUser]:
    """
    Optional authentication - returns None if not authenticated.
    Use for endpoints that work both with and without auth.
    """
    if not credentials:
        return None

    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None


# =============================================================================
# Role-Based Access Control
# =============================================================================

def require_roles(*required_roles: str):
    """
    Dependency factory for role-based access control.
    Usage: Depends(require_roles("admin", "manager"))
    """
    async def check_roles(
        current_user: CurrentUser = Depends(get_current_user)
    ) -> CurrentUser:
        user_roles = set(current_user.roles)
        required = set(required_roles)

        if not user_roles.intersection(required):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(required_roles)}"
            )

        return current_user

    return check_roles


def require_tenant_access(tenant_id: str):
    """
    Check if user has access to specific tenant.
    For multi-tenant data isolation.
    """
    async def check_tenant(
        current_user: CurrentUser = Depends(get_current_user)
    ) -> CurrentUser:
        # Admins can access any tenant
        if "admin" in current_user.roles:
            return current_user

        if current_user.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this tenant's resources"
            )

        return current_user

    return check_tenant


# =============================================================================
# Development Mode Helper
# =============================================================================

async def get_dev_user(request: Request) -> CurrentUser:
    """
    Development-only: Returns a mock user when DEV_BYPASS_AUTH is enabled.
    NEVER use in production!
    """
    import os
    if os.getenv("ENVIRONMENT", "development") == "production":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Dev auth not available in production"
        )
    seed_admin_id = os.getenv("SEED_ADMIN_ID", "00000000-0000-0000-0000-000000000001")
    seed_tenant_id = os.getenv("SEED_TENANT_ID", "00000000-0000-0000-0000-000000000000")

    return CurrentUser(
        id=seed_admin_id,
        email=os.getenv("SEED_ADMIN_EMAIL", "dev@prospecai.com"),
        username=os.getenv("SEED_ADMIN_USERNAME", "developer"),
        name="Development User",
        tenant_id=seed_tenant_id,
        roles=["admin", "user"],
        permissions=["*"],
    )


def get_auth_dependency():
    """
    Returns the appropriate auth dependency based on environment.
    - DEV_BYPASS_AUTH=true: Use mock auth (development only)
    - Otherwise: Uses internal JWT auth
    """
    import os
    dev_bypass = os.getenv("DEV_BYPASS_AUTH", "false").lower() == "true"
    env = os.getenv("ENVIRONMENT", "development")

    if env == "production" and dev_bypass:
        raise ValueError("DEV_BYPASS_AUTH cannot be enabled in production")

    if dev_bypass:
        return get_dev_user

    return get_current_user
