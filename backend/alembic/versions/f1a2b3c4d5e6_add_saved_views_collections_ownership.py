"""Add saved views, collections, and interview/theme workspace ownership polish

Revision ID: f1a2b3c4d5e6
Revises: d4e9f6b8a2c3
Create Date: 2026-07-14 09:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "d4e9f6b8a2c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── saved_views ──
    op.create_table(
        "saved_views",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("filters_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.UniqueConstraint("workspace_id", "name", name="uq_saved_views_workspace_name"),
    )
    op.create_index(
        "ix_saved_views_workspace_user", "saved_views", ["workspace_id", "user_id"]
    )

    # ── collections ──
    op.create_table(
        "collections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )
    op.create_index("ix_collections_user_id", "collections", ["user_id"])

    # ── collection_interviews (association) ──
    op.create_table(
        "collection_interviews",
        sa.Column(
            "collection_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("collections.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "interview_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("interviews.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index(
        "ix_collection_interviews_interview", "collection_interviews", ["interview_id"]
    )

    # ── ownership polish: workspace_id + comment on interviews and themes ──
    op.add_column(
        "interviews",
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column("interviews", sa.Column("comment", sa.Text(), nullable=True))
    op.create_index("ix_interviews_workspace_id", "interviews", ["workspace_id"])

    op.add_column(
        "themes",
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column("themes", sa.Column("comment", sa.Text(), nullable=True))
    op.create_index("ix_themes_workspace_id", "themes", ["workspace_id"])

    # backfill workspace_id from each owner's personal workspace
    op.execute(
        """
        UPDATE interviews
        SET workspace_id = workspaces.id
        FROM workspaces
        WHERE workspaces.owner_user_id = interviews.user_id
          AND workspaces.kind = 'personal'
        """
    )
    op.execute(
        """
        UPDATE themes
        SET workspace_id = workspaces.id
        FROM workspaces
        WHERE workspaces.owner_user_id = themes.user_id
          AND workspaces.kind = 'personal'
        """
    )


def downgrade() -> None:
    op.drop_index("ix_themes_workspace_id", table_name="themes")
    op.drop_column("themes", "comment")
    op.drop_column("themes", "workspace_id")

    op.drop_index("ix_interviews_workspace_id", table_name="interviews")
    op.drop_column("interviews", "comment")
    op.drop_column("interviews", "workspace_id")

    op.drop_index("ix_collection_interviews_interview", table_name="collection_interviews")
    op.drop_table("collection_interviews")

    op.drop_index("ix_collections_user_id", table_name="collections")
    op.drop_table("collections")

    op.drop_index("ix_saved_views_workspace_user", table_name="saved_views")
    op.drop_table("saved_views")
