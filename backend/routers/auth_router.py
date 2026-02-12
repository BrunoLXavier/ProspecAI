# Authentication Router
# Adapters Layer - FastAPI endpoints for authentication
# Implements RF-01: User registration and authentication

from typing import Optional
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from adapters.database.connection import get_session
from adapters.repositories.user_repository import UserRepository
from adapters.repositories.refresh_token_repository import RefreshTokenRepository
from adapters.repositories.login_attempt_repository import LoginAttemptRepository
from adapters.repositories.system_config_repository import SystemConfigRepository
from adapters.api.auth_middleware import (
    get_current_user, require_auth, get_client_ip, AuthenticatedUser
)
from infrastructure.dependencies import get_current_tenant_id
from adapters.database.models import UserRoleModel
from use_cases.auth_use_cases_use_case import (
    RegisterUser, LoginUser, VerifyEmail, RequestPasswordReset,
    ConfirmPasswordReset, RefreshAccessToken, LogoutUser, ChangePassword,
    RegisterRequest, LoginRequest, PasswordResetRequest,
    PasswordResetConfirm, EmailVerificationRequest, RefreshTokenRequest,
    ChangePasswordRequest,
    RegisterResponse, LoginResponse,
    AuthenticationError, InvalidCredentialsError, AccountLockedError,
    EmailNotVerifiedError, UserExistsError, PasswordTooWeakError, TokenInvalidError
)
from infrastructure.serializers import to_primitive

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


def get_base_url(request: Request) -> str:
    """Get base URL from request for email links."""
    # Use frontend URL from env or construct from request
    import os
    frontend_url = os.environ.get("FRONTEND_URL", None)
    
    if frontend_url:
        return frontend_url
    
    # Construct from request
    scheme = request.headers.get("X-Forwarded-Proto", request.url.scheme)
    host = request.headers.get("X-Forwarded-Host", request.url.netloc)
    
    # Replace API port with frontend port in development
    if ":8000" in host:
        host = host.replace(":8000", ":3000")
    
    return f"{scheme}://{host}"


# ============================================================================
# Registration
# ============================================================================

@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
    description="Create a new user account. Sends verification email."
)
async def register(
    request: Request,
    data: RegisterRequest,
    session: AsyncSession = Depends(get_session),
    tenant_id: str = Depends(get_current_tenant_id)
):
    """
    Register a new user.
    
    - Creates user account
    - Sends email verification link
    - Returns user info (not tokens - must verify email first)
    """
    user_repo = UserRepository(session)
    token_repo = RefreshTokenRepository(session)
    config_repo = SystemConfigRepository(session)
    
    use_case = RegisterUser(user_repo, token_repo, config_repo)
    
    try:
        base_url = get_base_url(request)
        # Ensure tenant_id provided by auth/context is forwarded to use case
        if tenant_id:
            from uuid import UUID as _UUID
            try:
                data.tenant_id = _UUID(tenant_id)
            except Exception:
                pass
        result = await use_case.execute(data, base_url)
        await session.commit()
        return to_primitive(result)
    except UserExistsError as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except PasswordTooWeakError as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        await session.rollback()
        logger.exception("Registration error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


# ============================================================================
# Login
# ============================================================================

@router.post(
    "/login",
    response_model=LoginResponse,
    summary="User login",
    description="Authenticate with email and password."
)
async def login(
    request: Request
):
    """
    Authenticate user.
    
    - Validates credentials
    - Returns access and refresh tokens
    - Tracks login attempts for rate limiting
    """
    # Parse raw body
    try:
        body = await request.json()
        email = body.get('email')
        password = body.get('password')
    except Exception as e:
        logger.error(f"Failed to parse request body: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request format"
        )
    
    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password required"
        )
    
    # Delegate to use case implementation to ensure refresh token persistence and auditing
    from adapters.database.connection import AsyncSessionLocal
    from adapters.repositories.user_repository import UserRepository
    from adapters.repositories.refresh_token_repository import RefreshTokenRepository
    from adapters.repositories.login_attempt_repository import LoginAttemptRepository
    from adapters.repositories.system_config_repository import SystemConfigRepository
    from use_cases.auth_use_cases_use_case import LoginUser, LoginRequest

    async with AsyncSessionLocal() as session:
        try:
            login_req = LoginRequest(email=email, password=password)
            user_repo = UserRepository(session)
            token_repo = RefreshTokenRepository(session)
            attempt_repo = LoginAttemptRepository(session)
            config_repo = SystemConfigRepository(session)

            use_case = LoginUser(user_repo, token_repo, attempt_repo, config_repo)
            result = await use_case.execute(login_req)
            await session.commit()
            return to_primitive(result)
        except InvalidCredentialsError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e)
            )
        except Exception as e:
            await session.rollback()
            logger.exception("Login error during login")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Login failed"
            )


