"""Add workspace and source foundation tables

Revision ID: 9d04d8a7f3c1
Revises: a423c97f74ff
Create Date: 2026-03-16 17:15:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "9d04d8a7f3c1"
down_revision: Union[str, None] = "a423c97f74ff"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


workspace_kind = postgresql.ENUM(
    "personal",
    "shared",
    name="workspace_kind",
    create_type=False,
)
source_type = postgresql.ENUM(
    "interview",
    "support",
    "survey",
    "analytics",
    name="source_type",
    create_type=False,
)
connection_method = postgresql.ENUM(
    "native_upload",
    "api_token",
    "csv_upload",
    "oauth",
    name="connection_method",
    create_type=False,
)
source_connection_status = postgresql.ENUM(
    "configured",
    "validating",
    "connected",
    "syncing",
    "error",
    "disconnected",
    name="source_connection_status",
    create_type=False,
)
sync_run_type = postgresql.ENUM(
    "backfill",
    "incremental",
    "manual",
    name="sync_run_type",
    create_type=False,
)
sync_run_status = postgresql.ENUM(
    "running",
    "succeeded",
    "failed",
    name="sync_run_status",
    create_type=False,
)
signal_kind = postgresql.ENUM(
    "insight",
    "ticket",
    "survey_response",
    "metric_window",
    name="signal_kind",
    create_type=False,
)
signal_status = postgresql.ENUM(
    "active",
    "hidden",
    "error",
    name="signal_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    workspace_kind.create(bind, checkfirst=True)
    source_type.create(bind, checkfirst=True)
    connection_method.create(bind, checkfirst=True)
    source_connection_status.create(bind, checkfirst=True)
    sync_run_type.create(bind, checkfirst=True)
    sync_run_status.create(bind, checkfirst=True)
    signal_kind.create(bind, checkfirst=True)
    signal_status.create(bind, checkfirst=True)

    op.create_table(
        "workspaces",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("owner_user_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("kind", workspace_kind, nullable=False),
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
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workspaces_slug"), "workspaces", ["slug"], unique=True)
    op.create_index(
        "ix_workspaces_owner_kind", "workspaces", ["owner_user_id", "kind"], unique=False
    )

    op.create_table(
        "data_sources",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("source_type", source_type, nullable=False),
        sa.Column("provider", sa.String(length=100), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("connection_method", connection_method, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source_type", "provider", name="uq_data_sources_source_type_provider"
        ),
    )
    op.create_index(
        "ix_data_sources_active_type",
        "data_sources",
        ["is_active", "source_type"],
        unique=False,
    )

    op.create_table(
        "source_connections",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=False),
        sa.Column("data_source_id", sa.UUID(), nullable=False),
        sa.Column("status", source_connection_status, nullable=False),
        sa.Column("secret_ref", sa.String(length=512), nullable=True),
        sa.Column("config_json", sa.JSON(), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error_summary", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["created_by_user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["data_source_id"], ["data_sources.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_source_connections_workspace_status",
        "source_connections",
        ["workspace_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_source_connections_data_source_status",
        "source_connections",
        ["data_source_id", "status"],
        unique=False,
    )

    op.create_table(
        "sync_runs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("source_connection_id", sa.UUID(), nullable=False),
        sa.Column("run_type", sync_run_type, nullable=False),
        sa.Column("status", sync_run_status, nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cursor_in", sa.JSON(), nullable=True),
        sa.Column("cursor_out", sa.JSON(), nullable=True),
        sa.Column("records_seen", sa.Integer(), nullable=False),
        sa.Column("records_created", sa.Integer(), nullable=False),
        sa.Column("records_updated", sa.Integer(), nullable=False),
        sa.Column("error_summary", sa.Text(), nullable=True),
        sa.Column("retry_of_run_id", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(["retry_of_run_id"], ["sync_runs.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["source_connection_id"], ["source_connections.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_sync_runs_connection_status",
        "sync_runs",
        ["source_connection_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_sync_runs_connection_started",
        "sync_runs",
        ["source_connection_id", "started_at"],
        unique=False,
    )

    op.create_table(
        "source_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("source_connection_id", sa.UUID(), nullable=False),
        sa.Column("external_id", sa.String(length=255), nullable=False),
        sa.Column("source_record_type", sa.String(length=100), nullable=False),
        sa.Column("external_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("native_entity_type", sa.String(length=100), nullable=True),
        sa.Column("native_entity_id", sa.UUID(), nullable=True),
        sa.Column("checksum", sa.String(length=128), nullable=True),
        sa.Column(
            "first_seen_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["source_connection_id"], ["source_connections.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source_connection_id",
            "external_id",
            name="uq_source_items_connection_external_id",
        ),
    )
    op.create_index(
        "ix_source_items_workspace_connection",
        "source_items",
        ["workspace_id", "source_connection_id"],
        unique=False,
    )

    op.create_table(
        "signals",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("source_connection_id", sa.UUID(), nullable=True),
        sa.Column("source_item_id", sa.UUID(), nullable=True),
        sa.Column("source_type", source_type, nullable=False),
        sa.Column("provider", sa.String(length=100), nullable=False),
        sa.Column("signal_kind", signal_kind, nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=True),
        sa.Column("content_text", sa.Text(), nullable=False),
        sa.Column("author_or_speaker", sa.String(length=255), nullable=True),
        sa.Column("sentiment", sa.String(length=20), nullable=True),
        sa.Column("source_url", sa.String(length=1024), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("native_entity_type", sa.String(length=100), nullable=True),
        sa.Column("native_entity_id", sa.UUID(), nullable=True),
        sa.Column("status", signal_status, nullable=False),
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
        sa.ForeignKeyConstraint(
            ["source_connection_id"], ["source_connections.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["source_item_id"], ["source_items.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_signals_workspace_source_type",
        "signals",
        ["workspace_id", "source_type"],
        unique=False,
    )
    op.create_index(
        "ix_signals_workspace_occurred_at",
        "signals",
        ["workspace_id", "occurred_at"],
        unique=False,
    )

    op.execute(
        """
        INSERT INTO data_sources (id, source_type, provider, display_name, connection_method, is_active)
        VALUES
            ('3dd80f8a-e31d-4f89-bcc0-af5e7b65a9d4', 'support', 'zendesk', 'Zendesk', 'api_token', true),
            ('53f6d0df-f797-4b02-a6ea-50c2bf0c7d2a', 'survey', 'csv_import', 'Survey CSV Import', 'csv_upload', true),
            ('9e0a39e5-45ec-4b94-92d2-c7935169c707', 'interview', 'native_upload', 'Interview Uploads', 'native_upload', true)
        ON CONFLICT (source_type, provider) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_index("ix_signals_workspace_occurred_at", table_name="signals")
    op.drop_index("ix_signals_workspace_source_type", table_name="signals")
    op.drop_table("signals")
    op.drop_index("ix_source_items_workspace_connection", table_name="source_items")
    op.drop_table("source_items")
    op.drop_index("ix_sync_runs_connection_started", table_name="sync_runs")
    op.drop_index("ix_sync_runs_connection_status", table_name="sync_runs")
    op.drop_table("sync_runs")
    op.drop_index(
        "ix_source_connections_data_source_status", table_name="source_connections"
    )
    op.drop_index(
        "ix_source_connections_workspace_status", table_name="source_connections"
    )
    op.drop_table("source_connections")
    op.drop_index("ix_data_sources_active_type", table_name="data_sources")
    op.drop_table("data_sources")
    op.drop_index("ix_workspaces_owner_kind", table_name="workspaces")
    op.drop_index(op.f("ix_workspaces_slug"), table_name="workspaces")
    op.drop_table("workspaces")

    bind = op.get_bind()
    signal_status.drop(bind, checkfirst=True)
    signal_kind.drop(bind, checkfirst=True)
    sync_run_status.drop(bind, checkfirst=True)
    sync_run_type.drop(bind, checkfirst=True)
    source_connection_status.drop(bind, checkfirst=True)
    connection_method.drop(bind, checkfirst=True)
    source_type.drop(bind, checkfirst=True)
    workspace_kind.drop(bind, checkfirst=True)
