from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid, false, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Board(Base):
    __tablename__ = "boards"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    color: Mapped[str | None] = mapped_column(String(32), default=None)
    is_favorite: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=false(),
    )
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    workspace: Mapped["Workspace"] = relationship(
        "Workspace",
        back_populates="boards",
    )
    owner: Mapped["User | None"] = relationship(
        "User",
        back_populates="owned_boards",
    )
    columns: Mapped[list["BoardColumn"]] = relationship(
        "BoardColumn",
        back_populates="board",
        order_by="BoardColumn.position",
        cascade="all, delete-orphan",
    )
    tasks: Mapped[list["Task"]] = relationship(
        "Task",
        back_populates="board",
        cascade="all, delete-orphan",
    )
