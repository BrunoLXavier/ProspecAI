# Authentication Use Cases
# Use Cases Layer - Core authentication business logic
# Implements RF-01: User registration and authentication

from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any
from uuid import UUID
import logging
import secrets

from pydantic import BaseModel, Field, EmailStr

from domain.entities.user import User, UserCreate, PasswordStrengthConfig
from domain.entities.refresh_token import RefreshToken, TokenType
from adapters.repositories.user_repository import UserRepository
from adapters.repositories.refresh_token_repository import RefreshTokenRepository
from adapters.repositories.login_attempt_repository import LoginAttemptRepository
from adapters.repositories.system_config_repository import SystemConfigRepository
from domain.entities.system_config import SecurityConfig
from infrastructure.jwt_service import JWTService, get_jwt_service
from infrastructure.email_service import EmailService, get_email_service

logger = logging.getLogger(__name__)


# ============================================================================
# Request/Response DTOs
# ============================================================================

class RegisterRequest(BaseModel):
    """User registration request."""
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8)
    full_name: Optional[str] = None
    tenant_id: Optional[UUID] = None


class RegisterResponse(BaseModel):
    """User registration response."""
    user_id: UUID
    email: str
    username: str
    message: str = "Registration successful. Please verify your email."


class LoginRequest(BaseModel):
    """User login request."""
    email: str
    password: str


class LoginResponse(BaseModel):
    """User login response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: Dict[str, Any]
    requires_email_verification: bool = False


class PasswordResetRequest(BaseModel):
    """Password reset request (forgot password)."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation."""
    token: str
    new_password: str = Field(min_length=8)


class EmailVerificationRequest(BaseModel):
    """Email verification request."""
    token: str


class RefreshTokenRequest(BaseModel):
    """Token refresh request."""
    refresh_token: str


# ============================================================================
# Exceptions
# ============================================================================

class AuthenticationError(Exception):
    """Base authentication error."""
    pass


class InvalidCredentialsError(AuthenticationError):
    """Invalid email or password."""
    pass


class AccountLockedError(AuthenticationError):
    """Account is locked due to too many failed attempts."""
    def __init__(self, message: str, lockout_ends_at: Optional[datetime] = None):
        super().__init__(message)
        self.lockout_ends_at = lockout_ends_at


class EmailNotVerifiedError(AuthenticationError):
    """Email not verified."""
    pass


class UserExistsError(AuthenticationError):
    """User already exists."""
    pass


class PasswordTooWeakError(AuthenticationError):
    """Password doesn't meet requirements."""
    pass


class TokenInvalidError(AuthenticationError):
    """Token is invalid or expired."""
    pass


# ============================================================================
# Use Cases
# ============================================================================

