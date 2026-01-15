# Refresh Token Entity
# Domain Layer - Token management for authentication
# Implements RNF-02: Secure token-based authentication

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, Field
from enum import Enum
import hashlib
import secrets


class TokenType(str, Enum):
    """Types of tokens stored in the system."""
    ACCESS = "access"
    REFRESH = "refresh"
    PASSWORD_RESET = "password_reset"
    EMAIL_VERIFICATION = "email_verification"


class RefreshToken(BaseModel):
    """
    Token entity for managing refresh tokens, password reset tokens,
    and email verification tokens.
    
    Implements RNF-02: Secure token management with expiration
    """
    
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    token_hash: str  # SHA-256 hash of the token
    token_type: TokenType
    used: bool = False  # For one-time tokens (email verification, password reset)
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by_ip: Optional[str] = None
    
    class Config:
        from_attributes = True
    
    @staticmethod
    def generate_token() -> str:
        """
        Generate a cryptographically secure random token.
        
        Returns:
            A 64-character URL-safe token string
        """
        return secrets.token_urlsafe(48)
    
    @staticmethod
    def hash_token(token: str) -> str:
        """
        Hash a token using SHA-256.
        
        Args:
            token: Plain token string to hash
            
        Returns:
            Hex-encoded SHA-256 hash
        """
        return hashlib.sha256(token.encode()).hexdigest()
    
    def is_expired(self) -> bool:
        """Check if token has expired."""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self) -> bool:
        """
        Check if token is valid (not expired and not used).
        
        For one-time tokens (password_reset, email_verification),
        also checks the 'used' flag.
        """
        if self.is_expired():
            return False
        
        # One-time tokens must not have been used
        if self.token_type in [TokenType.PASSWORD_RESET, TokenType.EMAIL_VERIFICATION]:
            return not self.used
        
        return True
    
    def mark_as_used(self) -> None:
        """Mark token as used (for one-time tokens)."""
        self.used = True


class TokenAlreadyUsedException(Exception):
    """Exception raised when a one-time token has already been used."""
    pass


class TokenExpiredException(Exception):
    """Exception raised when a token has expired."""
    pass


class TokenInvalidException(Exception):
    """Exception raised when a token is invalid."""
    pass
