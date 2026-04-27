"""subscriptions and billing_events

Revision ID: f1a2b3c4d5e6
Revises: e5f6a1b2c3d4
Create Date: 2026-04-07

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "e5f6a1b2c3d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("workspace_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column(
            "plan",
            sa.String(length=32),
            server_default="free",
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default="active",
            nullable=False,
        ),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stripe_customer_id", sa.String(length=255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True),
        sa.CheckConstraint(
            "(user_id IS NOT NULL AND workspace_id IS NULL) OR "
            "(user_id IS NULL AND workspace_id IS NOT NULL)",
            name="ck_subscription_user_xor_workspace",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])
    op.create_index("ix_subscriptions_workspace_id", "subscriptions", ["workspace_id"])
    op.create_index(
        "uq_subscriptions_user_id",
        "subscriptions",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("user_id IS NOT NULL"),
    )
    op.create_index(
        "uq_subscriptions_workspace_id",
        "subscriptions",
        ["workspace_id"],
        unique=True,
        postgresql_where=sa.text("workspace_id IS NOT NULL"),
    )
    op.create_index(
        "uq_subscriptions_stripe_subscription_id",
        "subscriptions",
        ["stripe_subscription_id"],
        unique=True,
        postgresql_where=sa.text("stripe_subscription_id IS NOT NULL"),
    )

    op.create_table(
        "billing_events",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("subscription_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=255), nullable=False),
        sa.Column("payload_json", JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["subscription_id"],
            ["subscriptions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_billing_events_subscription_id",
        "billing_events",
        ["subscription_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_billing_events_subscription_id", table_name="billing_events")
    op.drop_table("billing_events")
    op.drop_index(
        "uq_subscriptions_stripe_subscription_id",
        table_name="subscriptions",
    )
    op.drop_index("uq_subscriptions_workspace_id", table_name="subscriptions")
    op.drop_index("uq_subscriptions_user_id", table_name="subscriptions")
    op.drop_index("ix_subscriptions_workspace_id", table_name="subscriptions")
    op.drop_index("ix_subscriptions_user_id", table_name="subscriptions")
    op.drop_table("subscriptions")
