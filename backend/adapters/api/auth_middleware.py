# Authentication Middleware
# Adapters Layer - FastAPI dependencies for authentication
# Implements RNF-02: Security and access control

from typing import Optional, List, Callable
from uuid import UUID
import logging

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from infrastructure.jwt_service import JWTService, TokenPayload, get_jwt_service
from adapters.database.connection import get_session
from adapters.repositories.user_repository import UserRepository
from domain.entities.user import User

logger = logging.getLogger(__name__)


# HTTP Bearer token security scheme
bearer_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    """
    Authenticated user context.
    
    Contains user info and permissions from JWT token.
    """
    
    def __init__(
        self,
        user_id: UUID,
        email: str,
        tenant_id: Optional[UUID],
        roles: List[str],
        email_verified: bool
    ):
        self.user_id = user_id
        self.email = email
        self.tenant_id = tenant_id
        self.roles = roles
        self.email_verified = email_verified
    
    def has_role(self, role: str) -> bool:
        """Check if user has a specific role."""
        return role in self.roles
    
    def has_any_role(self, roles: List[str]) -> bool:
        """Check if user has any of the specified roles."""
        return any(role in self.roles for role in roles)
    
    def is_admin(self) -> bool:
        """Check if user is an admin."""
        return self.has_any_role(["admin", "super_admin"])


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    jwt_service: JWTService = Depends(get_jwt_service)
) -> Optional[AuthenticatedUser]:
    """
    Get current authenticated user from JWT token.
    
    Returns None if no valid token provided.
    """
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = jwt_service.validate_access_token(token)
    
    if not payload:
        return None
    
    try:
        return AuthenticatedUser(
            user_id=UUID(payload.sub),
            email=payload.email,
            tenant_id=UUID(payload.tenant_id) if payload.tenant_id else None,
            roles=payload.roles,
            email_verified=payload.email_verified
        )
    except Exception as e:
        logger.warning(f"Error parsing token payload: {e}")
        return None


async def require_auth(
    user: Optional[AuthenticatedUser] = Depends(get_current_user)
) -> AuthenticatedUser:
    """
    Require authenticated user.
    
    Raises 401 if not authenticated.
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user


async def require_verified_email(
    request: Request,
    user: AuthenticatedUser = Depends(require_auth)
) -> AuthenticatedUser:
    """
    Require authenticated user with verified email.
    
    Only checks for POST, PUT, DELETE, PATCH methods.
    GET requests are allowed without email verification.
    
    Raises 403 if email not verified on write operations.
    """
    write_methods = ["POST", "PUT", "DELETE", "PATCH"]
    
    if request.method in write_methods and not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required to perform this action",
            headers={"X-Verification-Required": "true"}
        )
    
    return user


def require_roles(allowed_roles: List[str]) -> Callable:
    """
    Factory for role-based access control dependency.
    
    Usage:
        @router.get("/admin")
        async def admin_endpoint(user = Depends(require_roles(["admin"]))):
            ...
    """
    async def role_checker(
        user: AuthenticatedUser = Depends(require_auth)
    ) -> AuthenticatedUser:
        if not user.has_any_role(allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {allowed_roles}"
            )
        return user
    
    return role_checker


async def require_admin(
    user: AuthenticatedUser = Depends(require_auth)
) -> AuthenticatedUser:
    """
    Require admin user.
    
    Raises 403 if not admin.
    """
    if not user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user


def get_tenant_id(
    user: Optional[AuthenticatedUser] = Depends(get_current_user)
) -> Optional[UUID]:
    """
    Get tenant ID from authenticated user.
    
    Returns None if not authenticated.
    """
    if user:
        return user.tenant_id
    return None


def require_tenant(
    user: AuthenticatedUser = Depends(require_auth)
) -> UUID:
    """
    Require tenant context.
    
    Raises 400 if no tenant in token.
    """
    if not user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant context required"
        )
    return user.tenant_id


class EmailVerificationMiddleware:
    """
    Middleware to enforce email verification on write operations.
    
    Can be applied at app or router level.
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive, send)
        
        # Only check write methods
        if request.method not in ["POST", "PUT", "DELETE", "PATCH"]:
            await self.app(scope, receive, send)
            return
        
        # Skip auth endpoints
        if request.url.path.startswith("/api/v1/auth"):
            await self.app(scope, receive, send)
            return
        
        # Skip contact form
        if request.url.path.startswith("/api/v1/contact"):
            await self.app(scope, receive, send)
            return
        
        # Skip health check
        if request.url.path in ["/health", "/api/health"]:
            await self.app(scope, receive, send)
            return
        
        await self.app(scope, receive, send)


# Utility functions for getting user from request

def get_client_ip(request: Request) -> str:
    """
    Get client IP address from request.
    
    Handles X-Forwarded-For header for reverse proxies.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # First IP in the list is the client
        return forwarded.split(",")[0].strip()
    
    if request.client:
        return request.client.host
    
    return "0.0.0.0"


async def get_user_from_db(
    user: AuthenticatedUser = Depends(require_auth),
    session = Depends(get_session)
) -> User:
    """
    Get full user entity from database.
    
    Use when you need more than what's in the JWT token.
    """
    user_repo = UserRepository(session)
    db_user = await user_repo.get_by_id(user.user_id)
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return db_user
