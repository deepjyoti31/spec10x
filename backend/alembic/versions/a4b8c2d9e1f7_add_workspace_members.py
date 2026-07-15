"""Add v1.1 multi-user workspaces (members, active workspace) + outcome notification stamp

Revision ID: a4b8c2d9e1f7
Revises: d2e7f4a9c6b3
Create Date: 2026-07-14 21:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a4b8c2d9e1f7"
down_revision: Union[str, None] = "d2e7f4a9c6b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workspace_members",
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
            nullable=True,
        ),
        sa.Column("invited_email", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("owner", "member", name="workspace_member_role"),
            nullable=False,
            server_default="member",
        ),
        sa.Column(
            "status",
            sa.Enum("invited", "active", name="workspace_member_status"),
            nullable=False,
            server_default="invited",
        ),
        sa.Column(
            "invited_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint(
            "workspace_id", "invited_email", name="uq_workspace_members_email"
        ),
    )
    op.create_index(
        "ix_workspace_members_workspace_status",
        "workspace_members",
        ["workspace_id", "status"],
    )
    op.create_index(
        "ix_workspace_members_user_id", "workspace_members", ["user_id"]
    )
    op.create_index(
        "ix_workspace_members_invited_email", "workspace_members", ["invited_email"]
    )

    op.add_column(
        "users",
        sa.Column(
            "active_workspace_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
    )
    op.create_foreign_key(
        "fk_users_active_workspace_id",
        "users",
        "workspaces",
        ["active_workspace_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column(
        "specs",
        sa.Column("outcome_notified_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("specs", "outcome_notified_at")
    op.drop_constraint("fk_users_active_workspace_id", "users", type_="foreignkey")
    op.drop_column("users", "active_workspace_id")
    op.drop_index("ix_workspace_members_invited_email", table_name="workspace_members")
    op.drop_index("ix_workspace_members_user_id", table_name="workspace_members")
    op.drop_index(
        "ix_workspace_members_workspace_status", table_name="workspace_members"
    )
    op.drop_table("workspace_members")
    sa.Enum(name="workspace_member_role").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="workspace_member_status").drop(op.get_bind(), checkfirst=True)
