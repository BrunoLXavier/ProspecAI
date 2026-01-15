# User Entity
# Domain Layer - User management and authentication
# Implements RNF-02: RBAC with Row-Level Security

from datetime import datetime
from typing import Optional, List
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, EmailStr
from passlib.context import CryptContext


# Password hashing configuration using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class User(BaseModel):
    """
    User entity for authentication and authorization.
    
    Implements RNF-02: RBAC with tenant isolation
    """
    
    id: UUID = Field(default_factory=uuid4)
    tenant_id: UUID
    email: EmailStr
    username: str
    password_hash: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool = True
    email_verified: bool = False
    last_login_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
    roles: list[str] = Field(default_factory=list)
    
    class Config:
        from_attributes = True
        validate_assignment = True
    
    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash a password using bcrypt.
        
        Args:
            password: Plain text password to hash
            
        Returns:
            Bcrypt hash of the password
        """
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against its hash.
        
        Args:
            plain_password: Plain text password to verify
            hashed_password: Bcrypt hash to verify against
            
        Returns:
            True if password matches, False otherwise
        """
        return pwd_context.verify(plain_password, hashed_password)
    
    def is_deleted(self) -> bool:
        """Check if user is soft-deleted."""
        return self.deleted_at is not None
    
    def get_full_name(self) -> str:
        """Get user's full name."""
        parts = []
        if self.first_name:
            parts.append(self.first_name)
        if self.last_name:
            parts.append(self.last_name)
        return " ".join(parts) if parts else self.username
    
    def can_access_protected_features(self) -> bool:
        """
        Check if user can access protected features.
        Users with unverified email have read-only access.
        """
        return self.email_verified and self.is_active


class UserCreate(BaseModel):
    """Schema for creating a new user."""
    email: EmailStr
    username: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None


class UserLogin(BaseModel):
    """Schema for user login request."""
    email: EmailStr
    password: str


class PasswordReset(BaseModel):
    """Schema for password reset request."""
    token: str
    new_password: str


class PasswordStrengthConfig(BaseModel):
    """Configuration for password strength requirements."""
    min_length: int = 8
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_number: bool = True
    require_special_char: bool = True
    
    def validate_password(self, password: str) -> tuple[bool, List[str]]:
        """
        Validate password against strength requirements.
        
        Args:
            password: Password to validate
            
        Returns:
            Tuple of (is_valid, list of error messages)
        """
        errors = []
        
        if len(password) < self.min_length:
            errors.append(f"Password must be at least {self.min_length} characters")
        
        if self.require_uppercase and not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        if self.require_lowercase and not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        if self.require_number and not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        
        if self.require_special_char:
            special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
            if not any(c in special_chars for c in password):
                errors.append("Password must contain at least one special character")
        
        return len(errors) == 0, errors
