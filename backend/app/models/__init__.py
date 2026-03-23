"""
Spec10x — SQLAlchemy ORM Models

All database models matching the technical architecture data model.
Uses SQLAlchemy 2.0 mapped_column style with pgvector support.
"""

import uuid
import enum
from datetime import datetime, date

from sqlalchemy import (
    String,
    Text,
    Integer,
    BigInteger,
    Float,
    Boolean,
    DateTime,
    Date,
    Enum,
    ForeignKey,
    Index,
    JSON,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector

from app.core.database import Base


# ─── Enums ───────────────────────────────────────────────

class PlanType(str, enum.Enum):
    free = "free"
    pro = "pro"
    business = "business"


class WorkspaceKind(str, enum.Enum):
    personal = "personal"
    shared = "shared"


class FileType(str, enum.Enum):
    txt = "txt"
    md = "md"
    pdf = "pdf"
    docx = "docx"
    mp3 = "mp3"
    wav = "wav"
    mp4 = "mp4"


class InterviewStatus(str, enum.Enum):
    queued = "queued"
    transcribing = "transcribing"
    analyzing = "analyzing"
    done = "done"
    error = "error"


class InsightCategory(str, enum.Enum):
    pain_point = "pain_point"
    feature_request = "feature_request"
    positive = "positive"
    suggestion = "suggestion"


class ThemeStatus(str, enum.Enum):
    active = "active"
    previous = "previous"


class ThemePriorityState(str, enum.Enum):
    default = "default"
    pinned = "pinned"
    monitoring = "monitoring"


class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"


class SourceType(str, enum.Enum):
    interview = "interview"
    support = "support"
    survey = "survey"
    analytics = "analytics"


class ConnectionMethod(str, enum.Enum):
    native_upload = "native_upload"
    api_token = "api_token"
    csv_upload = "csv_upload"
    oauth = "oauth"


class SourceConnectionStatus(str, enum.Enum):
    configured = "configured"
    validating = "validating"
    connected = "connected"
    syncing = "syncing"
    error = "error"
    disconnected = "disconnected"


class SyncRunType(str, enum.Enum):
    backfill = "backfill"
    incremental = "incremental"
    manual = "manual"


class SyncRunStatus(str, enum.Enum):
    running = "running"
    succeeded = "succeeded"
    failed = "failed"


class SignalKind(str, enum.Enum):
    insight = "insight"
    ticket = "ticket"
    survey_response = "survey_response"
    metric_window = "metric_window"


class SignalStatus(str, enum.Enum):
    active = "active"
    hidden = "hidden"
    error = "error"


# ─── Models ──────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    plan: Mapped[PlanType] = mapped_column(
        Enum(PlanType, name="plan_type"), default=PlanType.free
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    interviews: Mapped[list["Interview"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    themes: Mapped[list["Theme"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    insights: Mapped[list["Insight"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    ask_conversations: Mapped[list["AskConversation"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    usage_records: Mapped[list["Usage"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    workspaces: Mapped[list["Workspace"]] = relationship(
        back_populates="owner_user", cascade="all, delete-orphan"
    )
    created_source_connections: Mapped[list["SourceConnection"]] = relationship(
        back_populates="created_by_user"
    )


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    kind: Mapped[WorkspaceKind] = mapped_column(
        Enum(WorkspaceKind, name="workspace_kind"), default=WorkspaceKind.personal
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner_user: Mapped["User"] = relationship(back_populates="workspaces")
    source_connections: Mapped[list["SourceConnection"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    source_items: Mapped[list["SourceItem"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    signals: Mapped[list["Signal"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_workspaces_owner_kind", "owner_user_id", "kind"),
    )


class DataSource(Base):
    __tablename__ = "data_sources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_type: Mapped[SourceType] = mapped_column(
        Enum(SourceType, name="source_type")
    )
    provider: Mapped[str] = mapped_column(String(100))
    display_name: Mapped[str] = mapped_column(String(255))
    connection_method: Mapped[ConnectionMethod] = mapped_column(
        Enum(ConnectionMethod, name="connection_method")
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    source_connections: Mapped[list["SourceConnection"]] = relationship(
        back_populates="data_source"
    )

    __table_args__ = (
        UniqueConstraint(
            "source_type", "provider", name="uq_data_sources_source_type_provider"
        ),
        Index("ix_data_sources_active_type", "is_active", "source_type"),
    )


class SourceConnection(Base):
    __tablename__ = "source_connections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE")
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    data_source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_sources.id", ondelete="RESTRICT")
    )
    status: Mapped[SourceConnectionStatus] = mapped_column(
        Enum(SourceConnectionStatus, name="source_connection_status"),
        default=SourceConnectionStatus.configured,
    )
    secret_ref: Mapped[str | None] = mapped_column(String(512), nullable=True)
    config_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_error_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    workspace: Mapped["Workspace"] = relationship(back_populates="source_connections")
    created_by_user: Mapped["User"] = relationship(
        back_populates="created_source_connections"
    )
    data_source: Mapped["DataSource"] = relationship(back_populates="source_connections")
    sync_runs: Mapped[list["SyncRun"]] = relationship(
        back_populates="source_connection",
        cascade="all, delete-orphan",
        order_by=lambda: SyncRun.started_at.desc(),
    )
    source_items: Mapped[list["SourceItem"]] = relationship(
        back_populates="source_connection", cascade="all, delete-orphan"
    )
    signals: Mapped[list["Signal"]] = relationship(
        back_populates="source_connection", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_source_connections_workspace_status", "workspace_id", "status"),
        Index("ix_source_connections_data_source_status", "data_source_id", "status"),
    )


class SyncRun(Base):
    __tablename__ = "sync_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_connection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("source_connections.id", ondelete="CASCADE")
    )
    run_type: Mapped[SyncRunType] = mapped_column(
        Enum(SyncRunType, name="sync_run_type")
    )
    status: Mapped[SyncRunStatus] = mapped_column(
        Enum(SyncRunStatus, name="sync_run_status"), default=SyncRunStatus.running
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cursor_in: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    cursor_out: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    records_seen: Mapped[int] = mapped_column(Integer, default=0)
    records_created: Mapped[int] = mapped_column(Integer, default=0)
    records_updated: Mapped[int] = mapped_column(Integer, default=0)
    records_unchanged: Mapped[int] = mapped_column(Integer, default=0)
    error_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    retry_of_run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sync_runs.id", ondelete="SET NULL"), nullable=True
    )

    source_connection: Mapped["SourceConnection"] = relationship(
        back_populates="sync_runs"
    )
    retry_of_run: Mapped["SyncRun | None"] = relationship(
        remote_side=lambda: SyncRun.id
    )

    __table_args__ = (
        Index("ix_sync_runs_connection_status", "source_connection_id", "status"),
        Index("ix_sync_runs_connection_started", "source_connection_id", "started_at"),
    )


class SourceItem(Base):
    __tablename__ = "source_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE")
    )
    source_connection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("source_connections.id", ondelete="CASCADE")
    )
    external_id: Mapped[str] = mapped_column(String(255))
    source_record_type: Mapped[str] = mapped_column(String(100))
    external_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    native_entity_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    native_entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    checksum: Mapped[str | None] = mapped_column(String(128), nullable=True)
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    workspace: Mapped["Workspace"] = relationship(back_populates="source_items")
    source_connection: Mapped["SourceConnection"] = relationship(
        back_populates="source_items"
    )
    signals: Mapped[list["Signal"]] = relationship(
        back_populates="source_item", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint(
            "source_connection_id",
            "external_id",
            name="uq_source_items_connection_external_id",
        ),
        Index("ix_source_items_workspace_connection", "workspace_id", "source_connection_id"),
    )


class Signal(Base):
    __tablename__ = "signals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE")
    )
    source_connection_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("source_connections.id", ondelete="SET NULL"),
        nullable=True,
    )
    source_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("source_items.id", ondelete="SET NULL"),
        nullable=True,
    )
    source_type: Mapped[SourceType] = mapped_column(
        Enum(SourceType, name="source_type")
    )
    provider: Mapped[str] = mapped_column(String(100))
    signal_kind: Mapped[SignalKind] = mapped_column(
        Enum(SignalKind, name="signal_kind")
    )
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    content_text: Mapped[str] = mapped_column(Text)
    author_or_speaker: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sentiment: Mapped[str | None] = mapped_column(String(20), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    native_entity_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    native_entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    status: Mapped[SignalStatus] = mapped_column(
        Enum(SignalStatus, name="signal_status"), default=SignalStatus.active
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    workspace: Mapped["Workspace"] = relationship(back_populates="signals")
    source_connection: Mapped["SourceConnection | None"] = relationship(
        back_populates="signals"
    )
    source_item: Mapped["SourceItem | None"] = relationship(back_populates="signals")

    __table_args__ = (
        Index("ix_signals_workspace_source_type", "workspace_id", "source_type"),
        Index("ix_signals_workspace_occurred_at", "workspace_id", "occurred_at"),
    )


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    filename: Mapped[str] = mapped_column(String(512))
    file_type: Mapped[FileType] = mapped_column(Enum(FileType, name="file_type"))
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    storage_path: Mapped[str] = mapped_column(String(1024), default="")
    status: Mapped[InterviewStatus] = mapped_column(
        Enum(InterviewStatus, name="interview_status"),
        default=InterviewStatus.queued,
    )
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(
        "metadata", JSON, nullable=True
    )
    file_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="interviews")
    speakers: Mapped[list["Speaker"]] = relationship(
        back_populates="interview", cascade="all, delete-orphan"
    )
    insights: Mapped[list["Insight"]] = relationship(
        back_populates="interview", cascade="all, delete-orphan"
    )
    transcript_chunks: Mapped[list["TranscriptChunk"]] = relationship(
        back_populates="interview", cascade="all, delete-orphan"
    )

    # Indexes
    __table_args__ = (
        Index("ix_interviews_user_status", "user_id", "status"),
        Index("ix_interviews_file_hash", "file_hash"),
    )


class Speaker(Base):
    __tablename__ = "speakers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    interview_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interviews.id", ondelete="CASCADE")
    )
    speaker_label: Mapped[str] = mapped_column(String(255), default="Speaker 1")
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_interviewer: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_detected: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    interview: Mapped["Interview"] = relationship(back_populates="speakers")
    insights: Mapped[list["Insight"]] = relationship(back_populates="speaker")
    transcript_chunks: Mapped[list["TranscriptChunk"]] = relationship(
        back_populates="speaker"
    )


class Theme(Base):
    __tablename__ = "themes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(512))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    mention_count: Mapped[int] = mapped_column(Integer, default=0)
    sentiment_positive: Mapped[float] = mapped_column(Float, default=0.0)
    sentiment_neutral: Mapped[float] = mapped_column(Float, default=0.0)
    sentiment_negative: Mapped[float] = mapped_column(Float, default=0.0)
    is_new: Mapped[bool] = mapped_column(Boolean, default=True)
    last_new_activity: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[ThemeStatus] = mapped_column(
        Enum(ThemeStatus, name="theme_status"), default=ThemeStatus.active
    )
    priority_state: Mapped[ThemePriorityState] = mapped_column(
        Enum(ThemePriorityState, name="theme_priority_state"),
        default=ThemePriorityState.default,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="themes")
    sub_themes: Mapped[list["SubTheme"]] = relationship(
        back_populates="theme", cascade="all, delete-orphan"
    )
    insights: Mapped[list["Insight"]] = relationship(back_populates="theme")

    # Indexes
    __table_args__ = (
        Index("ix_themes_user_status", "user_id", "status"),
        Index("ix_themes_user_priority_state", "user_id", "priority_state"),
    )


class SubTheme(Base):
    __tablename__ = "sub_themes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    theme_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("themes.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(512))

    # Relationships
    theme: Mapped["Theme"] = relationship(back_populates="sub_themes")


class Insight(Base):
    __tablename__ = "insights"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    interview_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interviews.id", ondelete="CASCADE")
    )
    theme_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("themes.id", ondelete="SET NULL"), nullable=True
    )
    category: Mapped[InsightCategory] = mapped_column(
        Enum(InsightCategory, name="insight_category")
    )
    title: Mapped[str] = mapped_column(String(1024))
    quote: Mapped[str] = mapped_column(Text)
    quote_start_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    quote_end_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    speaker_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("speakers.id", ondelete="SET NULL"),
        nullable=True,
    )
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_manual: Mapped[bool] = mapped_column(Boolean, default=False)
    theme_suggestion: Mapped[str | None] = mapped_column(String(512), nullable=True)
    sentiment: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="insights")
    interview: Mapped["Interview"] = relationship(back_populates="insights")
    theme: Mapped["Theme | None"] = relationship(back_populates="insights")
    speaker: Mapped["Speaker | None"] = relationship(back_populates="insights")

    # Indexes
    __table_args__ = (
        Index("ix_insights_user_theme", "user_id", "theme_id"),
        Index("ix_insights_interview", "interview_id"),
    )


class TranscriptChunk(Base):
    __tablename__ = "transcript_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    interview_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interviews.id", ondelete="CASCADE")
    )
    chunk_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    embedding = mapped_column(Vector(768), nullable=True)
    speaker_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("speakers.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    interview: Mapped["Interview"] = relationship(back_populates="transcript_chunks")
    speaker: Mapped["Speaker | None"] = relationship(
        back_populates="transcript_chunks"
    )


class AskConversation(Base):
    __tablename__ = "ask_conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String(512), default="New Conversation")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="ask_conversations")
    messages: Mapped[list["AskMessage"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )


class AskMessage(Base):
    __tablename__ = "ask_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ask_conversations.id", ondelete="CASCADE")
    )
    role: Mapped[MessageRole] = mapped_column(Enum(MessageRole, name="message_role"))
    content: Mapped[str] = mapped_column(Text)
    citations: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    conversation: Mapped["AskConversation"] = relationship(back_populates="messages")


class Usage(Base):
    __tablename__ = "usage"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    month: Mapped[date] = mapped_column(Date)
    interviews_uploaded: Mapped[int] = mapped_column(Integer, default=0)
    qa_queries_used: Mapped[int] = mapped_column(Integer, default=0)
    storage_bytes_used: Mapped[int] = mapped_column(BigInteger, default=0)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="usage_records")

    __table_args__ = (
        Index("ix_usage_user_month", "user_id", "month", unique=True),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="notifications")

    __table_args__ = (
        Index("ix_notifications_user_id", "user_id"),
    )
