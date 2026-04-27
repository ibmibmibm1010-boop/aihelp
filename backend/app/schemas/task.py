from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.task import TaskPriority


class TaskCreate(BaseModel):
    """Данные для создания задачи."""

    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=10000)
    due_date: datetime | None = None
    priority: TaskPriority = TaskPriority.MEDIUM
    column_id: uuid.UUID
    board_id: uuid.UUID


class TaskUpdate(BaseModel):
    """Частичное обновление задачи."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=10000)
    due_date: datetime | None = None
    priority: TaskPriority | None = None
    column_id: uuid.UUID | None = None
    board_id: uuid.UUID | None = None
    assignee_id: uuid.UUID | None = None
    estimated_time: int | None = Field(default=None, ge=0)


class TaskResponse(BaseModel):
    """Публичное представление задачи для API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None
    due_date: datetime | None
    priority: TaskPriority
    column_id: uuid.UUID
    board_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
