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


class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"


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
