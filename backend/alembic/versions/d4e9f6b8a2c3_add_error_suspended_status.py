"""Add error_suspended status to source_connection_status enum

Revision ID: d4e9f6b8a2c3
Revises: e8f2a1b9c4d7
Create Date: 2026-07-10 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4e9f6b8a2c3"
down_revision: Union[str, None] = "e8f2a1b9c4d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL allows ALTER TYPE ... ADD VALUE inside a transaction block in v12+
    # as long as the new value is not referenced in the same transaction.
    op.execute("ALTER TYPE source_connection_status ADD VALUE 'error_suspended'")


def downgrade() -> None:
    # PostgreSQL doesn't support removing values from an ENUM type.
    # Downgrade can be a no-op or recreate the enum. Recreating the enum
    # is complex and risky if data exists, so we leave it as no-op.
    pass
