"""Add v1.0 Full Loop columns to specs (task breakdown + ship timestamp)

Revision ID: d2e7f4a9c6b3
Revises: b7c4d1e8f2a9
Create Date: 2026-07-14 18:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d2e7f4a9c6b3"
down_revision: Union[str, None] = "b7c4d1e8f2a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("specs", sa.Column("tasks_json", sa.JSON(), nullable=True))
    op.add_column(
        "specs",
        sa.Column("tasks_generated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "specs",
        sa.Column("shipped_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("specs", "shipped_at")
    op.drop_column("specs", "tasks_generated_at")
    op.drop_column("specs", "tasks_json")
