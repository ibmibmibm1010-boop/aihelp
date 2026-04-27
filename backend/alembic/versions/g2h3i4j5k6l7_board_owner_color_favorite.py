"""boards: owner_id, color, is_favorite

Revision ID: g2h3i4j5k6l7
Revises: c4d5e6f7a8b9
Create Date: 2026-04-07

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "g2h3i4j5k6l7"
down_revision: Union[str, None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "boards",
        sa.Column("owner_id", sa.Uuid(as_uuid=True), nullable=True),
    )
    op.add_column(
        "boards",
        sa.Column("color", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "boards",
        sa.Column(
            "is_favorite",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
    )
    op.create_foreign_key(
        "fk_boards_owner_id_users",
        "boards",
        "users",
        ["owner_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("ix_boards_owner_id", "boards", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_boards_owner_id", table_name="boards")
    op.drop_constraint("fk_boards_owner_id_users", "boards", type_="foreignkey")
    op.drop_column("boards", "is_favorite")
    op.drop_column("boards", "color")
    op.drop_column("boards", "owner_id")
