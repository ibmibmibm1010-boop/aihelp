from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.board_column import BoardColumn
from app.schemas.column import ColumnCreate


class ColumnRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, column_id: uuid.UUID) -> BoardColumn | None:
        return await self._session.get(BoardColumn, column_id)

    async def count_by_board(self, board_id: uuid.UUID) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(BoardColumn)
            .where(BoardColumn.board_id == board_id),
        )
        count = result.scalar_one()
        return int(count)

    async def create(
        self,
        obj_in: ColumnCreate,
        board_id: uuid.UUID,
        position: int,
    ) -> BoardColumn:
        column = BoardColumn(
            board_id=board_id,
            title=obj_in.title,
            position=position,
        )
        self._session.add(column)
        await self._session.commit()
        await self._session.refresh(column)
        return column
