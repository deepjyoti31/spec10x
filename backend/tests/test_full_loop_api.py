"""
Integration Tests — v1.0 Full Loop (PRD-10-01)

Covers task breakdown generation with dependency/citation sanitizing,
approval gating, the agent-ready markdown export bundle, shipped_at
stamping, the post-ship outcomes readout, and the home spec pipeline.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock

import pytest
from sqlalchemy import update

from app.models import (
    FileType,
    Insight,
    InsightCategory,
    Interview,
    InterviewStatus,
    Spec,
    Theme,
    ThemeStatus,
)
from tests.conftest import AUTH_HEADER


def _brief_json(title: str = "Fix Onboarding Friction") -> str:
    def section(text: str) -> dict:
        return {"content": text, "citations": [1]}

    return json.dumps(
        {
            "title": title,
            "problem_statement": section("Users struggle to finish onboarding."),
            "user_stories": section("- As a PM, I want a guided setup, so that I finish faster."),
            "proposed_solution": section("Ship a guided setup checklist."),
            "acceptance_criteria": section("- [ ] Setup completes in under 5 minutes"),
            "risks_and_edge_cases": section("- Risk: checklist becomes clutter for power users"),
            "success_metrics": section("Fewer onboarding complaints in support tickets."),
        }
    )


def _tasks_json() -> str:
    return json.dumps(
        {
            "tasks": [
                {
                    "title": "Add guided setup checklist model",
                    "summary": "Create the checklist table and model. Done when migrations apply cleanly.",
                    "complexity": "M",
                    "depends_on": [],
                    # 99 is out of evidence range — the service must drop it
                    "citations": [1, 99],
                },
                {
                    "title": "Build checklist API",
                    "summary": "CRUD endpoints for checklist steps.",
                    # invalid vocabulary — must normalize to M
                    "complexity": "XL",
                    # 2 is a self-reference and 99 is unknown — both must be dropped
                    "depends_on": [1, 2, 99],
                    "citations": [],
                },
                {
                    "title": "Wire onboarding UI to checklist",
                    "summary": "Show the checklist during first-run onboarding.",
                    "complexity": "L",
                    "depends_on": [2],
                    "citations": [2],
                },
            ]
        }
    )


def _set_response(mock_client, text: str) -> None:
    mock_client.models.generate_content.return_value = Mock(text=text)


async def _create_theme_with_insights(
    db_session, test_user, name: str, *, insight_ages_days: list[int]
) -> Theme:
    theme = Theme(
        user_id=test_user.id,
        name=name,
        description=f"Theme about {name.lower()}",
        mention_count=len(insight_ages_days),
        sentiment_negative=1.0,
        status=ThemeStatus.active,
        is_new=False,
    )
    db_session.add(theme)
    await db_session.flush()

    interview = Interview(
        user_id=test_user.id,
        filename=f"{uuid.uuid4()}.txt",
        file_type=FileType.txt,
        file_size_bytes=10,
        storage_path=f"tests/{uuid.uuid4()}.txt",
        status=InterviewStatus.done,
        transcript="Some transcript text.",
    )
    db_session.add(interview)
    await db_session.flush()

    for index, age_days in enumerate(insight_ages_days):
        db_session.add(
            Insight(
                user_id=test_user.id,
                interview_id=interview.id,
                theme_id=theme.id,
                category=InsightCategory.pain_point,
                title=f"{name} insight {index}",
                quote=f"A representative quote about {name.lower()} number {index}.",
                confidence=0.9,
                theme_suggestion=theme.name,
                sentiment="negative",
                created_at=datetime.now(timezone.utc) - timedelta(days=age_days),
            )
        )
    await db_session.flush()
    await db_session.commit()
    return theme


async def _add_insights(db_session, test_user, theme: Theme, *, ages_days: list[int]) -> None:
    interview = Interview(
        user_id=test_user.id,
        filename=f"{uuid.uuid4()}.txt",
        file_type=FileType.txt,
        file_size_bytes=10,
        storage_path=f"tests/{uuid.uuid4()}.txt",
        status=InterviewStatus.done,
        transcript="More transcript text.",
    )
    db_session.add(interview)
    await db_session.flush()
    for index, age_days in enumerate(ages_days):
        db_session.add(
            Insight(
                user_id=test_user.id,
                interview_id=interview.id,
                theme_id=theme.id,
                category=InsightCategory.pain_point,
                title=f"{theme.name} follow-up {index}",
                quote=f"Another quote about {theme.name.lower()} number {index}.",
                confidence=0.9,
                theme_suggestion=theme.name,
                sentiment="negative",
                created_at=datetime.now(timezone.utc) - timedelta(days=age_days),
            )
        )
    await db_session.flush()
    await db_session.commit()


async def _create_spec(client, mock_client, theme: Theme, title: str) -> dict:
    _set_response(mock_client, _brief_json(title))
    response = await client.post(
        "/api/specs", headers=AUTH_HEADER, json={"theme_id": str(theme.id)}
    )
    assert response.status_code == 201, response.text
    spec = response.json()
    assert spec["generation_status"] == "ready"
    return spec


async def _walk_to(client, spec_id: str, statuses: list[str]) -> dict:
    body: dict = {}
    for status in statuses:
        response = await client.patch(
            f"/api/specs/{spec_id}", headers=AUTH_HEADER, json={"status": status}
        )
        assert response.status_code == 200, f"{status}: {response.text}"
        body = response.json()
    return body


async def _backdate_ship(db_session, spec_id: str, *, days_ago: int) -> datetime:
    shipped_at = datetime.now(timezone.utc) - timedelta(days=days_ago)
    await db_session.execute(
        update(Spec).where(Spec.id == uuid.UUID(spec_id)).values(shipped_at=shipped_at)
    )
    await db_session.commit()
    return shipped_at


class TestTaskBreakdown:
    @pytest.mark.asyncio
    async def test_tasks_blocked_before_approval(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        theme = await _create_theme_with_insights(
            db_session, test_user, "Task Gate Theme", insight_ages_days=[1, 2]
        )
        spec = await _create_spec(client, mock_genai_client_global, theme, "Task Gate Brief")

        response = await client.post(
            f"/api/specs/{spec['id']}/tasks", headers=AUTH_HEADER
        )
        assert response.status_code == 409
        assert "Approve the spec" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_generate_tasks_sanitizes_dependencies_and_citations(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        theme = await _create_theme_with_insights(
            db_session, test_user, "Task Sanitize Theme", insight_ages_days=[1, 2]
        )
        spec = await _create_spec(client, mock_genai_client_global, theme, "Task Sanitize Brief")
        await _walk_to(client, spec["id"], ["in_review", "approved"])

        _set_response(mock_genai_client_global, _tasks_json())
        response = await client.post(
            f"/api/specs/{spec['id']}/tasks", headers=AUTH_HEADER
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["task_count"] == 3
        assert body["tasks_generated_at"] is not None

        tasks = body["tasks"]
        assert [task["number"] for task in tasks] == [1, 2, 3]
        # Evidence ref 99 dropped, valid ref 1 kept
        assert tasks[0]["citations"] == [1]
        # Self-reference (2) and unknown task (99) dropped; valid dependency kept
        assert tasks[1]["depends_on"] == [1]
        # Invalid complexity vocabulary normalized to M
        assert tasks[1]["complexity"] == "M"
        assert tasks[2]["depends_on"] == [2]
        assert tasks[2]["complexity"] == "L"

        # task_count also lands in the list serializer
        listing = await client.get("/api/specs?status=approved", headers=AUTH_HEADER)
        row = next(row for row in listing.json() if row["id"] == spec["id"])
        assert row["task_count"] == 3

    @pytest.mark.asyncio
    async def test_task_generation_failure_persists_nothing(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        theme = await _create_theme_with_insights(
            db_session, test_user, "Task Failure Theme", insight_ages_days=[1, 2]
        )
        spec = await _create_spec(client, mock_genai_client_global, theme, "Task Failure Brief")
        await _walk_to(client, spec["id"], ["in_review", "approved"])

        _set_response(mock_genai_client_global, "this is not json")
        response = await client.post(
            f"/api/specs/{spec['id']}/tasks", headers=AUTH_HEADER
        )
        assert response.status_code == 502

        detail = await client.get(f"/api/specs/{spec['id']}", headers=AUTH_HEADER)
        assert detail.json()["task_count"] == 0
        assert detail.json()["tasks_generated_at"] is None

        # Retry succeeds and replaces nothing-with-something
        _set_response(mock_genai_client_global, _tasks_json())
        retry = await client.post(f"/api/specs/{spec['id']}/tasks", headers=AUTH_HEADER)
        assert retry.status_code == 200
        assert retry.json()["task_count"] == 3


class TestSpecExport:
    @pytest.mark.asyncio
    async def test_export_bundle_is_self_contained(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        theme = await _create_theme_with_insights(
            db_session, test_user, "Export Bundle Theme", insight_ages_days=[1, 2]
        )
        spec = await _create_spec(client, mock_genai_client_global, theme, "Export Bundle Brief")
        await _walk_to(client, spec["id"], ["in_review", "approved"])
        _set_response(mock_genai_client_global, _tasks_json())
        assert (
            await client.post(f"/api/specs/{spec['id']}/tasks", headers=AUTH_HEADER)
        ).status_code == 200

        response = await client.get(
            f"/api/specs/{spec['id']}/export", headers=AUTH_HEADER
        )
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/markdown")
        bundle = response.text

        assert bundle.startswith("# Export Bundle Brief")
        assert "from theme: Export Bundle Theme" in bundle
        # Sections with their citation refs
        assert "## Problem Statement" in bundle
        assert "Users struggle to finish onboarding." in bundle
        assert "Evidence: [1]" in bundle
        # Tasks with dependency and complexity metadata
        assert "## Task Breakdown" in bundle
        assert "### Task 1: Add guided setup checklist model (complexity M)" in bundle
        assert "### Task 2: Build checklist API (complexity M; after #1)" in bundle
        # Evidence appendix carries the numbered snapshot and the caution line
        assert "## Evidence Appendix" in bundle
        assert "**[1]**" in bundle
        assert "**[2]**" in bundle
        assert "supporting evidence, not proven impact" in bundle

    @pytest.mark.asyncio
    async def test_export_requires_ready_brief(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        theme = await _create_theme_with_insights(
            db_session, test_user, "Export Gate Theme", insight_ages_days=[1]
        )
        _set_response(mock_genai_client_global, "this is not json")
        spec = (
            await client.post(
                "/api/specs", headers=AUTH_HEADER, json={"theme_id": str(theme.id)}
            )
        ).json()
        assert spec["generation_status"] == "error"

        response = await client.get(
            f"/api/specs/{spec['id']}/export", headers=AUTH_HEADER
        )
        assert response.status_code == 409


class TestOutcomes:
    @pytest.mark.asyncio
    async def test_first_ship_stamps_shipped_at_once(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        theme = await _create_theme_with_insights(
            db_session, test_user, "Ship Stamp Theme", insight_ages_days=[1, 2]
        )
        spec = await _create_spec(client, mock_genai_client_global, theme, "Ship Stamp Brief")
        assert spec["shipped_at"] is None

        body = await _walk_to(
            client, spec["id"], ["in_review", "approved", "in_dev", "shipped"]
        )
        first_shipped_at = body["shipped_at"]
        assert first_shipped_at is not None

        # Rolling back and re-shipping keeps the original anchor (D-10-06)
        body = await _walk_to(client, spec["id"], ["in_dev", "shipped"])
        assert body["shipped_at"] == first_shipped_at

    @pytest.mark.asyncio
    async def test_outcomes_improving_when_voice_volume_falls(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        # All voice volume sits before the (backdated) ship; nothing after.
        theme = await _create_theme_with_insights(
            db_session,
            test_user,
            "Outcome Improving Theme",
            insight_ages_days=[24, 28, 33, 40],
        )
        spec = await _create_spec(client, mock_genai_client_global, theme, "Outcome Improving Brief")
        await _walk_to(client, spec["id"], ["in_review", "approved", "in_dev", "shipped"])
        await _backdate_ship(db_session, spec["id"], days_ago=21)

        response = await client.get("/api/specs/outcomes", headers=AUTH_HEADER)
        assert response.status_code == 200
        page = response.json()
        assert page["window_weeks"] == 4
        row = next(r for r in page["specs"] if r["spec_id"] == spec["id"])
        assert row["theme_name"] == "Outcome Improving Theme"
        assert len(row["pre_counts"]) == 4
        assert sum(row["pre_counts"]) == 4
        assert len(row["post_counts"]) == 3  # 21 days elapsed = 3 full weeks
        assert sum(row["post_counts"]) == 0
        assert row["pre_weekly_avg"] == 1.0
        assert row["post_weekly_avg"] == 0.0
        assert row["state"] == "improving"

    @pytest.mark.asyncio
    async def test_outcomes_worsening_when_voice_volume_grows(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        theme = await _create_theme_with_insights(
            db_session,
            test_user,
            "Outcome Worsening Theme",
            insight_ages_days=[16, 24],  # pre-ship: 2 signals over 4 weeks
        )
        spec = await _create_spec(client, mock_genai_client_global, theme, "Outcome Worsening Brief")
        await _walk_to(client, spec["id"], ["in_review", "approved", "in_dev", "shipped"])
        await _backdate_ship(db_session, spec["id"], days_ago=14)
        # Post-ship: 5 signals over 2 weeks
        await _add_insights(db_session, test_user, theme, ages_days=[2, 3, 5, 9, 10])

        response = await client.get("/api/specs/outcomes", headers=AUTH_HEADER)
        row = next(r for r in response.json()["specs"] if r["spec_id"] == spec["id"])
        assert row["pre_weekly_avg"] == 0.5
        assert row["post_weekly_avg"] == 2.5
        assert row["state"] == "worsening"

    @pytest.mark.asyncio
    async def test_outcome_too_early_right_after_ship(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        theme = await _create_theme_with_insights(
            db_session, test_user, "Outcome Early Theme", insight_ages_days=[1, 2]
        )
        spec = await _create_spec(client, mock_genai_client_global, theme, "Outcome Early Brief")
        await _walk_to(client, spec["id"], ["in_review", "approved", "in_dev", "shipped"])

        response = await client.get("/api/specs/outcomes", headers=AUTH_HEADER)
        row = next(r for r in response.json()["specs"] if r["spec_id"] == spec["id"])
        assert row["state"] == "too_early"
        assert row["post_counts"] == []
        assert row["post_weekly_avg"] is None

    @pytest.mark.asyncio
    async def test_outcome_unavailable_after_theme_merge(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        target = await _create_theme_with_insights(
            db_session, test_user, "Outcome Merge Target", insight_ages_days=[1]
        )
        source = await _create_theme_with_insights(
            db_session, test_user, "Outcome Merge Source", insight_ages_days=[1, 2]
        )
        spec = await _create_spec(client, mock_genai_client_global, source, "Outcome Merge Brief")
        await _walk_to(client, spec["id"], ["in_review", "approved", "in_dev", "shipped"])

        merge = await client.post(
            f"/api/themes/{target.id}/merge",
            headers=AUTH_HEADER,
            json={"source_theme_id": str(source.id)},
        )
        assert merge.status_code == 200

        response = await client.get("/api/specs/outcomes", headers=AUTH_HEADER)
        row = next(r for r in response.json()["specs"] if r["spec_id"] == spec["id"])
        assert row["state"] == "unavailable"
        # The snapshot still names the theme even though it is gone
        assert row["theme_name"] == "Outcome Merge Source"


class TestHomeSpecPipeline:
    @pytest.mark.asyncio
    async def test_home_dashboard_reports_spec_pipeline(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        theme = await _create_theme_with_insights(
            db_session, test_user, "Pipeline Theme", insight_ages_days=[1, 2]
        )
        draft_spec = await _create_spec(client, mock_genai_client_global, theme, "Pipeline Draft")
        approved_spec = await _create_spec(client, mock_genai_client_global, theme, "Pipeline Approved")
        await _walk_to(client, approved_spec["id"], ["in_review", "approved"])

        response = await client.get("/api/dashboard/home", headers=AUTH_HEADER)
        assert response.status_code == 200
        pipeline = response.json()["spec_pipeline"]

        # Shared test DB accumulates rows, so assert relatively, not absolutely
        assert pipeline["draft"] >= 1
        assert pipeline["approved"] >= 1
        status_sum = (
            pipeline["draft"]
            + pipeline["in_review"]
            + pipeline["needs_changes"]
            + pipeline["approved"]
            + pipeline["in_dev"]
            + pipeline["shipped"]
        )
        assert pipeline["total"] == status_sum
        assert pipeline["total"] >= 2
        assert draft_spec["id"] and approved_spec["id"]
