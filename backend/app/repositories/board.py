from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.board import Board
from app.schemas.board import BoardCreate


class BoardRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, board_id: uuid.UUID) -> Board | None:
        return await self._session.get(Board, board_id)

    async def list_by_workspace(self, workspace_id: uuid.UUID) -> list[Board]:
        result = await self._session.execute(
            select(Board)
            .where(Board.workspace_id == workspace_id)
            .order_by(Board.position.asc()),
        )
        return list(result.scalars().all())

    async def count_by_workspace(self, workspace_id: uuid.UUID) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(Board)
            .where(Board.workspace_id == workspace_id),
        )
        count = result.scalar_one()
        return int(count)

    async def create(
        self,
        obj_in: BoardCreate,
        owner_id: uuid.UUID,
        workspace_id: uuid.UUID,
        position: int,
    ) -> Board:
        board = Board(
            workspace_id=workspace_id,
            owner_id=owner_id,
            title=obj_in.title,
            description=obj_in.description,
            color=obj_in.color,
            is_favorite=obj_in.is_favorite,
            position=position,
        )
        self._session.add(board)
        await self._session.commit()
        await self._session.refresh(board)
        return board