# ============================================================================
# Email Verification
# ============================================================================

@router.post(
    "/verify-email",
    summary="Verify email",
    description="Verify email address using token from email link."
)
async def verify_email(
    data: EmailVerificationRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Verify user email.
    
    - Token can only be used once
    - Sends welcome email on success
    """
    user_repo = UserRepository(session)
    token_repo = RefreshTokenRepository(session)
    
    use_case = VerifyEmail(user_repo, token_repo)
    
    try:
        result = await use_case.execute(data)
        await session.commit()
        return to_primitive(result)
    except TokenInvalidError as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        await session.rollback()
        logger.error(f"Email verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Verification failed"
        )


@router.post(
    "/resend-verification",
    summary="Resend verification email",
    description="Resend email verification link."
)
async def resend_verification(
    request: Request,
    user: AuthenticatedUser = Depends(require_auth),
    session: AsyncSession = Depends(get_session)
):
    """
    Resend verification email.
    
    - Requires authentication
    - Invalidates previous tokens
    - Sends new verification email
    """
    if user.email_verified:
        return {"message": "Email already verified"}
    
    from datetime import datetime, timedelta
    import secrets
    from domain.entities.refresh_token import RefreshToken, TokenType
    from services.core.email_service import get_email_service
    
    user_repo = UserRepository(session)
    token_repo = RefreshTokenRepository(session)
    
    # Get user from DB
    db_user = await user_repo.get_by_id(user.user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Invalidate previous tokens
    await token_repo.invalidate_previous_tokens(user.user_id, TokenType.EMAIL_VERIFICATION)
    
    # Generate new token
    token = secrets.token_urlsafe(32)
    token_hash = RefreshToken.hash_token(token)
    expires_at = datetime.utcnow() + timedelta(hours=24)
    
    await token_repo.save(
        user_id=user.user_id,
        token_hash=token_hash,
        token_type=TokenType.EMAIL_VERIFICATION,
        expires_at=expires_at
    )
    
    # Send email
    base_url = get_base_url(request)
    verification_link = f"{base_url}/auth/verify-email?token={token}"
    
    email_service = get_email_service()
    await email_service.send_verification_email(
        to_email=db_user.email,
        username=db_user.username,
        verification_link=verification_link
    )
    
    await session.commit()
    
    return {"message": "Verification email sent"}


# ============================================================================
# Password Reset
# ============================================================================

@router.post(
    "/forgot-password",
    summary="Request password reset",
    description="Request a password reset email."
)
async def forgot_password(
    request: Request,
    data: PasswordResetRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Request password reset.
    
    - Always returns success to prevent email enumeration
    - Sends reset link if email exists
    """
    user_repo = UserRepository(session)
    token_repo = RefreshTokenRepository(session)
    config_repo = SystemConfigRepository(session)
    
    use_case = RequestPasswordReset(user_repo, token_repo, config_repo)
    
    try:
        base_url = get_base_url(request)
        result = await use_case.execute(data, base_url)
        await session.commit()
        return to_primitive(result)
    except Exception as e:
        await session.rollback()
        logger.error(f"Password reset request error: {e}")
        # Still return success to prevent enumeration
        return {"message": "If the email exists, a reset link has been sent"}


@router.post(
    "/reset-password",
    summary="Reset password",
    description="Reset password using token from email link."
)
async def reset_password(
    data: PasswordResetConfirm,
    session: AsyncSession = Depends(get_session)
):
    """
    Reset password.
    
    - Token can only be used once
    - Revokes all existing sessions
    """
    user_repo = UserRepository(session)
    token_repo = RefreshTokenRepository(session)
    config_repo = SystemConfigRepository(session)
    
    use_case = ConfirmPasswordReset(user_repo, token_repo, config_repo)
    
    try:
        result = await use_case.execute(data)
        await session.commit()
        return to_primitive(result)
    except TokenInvalidError as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except PasswordTooWeakError as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        await session.rollback()
        logger.error(f"Password reset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )


# ============================================================================
# Token Management
# ============================================================================

@router.post(
    "/refresh",
    response_model=LoginResponse,
    summary="Refresh access token",
    description="Get new access token using refresh token."
)
async def refresh_token(
    data: RefreshTokenRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Refresh access token.
    
    - Validates refresh token
    - Returns new access token
    - Same refresh token continues to be valid
    """
    try:
        token_preview = (data.refresh_token[:10] + '...' + data.refresh_token[-6:]) if data.refresh_token else 'MISSING'
    except Exception:
        token_preview = 'ERROR'
    logger.info(f"[DEBUG_REFRESH] refresh called with token: {token_preview}")
    user_repo = UserRepository(session)
    token_repo = RefreshTokenRepository(session)
    
    use_case = RefreshAccessToken(user_repo, token_repo)
    
    try:
        result = await use_case.execute(data)
        return to_primitive(result)
    except TokenInvalidError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )



@router.post(
    "/logout",
    summary="Logout",
    description="Invalidate current session."
)
async def logout(
    data: RefreshTokenRequest,
    revoke_all: bool = False,
    session: AsyncSession = Depends(get_session)
):
    """
    Logout user.
    
    - Revokes refresh token
    - Optional: revoke all sessions
    """
    token_repo = RefreshTokenRepository(session)
    
    use_case = LogoutUser(token_repo)
    
    try:
        result = await use_case.execute(data.refresh_token, revoke_all)
        await session.commit()
        return to_primitive(result)
    except Exception as e:
        await session.rollback()
        logger.error(f"Logout error: {e}")
        # Don't fail logout
        return {"message": "Logged out"}


# ============================================================================
# User Info
# ============================================================================

@router.get(
    "/me",
    summary="Get current user",
    description="Get current authenticated user info."
)
async def get_me(
    user: AuthenticatedUser = Depends(require_auth),
    session: AsyncSession = Depends(get_session)
):
    """
    Get current user info.
    
    Returns full user profile from database.
    """
    user_repo = UserRepository(session)
    db_user = await user_repo.get_by_id(user.user_id)
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Fetch roles from user_roles table to guarantee DB is source of truth
    roles_q = await session.execute(
        select(UserRoleModel.role_id).where(UserRoleModel.user_id == db_user.id)
    )
    roles = [r[0] for r in roles_q.all()]

    return {
        "id": str(db_user.id),
        "email": db_user.email,
        "username": db_user.username,
        "full_name": getattr(db_user, 'full_name', None) or (
            f"{db_user.first_name or ''} {db_user.last_name or ''}".strip() or None
        ),
        "first_name": db_user.first_name,
        "last_name": db_user.last_name,
        "email_verified": db_user.email_verified,
        "roles": roles,
        "created_at": db_user.created_at.isoformat() if getattr(db_user, 'created_at', None) else None,
        "last_login_at": db_user.last_login_at.isoformat() if getattr(db_user, 'last_login_at', None) else None
    }


# ============================================================================
# Profile Update
# ============================================================================

@router.put(
    "/me",
    summary="Update current user profile",
    description="Update profile fields for the authenticated user."
)
async def update_me(
    request: Request,
    user: AuthenticatedUser = Depends(require_auth),
    session: AsyncSession = Depends(get_session)
):
    """
    Update authenticated user's profile.

    Accepts: full_name, first_name, last_name.
    Splits full_name into first_name / last_name when provided.
    """
    body = await request.json()

    user_repo = UserRepository(session)
    db_user = await user_repo.get_by_id(user.user_id)

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Handle full_name → first_name / last_name split
    full_name = body.get("full_name")
    if full_name:
        parts = full_name.strip().split(" ", 1)
        db_user.first_name = parts[0]
        db_user.last_name = parts[1] if len(parts) > 1 else ""
    else:
        if "first_name" in body:
            db_user.first_name = body["first_name"]
        if "last_name" in body:
            db_user.last_name = body["last_name"]

    await session.commit()
    await session.refresh(db_user)

    return {
        "id": str(db_user.id),
        "email": db_user.email,
        "username": db_user.username,
        "full_name": f"{db_user.first_name or ''} {db_user.last_name or ''}".strip() or None,
        "first_name": db_user.first_name,
        "last_name": db_user.last_name,
        "message": "Profile updated successfully"
    }


@router.get(
    "/check-email",
    summary="Check email availability",
    description="Check if an email is available for registration."
)
async def check_email(
    email: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Check if email is available.
    
    Returns true if email is not in use.
    """
    user_repo = UserRepository(session)
    exists = await user_repo.email_exists(email)
    
    return {"available": not exists}


@router.get(
    "/check-username",
    summary="Check username availability",
    description="Check if a username is available for registration."
)
async def check_username(
    username: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Check if username is available.
    
    Returns true if username is not in use.
    """
    user_repo = UserRepository(session)
    exists = await user_repo.username_exists(username)
    
    return {"available": not exists}


@router.put(
    "/change-password",
    summary="Change password",
    description="Change password for authenticated user. Requires current password."
)
async def change_password(
    data: ChangePasswordRequest,
    user: AuthenticatedUser = Depends(require_auth),
    session: AsyncSession = Depends(get_session)
):
    """
    Change password for authenticated user.

    - Verifies current password
    - Validates new password strength
    - Updates password hash
    """
    user_repo = UserRepository(session)
    config_repo = SystemConfigRepository(session)

    use_case = ChangePassword(user_repo, config_repo)

    try:
        result = await use_case.execute(
            user_id=user.user_id,
            request=data,
            tenant_id=getattr(user, 'tenant_id', None)
        )
        await session.commit()
        return to_primitive(result)
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except PasswordTooWeakError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        await session.rollback()
        logger.error(f"Password change error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )
