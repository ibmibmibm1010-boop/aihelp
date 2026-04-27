from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    """Данные для создания пользователя; `password_hash` передаётся из сервиса после хэширования."""

    email: EmailStr
    username: str = Field(min_length=1, max_length=255)
    password_hash: str = Field(min_length=1, max_length=255)
    full_name: str | None = Field(default=None, max_length=255)
    is_active: bool = True


class UserResponse(BaseModel):
    """Публичное представление пользователя для API (без секретов)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    username: str | None
    full_name: str | None
    is_active: bool
    created_at: datetime
