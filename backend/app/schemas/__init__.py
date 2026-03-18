"""
Spec10x Backend — Pydantic Schemas for API request/response validation
"""

import uuid
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, EmailStr

from app.models import (
    PlanType,
    ConnectionMethod,
    FileType,
    InterviewStatus,
    InsightCategory,
    SourceConnectionStatus,
    SourceType,
    SyncRunStatus,
    SyncRunType,
    ThemeStatus,
    MessageRole,
)


# ─── Auth ────────────────────────────────────────────────

class AuthVerifyRequest(BaseModel):
    """Request body for POST /api/auth/verify"""
    token: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    avatar_url: Optional[str] = None
    plan: PlanType
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Interviews ──────────────────────────────────────────

class UploadUrlRequest(BaseModel):
    filename: str
    content_type: str
    file_size_bytes: int


class UploadUrlResponse(BaseModel):
    upload_url: str
    storage_path: str


class InterviewCreate(BaseModel):
    filename: str
    file_type: FileType
    file_size_bytes: int
    storage_path: str
    file_hash: Optional[str] = None


class InterviewResponse(BaseModel):
    id: uuid.UUID
    filename: str
    file_type: FileType
    file_size_bytes: int
    status: InterviewStatus
    duration_seconds: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InterviewDetailResponse(InterviewResponse):
    transcript: Optional[str] = None
    metadata_json: Optional[dict] = None
    speakers: list["SpeakerResponse"] = []
    insights: list["InsightResponse"] = []


# ─── Speakers ────────────────────────────────────────────

class SpeakerResponse(BaseModel):
    id: uuid.UUID
    speaker_label: str
    name: Optional[str] = None
    role: Optional[str] = None
    company: Optional[str] = None
    is_interviewer: bool
    auto_detected: bool

    model_config = {"from_attributes": True}


class SpeakerUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    company: Optional[str] = None


# ─── Themes ──────────────────────────────────────────────

class ThemeResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    mention_count: int
    sentiment_positive: float
    sentiment_neutral: float
    sentiment_negative: float
    is_new: bool
    status: ThemeStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class ThemeDetailResponse(ThemeResponse):
    sub_themes: list["SubThemeResponse"] = []
    insights: list["InsightResponse"] = []


class ThemeUpdate(BaseModel):
    name: Optional[str] = None


class SubThemeResponse(BaseModel):
    id: uuid.UUID
    name: str

    model_config = {"from_attributes": True}


# ─── Insights ────────────────────────────────────────────

class InsightResponse(BaseModel):
    id: uuid.UUID
    interview_id: uuid.UUID
    theme_id: Optional[uuid.UUID] = None
    category: InsightCategory
    title: str
    quote: str
    quote_start_index: Optional[int] = None
    quote_end_index: Optional[int] = None
    confidence: float
    is_flagged: bool
    is_dismissed: bool
    is_manual: bool
    theme_suggestion: Optional[str] = None
    sentiment: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class InsightCreate(BaseModel):
    interview_id: uuid.UUID
    category: InsightCategory
    title: str
    quote: str
    quote_start_index: Optional[int] = None
    quote_end_index: Optional[int] = None
    theme_id: Optional[uuid.UUID] = None


class InsightUpdate(BaseModel):
    category: Optional[InsightCategory] = None
    title: Optional[str] = None
    theme_id: Optional[uuid.UUID] = None


# ─── Ask (Q&A) ──────────────────────────────────────────

class AskRequest(BaseModel):
    question: str
    conversation_id: Optional[uuid.UUID] = None


class AskConversationResponse(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AskMessageResponse(BaseModel):
    id: uuid.UUID
    role: MessageRole
    content: str
    citations: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Usage / Billing ─────────────────────────────────────

class UsageResponse(BaseModel):
    month: date
    interviews_uploaded: int
    qa_queries_used: int
    storage_bytes_used: int

    model_config = {"from_attributes": True}


# â”€â”€â”€ Source Foundation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class DataSourceResponse(BaseModel):
    id: uuid.UUID
    source_type: SourceType
    provider: str
    display_name: str
    connection_method: ConnectionMethod
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SourceConnectionCreate(BaseModel):
    data_source_id: uuid.UUID
    secret_ref: Optional[str] = None
    config_json: Optional[dict] = None


class SyncRunResponse(BaseModel):
    id: uuid.UUID
    run_type: SyncRunType
    status: SyncRunStatus
    started_at: datetime
    finished_at: Optional[datetime] = None
    cursor_in: Optional[dict] = None
    cursor_out: Optional[dict] = None
    records_seen: int
    records_created: int
    records_updated: int
    error_summary: Optional[str] = None
    retry_of_run_id: Optional[uuid.UUID] = None

    model_config = {"from_attributes": True}


class SourceConnectionResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_by_user_id: uuid.UUID
    status: SourceConnectionStatus
    last_synced_at: Optional[datetime] = None
    last_error_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    data_source: DataSourceResponse

    model_config = {"from_attributes": True}


class SourceConnectionDetailResponse(SourceConnectionResponse):
    sync_runs: list[SyncRunResponse] = []
