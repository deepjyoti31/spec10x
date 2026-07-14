"""
Integration Tests — Specs API (v0.8 Specification Engine, PRD-08-01)

Covers spec generation with evidence citations, citation sanitizing,
review-workflow transitions, section editing, regeneration rules, and
evidence-trail survival across theme merge.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock

import pytest

from app.models import (
    FileType,
    Insight,
    InsightCategory,
    Interview,
    InterviewStatus,
    Theme,
    ThemeStatus,
)
from tests.conftest import AUTH_HEADER


def _brief_json(title: str = "Fix Onboarding Friction", suffix: str = "") -> str:
    def section(text: str) -> dict:
        # 99 is deliberately out of range — the service must drop it
        return {"content": f"{text}{suffix}", "citations": [1, 99]}

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


def _set_brief_response(mock_client, text: str) -> None:
    mock_client.models.generate_content.return_value = Mock(text=text)


async def _create_theme(db_session, test_user, name: str) -> Theme:
    theme = Theme(
        user_id=test_user.id,
        name=name,
        description=f"Theme about {name.lower()}",
        mention_count=2,
        sentiment_negative=1.0,
        status=ThemeStatus.active,
        is_new=False,
    )
    db_session.add(theme)
    await db_session.flush()
    return theme


async def _create_theme_with_evidence(
    db_session,
    test_user,
    name: str,
    *,
    insight_count: int = 2,
    days_old: int = 1,
) -> Theme:
    theme = await _create_theme(db_session, test_user, name)
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

    for index in range(insight_count):
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
                created_at=datetime.now(timezone.utc) - timedelta(days=days_old),
            )
        )
    await db_session.flush()
    await db_session.commit()
    return theme


class TestSpecGeneration:
    @pytest.mark.asyncio
    async def test_create_spec_generates_cited_sections_and_evidence(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        theme = await _create_theme_with_evidence(
            db_session, test_user, "Onboarding Friction Alpha", insight_count=2
        )
        _set_brief_response(mock_genai_client_global, _brief_json())

        response = await client.post(
            "/api/specs", headers=AUTH_HEADER, json={"theme_id": str(theme.id)}
        )
        assert response.status_code == 201, response.text
        spec = response.json()

        assert spec["generation_status"] == "ready"
        assert spec["status"] == "draft"
        assert spec["title"] == "Fix Onboarding Friction"
        assert spec["theme_id"] == str(theme.id)
        assert spec["theme_name_snapshot"] == "Onboarding Friction Alpha"
        assert spec["is_edited"] is False
        assert spec["impact_score_snapshot"] > 0

        # Fixed MVP section order (D-08-01)
        assert [section["key"] for section in spec["sections"]] == [
            "problem_statement",
            "user_stories",
            "proposed_solution",
            "acceptance_criteria",
            "risks_and_edge_cases",
            "success_metrics",
        ]
        # Invalid citation ref 99 is dropped; valid ref 1 kept
        for section in spec["sections"]:
            assert section["citations"] == [1]

        # Evidence snapshot maps refs to real signals
        assert spec["evidence_count"] == 2
        refs = [item["ref"] for item in spec["evidence"]]
        assert refs == [1, 2]
        assert all(item["source_type"] == "interview" for item in spec["evidence"])
        assert all(item["signal_id"] for item in spec["evidence"])

    @pytest.mark.asyncio
    async def test_create_spec_rejects_theme_without_evidence(
        self, client, db_session, test_user
    ):
        theme = await _create_theme(db_session, test_user, "Zqx Unmatched Theme")
        await db_session.commit()

        response = await client.post(
            "/api/specs", headers=AUTH_HEADER, json={"theme_id": str(theme.id)}
        )
        assert response.status_code == 422
        assert "no supporting evidence" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_create_spec_404_for_unknown_theme(self, client):
        response = await client.post(
            "/api/specs", headers=AUTH_HEADER, json={"theme_id": str(uuid.uuid4())}
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_generation_failure_is_recorded_and_retryable(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        theme = await _create_theme_with_evidence(
            db_session, test_user, "Export Reliability Beta"
        )
        _set_brief_response(mock_genai_client_global, "this is not json")

        response = await client.post(
            "/api/specs", headers=AUTH_HEADER, json={"theme_id": str(theme.id)}
        )
        assert response.status_code == 201
        spec = response.json()
        assert spec["generation_status"] == "error"
        assert spec["generation_error"]
        # Failure still keeps the evidence snapshot for transparency
        assert spec["evidence_count"] == 2

        # Retry succeeds once the model responds properly
        _set_brief_response(mock_genai_client_global, _brief_json("Export Reliability Fixes"))
        retry = await client.post(
            f"/api/specs/{spec['id']}/regenerate", headers=AUTH_HEADER
        )
        assert retry.status_code == 200
        assert retry.json()["generation_status"] == "ready"
        assert retry.json()["title"] == "Export Reliability Fixes"


class TestSpecWorkflow:
    async def _create_ready_spec(
        self, client, db_session, test_user, mock_client, name: str
    ) -> dict:
        theme = await _create_theme_with_evidence(db_session, test_user, name)
        _set_brief_response(mock_client, _brief_json(f"{name} Brief"))
        response = await client.post(
            "/api/specs", headers=AUTH_HEADER, json={"theme_id": str(theme.id)}
        )
        assert response.status_code == 201
        return response.json()

    @pytest.mark.asyncio
    async def test_valid_workflow_walk(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        spec = await self._create_ready_spec(
            client, db_session, test_user, mock_genai_client_global, "Workflow Walk Theme"
        )
        for status in ["in_review", "approved", "in_dev", "shipped"]:
            response = await client.patch(
                f"/api/specs/{spec['id']}", headers=AUTH_HEADER, json={"status": status}
            )
            assert response.status_code == 200, f"{status}: {response.text}"
            assert response.json()["status"] == status

    @pytest.mark.asyncio
    async def test_invalid_transition_rejected(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        spec = await self._create_ready_spec(
            client, db_session, test_user, mock_genai_client_global, "Workflow Skip Theme"
        )
        # draft → approved skips review
        response = await client.patch(
            f"/api/specs/{spec['id']}", headers=AUTH_HEADER, json={"status": "approved"}
        )
        assert response.status_code == 422
        assert "Cannot move a spec" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_edit_title_and_section_marks_edited(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        spec = await self._create_ready_spec(
            client, db_session, test_user, mock_genai_client_global, "Editable Theme"
        )
        response = await client.patch(
            f"/api/specs/{spec['id']}",
            headers=AUTH_HEADER,
            json={
                "title": "Edited Title",
                "sections": [{"key": "problem_statement", "content": "Edited problem."}],
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["title"] == "Edited Title"
        assert body["is_edited"] is True
        by_key = {section["key"]: section for section in body["sections"]}
        assert by_key["problem_statement"]["content"] == "Edited problem."
        # Untouched sections keep their generated content and citations
        assert by_key["proposed_solution"]["content"].startswith("Ship a guided setup")
        assert by_key["proposed_solution"]["citations"] == [1]

    @pytest.mark.asyncio
    async def test_edit_unknown_section_rejected(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        spec = await self._create_ready_spec(
            client, db_session, test_user, mock_genai_client_global, "Unknown Section Theme"
        )
        response = await client.patch(
            f"/api/specs/{spec['id']}",
            headers=AUTH_HEADER,
            json={"sections": [{"key": "wireframes", "content": "nope"}]},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_regenerate_blocked_after_approval(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        spec = await self._create_ready_spec(
            client, db_session, test_user, mock_genai_client_global, "Approved Lock Theme"
        )
        for status in ["in_review", "approved"]:
            await client.patch(
                f"/api/specs/{spec['id']}", headers=AUTH_HEADER, json={"status": status}
            )
        response = await client.post(
            f"/api/specs/{spec['id']}/regenerate", headers=AUTH_HEADER
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_regenerate_replaces_sections_and_resets_edits(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        spec = await self._create_ready_spec(
            client, db_session, test_user, mock_genai_client_global, "Regen Theme"
        )
        await client.patch(
            f"/api/specs/{spec['id']}",
            headers=AUTH_HEADER,
            json={"sections": [{"key": "problem_statement", "content": "Manually edited."}]},
        )

        _set_brief_response(
            mock_genai_client_global, _brief_json("Regen Theme Brief", suffix=" (v2)")
        )
        response = await client.post(
            f"/api/specs/{spec['id']}/regenerate", headers=AUTH_HEADER
        )
        assert response.status_code == 200
        body = response.json()
        assert body["is_edited"] is False
        assert body["status"] == "draft"
        by_key = {section["key"]: section for section in body["sections"]}
        assert by_key["problem_statement"]["content"].endswith("(v2)")


class TestSpecLifecycle:
    @pytest.mark.asyncio
    async def test_list_specs_filters_by_status(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        theme = await _create_theme_with_evidence(db_session, test_user, "List Filter Theme")
        _set_brief_response(mock_genai_client_global, _brief_json("List Filter Brief"))

        first = (
            await client.post(
                "/api/specs", headers=AUTH_HEADER, json={"theme_id": str(theme.id)}
            )
        ).json()
        second = (
            await client.post(
                "/api/specs", headers=AUTH_HEADER, json={"theme_id": str(theme.id)}
            )
        ).json()
        await client.patch(
            f"/api/specs/{second['id']}", headers=AUTH_HEADER, json={"status": "in_review"}
        )

        in_review = await client.get(
            "/api/specs?status=in_review", headers=AUTH_HEADER
        )
        assert in_review.status_code == 200
        ids = {row["id"] for row in in_review.json()}
        assert second["id"] in ids
        assert first["id"] not in ids
        assert all(row["status"] == "in_review" for row in in_review.json())

    @pytest.mark.asyncio
    async def test_spec_survives_theme_merge(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        target = await _create_theme_with_evidence(db_session, test_user, "Merge Target Gamma")
        source = await _create_theme_with_evidence(db_session, test_user, "Merge Source Gamma")
        _set_brief_response(mock_genai_client_global, _brief_json("Merge Source Brief"))

        spec = (
            await client.post(
                "/api/specs", headers=AUTH_HEADER, json={"theme_id": str(source.id)}
            )
        ).json()
        assert spec["generation_status"] == "ready"

        merge = await client.post(
            f"/api/themes/{target.id}/merge",
            headers=AUTH_HEADER,
            json={"source_theme_id": str(source.id)},
        )
        assert merge.status_code == 200

        # The spec keeps rendering from its snapshot after the theme is gone
        response = await client.get(f"/api/specs/{spec['id']}", headers=AUTH_HEADER)
        assert response.status_code == 200
        body = response.json()
        assert body["theme_id"] is None
        assert body["theme_name_snapshot"] == "Merge Source Gamma"
        assert body["evidence_count"] == 2
        assert len(body["sections"]) == 6

        # But it can no longer be regenerated
        regen = await client.post(
            f"/api/specs/{spec['id']}/regenerate", headers=AUTH_HEADER
        )
        assert regen.status_code == 409

    @pytest.mark.asyncio
    async def test_delete_spec_leaves_theme_untouched(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        theme = await _create_theme_with_evidence(db_session, test_user, "Delete Safety Theme")
        _set_brief_response(mock_genai_client_global, _brief_json("Delete Safety Brief"))

        spec = (
            await client.post(
                "/api/specs", headers=AUTH_HEADER, json={"theme_id": str(theme.id)}
            )
        ).json()

        delete = await client.delete(f"/api/specs/{spec['id']}", headers=AUTH_HEADER)
        assert delete.status_code == 204

        gone = await client.get(f"/api/specs/{spec['id']}", headers=AUTH_HEADER)
        assert gone.status_code == 404

        theme_still_there = await client.get(
            f"/api/themes/{theme.id}", headers=AUTH_HEADER
        )
        assert theme_still_there.status_code == 200
        assert len(theme_still_there.json()["insights"]) == 2
