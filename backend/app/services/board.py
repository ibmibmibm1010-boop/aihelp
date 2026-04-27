from __future__ import annotations

import uuid

from fastapi import HTTPException, status

from app.models.board import Board
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceRole
from app.repositories.board import BoardRepository
from app.repositories.workspace import WorkspaceRepository
from app.schemas.board import BoardCreate


class BoardService:
    def __init__(
        self,
        board_repo: BoardRepository,
        workspace_repo: WorkspaceRepository,
    ) -> None:
        self._board_repo = board_repo
        self._workspace_repo = workspace_repo

    async def create_board(self, data: BoardCreate, current_user: User) -> Board:
        if data.workspace_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Не указан workspace_id",
            )

        workspace = await self._workspace_repo.get_by_id(data.workspace_id)
        if workspace is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Рабочее пространство не найдено",
            )

        if not await self._user_can_create_board(
            workspace_owner_id=workspace.owner_id,
            workspace_id=workspace.id,
            user_id=current_user.id,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для создания доски в этом пространстве",
            )

        count = await self._board_repo.count_by_workspace(workspace.id)
        position = count

        return await self._board_repo.create(
            data,
            owner_id=current_user.id,
            workspace_id=workspace.id,
            position=position,
        )

    async def list_boards(
        self,
        workspace_id: uuid.UUID,
        current_user: User,
    ) -> list[Board]:
        workspace = await self._workspace_repo.get_by_id(workspace_id)
        if workspace is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Рабочее пространство не найдено",
            )

        if not await self._user_can_access_workspace(workspace, current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к этому рабочему пространству",
            )

        return await self._board_repo.list_by_workspace(workspace_id)

    async def _user_can_access_workspace(
        self,
        workspace: Workspace,
        user_id: uuid.UUID,
    ) -> bool:
        if user_id == workspace.owner_id:
            return True

        membership = await self._workspace_repo.get_membership(
            workspace.id,
            user_id,
        )
        return membership is not None

    async def _user_can_create_board(
        self,
        workspace_owner_id: uuid.UUID,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        if user_id == workspace_owner_id:
            return True

        membership = await self._workspace_repo.get_membership(
            workspace_id,
            user_id,
        )
        if membership is None:
            return False

        return membership.role in (
            WorkspaceRole.ADMIN,
            WorkspaceRole.MEMBER,
        )
