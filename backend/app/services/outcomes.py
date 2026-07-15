"""
Post-ship outcomes (v1.0 Full Loop, D-10-06) — computation shared by the
API route and the v1.1 auto-close notifier (PRD-11-01, D-11-05).

Weekly customer-voice volume on a shipped spec's source theme, compared
across the window before vs. after the first ship. Correlational only:
nothing here ever claims the feature caused the change, and notification
copy mirrors the /outcomes wording.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification, Spec, Theme
from app.services.signals import (
    _parse_theme_match_id,
    ensure_signal_consistency,
    get_workspace_signals,
    is_voice_signal,
)

logger = logging.getLogger(__name__)

OUTCOME_WINDOW_WEEKS = 4

# Outcome states that are readable — the only ones that ever notify (D-11-05).
NOTIFIABLE_STATES = {"improving", "worsening", "flat"}


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


async def compute_spec_outcomes(
    db: AsyncSession, *, user_id: uuid.UUID
) -> list[dict]:
    """Outcome entries for every shipped spec in the user's pool,
    newest ship first. Exactly the computation behind GET /api/specs/outcomes."""
    workspace = await ensure_signal_consistency(db, user_id=user_id)
    result = await db.execute(
        select(Spec)
        .where(Spec.user_id == user_id, Spec.shipped_at.is_not(None))
        .order_by(Spec.shipped_at.desc())
    )
    shipped_specs = list(result.scalars().all())
    if not shipped_specs:
        return []

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

    return outcomes


def _notification_message(entry: dict) -> str:
    theme = entry["theme_name"]
    title = entry["title"]
    pre = entry["pre_weekly_avg"]
    post = entry["post_weekly_avg"]
    if entry["state"] == "improving":
        movement = "fell"
    elif entry["state"] == "worsening":
        movement = "rose"
    else:
        movement = "did not clearly change"
    return (
        f'Customer voice volume on "{theme}" {movement} after "{title}" shipped '
        f"({pre}/wk before vs. {post}/wk after). Supporting evidence, not proven "
        f"impact — see the Outcomes page for the full readout."
    )


async def generate_outcome_notifications(db: AsyncSession) -> int:
    """Notify each spec owner the first time a shipped spec's outcome leaves
    `too_early` for a readable state (D-11-05). Idempotent: the
    `outcome_notified_at` stamp guarantees at most one notification per spec;
    `unavailable` never notifies. Returns how many notifications were created."""
    result = await db.execute(
        select(Spec.user_id)
        .where(Spec.shipped_at.is_not(None), Spec.outcome_notified_at.is_(None))
        .distinct()
    )
    user_ids = [row[0] for row in result.all()]

    created = 0
    for user_id in user_ids:
        entries = {
            entry["spec_id"]: entry
            for entry in await compute_spec_outcomes(db, user_id=user_id)
        }
        pending_result = await db.execute(
            select(Spec).where(
                Spec.user_id == user_id,
                Spec.shipped_at.is_not(None),
                Spec.outcome_notified_at.is_(None),
            )
        )
        for spec in pending_result.scalars().all():
            entry = entries.get(spec.id)
            if entry is None or entry["state"] not in NOTIFIABLE_STATES:
                continue
            db.add(
                Notification(
                    user_id=spec.user_id,
                    title="Post-ship outcome ready",
                    message=_notification_message(entry),
                )
            )
            spec.outcome_notified_at = datetime.now(timezone.utc)
            created += 1

    await db.flush()
    if created:
        logger.info(f"Outcome notifier: created {created} notification(s)")
    return created
