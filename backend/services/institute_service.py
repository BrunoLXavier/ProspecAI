from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
import sqlalchemy as sa

from adapters.database.connection import get_session
from fastapi import Depends


class InstituteService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def user_belongs_to_institute(self, user_id: UUID, institute_id: UUID) -> bool:
        """Return True if the user is assigned to the institute."""
        q = sa.text("SELECT 1 FROM user_institutes WHERE user_id = :user_id AND institute_id = :institute_id LIMIT 1")
        res = await self.session.execute(q, {'user_id': str(user_id), 'institute_id': str(institute_id)})
        return res.scalars().first() is not None

    async def get_user_institute_ids(self, user_id: UUID) -> List[UUID]:
        q = sa.text("SELECT institute_id FROM user_institutes WHERE user_id = :user_id")
        res = await self.session.execute(q, {'user_id': str(user_id)})
        rows = res.scalars().all()
        return [UUID(str(r)) for r in rows]


async def get_institute_service(session: AsyncSession = Depends(get_session)) -> InstituteService:
    return InstituteService(session)
