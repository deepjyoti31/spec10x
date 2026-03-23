"""Add Sprint 6 board state and observability fields

Revision ID: c7d4e9f6b8a1
Revises: 9d04d8a7f3c1
Create Date: 2026-03-23 14:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c7d4e9f6b8a1"
down_revision: Union[str, None] = "9d04d8a7f3c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


theme_priority_state = postgresql.ENUM(
    "default",
    "pinned",
    "monitoring",
    name="theme_priority_state",
    create_type=False,
)


def upgrade() -> None:
    theme_priority_state.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "themes",
        sa.Column(
            "priority_state",
            sa.Enum(
                "default",
                "pinned",
                "monitoring",
                name="theme_priority_state",
            ),
            nullable=False,
            server_default="default",
        ),
    )
    op.create_index(
        "ix_themes_user_priority_state",
        "themes",
        ["user_id", "priority_state"],
        unique=False,
    )

    op.add_column(
        "sync_runs",
        sa.Column("records_unchanged", sa.Integer(), nullable=False, server_default="0"),
    )

    op.alter_column("themes", "priority_state", server_default=None)
    op.alter_column("sync_runs", "records_unchanged", server_default=None)


def downgrade() -> None:
    op.drop_column("sync_runs", "records_unchanged")
    op.drop_index("ix_themes_user_priority_state", table_name="themes")
    op.drop_column("themes", "priority_state")
    theme_priority_state.drop(op.get_bind(), checkfirst=True)
