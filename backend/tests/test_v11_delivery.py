"""
Integration Tests — v1.1 Delivery Integrations (PRD-11-01, EPIC-11-05)

Covers the one-way GitHub Issues export (request-scoped token, per-task
idempotency, partial-failure retry) and the auto-close outcome
notifications (fire once, only when the readout leaves too_early).
"""

from __future__ import annotations

import json
import uuid

import httpx
import pytest
from sqlalchemy import select

from app.models import Notification, Spec
from app.services.outcomes import generate_outcome_notifications
from tests.conftest import AUTH_HEADER
from tests.test_full_loop_api import (
    _backdate_ship,
    _create_spec,
    _create_theme_with_insights,
    _set_response,
    _tasks_json,
    _walk_to,
)


async def _spec_with_tasks(client, db_session, test_user, mock_client, title: str) -> dict:
    theme = await _create_theme_with_insights(
        db_session, test_user, f"{title} Theme", insight_ages_days=[1, 2]
    )
    spec = await _create_spec(client, mock_client, theme, title)
    await _walk_to(client, spec["id"], ["in_review", "approved"])
    _set_response(mock_client, _tasks_json())
    response = await client.post(f"/api/specs/{spec['id']}/tasks", headers=AUTH_HEADER)
    assert response.status_code == 200, response.text
    return response.json()


class _FakeGitHub:
    """MockTransport handler standing in for api.github.com."""

    def __init__(self):
        self.calls: list[dict] = []
        self.next_number = 100
        self.fail_on_call: set[int] = set()  # 1-based call indexes → HTTP 500
        self.status_override: int | None = None  # e.g. 401 for every call

    def handler(self, request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content.decode())
        self.calls.append({"url": str(request.url), "body": body})
        call_index = len(self.calls)
        if self.status_override is not None:
            return httpx.Response(self.status_override, json={"message": "nope"})
        if call_index in self.fail_on_call:
            return httpx.Response(500, json={"message": "boom"})
        self.next_number += 1
        return httpx.Response(
            201,
            json={
                "number": self.next_number,
                "html_url": f"https://github.com/acme/roadmap/issues/{self.next_number}",
            },
        )


@pytest.fixture
def fake_github(monkeypatch):
    fake = _FakeGitHub()
    transport = httpx.MockTransport(fake.handler)
    real_async_client = httpx.AsyncClient

    def _patched_client(**kwargs):
        kwargs.pop("transport", None)
        return real_async_client(transport=transport, **kwargs)

    monkeypatch.setattr(
        "app.services.github_export.httpx.AsyncClient", _patched_client
    )
    return fake


EXPORT_BODY = {"repo": "acme/roadmap", "token": "ghp_test_token"}


