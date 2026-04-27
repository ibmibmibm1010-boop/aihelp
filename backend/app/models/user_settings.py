from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ThemeMode(StrEnum):
    LIGHT = "light"
    DARK = "dark"
    SYSTEM = "system"


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    theme_mode: Mapped[ThemeMode] = mapped_column(
        SAEnum(ThemeMode, native_enum=False, length=32),
        default=ThemeMode.SYSTEM,
    )
    accent_style: Mapped[str] = mapped_column(String(64), default="indigo")
    custom_background: Mapped[str | None] = mapped_column(String(512), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped["User"] = relationship("User", back_populates="settings")
