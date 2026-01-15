# JWT Service
# Infrastructure Layer - Token generation and validation
# Implements RNF-02: Secure authentication with JWT

import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from uuid import UUID
import logging

import jwt
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class JWTConfig(BaseModel):
    """JWT Configuration."""
    secret_key: str = Field(default_factory=lambda: os.environ.get("JWT_SECRET_KEY", "dev-secret-key-change-in-production"))
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    issuer: str = "prospecai"


class TokenPayload(BaseModel):
    """JWT Token Payload."""
    sub: str  # User ID
    email: str
    tenant_id: Optional[str] = None
    roles: list[str] = Field(default_factory=list)
    email_verified: bool = False
    iat: datetime = Field(default_factory=datetime.utcnow)
    exp: datetime
    type: str = "access"  # access, refresh


class JWTService:
    """
    Service for JWT token operations.
    
    Handles:
    - Access token generation and validation
    - Refresh token generation
    - Token decoding and payload extraction
    """
    
    def __init__(self, config: Optional[JWTConfig] = None):
        self.config = config or JWTConfig()
    
    def create_access_token(
        self,
        user_id: UUID,
        email: str,
        tenant_id: Optional[UUID] = None,
        roles: list[str] = None,
        email_verified: bool = False,
        expires_delta: Optional[timedelta] = None
    ) -> Tuple[str, datetime]:
        """
        Create an access token.
        
        Args:
            user_id: User UUID
            email: User email
            tenant_id: Optional tenant UUID
            roles: List of role names
            email_verified: Whether email is verified
            expires_delta: Optional custom expiration
            
        Returns:
            Tuple of (token_string, expiration_datetime)
        """
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=self.config.access_token_expire_minutes
            )
        
        payload = {
            "sub": str(user_id),
            "email": email,
            "tenant_id": str(tenant_id) if tenant_id else None,
            "roles": roles or [],
            "email_verified": email_verified,
            "iat": datetime.utcnow(),
            "exp": expire,
            "type": "access",
            "iss": self.config.issuer
        }
        
        token = jwt.encode(
            payload,
            self.config.secret_key,
            algorithm=self.config.algorithm
        )
        
        logger.debug(f"Created access token for user: {user_id}")
        return token, expire
    
    def create_refresh_token(
        self,
        user_id: UUID,
        email: str,
        tenant_id: Optional[UUID] = None,
        expires_delta: Optional[timedelta] = None
    ) -> Tuple[str, datetime]:
        """
        Create a refresh token.
        
        Args:
            user_id: User UUID
            email: User email
            tenant_id: Optional tenant UUID
            expires_delta: Optional custom expiration
            
        Returns:
            Tuple of (token_string, expiration_datetime)
        """
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                days=self.config.refresh_token_expire_days
            )
        
        payload = {
            "sub": str(user_id),
            "email": email,
            "tenant_id": str(tenant_id) if tenant_id else None,
            "iat": datetime.utcnow(),
            "exp": expire,
            "type": "refresh",
            "iss": self.config.issuer
        }
        
        token = jwt.encode(
            payload,
            self.config.secret_key,
            algorithm=self.config.algorithm
        )
        
        logger.debug(f"Created refresh token for user: {user_id}")
        return token, expire
    
    def decode_token(self, token: str) -> Dict[str, Any]:
        """
        Decode and validate a token.
        
        Args:
            token: JWT token string
            
        Returns:
            Token payload as dictionary
            
        Raises:
            jwt.ExpiredSignatureError: Token expired
            jwt.InvalidTokenError: Invalid token
        """
        payload = jwt.decode(
            token,
            self.config.secret_key,
            algorithms=[self.config.algorithm],
            issuer=self.config.issuer
        )
        return payload
    
    def validate_access_token(self, token: str) -> Optional[TokenPayload]:
        """
        Validate an access token and return payload.
        
        Args:
            token: JWT token string
            
        Returns:
            TokenPayload or None if invalid
        """
        try:
            payload = self.decode_token(token)
            
            if payload.get("type") != "access":
                logger.warning("Token is not an access token")
                return None
            
            return TokenPayload(
                sub=payload["sub"],
                email=payload["email"],
                tenant_id=payload.get("tenant_id"),
                roles=payload.get("roles", []),
                email_verified=payload.get("email_verified", False),
                iat=datetime.fromisoformat(payload["iat"]) if isinstance(payload["iat"], str) else datetime.fromtimestamp(payload["iat"]),
                exp=datetime.fromisoformat(payload["exp"]) if isinstance(payload["exp"], str) else datetime.fromtimestamp(payload["exp"]),
                type=payload["type"]
            )
        except jwt.ExpiredSignatureError:
            logger.warning("Access token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid access token: {e}")
            return None
    
    def validate_refresh_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate a refresh token and return payload.
        
        Args:
            token: JWT token string
            
        Returns:
            Payload dict or None if invalid
        """
        try:
            payload = self.decode_token(token)
            
            if payload.get("type") != "refresh":
                logger.warning("Token is not a refresh token")
                return None
            
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Refresh token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid refresh token: {e}")
            return None
    
    def get_user_id_from_token(self, token: str) -> Optional[UUID]:
        """
        Extract user ID from token without full validation.
        
        Useful for getting user context even with expired tokens.
        
        Args:
            token: JWT token string
            
        Returns:
            User UUID or None
        """
        try:
            # Decode without verification to get payload
            payload = jwt.decode(
                token,
                self.config.secret_key,
                algorithms=[self.config.algorithm],
                options={"verify_exp": False}
            )
            return UUID(payload["sub"])
        except Exception:
            return None
    
    def refresh_access_token(
        self,
        refresh_token: str,
        roles: list[str] = None,
        email_verified: bool = False
    ) -> Optional[Tuple[str, datetime]]:
        """
        Create new access token from refresh token.
        
        Args:
            refresh_token: Valid refresh token
            roles: Updated roles (if any)
            email_verified: Updated email verification status
            
        Returns:
            New access token and expiration, or None if refresh token invalid
        """
        payload = self.validate_refresh_token(refresh_token)
        
        if not payload:
            return None
        
        return self.create_access_token(
            user_id=UUID(payload["sub"]),
            email=payload["email"],
            tenant_id=UUID(payload["tenant_id"]) if payload.get("tenant_id") else None,
            roles=roles or [],
            email_verified=email_verified
        )


# Singleton instance
_jwt_service: Optional[JWTService] = None


def get_jwt_service() -> JWTService:
    """Get singleton JWT service instance."""
    global _jwt_service
    if _jwt_service is None:
        _jwt_service = JWTService()
    return _jwt_service
