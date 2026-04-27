from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class PomodoroSessionStatus(StrEnum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PomodoroSession(Base):
    __tablename__ = "pomodoro_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    paused_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=None,
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=None,
    )
    status: Mapped[PomodoroSessionStatus] = mapped_column(
        SAEnum(PomodoroSessionStatus, native_enum=False, length=32),
        default=PomodoroSessionStatus.ACTIVE,
    )
    duration_seconds: Mapped[int | None] = mapped_column(Integer, default=None)

    task: Mapped["Task"] = relationship("Task", back_populates="pomodoro_sessions")
    user: Mapped["User"] = relationship("User", back_populates="pomodoro_sessions")
