
# Database Configuration and Session Management
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL Configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:changeme@localhost:5432/prospecai"
)

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("DEBUG", "false").lower() == "true",
    pool_pre_ping=True,
    poolclass=NullPool if os.getenv("ENVIRONMENT") == "test" else None,
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def set_tenant_context(session: AsyncSession, tenant_id: Optional[str]) -> None:
    """
    Set the tenant context for Row-Level Security in PostgreSQL.
    
    This must be called before any RLS-protected table operations.
    """
    if tenant_id:
        await session.execute(text(f"SET app.current_tenant = '{tenant_id}'"))
        await session.execute(text(f"SET app.current_tenant_id = '{tenant_id}'"))


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for FastAPI to get database sessions.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Implements RF-01: Test infrastructure fixture
# Export a FastAPI-compatible dependency function for obtaining DB sessions
get_session = get_db


@asynccontextmanager
async def get_db_context():
    """
    Context manager for database sessions outside FastAPI.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
