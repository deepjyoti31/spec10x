"""
Specs API — AI-generated, evidence-cited feature briefs (v0.8 Specification Engine)
plus the v1.0 Full Loop: task breakdown, agent-ready export, and post-ship outcomes.

Review workflow: Draft → In Review → Needs Changes → Approved → In Dev → Shipped.
Only validated transitions are accepted; regeneration is allowed pre-approval only.
Task breakdown is allowed post-approval only (D-10-02). The first transition to
Shipped stamps `shipped_at`, which anchors the outcomes window (D-10-06).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import Signal, Spec, SpecGenerationStatus, SpecStatus, Theme, User
from app.schemas import (
    SpecCreate,
    SpecDetailResponse,
    SpecListItemResponse,
    SpecOutcomesPageResponse,
    SpecUpdate,
)
from app.services.signals import (
    _parse_theme_match_id,
    ensure_signal_consistency,
    get_workspace_signals,
    is_voice_signal,
)
from app.services.spec_generation import generate_spec_for_theme
from app.services.task_breakdown import (
    TaskGenerationError,
    generate_tasks_for_spec,
    render_spec_export,
)

router = APIRouter(prefix="/api/specs", tags=["Specs"])

# Validated review-workflow transitions (PRD-08-01). Small backward moves are
# allowed for correction; anything else is rejected.
ALLOWED_TRANSITIONS: dict[SpecStatus, set[SpecStatus]] = {
    SpecStatus.draft: {SpecStatus.in_review},
    SpecStatus.in_review: {SpecStatus.draft, SpecStatus.needs_changes, SpecStatus.approved},
    SpecStatus.needs_changes: {SpecStatus.in_review},
    SpecStatus.approved: {SpecStatus.needs_changes, SpecStatus.in_dev},
    SpecStatus.in_dev: {SpecStatus.approved, SpecStatus.shipped},
    SpecStatus.shipped: {SpecStatus.in_dev},
}

REGENERATABLE_STATUSES = {
    SpecStatus.draft,
    SpecStatus.in_review,
    SpecStatus.needs_changes,
}

# Task breakdown is only meaningful once the brief is approved (D-10-02)
TASK_READY_STATUSES = {
    SpecStatus.approved,
    SpecStatus.in_dev,
    SpecStatus.shipped,
}

OUTCOME_WINDOW_WEEKS = 4


async def _get_owned_spec(
    db: AsyncSession,
    *,
    spec_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Spec:
    result = await db.execute(
        select(Spec).where(Spec.id == spec_id, Spec.user_id == user_id)
    )
    spec = result.scalar_one_or_none()
    if spec is None:
        raise HTTPException(status_code=404, detail="Spec not found")
    return spec


async def _get_owned_theme(
    db: AsyncSession,
    *,
    theme_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Theme:
    result = await db.execute(
        select(Theme).where(Theme.id == theme_id, Theme.user_id == user_id)
    )
    theme = result.scalar_one_or_none()
    if theme is None:
        raise HTTPException(status_code=404, detail="Theme not found")
    return theme


async def _get_theme_signals(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    theme: Theme,
) -> tuple[uuid.UUID, list[Signal]]:
    workspace = await ensure_signal_consistency(db, user_id=user_id)
    workspace_signals = await get_workspace_signals(db, workspace_id=workspace.id)
    theme_signals = [
        signal
        for signal in workspace_signals
        if _parse_theme_match_id(signal.metadata_json) == theme.id
    ]
    return workspace.id, theme_signals


def _serialize_summary(spec: Spec) -> dict:
    return {
        "id": spec.id,
        "title": spec.title,
        "status": spec.status,
        "generation_status": spec.generation_status,
        "theme_id": spec.theme_id,
        "theme_name_snapshot": spec.theme_name_snapshot,
        "impact_score_snapshot": spec.impact_score_snapshot,
        "section_count": len(spec.sections_json or []),
        "evidence_count": len(spec.evidence_json or []),
        "task_count": len(spec.tasks_json or []),
        "is_edited": spec.is_edited,
        "shipped_at": spec.shipped_at,
        "created_at": spec.created_at,
        "updated_at": spec.updated_at,
    }


def _serialize_detail(spec: Spec) -> dict:
    payload = _serialize_summary(spec)
    payload["generation_error"] = spec.generation_error
    payload["model_used"] = spec.model_used
    payload["sections"] = spec.sections_json or []
    payload["evidence"] = spec.evidence_json or []
    payload["tasks"] = spec.tasks_json or []
    payload["tasks_generated_at"] = spec.tasks_generated_at
    return payload


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


@router.post("", response_model=SpecDetailResponse, status_code=201)
async def create_spec(
    body: SpecCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a new spec from a theme's evidence."""
    theme = await _get_owned_theme(db, theme_id=body.theme_id, user_id=current_user.id)
    workspace_id, theme_signals = await _get_theme_signals(
        db, user_id=current_user.id, theme=theme
    )
    if not theme_signals:
        raise HTTPException(
            status_code=422,
            detail="This theme has no supporting evidence yet — add interviews or sync sources before generating a spec.",
        )

    spec = Spec(
        user_id=current_user.id,
        workspace_id=workspace_id,
        theme_id=theme.id,
        theme_name_snapshot=theme.name,
        title=theme.name,
        generation_status=SpecGenerationStatus.generating,
    )
    db.add(spec)
    await db.flush()

    await generate_spec_for_theme(
        db, user=current_user, theme=theme, spec=spec, theme_signals=theme_signals
    )
    await db.refresh(spec)
    return _serialize_detail(spec)


