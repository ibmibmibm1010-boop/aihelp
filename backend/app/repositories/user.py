from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_email(self, email: str) -> User | None:
        result = await self._session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return await self._session.get(User, user_id)

    async def create(self, obj_in: UserCreate) -> User:
        user = User(
            email=obj_in.email,
            username=obj_in.username,
            full_name=obj_in.full_name,
            is_active=obj_in.is_active,
            password_hash=obj_in.password_hash,
        )
        self._session.add(user)
        await self._session.commit()
        await self._session.refresh(user)
        return user
