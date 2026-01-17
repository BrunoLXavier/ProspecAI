"""
Authentication Infrastructure
JWT validation with Keycloak integration
Implements RNF-02: Security with OIDC/JWT
"""
import os
from typing import Optional
from datetime import datetime

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError, ExpiredSignatureError
import httpx

# =============================================================================
# Configuration
# =============================================================================

KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "http://keycloak:8080")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "prospecai")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "prospecai-api")
KEYCLOAK_CLIENT_SECRET = os.getenv("KEYCLOAK_CLIENT_SECRET", "")

# JWKS URL for public key retrieval
JWKS_URL = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs"
ISSUER = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}"

# Cache for JWKS keys
_jwks_cache: Optional[dict] = None
_jwks_cache_time: Optional[datetime] = None
JWKS_CACHE_TTL = 3600  # 1 hour

# =============================================================================
# Models
# =============================================================================

class TokenPayload(BaseModel):
    """Decoded JWT payload structure"""
    sub: str  # Subject (user ID)
    email: Optional[str] = None
    preferred_username: Optional[str] = None
    name: Optional[str] = None
    tenant_id: Optional[str] = None
    realm_access: Optional[dict] = None
    resource_access: Optional[dict] = None
    exp: int
    iat: int


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
    tokenUrl=f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/token",
    auto_error=False
)

http_bearer = HTTPBearer(auto_error=False)


# =============================================================================
# JWKS Key Management
# =============================================================================

async def get_jwks() -> dict:
    """Fetch and cache JWKS from Keycloak"""
    global _jwks_cache, _jwks_cache_time
    
    now = datetime.now()
    
    # Return cached if valid
    if _jwks_cache and _jwks_cache_time:
        cache_age = (now - _jwks_cache_time).total_seconds()
        if cache_age < JWKS_CACHE_TTL:
            return _jwks_cache
    
    # Fetch fresh JWKS
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(JWKS_URL, timeout=10.0)
            response.raise_for_status()
            _jwks_cache = response.json()
            _jwks_cache_time = now
            return _jwks_cache
    except Exception as e:
        # If we have cached keys, use them even if expired
        if _jwks_cache:
            return _jwks_cache
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Cannot reach authentication server: {str(e)}"
        )


def get_public_key(jwks: dict, kid: str) -> str:
    """Extract public key from JWKS by key ID"""
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            # Convert JWK to PEM format (simplified)
            return key
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token signing key not found"
    )


# =============================================================================
# Token Validation
# =============================================================================

async def decode_token(token: str) -> TokenPayload:
    """Decode and validate JWT token"""
    try:
        # Get unverified header to find key ID
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing key ID"
            )
        
        # Get JWKS and find the key
        jwks = await get_jwks()
        key = get_public_key(jwks, kid)
        
        # Decode and validate token
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=KEYCLOAK_CLIENT_ID,
            issuer=ISSUER,
            options={
                "verify_aud": True,
                "verify_iss": True,
                "verify_exp": True,
            }
        )
        
        return TokenPayload(**payload)
        
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def extract_roles(payload: TokenPayload) -> list[str]:
    """Extract roles from token payload"""
    roles = []
    
    # Realm-level roles
    if payload.realm_access:
        roles.extend(payload.realm_access.get("roles", []))
    
    # Client-level roles
    if payload.resource_access and KEYCLOAK_CLIENT_ID in payload.resource_access:
        client_roles = payload.resource_access[KEYCLOAK_CLIENT_ID]
        roles.extend(client_roles.get("roles", []))
    
    return list(set(roles))


def extract_tenant_id(payload: TokenPayload) -> str:
    """Extract tenant ID from token claims or use default"""
    # Check custom claim first
    if payload.tenant_id:
        return payload.tenant_id
    
    # Check if it's in token attributes
    # In production, this should be a custom Keycloak mapper
    # For now, derive from username domain or use default
    if payload.email and "@" in payload.email:
        domain = payload.email.split("@")[1]
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
    - If DEV_BYPASS_AUTH=false: Requires valid JWT token from Keycloak
    """
    import os
    
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
        return CurrentUser(
            id="00000000-0000-0000-0000-000000000001",
            email="dev@prospecai.com",
            username="developer",
            name="Development User",
            tenant_id="00000000-0000-0000-0000-000000000000",
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
        id=payload.sub,
        email=payload.email,
        username=payload.preferred_username,
        name=payload.name,
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
    
    return CurrentUser(
        id="00000000-0000-0000-0000-000000000001",
        email="dev@prospecai.com",
        username="developer",
        name="Development User",
        tenant_id="00000000-0000-0000-0000-000000000000",
        roles=["admin", "user"],
        permissions=["*"],
    )


def get_auth_dependency():
    """
    Returns the appropriate auth dependency based on environment.
    - DEV_BYPASS_AUTH=true: Use mock auth (development only)
    - DEV_BYPASS_AUTH=false: Use real Keycloak auth
    - Otherwise: Depends on ENVIRONMENT setting
    """
    import os
    dev_bypass = os.getenv("DEV_BYPASS_AUTH", "false").lower() == "true"
    env = os.getenv("ENVIRONMENT", "development")
    
    if env == "production" and dev_bypass:
        raise ValueError("DEV_BYPASS_AUTH cannot be enabled in production")
    
    if dev_bypass:
        return get_dev_user
    
    return get_current_user
