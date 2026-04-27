from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class TaskPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(StrEnum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    board_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("boards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    column_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("board_columns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=None,
    )
    priority: Mapped[TaskPriority] = mapped_column(
        SAEnum(TaskPriority, native_enum=False, length=32),
        default=TaskPriority.MEDIUM,
    )
    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(TaskStatus, native_enum=False, length=32),
        default=TaskStatus.TODO,
    )
    position: Mapped[int] = mapped_column(Integer, default=0)
    estimated_time: Mapped[int | None] = mapped_column(Integer, default=None)
    spent_time: Mapped[int] = mapped_column(Integer, default=0)
    recurrence_rule: Mapped[str | None] = mapped_column(String(512), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    board: Mapped["Board"] = relationship("Board", back_populates="tasks")
    column: Mapped["BoardColumn"] = relationship(
        "BoardColumn",
        back_populates="tasks",
    )
    assignee: Mapped["User | None"] = relationship(
        "User",
        back_populates="assigned_tasks",
    )
    checklist_items: Mapped[list["TaskChecklistItem"]] = relationship(
        "TaskChecklistItem",
        back_populates="task",
        order_by="TaskChecklistItem.position",
        cascade="all, delete-orphan",
    )
    pomodoro_sessions: Mapped[list["PomodoroSession"]] = relationship(
        "PomodoroSession",
        back_populates="task",
        cascade="all, delete-orphan",
    )
