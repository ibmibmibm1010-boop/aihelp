from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, String, Uuid, func, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.analytics_snapshot import AnalyticsSnapshot
    from app.models.board import Board
    from app.models.pomodoro_session import PomodoroSession
    from app.models.subscription import Subscription
    from app.models.task import Task
    from app.models.user_settings import UserSettings
    from app.models.workspace import Workspace
    from app.models.workspace_member import WorkspaceMember


class SubscriptionStatus(StrEnum):
    FREE = "free"
    PREMIUM = "premium"
    CANCELLED = "cancelled"
    PAST_DUE = "past_due"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
        index=True,
    )
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=true(),
        default=True,
    )
    password_hash: Mapped[str] = mapped_column(String(255))
    subscription_status: Mapped[SubscriptionStatus] = mapped_column(
        SAEnum(SubscriptionStatus, native_enum=False, length=32),
        default=SubscriptionStatus.FREE,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    settings: Mapped[UserSettings | None] = relationship(
        "UserSettings",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    owned_workspaces: Mapped[list[Workspace]] = relationship(
        "Workspace",
        back_populates="owner",
    )
    owned_boards: Mapped[list["Board"]] = relationship(
        "Board",
        back_populates="owner",
    )
    workspace_memberships: Mapped[list[WorkspaceMember]] = relationship(
        "WorkspaceMember",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    assigned_tasks: Mapped[list[Task]] = relationship(
        "Task",
        back_populates="assignee",
    )
    pomodoro_sessions: Mapped[list[PomodoroSession]] = relationship(
        "PomodoroSession",
        back_populates="user",
    )
    billing_subscription: Mapped[Subscription | None] = relationship(
        "Subscription",
        back_populates="user",
        uselist=False,
    )
    analytics_snapshots: Mapped[list[AnalyticsSnapshot]] = relationship(
        "AnalyticsSnapshot",
        back_populates="user",
        cascade="all, delete-orphan",
    )
