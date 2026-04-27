from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskStatus
from app.schemas.task import TaskCreate, TaskUpdate


class TaskRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def count_by_column(self, column_id: uuid.UUID) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(Task)
            .where(Task.column_id == column_id),
        )
        count = result.scalar_one()
        return int(count)

    async def list_by_board(self, board_id: uuid.UUID) -> list[Task]:
        result = await self._session.execute(
            select(Task)
            .where(Task.board_id == board_id)
            .order_by(Task.column_id.asc(), Task.position.asc()),
        )
        return list(result.scalars().all())

    async def get_by_id(self, task_id: uuid.UUID) -> Task | None:
        return await self._session.get(Task, task_id)

    async def create(self, obj_in: TaskCreate) -> Task:
        position = await self.count_by_column(obj_in.column_id)
        task = Task(
            board_id=obj_in.board_id,
            column_id=obj_in.column_id,
            title=obj_in.title,
            description=obj_in.description,
            due_date=obj_in.due_date,
            priority=obj_in.priority,
            status=TaskStatus.TODO,
            position=position,
        )
        self._session.add(task)
        await self._session.commit()
        await self._session.refresh(task)
        return task

    async def update(
        self,
        task: Task,
        obj_in: TaskUpdate,
        *,
        position: int | None = None,
    ) -> Task:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)
        if position is not None:
            task.position = position
        await self._session.commit()
        await self._session.refresh(task)
        return task

    async def delete(self, task: Task) -> None:
        await self._session.delete(task)
        await self._session.commit()
