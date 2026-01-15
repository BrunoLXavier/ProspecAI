# Refresh Token Repository
# Adapters Layer - Database operations for tokens
# Implements RNF-02: Secure token management

from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID, uuid4
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, delete

from adapters.database.models import RefreshTokenModel
from domain.entities.refresh_token import (
    RefreshToken, TokenType,
    TokenAlreadyUsedException, TokenExpiredException, TokenInvalidException
)

logger = logging.getLogger(__name__)


class RefreshTokenRepository:
    """
    Repository for refresh token operations.
    
    Handles:
    - Refresh tokens for session management
    - Password reset tokens (one-time use)
    - Email verification tokens (one-time use)
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    def _model_to_entity(self, model: RefreshTokenModel) -> RefreshToken:
        """Convert database model to domain entity."""
        # Ensure IP addresses from the DB (which may be ipaddress.IPv4Address/IPv6Address)
        # are converted to plain strings before passing to the Pydantic model.
        created_by_ip = None
        try:
            if model.created_by_ip is not None:
                created_by_ip = str(model.created_by_ip)
        except Exception:
            created_by_ip = None

        return RefreshToken(
            id=model.id,
            user_id=model.user_id,
            token_hash=model.token_hash,
            token_type=TokenType(model.token_type),
            used=model.used,
            expires_at=model.expires_at,
            created_at=model.created_at,
            created_by_ip=created_by_ip
        )
    
    async def save(
        self,
        user_id: UUID,
        token_hash: str,
        token_type: TokenType,
        expires_at: datetime,
        created_by_ip: Optional[str] = None
    ) -> RefreshToken:
        """
        Save a new token.
        
        Args:
            user_id: User UUID
            token_hash: SHA-256 hash of the token
            token_type: Type of token
            expires_at: Token expiration datetime
            created_by_ip: IP address of request
            
        Returns:
            Created RefreshToken entity
        """
        model = RefreshTokenModel(
            id=uuid4(),
            user_id=user_id,
            token_hash=token_hash,
            token_type=token_type.value,
            used=False,
            expires_at=expires_at,
            created_by_ip=created_by_ip
        )
        
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        
        logger.info(f"Created {token_type.value} token for user: {user_id}")
        # Convert to domain entity, guarding against unexpected DB types
        try:
            return self._model_to_entity(model)
        except Exception:
            created_by_ip = None
            try:
                if model.created_by_ip is not None:
                    created_by_ip = str(model.created_by_ip)
            except Exception:
                created_by_ip = None

            return RefreshToken(
                id=model.id,
                user_id=model.user_id,
                token_hash=model.token_hash,
                token_type=TokenType(model.token_type),
                used=model.used,
                expires_at=model.expires_at,
                created_at=model.created_at,
                created_by_ip=created_by_ip
            )
    
    async def get_by_token(self, token_hash: str) -> Optional[RefreshToken]:
        """
        Get token by its hash.
        
        Args:
            token_hash: SHA-256 hash of the token
            
        Returns:
            RefreshToken entity or None if not found
        """
        query = select(RefreshTokenModel).where(
            RefreshTokenModel.token_hash == token_hash
        )
        
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if model:
            return self._model_to_entity(model)
        return None
    
    async def get_valid_token(self, token_hash: str) -> RefreshToken:
        """
        Get a valid token by its hash.
        
        Validates that the token exists, is not expired, and is not used.
        
        Args:
            token_hash: SHA-256 hash of the token
            
        Returns:
            Valid RefreshToken entity
            
        Raises:
            TokenInvalidException: If token not found
            TokenExpiredException: If token is expired
            TokenAlreadyUsedException: If one-time token was already used
        """
        try:
            logger.info(f"[REFRESH_REPO] get_valid_token lookup: {token_hash[:10]}...{token_hash[-6:]}")
        except Exception:
            logger.info("[REFRESH_REPO] get_valid_token lookup: (error masking)")
        token = await self.get_by_token(token_hash)
        
        if not token:
            logger.info("[REFRESH_REPO] token not found")
            raise TokenInvalidException("Token not found")
        
        if token.is_expired():
            logger.info("[REFRESH_REPO] token expired")
            raise TokenExpiredException("Token has expired")
        
        # Check one-time tokens
        if token.token_type in [TokenType.PASSWORD_RESET, TokenType.EMAIL_VERIFICATION]:
            if token.used:
                raise TokenAlreadyUsedException("Token has already been used")
        
        return token
    
    async def get_by_user_and_type(
        self,
        user_id: UUID,
        token_type: TokenType
    ) -> Optional[RefreshToken]:
        """
        Get the latest token for a user of a specific type.
        
        Args:
            user_id: User UUID
            token_type: Type of token
            
        Returns:
            Latest RefreshToken entity or None
        """
        query = select(RefreshTokenModel).where(
            and_(
                RefreshTokenModel.user_id == user_id,
                RefreshTokenModel.token_type == token_type.value
            )
        ).order_by(RefreshTokenModel.created_at.desc()).limit(1)
        
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if model:
            return self._model_to_entity(model)
        return None
    
    async def mark_used(self, token_id: UUID) -> None:
        """
        Mark a token as used.
        
        For one-time tokens (password_reset, email_verification).
        
        Args:
            token_id: Token UUID
        """
        query = select(RefreshTokenModel).where(
            RefreshTokenModel.id == token_id
        )
        
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if model:
            model.used = True
            await self.session.flush()
            logger.info(f"Marked token as used: {token_id}")
    
    async def revoke(self, token_id: UUID) -> None:
        """
        Revoke a token by deleting it.
        
        Args:
            token_id: Token UUID
        """
        query = select(RefreshTokenModel).where(
            RefreshTokenModel.id == token_id
        )
        
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if model:
            await self.session.delete(model)
            await self.session.flush()
            logger.info(f"Revoked token: {token_id}")
    
    async def revoke_all_for_user(self, user_id: UUID, token_type: Optional[TokenType] = None) -> int:
        """
        Revoke all tokens for a user.
        
        Args:
            user_id: User UUID
            token_type: Optional type to filter (None = all types)
            
        Returns:
            Number of tokens revoked
        """
        conditions = [RefreshTokenModel.user_id == user_id]
        
        if token_type:
            conditions.append(RefreshTokenModel.token_type == token_type.value)
        
        # Count first
        count_query = select(RefreshTokenModel).where(and_(*conditions))
        result = await self.session.execute(count_query)
        count = len(result.scalars().all())
        
        # Delete
        delete_stmt = delete(RefreshTokenModel).where(and_(*conditions))
        await self.session.execute(delete_stmt)
        await self.session.flush()
        
        logger.info(f"Revoked {count} tokens for user: {user_id}")
        return count
    
    async def cleanup_expired_tokens(self) -> int:
        """
        Delete all expired tokens.
        
        Should be run periodically to clean up database.
        
        Returns:
            Number of tokens deleted
        """
        now = datetime.utcnow()
        
        # Count first
        count_query = select(RefreshTokenModel).where(
            RefreshTokenModel.expires_at < now
        )
        result = await self.session.execute(count_query)
        count = len(result.scalars().all())
        
        # Delete expired
        delete_stmt = delete(RefreshTokenModel).where(
            RefreshTokenModel.expires_at < now
        )
        await self.session.execute(delete_stmt)
        await self.session.flush()
        
        logger.info(f"Cleaned up {count} expired tokens")
        return count
    
    async def invalidate_previous_tokens(
        self,
        user_id: UUID,
        token_type: TokenType
    ) -> int:
        """
        Invalidate all previous tokens of a type for a user.
        
        Used when generating a new password reset or email verification token.
        
        Args:
            user_id: User UUID
            token_type: Type of token
            
        Returns:
            Number of tokens invalidated
        """
        return await self.revoke_all_for_user(user_id, token_type)