@router.get("", response_model=list[SpecListItemResponse])
async def list_specs(
    status_filter: SpecStatus | None = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Spec).where(Spec.user_id == current_user.id)
    if status_filter is not None:
        stmt = stmt.where(Spec.status == status_filter)
    stmt = stmt.order_by(Spec.updated_at.desc(), Spec.created_at.desc())
    result = await db.execute(stmt)
    return [_serialize_summary(spec) for spec in result.scalars().all()]


@router.get("/outcomes", response_model=SpecOutcomesPageResponse)
async def list_spec_outcomes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Post-ship outcomes for every shipped spec (v1.0 Full Loop, D-10-06).

    Compares weekly customer-voice volume on the source theme across the
    OUTCOME_WINDOW_WEEKS before and after the first ship. Correlational
    only — the readout never claims the feature caused the change.
    Registered before `/{spec_id}` so the path does not parse as a UUID.
    """
    workspace = await ensure_signal_consistency(db, user_id=current_user.id)
    result = await db.execute(
        select(Spec)
        .where(Spec.user_id == current_user.id, Spec.shipped_at.is_not(None))
        .order_by(Spec.shipped_at.desc())
    )
    shipped_specs = list(result.scalars().all())

    workspace_signals = await get_workspace_signals(db, workspace_id=workspace.id)
    voice_by_theme: dict[uuid.UUID, list[datetime]] = {}
    for signal in workspace_signals:
        theme_id = _parse_theme_match_id(signal.metadata_json)
        if theme_id is not None and is_voice_signal(signal):
            voice_by_theme.setdefault(theme_id, []).append(_as_utc(signal.occurred_at))

    theme_ids = {spec.theme_id for spec in shipped_specs if spec.theme_id is not None}
    theme_names: dict[uuid.UUID, str] = {}
    if theme_ids:
        themes_result = await db.execute(select(Theme).where(Theme.id.in_(theme_ids)))
        theme_names = {theme.id: theme.name for theme in themes_result.scalars().all()}

    now = datetime.now(timezone.utc)
    week = timedelta(days=7)
    outcomes = []
    for spec in shipped_specs:
        shipped_at = _as_utc(spec.shipped_at)
        entry = {
            "spec_id": spec.id,
            "title": spec.title,
            "theme_id": spec.theme_id,
            "theme_name": theme_names.get(spec.theme_id, spec.theme_name_snapshot),
            "shipped_at": shipped_at,
            "state": "unavailable",
            "pre_counts": [],
            "post_counts": [],
            "pre_weekly_avg": None,
            "post_weekly_avg": None,
        }
        if spec.theme_id is None:
            outcomes.append(entry)
            continue

        occurred_ats = voice_by_theme.get(spec.theme_id, [])
        pre_counts = [0] * OUTCOME_WINDOW_WEEKS
        for index in range(OUTCOME_WINDOW_WEEKS):
            bucket_start = shipped_at - week * (OUTCOME_WINDOW_WEEKS - index)
            pre_counts[index] = sum(
                1 for at in occurred_ats if bucket_start <= at < bucket_start + week
            )
        entry["pre_counts"] = pre_counts
        entry["pre_weekly_avg"] = round(sum(pre_counts) / OUTCOME_WINDOW_WEEKS, 1)

        elapsed_weeks = min(OUTCOME_WINDOW_WEEKS, int((now - shipped_at).days // 7))
        if elapsed_weeks < 1:
            entry["state"] = "too_early"
            outcomes.append(entry)
            continue

        post_counts = [0] * elapsed_weeks
        for index in range(elapsed_weeks):
            bucket_start = shipped_at + week * index
            post_counts[index] = sum(
                1 for at in occurred_ats if bucket_start <= at < bucket_start + week
            )
        entry["post_counts"] = post_counts
        pre_avg = entry["pre_weekly_avg"]
        post_avg = round(sum(post_counts) / elapsed_weeks, 1)
        entry["post_weekly_avg"] = post_avg

        # Voice volume on a pain theme falling after ship reads as improvement;
        # thresholds keep small wobbles honest as "flat".
        if post_avg <= pre_avg * 0.8 and post_avg < pre_avg:
            entry["state"] = "improving"
        elif post_avg >= pre_avg * 1.2 and post_avg > pre_avg:
            entry["state"] = "worsening"
        else:
            entry["state"] = "flat"
        outcomes.append(entry)

    return SpecOutcomesPageResponse(
        window_weeks=OUTCOME_WINDOW_WEEKS,
        specs=outcomes,
        has_data=bool(outcomes),
    )


@router.get("/{spec_id}", response_model=SpecDetailResponse)
async def get_spec(
    spec_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    spec = await _get_owned_spec(db, spec_id=spec_id, user_id=current_user.id)
    return _serialize_detail(spec)


@router.patch("/{spec_id}", response_model=SpecDetailResponse)
async def update_spec(
    spec_id: uuid.UUID,
    body: SpecUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Edit the spec title, section content, or move it through the review workflow."""
    spec = await _get_owned_spec(db, spec_id=spec_id, user_id=current_user.id)

    if body.status is not None and body.status != spec.status:
        allowed = ALLOWED_TRANSITIONS.get(spec.status, set())
        if body.status not in allowed:
            allowed_labels = ", ".join(sorted(status.value for status in allowed)) or "none"
            raise HTTPException(
                status_code=422,
                detail=f"Cannot move a spec from {spec.status.value} to {body.status.value}. Allowed: {allowed_labels}.",
            )
        spec.status = body.status
        # First ship stamps the outcomes anchor; rolling back to In Dev keeps it (D-10-06)
        if body.status == SpecStatus.shipped and spec.shipped_at is None:
            spec.shipped_at = datetime.now(timezone.utc)

    if body.title is not None:
        title = body.title.strip()
        if not title:
            raise HTTPException(status_code=422, detail="Spec title cannot be empty")
        spec.title = title
        spec.is_edited = True

    if body.sections:
        sections = list(spec.sections_json or [])
        sections_by_key = {section["key"]: section for section in sections}
        for update in body.sections:
            if update.key not in sections_by_key:
                raise HTTPException(
                    status_code=422, detail=f"Unknown spec section: {update.key}"
                )
            sections_by_key[update.key]["content"] = update.content
        # Reassign so SQLAlchemy detects the JSON mutation
        spec.sections_json = [dict(section) for section in sections]
        spec.is_edited = True

    await db.flush()
    await db.refresh(spec, attribute_names=["updated_at"])
    return _serialize_detail(spec)


