from __future__ import annotations

import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class AnalyticsSnapshot(Base):
    """Предрассчитанные дневные агрегаты аналитики пользователя."""

    __tablename__ = "analytics_snapshots"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    snapshot_date: Mapped[date] = mapped_column("date", Date, primary_key=True)
    completed_tasks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    focus_time_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    streak_value: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user: Mapped[User] = relationship("User", back_populates="analytics_snapshots")
