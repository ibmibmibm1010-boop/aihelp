from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember


class WorkspaceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, workspace_id: uuid.UUID) -> Workspace | None:
        return await self._session.get(Workspace, workspace_id)

    async def get_membership(
        self,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> WorkspaceMember | None:
        result = await self._session.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            ),
        )
        return result.scalar_one_or_none()