@router.post("/{spec_id}/regenerate", response_model=SpecDetailResponse)
async def regenerate_spec(
    spec_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-run generation, replacing sections and evidence. Pre-approval only."""
    spec = await _get_owned_spec(db, spec_id=spec_id, user_id=current_user.id)
    if spec.status not in REGENERATABLE_STATUSES:
        raise HTTPException(
            status_code=409,
            detail="Approved or in-flight specs cannot be regenerated — move the spec back to Needs Changes first.",
        )
    if spec.theme_id is None:
        raise HTTPException(
            status_code=409,
            detail="The source theme for this spec no longer exists, so it cannot be regenerated.",
        )

    theme = await _get_owned_theme(db, theme_id=spec.theme_id, user_id=current_user.id)
    _, theme_signals = await _get_theme_signals(
        db, user_id=current_user.id, theme=theme
    )
    if not theme_signals:
        raise HTTPException(
            status_code=422,
            detail="This theme has no supporting evidence anymore, so the spec cannot be regenerated.",
        )

    spec.generation_status = SpecGenerationStatus.generating
    await generate_spec_for_theme(
        db, user=current_user, theme=theme, spec=spec, theme_signals=theme_signals
    )
    await db.refresh(spec)
    return _serialize_detail(spec)


@router.post("/{spec_id}/tasks", response_model=SpecDetailResponse)
async def generate_spec_tasks(
    spec_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Break the approved brief into agent-ready tasks (v1.0 Full Loop).

    Replaces any previous breakdown. A failed generation changes nothing
    and returns an error the UI can show (D-10-03).
    """
    spec = await _get_owned_spec(db, spec_id=spec_id, user_id=current_user.id)
    if spec.status not in TASK_READY_STATUSES:
        raise HTTPException(
            status_code=409,
            detail="Approve the spec before breaking it into tasks — task breakdown is available for Approved, In Dev, and Shipped specs.",
        )
    if spec.generation_status != SpecGenerationStatus.ready:
        raise HTTPException(
            status_code=409,
            detail="The brief has no generated content to break down yet.",
        )

    try:
        tasks = generate_tasks_for_spec(spec)
    except TaskGenerationError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Task breakdown failed — try again. ({exc})",
        )

    spec.tasks_json = tasks
    spec.tasks_generated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(spec, attribute_names=["updated_at"])
    return _serialize_detail(spec)


@router.get("/{spec_id}/export", response_class=PlainTextResponse)
async def export_spec(
    spec_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Agent-ready markdown context bundle: brief + tasks + evidence (D-10-04)."""
    spec = await _get_owned_spec(db, spec_id=spec_id, user_id=current_user.id)
    if spec.generation_status != SpecGenerationStatus.ready:
        raise HTTPException(
            status_code=409,
            detail="The brief has no generated content to export yet.",
        )
    return PlainTextResponse(
        render_spec_export(spec), media_type="text/markdown; charset=utf-8"
    )


@router.delete("/{spec_id}", status_code=204)
async def delete_spec(
    spec_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a spec. Never touches the underlying theme, insights, or signals."""
    spec = await _get_owned_spec(db, spec_id=spec_id, user_id=current_user.id)
    await db.delete(spec)
    await db.flush()
