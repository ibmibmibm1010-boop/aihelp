from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ColumnCreate(BaseModel):
    """Данные для создания колонки на доске."""

    title: str = Field(min_length=1, max_length=255)


class ColumnResponse(BaseModel):
    """Публичное представление колонки для API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    board_id: uuid.UUID
    title: str
    position: int
    created_at: datetime
    updated_at: datetime
