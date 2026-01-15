# Login Attempt Repository
# Adapters Layer - Database operations for rate limiting
# Implements RNF-02: Rate limiting for brute force protection

from datetime import datetime, timedelta
from typing import Optional, Tuple
from uuid import UUID, uuid4
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, delete, func

from adapters.database.models import LoginAttemptModel

logger = logging.getLogger(__name__)


class LoginAttemptRepository:
    """
    Repository for login attempt tracking and rate limiting.
    
    Tracks failed login attempts per email address to prevent brute force attacks.
    Rate limiting is per email (not per IP) as specified.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def record_attempt(
        self,
        email: str,
        ip_address: str,
        success: bool,
        tenant_id: Optional[UUID] = None
    ) -> None:
        """
        Record a login attempt.
        
        Args:
            email: Email used in attempt
            ip_address: IP address of client
            success: Whether login was successful
            tenant_id: Optional tenant ID
        """
        model = LoginAttemptModel(
            id=uuid4(),
            email=email.lower().strip(),
            ip_address=ip_address,
            success=success
        )
        
        self.session.add(model)
        await self.session.flush()
        
        logger.info(
            f"Recorded login attempt for {email}: "
            f"{'success' if success else 'failed'} from {ip_address}"
        )
    
    async def get_failed_attempts_count(
        self,
        email: str,
        window_minutes: int = 15
    ) -> int:
        """
        Count failed login attempts for an email within time window.
        
        Args:
            email: Email to check
            window_minutes: Time window in minutes (default 15)
            
        Returns:
            Number of failed attempts
        """
        since = datetime.utcnow() - timedelta(minutes=window_minutes)
        
        query = select(func.count(LoginAttemptModel.id)).where(
            and_(
                LoginAttemptModel.email == email.lower().strip(),
                LoginAttemptModel.success == False,
                LoginAttemptModel.timestamp >= since
            )
        )
        
        result = await self.session.execute(query)
        count = result.scalar_one()
        
        return count
    
    async def get_lockout_status(
        self,
        email: str,
        max_attempts: int = 5,
        window_minutes: int = 15
    ) -> Tuple[bool, int, Optional[datetime]]:
        """
        Check if an email is currently locked out.
        
        Args:
            email: Email to check
            max_attempts: Maximum allowed failed attempts (default 5)
            window_minutes: Time window in minutes (default 15)
            
        Returns:
            Tuple of (is_locked, attempts_count, lockout_ends_at)
        """
        failed_count = await self.get_failed_attempts_count(email, window_minutes)
        is_locked = failed_count >= max_attempts
        
        lockout_ends_at = None
        if is_locked:
            # Get the timestamp of the most recent failed attempt
            query = select(LoginAttemptModel.timestamp).where(
                and_(
                    LoginAttemptModel.email == email.lower().strip(),
                    LoginAttemptModel.success == False
                )
            ).order_by(LoginAttemptModel.timestamp.desc()).limit(1)
            
            result = await self.session.execute(query)
            last_attempt = result.scalar_one_or_none()
            
            if last_attempt:
                lockout_ends_at = last_attempt + timedelta(minutes=window_minutes)
        
        return is_locked, failed_count, lockout_ends_at
    
    async def get_remaining_attempts(
        self,
        email: str,
        max_attempts: int = 5,
        window_minutes: int = 15
    ) -> int:
        """
        Get remaining login attempts before lockout.
        
        Args:
            email: Email to check
            max_attempts: Maximum allowed failed attempts
            window_minutes: Time window in minutes
            
        Returns:
            Number of remaining attempts (minimum 0)
        """
        failed_count = await self.get_failed_attempts_count(email, window_minutes)
        remaining = max_attempts - failed_count
        return max(0, remaining)
    
    async def clear_attempts(self, email: str) -> int:
        """
        Clear all login attempts for an email.
        
        Called after successful login.
        
        Args:
            email: Email to clear attempts for
            
        Returns:
            Number of attempts cleared
        """
        # Count first
        count_query = select(func.count(LoginAttemptModel.id)).where(
            LoginAttemptModel.email == email.lower().strip()
        )
        result = await self.session.execute(count_query)
        count = result.scalar_one()
        
        # Delete
        delete_stmt = delete(LoginAttemptModel).where(
            LoginAttemptModel.email == email.lower().strip()
        )
        await self.session.execute(delete_stmt)
        await self.session.flush()
        
        logger.info(f"Cleared {count} login attempts for {email}")
        return count
    
    async def clear_old_attempts(self, retention_days: int = 30) -> int:
        """
        Clean up old login attempts.
        
        Should be run periodically to clean up database.
        
        Args:
            retention_days: Days to retain attempts (default 30)
            
        Returns:
            Number of attempts deleted
        """
        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        
        # Count first
        count_query = select(func.count(LoginAttemptModel.id)).where(
            LoginAttemptModel.timestamp < cutoff
        )
        result = await self.session.execute(count_query)
        count = result.scalar_one()
        
        # Delete
        delete_stmt = delete(LoginAttemptModel).where(
            LoginAttemptModel.timestamp < cutoff
        )
        await self.session.execute(delete_stmt)
        await self.session.flush()
        
        logger.info(f"Cleaned up {count} old login attempts")
        return count
    
    async def get_recent_attempts_by_ip(
        self,
        ip_address: str,
        window_minutes: int = 60,
        limit: int = 100
    ) -> int:
        """
        Get count of all attempts from an IP address.
        
        Useful for detecting distributed attacks.
        
        Args:
            ip_address: IP address to check
            window_minutes: Time window in minutes
            limit: Maximum to count
            
        Returns:
            Number of attempts from IP
        """
        since = datetime.utcnow() - timedelta(minutes=window_minutes)
        
        query = select(func.count(LoginAttemptModel.id)).where(
            and_(
                LoginAttemptModel.ip_address == ip_address,
                LoginAttemptModel.timestamp >= since
            )
        )
        
        result = await self.session.execute(query)
        count = result.scalar_one()
        
        return min(count, limit)