class TestGitHubExport:
    @pytest.mark.asyncio
    async def test_export_creates_issues_and_retry_skips_them(
        self, client, db_session, test_user, mock_genai_client_global, fake_github
    ):
        spec = await _spec_with_tasks(
            client, db_session, test_user, mock_genai_client_global, "GH Export Brief"
        )

        response = await client.post(
            f"/api/specs/{spec['id']}/tasks/github", headers=AUTH_HEADER, json=EXPORT_BODY
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["created"] == 3
        assert all(result["status"] == "created" for result in body["results"])
        assert all(task["issue_url"] for task in body["tasks"])
        # The issue body carries the plan, not just a title
        first_issue = fake_github.calls[0]["body"]
        assert first_issue["title"].startswith("[Spec10x] ")
        assert "Complexity" in first_issue["body"]
        assert "Exported from Spec10x" in first_issue["body"]
        # The token went to GitHub and nowhere else — never echoed back
        assert "ghp_test_token" not in response.text

        # Issue links persist on the spec
        detail = (await client.get(f"/api/specs/{spec['id']}", headers=AUTH_HEADER)).json()
        assert all(task["issue_url"] for task in detail["tasks"])

        # Re-export creates nothing new
        retry = await client.post(
            f"/api/specs/{spec['id']}/tasks/github", headers=AUTH_HEADER, json=EXPORT_BODY
        )
        assert retry.status_code == 200
        assert retry.json()["created"] == 0
        assert all(r["status"] == "already_exported" for r in retry.json()["results"])
        assert len(fake_github.calls) == 3

    @pytest.mark.asyncio
    async def test_partial_failure_keeps_created_links_and_retry_fills_gap(
        self, client, db_session, test_user, mock_genai_client_global, fake_github
    ):
        spec = await _spec_with_tasks(
            client, db_session, test_user, mock_genai_client_global, "GH Partial Brief"
        )
        fake_github.fail_on_call = {2}

        response = await client.post(
            f"/api/specs/{spec['id']}/tasks/github", headers=AUTH_HEADER, json=EXPORT_BODY
        )
        assert response.status_code == 200
        body = response.json()
        assert body["created"] == 2  # tasks 1 and 3; task 2 hit the 500
        statuses = {result["number"]: result["status"] for result in body["results"]}
        assert statuses == {1: "created", 2: "failed", 3: "created"}

        detail = (await client.get(f"/api/specs/{spec['id']}", headers=AUTH_HEADER)).json()
        assert detail["tasks"][0]["issue_url"] and detail["tasks"][2]["issue_url"]
        assert detail["tasks"][1]["issue_url"] is None

        # Retry only creates the missing issue
        fake_github.fail_on_call = set()
        retry = await client.post(
            f"/api/specs/{spec['id']}/tasks/github", headers=AUTH_HEADER, json=EXPORT_BODY
        )
        assert retry.json()["created"] == 1
        statuses = {r["number"]: r["status"] for r in retry.json()["results"]}
        assert statuses == {1: "already_exported", 2: "created", 3: "already_exported"}

    @pytest.mark.asyncio
    async def test_rejected_token_exports_nothing(
        self, client, db_session, test_user, mock_genai_client_global, fake_github
    ):
        spec = await _spec_with_tasks(
            client, db_session, test_user, mock_genai_client_global, "GH Reject Brief"
        )
        fake_github.status_override = 401

        response = await client.post(
            f"/api/specs/{spec['id']}/tasks/github", headers=AUTH_HEADER, json=EXPORT_BODY
        )
        assert response.status_code == 502
        assert "token" in response.json()["detail"].lower()
        # A 401 is fatal — the export stops after the first call
        assert len(fake_github.calls) == 1

        detail = (await client.get(f"/api/specs/{spec['id']}", headers=AUTH_HEADER)).json()
        assert all(task["issue_url"] is None for task in detail["tasks"])

    @pytest.mark.asyncio
    async def test_export_requires_tasks_and_valid_repo(
        self, client, db_session, test_user, mock_genai_client_global, fake_github
    ):
        theme = await _create_theme_with_insights(
            db_session, test_user, "GH Gate Theme", insight_ages_days=[1]
        )
        spec = await _create_spec(
            client, mock_genai_client_global, theme, "GH Gate Brief"
        )
        response = await client.post(
            f"/api/specs/{spec['id']}/tasks/github", headers=AUTH_HEADER, json=EXPORT_BODY
        )
        assert response.status_code == 409

        spec_with_tasks = await _spec_with_tasks(
            client, db_session, test_user, mock_genai_client_global, "GH Repo Brief"
        )
        response = await client.post(
            f"/api/specs/{spec_with_tasks['id']}/tasks/github",
            headers=AUTH_HEADER,
            json={"repo": "not a repo", "token": "ghp_x"},
        )
        assert response.status_code == 422
        assert len(fake_github.calls) == 0


class TestOutcomeNotifications:
    @pytest.mark.asyncio
    async def test_notification_fires_once_when_outcome_becomes_readable(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        theme = await _create_theme_with_insights(
            db_session,
            test_user,
            "Notify Improving Theme",
            insight_ages_days=[24, 28, 33, 40],
        )
        spec = await _create_spec(
            client, mock_genai_client_global, theme, "Notify Improving Brief"
        )
        await _walk_to(client, spec["id"], ["in_review", "approved", "in_dev", "shipped"])
        await _backdate_ship(db_session, spec["id"], days_ago=21)

        created = await generate_outcome_notifications(db_session)
        await db_session.commit()
        assert created >= 1

        result = await db_session.execute(
            select(Notification).where(
                Notification.user_id == test_user.id,
                Notification.message.contains("Notify Improving Brief"),
            )
        )
        notifications = result.scalars().all()
        assert len(notifications) == 1
        message = notifications[0].message
        assert notifications[0].title == "Post-ship outcome ready"
        assert "Notify Improving Theme" in message
        assert "fell" in message
        assert "not proven impact" in message

        spec_row = (
            await db_session.execute(
                select(Spec).where(Spec.id == uuid.UUID(spec["id"]))
            )
        ).scalar_one()
        assert spec_row.outcome_notified_at is not None

        # Idempotent: a rerun never duplicates the notification
        await generate_outcome_notifications(db_session)
        await db_session.commit()
        result = await db_session.execute(
            select(Notification).where(
                Notification.user_id == test_user.id,
                Notification.message.contains("Notify Improving Brief"),
            )
        )
        assert len(result.scalars().all()) == 1

    @pytest.mark.asyncio
    async def test_notification_skips_too_early_and_unavailable(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        # Shipped just now → too_early, must not notify
        theme = await _create_theme_with_insights(
            db_session, test_user, "Notify Early Theme", insight_ages_days=[1, 2]
        )
        early_spec = await _create_spec(
            client, mock_genai_client_global, theme, "Notify Early Brief"
        )
        await _walk_to(
            client, early_spec["id"], ["in_review", "approved", "in_dev", "shipped"]
        )

        # Theme merged away → unavailable, must not notify
        target = await _create_theme_with_insights(
            db_session, test_user, "Notify Merge Target", insight_ages_days=[1]
        )
        source = await _create_theme_with_insights(
            db_session, test_user, "Notify Merge Source", insight_ages_days=[1, 2]
        )
        merged_spec = await _create_spec(
            client, mock_genai_client_global, source, "Notify Unavailable Brief"
        )
        await _walk_to(
            client, merged_spec["id"], ["in_review", "approved", "in_dev", "shipped"]
        )
        await _backdate_ship(db_session, merged_spec["id"], days_ago=21)
        merge = await client.post(
            f"/api/themes/{target.id}/merge",
            headers=AUTH_HEADER,
            json={"source_theme_id": str(source.id)},
        )
        assert merge.status_code == 200

        await generate_outcome_notifications(db_session)
        await db_session.commit()

        for title in ("Notify Early Brief", "Notify Unavailable Brief"):
            result = await db_session.execute(
                select(Notification).where(Notification.message.contains(title))
            )
            assert result.scalars().all() == []

        for spec_id in (early_spec["id"], merged_spec["id"]):
            spec_row = (
                await db_session.execute(
                    select(Spec).where(Spec.id == uuid.UUID(spec_id))
                )
            ).scalar_one()
            assert spec_row.outcome_notified_at is None
