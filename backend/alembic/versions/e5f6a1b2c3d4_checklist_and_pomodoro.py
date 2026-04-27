"""checklist items and pomodoro_sessions

Revision ID: e5f6a1b2c3d4
Revises: d4e5f6a1b2c3
Create Date: 2026-04-07

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e5f6a1b2c3d4"
down_revision: Union[str, None] = "d4e5f6a1b2c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "task_checklist_items",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("task_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column(
            "is_done",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "position",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_task_checklist_items_task_id",
        "task_checklist_items",
        ["task_id"],
    )
    op.create_table(
        "pomodoro_sessions",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("task_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("paused_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default="active",
            nullable=False,
        ),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pomodoro_sessions_task_id",
        "pomodoro_sessions",
        ["task_id"],
    )
    op.create_index(
        "ix_pomodoro_sessions_user_id",
        "pomodoro_sessions",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_pomodoro_sessions_user_id", table_name="pomodoro_sessions")
    op.drop_index("ix_pomodoro_sessions_task_id", table_name="pomodoro_sessions")
    op.drop_table("pomodoro_sessions")
    op.drop_index("ix_task_checklist_items_task_id", table_name="task_checklist_items")
    op.drop_table("task_checklist_items")
