from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    String,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.billing_event import BillingEvent
    from app.models.user import User
    from app.models.workspace import Workspace


class SubscriptionPlan(StrEnum):
    FREE = "free"
    PRO = "pro"
    TEAM = "team"
    ENTERPRISE = "enterprise"


class BillingSubscriptionStatus(StrEnum):
    ACTIVE = "active"
    TRIALING = "trialing"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    UNPAID = "unpaid"
    PAUSED = "paused"


class Subscription(Base):
    __tablename__ = "subscriptions"
    __table_args__ = (
        CheckConstraint(
            "(user_id IS NOT NULL AND workspace_id IS NULL) OR "
            "(user_id IS NULL AND workspace_id IS NOT NULL)",
            name="ck_subscription_user_xor_workspace",
        ),
        Index(
            "uq_subscriptions_user_id",
            "user_id",
            unique=True,
            postgresql_where=text("user_id IS NOT NULL"),
        ),
        Index(
            "uq_subscriptions_workspace_id",
            "workspace_id",
            unique=True,
            postgresql_where=text("workspace_id IS NOT NULL"),
        ),
        Index(
            "uq_subscriptions_stripe_subscription_id",
            "stripe_subscription_id",
            unique=True,
            postgresql_where=text("stripe_subscription_id IS NOT NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    plan: Mapped[SubscriptionPlan] = mapped_column(
        SAEnum(SubscriptionPlan, native_enum=False, length=32),
        default=SubscriptionPlan.FREE,
    )
    status: Mapped[BillingSubscriptionStatus] = mapped_column(
        SAEnum(BillingSubscriptionStatus, native_enum=False, length=32),
        default=BillingSubscriptionStatus.ACTIVE,
    )
    period_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    user: Mapped[User | None] = relationship(
        "User",
        back_populates="billing_subscription",
        foreign_keys=[user_id],
    )
    workspace: Mapped[Workspace | None] = relationship(
        "Workspace",
        back_populates="billing_subscription",
        foreign_keys=[workspace_id],
    )
    billing_events: Mapped[list[BillingEvent]] = relationship(
        "BillingEvent",
        back_populates="subscription",
        cascade="all, delete-orphan",
    )
