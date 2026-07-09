"""
Tests — Impact Score v2, trend direction, and score-change explanations
(US-052-01-03, US-052-03-01, US-052-03-02)
"""

import uuid
from datetime import datetime, timedelta, timezone

from app.models import Signal, SignalKind, SignalStatus, SourceType
from app.services.signals import (
    calculate_impact_score,
    calculate_score_change,
    calculate_theme_trend,
)

NOW = datetime.now(timezone.utc)
WORKSPACE_ID = uuid.uuid4()


def _signal(
    theme_id: uuid.UUID,
    *,
    days_old: float,
    source_type: SourceType = SourceType.support,
    provider: str = "zendesk",
    signal_kind: SignalKind = SignalKind.ticket,
    sentiment: str | None = None,
) -> Signal:
    return Signal(
        workspace_id=WORKSPACE_ID,
        source_type=source_type,
        provider=provider,
        signal_kind=signal_kind,
        occurred_at=NOW - timedelta(days=days_old),
        content_text="evidence",
        sentiment=sentiment,
        metadata_json={"theme_match": {"theme_id": str(theme_id)}},
        status=SignalStatus.active,
    )


def _metric_window(theme_id: uuid.UUID, *, days_old: float) -> Signal:
    return _signal(
        theme_id,
        days_old=days_old,
        source_type=SourceType.analytics,
        provider="posthog",
        signal_kind=SignalKind.metric_window,
        sentiment=None,
    )


# ── analytics guardrails in the score ──────────────────────

def test_analytics_widens_diversity_but_not_frequency_or_negative():
    """Metric windows add a source type without inflating voice components."""
    theme_id = uuid.uuid4()
    voice = [
        _signal(theme_id, days_old=2, sentiment="negative"),
        _signal(theme_id, days_old=3, sentiment="negative"),
        _signal(theme_id, days_old=4, sentiment="negative"),
    ]
    analytics = [_metric_window(theme_id, days_old=d) for d in (1, 2, 3, 4)]

    with_analytics = calculate_impact_score(theme_id=theme_id, signals=voice + analytics)
    without_analytics = calculate_impact_score(theme_id=theme_id, signals=voice)

    # frequency counts only the 3 voice signals in both cases
    assert with_analytics.frequency == without_analytics.frequency == 12.0
    # negative ratio stays 100% — no dilution by sentiment-less windows
    assert with_analytics.negative == without_analytics.negative == 25.0
    assert with_analytics.recency == without_analytics.recency == 20.0
    # diversity is the only component analytics may move (2 vs 1 source types)
    assert with_analytics.source_diversity == 10.0
    assert without_analytics.source_diversity == 5.0


def test_analytics_only_theme_scores_diversity_only():
    """A theme supported only by metric windows cannot look urgent."""
    theme_id = uuid.uuid4()
    signals = [_metric_window(theme_id, days_old=d) for d in (1, 8, 15)]

    result = calculate_impact_score(theme_id=theme_id, signals=signals)

    assert result.frequency == 0.0
    assert result.negative == 0.0
    assert result.recency == 0.0
    assert result.source_diversity == 5.0
    assert result.total == 5.0


def test_as_of_ignores_newer_signals():
    """Scoring as of a past date excludes signals that arrived after it."""
    theme_id = uuid.uuid4()
    signals = [_signal(theme_id, days_old=2, sentiment="negative")]

    past = calculate_impact_score(
        theme_id=theme_id,
        signals=signals,
        as_of=NOW - timedelta(days=14),
    )

    assert past.total == 0.0


# ── trend direction ────────────────────────────────────────

def test_trend_rising():
    theme_id = uuid.uuid4()
    signals = [
        _signal(theme_id, days_old=2),
        _signal(theme_id, days_old=5),
        _signal(theme_id, days_old=9),
        _signal(theme_id, days_old=20),
    ]

    trend = calculate_theme_trend(theme_id=theme_id, signals=signals)

    assert trend.direction == "rising"
    assert trend.recent_count == 3
    assert trend.previous_count == 1
    assert trend.window_days == 14


def test_trend_declining():
    theme_id = uuid.uuid4()
    signals = [
        _signal(theme_id, days_old=3),
        _signal(theme_id, days_old=16),
        _signal(theme_id, days_old=20),
        _signal(theme_id, days_old=25),
    ]

    trend = calculate_theme_trend(theme_id=theme_id, signals=signals)

    assert trend.direction == "declining"
    assert trend.recent_count == 1
    assert trend.previous_count == 3


def test_trend_ignores_metric_windows():
    """Weekly metric windows must not fake customer-voice momentum."""
    theme_id = uuid.uuid4()
    signals = [
        _signal(theme_id, days_old=5),
        _signal(theme_id, days_old=18),
        _metric_window(theme_id, days_old=1),
        _metric_window(theme_id, days_old=2),
        _metric_window(theme_id, days_old=3),
    ]

    trend = calculate_theme_trend(theme_id=theme_id, signals=signals)

    assert trend.direction == "flat"
    assert trend.recent_count == 1
    assert trend.previous_count == 1


# ── score-change explanations ──────────────────────────────

def test_score_change_explains_a_rise():
    """New signals in the window produce a deterministic, named breakdown."""
    theme_id = uuid.uuid4()
    signals = [
        _signal(theme_id, days_old=2),
        _signal(theme_id, days_old=4),
        _signal(theme_id, days_old=6),
    ]

    change = calculate_score_change(theme_id=theme_id, signals=signals)

    assert change.previous_total == 0.0
    assert change.delta > 0
    assert change.frequency_delta == 12.0
    assert change.recency_delta == 20.0
    assert change.explanation.startswith("Score rose")
    assert "frequency" in change.explanation
    assert str(change.window_days) in change.explanation


def test_score_change_flat_for_a_stale_theme():
    """A theme with no movement in either window reports no change."""
    theme_id = uuid.uuid4()
    signals = [_signal(theme_id, days_old=200)]

    change = calculate_score_change(theme_id=theme_id, signals=signals)

    assert change.delta == 0.0
    assert change.explanation == "No score change in the last 14 days."