class RegisterUser:
    """
    Use case for user registration.
    
    Creates a new user and sends verification email.
    """
    
    def __init__(
        self,
        user_repository: UserRepository,
        token_repository: RefreshTokenRepository,
        config_repository: SystemConfigRepository,
        email_service: Optional[EmailService] = None
    ):
        self.user_repo = user_repository
        self.token_repo = token_repository
        self.config_repo = config_repository
        self.email_service = email_service or get_email_service()
    
    async def execute(
        self,
        request: RegisterRequest,
        base_url: str
    ) -> RegisterResponse:
        """
        Register a new user.
        
        Args:
            request: Registration data
            base_url: Base URL for verification link
            
        Returns:
            RegisterResponse
            
        Raises:
            UserExistsError: If email or username already taken
            PasswordTooWeakError: If password doesn't meet requirements
        """
        # Check if email exists
        # Use default tenant if none provided (matches DB migration default)
        tenant_id = request.tenant_id or UUID('00000000-0000-0000-0000-000000000001')

        if await self.user_repo.email_exists(tenant_id, request.email):
            raise UserExistsError("Email already registered")
        
        # Check if username exists
        if await self.user_repo.username_exists(tenant_id, request.username):
            raise UserExistsError("Username already taken")
        
        # Get password requirements
        security_config = await self.config_repo.get_security_config(tenant_id)

        # Build password strength config from system settings
        password_config = PasswordStrengthConfig(
            min_length=security_config.password_min_length,
            require_uppercase=security_config.password_require_uppercase,
            require_lowercase=security_config.password_require_lowercase,
            require_number=security_config.password_require_number,
            require_special_char=security_config.password_require_special_char
        )

        # Validate password strength using PasswordStrengthConfig
        is_valid, errors = password_config.validate_password(request.password)
        if not is_valid:
            # errors is a list of messages
            raise PasswordTooWeakError('; '.join(errors))
        
        # Create user (repository expects raw fields)
        # Log password type/length (masked) for debug — do NOT log raw password
        try:
            pw = request.password
            if isinstance(pw, str):
                pw_bytes = pw.encode('utf-8')
            else:
                pw_bytes = bytes(pw)
            logger.info(f"RegisterUser: password type={type(pw).__name__}, byte_length={len(pw_bytes)}")
        except Exception:
            logger.exception("RegisterUser: failed to inspect password before hashing")

        password_hash = User.hash_password(request.password)
        user = await self.user_repo.create(
            tenant_id,
            request.email,
            request.username,
            password_hash,
            first_name=request.full_name
        )
        
        # Generate verification token
        token = secrets.token_urlsafe(32)
        token_hash = RefreshToken.hash_token(token)
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        await self.token_repo.save(
            user_id=user.id,
            token_hash=token_hash,
            token_type=TokenType.EMAIL_VERIFICATION,
            expires_at=expires_at
        )
        
        # Send verification email
        verification_link = f"{base_url}/auth/verify-email?token={token}"
        await self.email_service.send_verification_email(
            to_email=user.email,
            username=user.username,
            verification_link=verification_link
        )
        
        logger.info(f"User registered: {user.email}")
        
        return RegisterResponse(
            user_id=user.id,
            email=user.email,
            username=user.username
        )


