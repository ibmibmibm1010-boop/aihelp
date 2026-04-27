from __future__ import annotations

import uuid

from fastapi import HTTPException, status

from app.models.task import Task
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceRole
from app.repositories.board import BoardRepository
from app.repositories.column import ColumnRepository
from app.repositories.task import TaskRepository
from app.repositories.user import UserRepository
from app.repositories.workspace import WorkspaceRepository
from app.schemas.task import TaskCreate, TaskUpdate


class TaskService:
    def __init__(
        self,
        board_repo: BoardRepository,
        column_repo: ColumnRepository,
        task_repo: TaskRepository,
        workspace_repo: WorkspaceRepository,
        user_repo: UserRepository,
    ) -> None:
        self._board_repo = board_repo
        self._column_repo = column_repo
        self._task_repo = task_repo
        self._workspace_repo = workspace_repo
        self._user_repo = user_repo

    async def create_task(self, data: TaskCreate, current_user: User) -> Task:
        board = await self._board_repo.get_by_id(data.board_id)
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

        column = await self._column_repo.get_by_id(data.column_id)
        if column is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Колонка не найдена",
            )

        if column.board_id != board.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Колонка не принадлежит этой доске",
            )

        return await self._task_repo.create(data)

    async def update_task(
        self,
        task_id: uuid.UUID,
        data: TaskUpdate,
        current_user: User,
    ) -> Task:
        task = await self._task_repo.get_by_id(task_id)
        if task is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Задача не найдена",
            )

        board = await self._board_repo.get_by_id(task.board_id)
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

        patch = data.model_dump(exclude_unset=True)

        if "board_id" in patch and "column_id" not in patch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Укажите column_id при смене доски",
            )

        if "assignee_id" in patch and patch["assignee_id"] is not None:
            assignee = await self._user_repo.get_by_id(patch["assignee_id"])
            if assignee is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Исполнитель не найден",
                )

        position_override: int | None = None

        if "column_id" in patch or "board_id" in patch:
            target_column_id = patch.get("column_id", task.column_id)
            column = await self._column_repo.get_by_id(target_column_id)
            if column is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Колонка не найдена",
                )

            if "board_id" in patch:
                target_board_id = patch["board_id"]
                if column.board_id != target_board_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Колонка не принадлежит указанной доске",
                    )
            else:
                target_board_id = column.board_id

            target_board = await self._board_repo.get_by_id(target_board_id)
            if target_board is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Доска не найдена",
                )

            if column.board_id != target_board.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Колонка не принадлежит указанной доске",
                )

            workspace_target = await self._workspace_repo.get_by_id(
                target_board.workspace_id,
            )
            if workspace_target is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Рабочее пространство не найдено",
                )

            if not await self._user_can_modify_board(
                workspace_target,
                current_user.id,
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Недостаточно прав для изменения целевой доски",
                )

            if (
                target_board_id != task.board_id
                or target_column_id != task.column_id
            ):
                position_override = await self._task_repo.count_by_column(
                    target_column_id,
                )

        return await self._task_repo.update(
            task,
            data,
            position=position_override,
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
