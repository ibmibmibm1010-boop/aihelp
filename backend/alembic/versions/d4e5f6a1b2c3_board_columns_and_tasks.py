"""board_columns and tasks

Revision ID: d4e5f6a1b2c3
Revises: c3d4e5f6a1b2
Create Date: 2026-04-07

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4e5f6a1b2c3"
down_revision: Union[str, None] = "c3d4e5f6a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "board_columns",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("board_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
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
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["board_id"], ["boards.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_board_columns_board_id", "board_columns", ["board_id"])
    op.create_table(
        "tasks",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("board_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("column_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("assignee_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "priority",
            sa.String(length=32),
            server_default="medium",
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default="todo",
            nullable=False,
        ),
        sa.Column(
            "position",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column("estimated_time", sa.Integer(), nullable=True),
        sa.Column(
            "spent_time",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column("recurrence_rule", sa.String(length=512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["assignee_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["board_id"], ["boards.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["column_id"], ["board_columns.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tasks_assignee_id", "tasks", ["assignee_id"])
    op.create_index("ix_tasks_board_id", "tasks", ["board_id"])
    op.create_index("ix_tasks_column_id", "tasks", ["column_id"])


def downgrade() -> None:
    op.drop_index("ix_tasks_column_id", table_name="tasks")
    op.drop_index("ix_tasks_board_id", table_name="tasks")
    op.drop_index("ix_tasks_assignee_id", table_name="tasks")
    op.drop_table("tasks")
    op.drop_index("ix_board_columns_board_id", table_name="board_columns")
    op.drop_table("board_columns")