class LoginUser:
    """
    Use case for user login.
    
    Validates credentials and returns tokens.
    """
    
    def __init__(
        self,
        user_repository: UserRepository,
        token_repository: RefreshTokenRepository,
        attempt_repository: LoginAttemptRepository,
        config_repository: SystemConfigRepository,
        jwt_service: Optional[JWTService] = None
    ):
        self.user_repo = user_repository
        self.token_repo = token_repository
        self.attempt_repo = attempt_repository
        self.config_repo = config_repository
        self.jwt_service = jwt_service or get_jwt_service()
    
    async def execute(
        self,
        request: LoginRequest,
        tenant_id: Optional[UUID] = None,
        ip_address: str = "0.0.0.0"
    ) -> LoginResponse:
        """
        Authenticate user and return tokens.
        
        Args:
            request: Login credentials
            tenant_id: Optional tenant context
            ip_address: Client IP for rate limiting
            
        Returns:
            LoginResponse with tokens
            
        Raises:
            AccountLockedError: If account is locked
            InvalidCredentialsError: If credentials are wrong
        """
        # Get security config for rate limiting. If reading config fails (legacy DB/schema errors),
        # fall back to defaults to avoid aborting the whole login flow.
        try:
            security_config = await self.config_repo.get_security_config(tenant_id)
            if security_config is None:
                security_config = SecurityConfig()
        except Exception:
            logger.exception("Failed to load security config; using defaults")
            security_config = SecurityConfig()
        
        # Check rate limiting
        is_locked, attempts, lockout_ends = await self.attempt_repo.get_lockout_status(
            request.email,
            max_attempts=security_config.max_login_attempts,
            window_minutes=security_config.lockout_duration_minutes
        )
        
        if is_locked:
            raise AccountLockedError(
                f"Account locked due to {attempts} failed attempts. Try again later.",
                lockout_ends_at=lockout_ends
            )
        
        # Find user. If tenant_id not provided, try to locate user across tenants
        if tenant_id is None:
            user = await self.user_repo.get_by_email_any_tenant(request.email)
            # derive tenant_id for downstream operations
            if user:
                tenant_id = user.tenant_id
        else:
            user = await self.user_repo.get_by_email(tenant_id, request.email)
        
        if not user or not User.verify_password(request.password, user.password_hash):
            # Record failed attempt (best-effort; don't fail login flow on DB errors)
            try:
                await self.attempt_repo.record_attempt(
                    email=request.email,
                    ip_address=ip_address,
                    success=False,
                    tenant_id=tenant_id
                )
            except Exception as e:
                # Log and continue; authentication result is primary
                import logging
                logging.getLogger(__name__).warning("Failed to record login attempt: %s", e)
            
            remaining = await self.attempt_repo.get_remaining_attempts(
                request.email,
                max_attempts=security_config.max_login_attempts,
                window_minutes=security_config.lockout_duration_minutes
            )
            
            raise InvalidCredentialsError(
                f"Invalid email or password. {remaining} attempts remaining."
            )
        
        # Check if user is active
        if not user.is_active:
            raise InvalidCredentialsError("Account is deactivated")
        
        # Record successful attempt and clear previous failures (best-effort)
        try:
            await self.attempt_repo.record_attempt(
                email=request.email,
                ip_address=ip_address,
                success=True,
                tenant_id=tenant_id
            )
            await self.attempt_repo.clear_attempts(request.email)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Failed to update login attempts: %s", e)
        
        # Update last login
        await self.user_repo.update_last_login(user.id)
        
        # Generate tokens
        access_token, access_expires = self.jwt_service.create_access_token(
            user_id=user.id,
            email=user.email,
            tenant_id=tenant_id,
            roles=user.roles,
            email_verified=user.email_verified
        )
        
        refresh_token, refresh_expires = self.jwt_service.create_refresh_token(
            user_id=user.id,
            email=user.email,
            tenant_id=tenant_id
        )
        
        # Store refresh token hash
        refresh_hash = RefreshToken.hash_token(refresh_token)
        await self.token_repo.save(
            user_id=user.id,
            token_hash=refresh_hash,
            token_type=TokenType.REFRESH,
            expires_at=refresh_expires,
            created_by_ip=ip_address
        )
        
        logger.info(f"User logged in: {user.email}")
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=access_expires,
            user={
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "full_name": user.get_full_name(),
                "email_verified": user.email_verified,
                "roles": user.roles
            },
            requires_email_verification=not user.email_verified
        )


