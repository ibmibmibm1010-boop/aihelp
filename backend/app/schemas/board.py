from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BoardBase(BaseModel):
    """Общие поля доски."""

    title: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    color: str | None = Field(default=None, max_length=32)
    is_favorite: bool = False


class BoardCreate(BoardBase):
    """Создание доски."""

    workspace_id: uuid.UUID | None = None


class BoardUpdate(BaseModel):
    """Частичное обновление доски."""

    title: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    color: str | None = Field(default=None, max_length=32)
    is_favorite: bool | None = None
    workspace_id: uuid.UUID | None = None


class BoardResponse(BaseModel):
    """Публичное представление доски для API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    workspace_id: uuid.UUID
    title: str
    description: str | None
    color: str | None
    is_favorite: bool
    position: int
    created_at: datetime
    updated_at: datetime
