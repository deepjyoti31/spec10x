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
    ThemePriorityState,
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


class InterviewThemeChipResponse(BaseModel):
    id: uuid.UUID
    name: str


class InterviewLibrarySourceResponse(BaseModel):
    provider: str
    label: str
    count: int


class InterviewLibrarySummaryResponse(BaseModel):
    total_count: int
    filtered_count: int
    storage_bytes_used: int
    storage_bytes_limit: int
    plan: PlanType
    has_data: bool
    available_sources: list[InterviewLibrarySourceResponse] = []


class InterviewLibraryItemResponse(BaseModel):
    id: uuid.UUID
    filename: str
    file_type: FileType
    created_at: datetime
    updated_at: datetime
    duration_seconds: Optional[int] = None
    file_size_bytes: int
    raw_status: InterviewStatus
    display_status: str
    error_message: Optional[str] = None
    participant_summary: Optional[str] = None
    source_provider: str
    source_label: str
    insights_count: int
    themes_count: int
    theme_chips: list[InterviewThemeChipResponse] = []


class InterviewLibraryResponse(BaseModel):
    summary: InterviewLibrarySummaryResponse
    items: list[InterviewLibraryItemResponse] = []


class InterviewBulkRequest(BaseModel):
    interview_ids: list[uuid.UUID]


class InterviewBulkFailureResponse(BaseModel):
    interview_id: uuid.UUID
    error: str


class InterviewBulkResultResponse(BaseModel):
    requested_count: int
    success_count: int
    failed_count: int
    succeeded_ids: list[uuid.UUID] = []
    failures: list[InterviewBulkFailureResponse] = []


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
    priority_state: ThemePriorityState
    impact_score: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ThemeImpactBreakdownResponse(BaseModel):
    total: float
    frequency: float
    negative: float
    recency: float
    source_diversity: float


class ThemeChipResponse(BaseModel):
    id: str
    name: str


class SignalLinkResponse(BaseModel):
    kind: str
    href: str
    label: str


class FeedSignalResponse(BaseModel):
    id: str
    source_type: str
    source_label: str
    provider: str
    provider_label: str
    signal_kind: str
    signal_kind_label: str
    occurred_at: datetime
    title: Optional[str] = None
    excerpt: str
    author_or_speaker: Optional[str] = None
    sentiment: Optional[str] = None
    theme_chip: Optional[ThemeChipResponse] = None
    link: Optional[SignalLinkResponse] = None


class FeedSignalDetailResponse(FeedSignalResponse):
    content_text: Optional[str] = None
    metadata_json: Optional[dict] = None


class SourceBreakdownResponse(BaseModel):
    source_type: str
    label: str
    count: int


class SupportingEvidenceGroupResponse(BaseModel):
    source_type: str
    label: str
    count: int
    items: list[FeedSignalResponse] = []


class ThemeDetailResponse(ThemeResponse):
    sub_themes: list["SubThemeResponse"] = []
    insights: list["InsightResponse"] = []
    source_breakdown: list[SourceBreakdownResponse] = []
    supporting_evidence: list[SupportingEvidenceGroupResponse] = []
    impact_breakdown: Optional[ThemeImpactBreakdownResponse] = None


class ThemeUpdate(BaseModel):
    name: Optional[str] = None
    priority_state: Optional[ThemePriorityState] = None


class BoardThemeCardResponse(ThemeResponse):
    impact_breakdown: ThemeImpactBreakdownResponse
    source_breakdown: list[SourceBreakdownResponse] = []
    evidence_preview: list[FeedSignalResponse] = []


class ThemeExplorerSummaryResponse(BaseModel):
    interviews_count: int
    signals_count: int
    active_themes_count: int


class ThemeExplorerSourceChipResponse(BaseModel):
    source_type: str
    label: str
    count: int


class ThemeExplorerQuotePreviewResponse(BaseModel):
    id: str
    excerpt: str
    author_or_speaker: Optional[str] = None
    source_label: str
    occurred_at: datetime


class ThemeExplorerSentimentResponse(BaseModel):
    positive: float
    neutral: float
    negative: float


class ThemeExplorerCardResponse(BaseModel):
    id: uuid.UUID
    name: str
    is_new: bool
    impact_score: float
    mention_count: int
    sentiment: ThemeExplorerSentimentResponse
    source_chips: list[ThemeExplorerSourceChipResponse] = []
    quote_previews: list[ThemeExplorerQuotePreviewResponse] = []


class ThemeExplorerFiltersResponse(BaseModel):
    sort: str
    sources: list[str] = []
    sentiment: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    selected_theme_id: Optional[uuid.UUID] = None
    available_source_types: list[str] = []


class ThemeExplorerResponse(BaseModel):
    summary: ThemeExplorerSummaryResponse
    filters: ThemeExplorerFiltersResponse
    default_selected_theme_id: Optional[uuid.UUID] = None
    active_themes: list[ThemeExplorerCardResponse] = []
    previous_themes: list[ThemeExplorerCardResponse] = []
    empty_reason: Optional[str] = None


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
    records_unchanged: int
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


# --- Home Dashboard ---

class HomeDashboardStatsResponse(BaseModel):
    interviews_total: int
    interviews_this_week: int
    active_themes_total: int
    new_themes_this_week: int
    signals_total: int
    active_source_type_count: int
    average_impact_score: float
    average_impact_delta: Optional[float] = None


class HomeDashboardPriorityResponse(BaseModel):
    id: uuid.UUID
    name: str
    impact_score: float
    trend: str
    primary_count_label: str
    source_summary_label: str
    priority_band: str


class HomeDashboardActivityResponse(BaseModel):
    kind: str
    title: str
    subtitle: str
    occurred_at: datetime
    href: str
    tone: str


class HomeDashboardTrendResponse(BaseModel):
    id: uuid.UUID
    name: str
    velocity_delta: Optional[int] = None
    sparkline_points: list[int]
    href: str


class HomeDashboardResponse(BaseModel):
    has_data: bool
    stats: HomeDashboardStatsResponse
    active_priorities: list[HomeDashboardPriorityResponse]
    recent_activity: list[HomeDashboardActivityResponse]
    emerging_trends: list[HomeDashboardTrendResponse]