class VerifyEmail:
    """
    Use case for email verification.
    """
    
    def __init__(
        self,
        user_repository: UserRepository,
        token_repository: RefreshTokenRepository,
        email_service: Optional[EmailService] = None
    ):
        self.user_repo = user_repository
        self.token_repo = token_repository
        self.email_service = email_service or get_email_service()
    
    async def execute(
        self,
        request: EmailVerificationRequest,
        tenant_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Verify user email.
        
        Args:
            request: Verification token
            tenant_id: Optional tenant context
            
        Returns:
            Success message
            
        Raises:
            TokenInvalidError: If token is invalid, expired, or already used
        """
        # Hash the token to look up
        token_hash = RefreshToken.hash_token(request.token)
        
        # Validate token (checks expiration and used status)
        try:
            token = await self.token_repo.get_valid_token(token_hash)
        except Exception as e:
            raise TokenInvalidError(str(e))
        
        if token.token_type != TokenType.EMAIL_VERIFICATION:
            raise TokenInvalidError("Invalid token type")
        
        # Mark email as verified
        user = await self.user_repo.mark_email_verified(token.user_id, tenant_id)
        
        # Mark token as used
        await self.token_repo.mark_used(token.id)
        
        # Send welcome email
        if user:
            await self.email_service.send_welcome_email(
                to_email=user.email,
                username=user.username
            )
        
        logger.info(f"Email verified for user: {token.user_id}")
        
        return {"message": "Email verified successfully"}


class RequestPasswordReset:
    """
    Use case for requesting password reset.
    """
    
    def __init__(
        self,
        user_repository: UserRepository,
        token_repository: RefreshTokenRepository,
        config_repository: SystemConfigRepository,
        email_service: Optional[EmailService] = None
    ):
        self.user_repo = user_repository
        self.token_repo = token_repository
        self.config_repo = config_repository
        self.email_service = email_service or get_email_service()
    
    async def execute(
        self,
        request: PasswordResetRequest,
        base_url: str,
        tenant_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Request password reset.
        
        Always returns success to prevent email enumeration.
        
        Args:
            request: Password reset request
            base_url: Base URL for reset link
            tenant_id: Optional tenant context
            
        Returns:
            Success message
        """
        # Find user by email
        user = await self.user_repo.get_by_email(tenant_id, request.email)
        
        # Always return success to prevent email enumeration
        if not user:
            logger.info(f"Password reset requested for non-existent email: {request.email}")
            return {"message": "If the email exists, a reset link has been sent"}
        
        # Get security config for token expiration
        security_config = await self.config_repo.get_security_config(tenant_id)
        
        # Invalidate any existing reset tokens
        await self.token_repo.invalidate_previous_tokens(
            user.id, TokenType.PASSWORD_RESET
        )
        
        # Generate reset token
        token = secrets.token_urlsafe(32)
        token_hash = RefreshToken.hash_token(token)
        expires_at = datetime.utcnow() + timedelta(
            hours=security_config.password_reset_expiry_hours
        )
        
        await self.token_repo.save(
            user_id=user.id,
            token_hash=token_hash,
            token_type=TokenType.PASSWORD_RESET,
            expires_at=expires_at
        )
        
        # Send reset email
        reset_link = f"{base_url}/auth/reset-password?token={token}"
        await self.email_service.send_password_reset_email(
            to_email=user.email,
            username=user.username,
            reset_link=reset_link
        )
        
        logger.info(f"Password reset requested for: {user.email}")
        
        return {"message": "If the email exists, a reset link has been sent"}


class ConfirmPasswordReset:
    """
    Use case for confirming password reset.
    """
    
    def __init__(
        self,
        user_repository: UserRepository,
        token_repository: RefreshTokenRepository,
        config_repository: SystemConfigRepository
    ):
        self.user_repo = user_repository
        self.token_repo = token_repository
        self.config_repo = config_repository
    
    async def execute(
        self,
        request: PasswordResetConfirm,
        tenant_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Confirm password reset with new password.
        
        Args:
            request: Reset confirmation with token and new password
            tenant_id: Optional tenant context
            
        Returns:
            Success message
            
        Raises:
            TokenInvalidError: If token is invalid
            PasswordTooWeakError: If password doesn't meet requirements
        """
        # Hash the token to look up
        token_hash = RefreshToken.hash_token(request.token)
        
        # Validate token
        try:
            token = await self.token_repo.get_valid_token(token_hash)
        except Exception as e:
            raise TokenInvalidError(str(e))
        
        if token.token_type != TokenType.PASSWORD_RESET:
            raise TokenInvalidError("Invalid token type")
        
        # Get password requirements
        security_config = await self.config_repo.get_security_config(tenant_id)
        
        # Validate new password strength using domain PasswordStrengthConfig
        password_config = PasswordStrengthConfig(
            min_length=security_config.password_min_length,
            require_uppercase=security_config.password_require_uppercase,
            require_lowercase=security_config.password_require_lowercase,
            require_number=security_config.password_require_number,
            require_special_char=security_config.password_require_special_char
        )

        is_valid, errors = password_config.validate_password(request.new_password)
        if not is_valid:
            raise PasswordTooWeakError('; '.join(errors))
        
        # Get user
        user = await self.user_repo.get_by_id(token.user_id, tenant_id)
        if not user:
            raise TokenInvalidError("User not found")
        
        # Update password
        try:
            pw = request.new_password
            if isinstance(pw, str):
                pw_bytes = pw.encode('utf-8')
            else:
                pw_bytes = bytes(pw)
            logger.info(f"PasswordReset: new_password type={type(pw).__name__}, byte_length={len(pw_bytes)}")
        except Exception:
            logger.exception("PasswordReset: failed to inspect new_password before hashing")

        new_password_hash = User.hash_password(request.new_password)
        await self.user_repo.update(
            user_id=user.id,
            tenant_id=tenant_id,
            password_hash=new_password_hash
        )
        
        # Mark token as used
        await self.token_repo.mark_used(token.id)
        
        # Revoke all refresh tokens for security
        await self.token_repo.revoke_all_for_user(user.id, TokenType.REFRESH)
        
        logger.info(f"Password reset completed for: {user.email}")
        
        return {"message": "Password reset successful"}


class RefreshAccessToken:
    """
    Use case for refreshing access token.
    """
    
    def __init__(
        self,
        user_repository: UserRepository,
        token_repository: RefreshTokenRepository,
        jwt_service: Optional[JWTService] = None
    ):
        self.user_repo = user_repository
        self.token_repo = token_repository
        self.jwt_service = jwt_service or get_jwt_service()
    
    async def execute(
        self,
        request: RefreshTokenRequest,
        tenant_id: Optional[UUID] = None
    ) -> LoginResponse:
        """
        Refresh access token using refresh token.
        
        Args:
            request: Refresh token
            tenant_id: Optional tenant context
            
        Returns:
            New tokens
            
        Raises:
            TokenInvalidError: If refresh token is invalid
        """
        # Validate refresh token JWT
        logger.info(f"RefreshAccessToken: validating refresh token preview={request.refresh_token[:10]}...{request.refresh_token[-6:]}")
        payload = self.jwt_service.validate_refresh_token(request.refresh_token)
        if not payload:
            logger.warning("RefreshAccessToken: JWT validation failed for provided refresh token")
            raise TokenInvalidError("Invalid or expired refresh token")

        # Check if token is in database and not revoked
        token_hash = RefreshToken.hash_token(request.refresh_token)
        logger.info(f"RefreshAccessToken: looking up token hash preview={token_hash[:10]}...{token_hash[-6:]}")
        try:
            stored_token = await self.token_repo.get_valid_token(token_hash)
        except Exception as e:
            logger.warning(f"RefreshAccessToken: token repository lookup failed: {e}")
            raise TokenInvalidError("Token has been revoked or is invalid")
        
        user_id = UUID(payload["sub"])

        # Determine tenant from payload if present
        tenant_from_payload = UUID(payload["tenant_id"]) if payload.get("tenant_id") else None

        # Get fresh user data
        user = await self.user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise TokenInvalidError("User not found or deactivated")
        
        # Determine tenant to include in new access token (prefer payload tenant)
        tenant_for_token = tenant_from_payload or tenant_id

        # Generate new access token
        access_token, access_expires = self.jwt_service.create_access_token(
            user_id=user.id,
            email=user.email,
            tenant_id=tenant_for_token,
            roles=user.roles,
            email_verified=user.email_verified
        )
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=request.refresh_token,  # Keep same refresh token
            expires_at=access_expires,
            user={
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "full_name": user.get_full_name() if hasattr(user, 'get_full_name') else getattr(user, 'full_name', None),
                "email_verified": user.email_verified,
                "roles": user.roles
            },
            requires_email_verification=not user.email_verified
        )


class LogoutUser:
    """
    Use case for user logout.
    """
    
    def __init__(self, token_repository: RefreshTokenRepository):
        self.token_repo = token_repository
    
    async def execute(
        self,
        refresh_token: str,
        revoke_all: bool = False
    ) -> Dict[str, Any]:
        """
        Logout user by revoking tokens.
        
        Args:
            refresh_token: Current refresh token
            revoke_all: If True, revoke all user's refresh tokens
            
        Returns:
            Success message
        """
        token_hash = RefreshToken.hash_token(refresh_token)
        stored_token = await self.token_repo.get_by_token(token_hash)
        
        if stored_token:
            if revoke_all:
                count = await self.token_repo.revoke_all_for_user(
                    stored_token.user_id, TokenType.REFRESH
                )
                logger.info(f"Revoked {count} tokens for user: {stored_token.user_id}")
            else:
                await self.token_repo.revoke(stored_token.id)
                logger.info(f"Revoked single token for user: {stored_token.user_id}")
        
        return {"message": "Logged out successfully"}
