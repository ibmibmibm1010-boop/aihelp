from __future__ import annotations

import uuid

from fastapi import HTTPException, status

from app.models.board_column import BoardColumn
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceRole
from app.repositories.board import BoardRepository
from app.repositories.column import ColumnRepository
from app.repositories.workspace import WorkspaceRepository
from app.schemas.column import ColumnCreate


class ColumnService:
    def __init__(
        self,
        board_repo: BoardRepository,
        column_repo: ColumnRepository,
        workspace_repo: WorkspaceRepository,
    ) -> None:
        self._board_repo = board_repo
        self._column_repo = column_repo
        self._workspace_repo = workspace_repo

    async def create_column(
        self,
        board_id: uuid.UUID,
        data: ColumnCreate,
        current_user: User,
    ) -> BoardColumn:
        board = await self._board_repo.get_by_id(board_id)
        if board is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Доска не найдена",
            )

        workspace = await self._workspace_repo.get_by_id(board.workspace_id)
        if workspace is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Рабочее пространство не найдено",
            )

        if not await self._user_can_modify_board(workspace, current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для изменения этой доски",
            )

        position = await self._column_repo.count_by_board(board.id)
        return await self._column_repo.create(
            data,
            board_id=board.id,
            position=position,
        )

    async def _user_can_modify_board(
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
        if membership is None:
            return False

        return membership.role in (
            WorkspaceRole.ADMIN,
            WorkspaceRole.MEMBER,
        )
