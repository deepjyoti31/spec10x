"""Add specs table for the v0.8 Specification Engine

Revision ID: b7c4d1e8f2a9
Revises: f1a2b3c4d5e6
Create Date: 2026-07-14 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "b7c4d1e8f2a9"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

spec_status = postgresql.ENUM(
    "draft",
    "in_review",
    "needs_changes",
    "approved",
    "in_dev",
    "shipped",
    name="spec_status",
    create_type=False,
)
spec_generation_status = postgresql.ENUM(
    "generating",
    "ready",
    "error",
    name="spec_generation_status",
    create_type=False,
)


def upgrade() -> None:
    spec_status.create(op.get_bind(), checkfirst=True)
    spec_generation_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "specs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "theme_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("themes.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("theme_name_snapshot", sa.String(512), nullable=False, server_default=""),
        sa.Column("title", sa.String(512), nullable=False, server_default=""),
        sa.Column("status", spec_status, nullable=False, server_default="draft"),
        sa.Column(
            "generation_status",
            spec_generation_status,
            nullable=False,
            server_default="generating",
        ),
        sa.Column("generation_error", sa.Text(), nullable=True),
        sa.Column("sections_json", sa.JSON(), nullable=True),
        sa.Column("evidence_json", sa.JSON(), nullable=True),
        sa.Column("impact_score_snapshot", sa.Float(), nullable=True),
        sa.Column("model_used", sa.String(255), nullable=True),
        sa.Column("is_edited", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )
    op.create_index("ix_specs_user_status", "specs", ["user_id", "status"])
    op.create_index("ix_specs_theme_id", "specs", ["theme_id"])


def downgrade() -> None:
    op.drop_index("ix_specs_theme_id", table_name="specs")
    op.drop_index("ix_specs_user_status", table_name="specs")
    op.drop_table("specs")
    spec_generation_status.drop(op.get_bind(), checkfirst=True)
    spec_status.drop(op.get_bind(), checkfirst=True)
