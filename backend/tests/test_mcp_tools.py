"""
Integration Tests — v1.1 MCP server tools (PRD-11-01, EPIC-11-03)

The MCP server module is a thin adapter; these tests exercise the tool
implementations directly against the database, plus the bundle-parity
guarantee: get_spec_bundle returns exactly what the API export serves.
"""

from __future__ import annotations

import pytest

from app.mcp.tools import (
    McpToolError,
    get_spec_bundle_tool,
    get_spec_outcome_tool,
    list_specs_tool,
    mark_spec_shipped_tool,
    resolve_mcp_user,
)
from tests.conftest import AUTH_HEADER, TEST_USER_EMAIL
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


class TestMcpIdentity:
    @pytest.mark.asyncio
    async def test_resolves_configured_user_and_rejects_unknown(
        self, db_session, test_user
    ):
        user = await resolve_mcp_user(db_session, TEST_USER_EMAIL.upper())
        assert user.id == test_user.id

        with pytest.raises(McpToolError, match="No Spec10x user"):
            await resolve_mcp_user(db_session, "nobody@spec10xtest.com")
        with pytest.raises(McpToolError, match="SPEC10X_MCP_USER_EMAIL"):
            await resolve_mcp_user(db_session, "")


class TestMcpSpecs:
    @pytest.mark.asyncio
    async def test_list_specs_and_status_filter(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        spec = await _spec_with_tasks(
            client, db_session, test_user, mock_genai_client_global, "MCP List Brief"
        )

        rows = await list_specs_tool(db_session, test_user)
        row = next(r for r in rows if r["id"] == spec["id"])
        assert row["title"] == "MCP List Brief"
        assert row["status"] == "approved"
        assert row["task_count"] == 3
        assert row["has_ready_brief"] is True

        approved_only = await list_specs_tool(db_session, test_user, "approved")
        assert any(r["id"] == spec["id"] for r in approved_only)
        shipped_only = await list_specs_tool(db_session, test_user, "shipped")
        assert all(r["id"] != spec["id"] for r in shipped_only)

        with pytest.raises(McpToolError, match="Unknown status"):
            await list_specs_tool(db_session, test_user, "done")

    @pytest.mark.asyncio
    async def test_bundle_is_identical_to_api_export(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        spec = await _spec_with_tasks(
            client, db_session, test_user, mock_genai_client_global, "MCP Bundle Brief"
        )

        api_bundle = (
            await client.get(f"/api/specs/{spec['id']}/export", headers=AUTH_HEADER)
        ).text
        mcp_bundle = await get_spec_bundle_tool(db_session, test_user, spec["id"])
        assert mcp_bundle == api_bundle
        assert "## Task Breakdown" in mcp_bundle

        with pytest.raises(McpToolError, match="not found"):
            await get_spec_bundle_tool(
                db_session, test_user, "00000000-0000-0000-0000-000000000000"
            )
        with pytest.raises(McpToolError, match="not a valid spec id"):
            await get_spec_bundle_tool(db_session, test_user, "not-a-uuid")


class TestMcpShipAndOutcome:
    @pytest.mark.asyncio
    async def test_mark_shipped_stamps_once_and_is_noop_when_shipped(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        spec = await _spec_with_tasks(
            client, db_session, test_user, mock_genai_client_global, "MCP Ship Brief"
        )

        result = await mark_spec_shipped_tool(db_session, test_user, spec["id"])
        await db_session.commit()
        assert result["changed"] is True
        assert result["status"] == "shipped"
        first_shipped_at = result["shipped_at"]
        assert first_shipped_at is not None

        # No-op on an already-shipped spec (D-10-06 preserved)
        again = await mark_spec_shipped_tool(db_session, test_user, spec["id"])
        assert again["changed"] is False
        assert again["shipped_at"] == first_shipped_at

        # The UI sees the same truth
        detail = (
            await client.get(f"/api/specs/{spec['id']}", headers=AUTH_HEADER)
        ).json()
        assert detail["status"] == "shipped"
        assert detail["shipped_at"] is not None

    @pytest.mark.asyncio
    async def test_mark_shipped_rejects_unreviewed_specs(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        theme = await _create_theme_with_insights(
            db_session, test_user, "MCP Gate Theme", insight_ages_days=[1]
        )
        draft = await _create_spec(
            client, mock_genai_client_global, theme, "MCP Gate Brief"
        )
        with pytest.raises(McpToolError, match="cannot be marked shipped"):
            await mark_spec_shipped_tool(db_session, test_user, draft["id"])

    @pytest.mark.asyncio
    async def test_outcome_tool_reports_state_with_caution(
        self, client, db_session, test_user, mock_genai_client_global
    ):
        theme = await _create_theme_with_insights(
            db_session,
            test_user,
            "MCP Outcome Theme",
            insight_ages_days=[24, 28, 33, 40],
        )
        spec = await _create_spec(
            client, mock_genai_client_global, theme, "MCP Outcome Brief"
        )
        await _walk_to(client, spec["id"], ["in_review", "approved", "in_dev", "shipped"])
        await _backdate_ship(db_session, spec["id"], days_ago=21)

        outcome = await get_spec_outcome_tool(db_session, test_user, spec["id"])
        assert outcome["state"] == "improving"
        assert outcome["theme_name"] == "MCP Outcome Theme"
        assert "not proven impact" in outcome["caution"]

        unshipped_theme = await _create_theme_with_insights(
            db_session, test_user, "MCP Unshipped Theme", insight_ages_days=[1]
        )
        unshipped = await _create_spec(
            client, mock_genai_client_global, unshipped_theme, "MCP Unshipped Brief"
        )
        with pytest.raises(McpToolError, match="not shipped"):
            await get_spec_outcome_tool(db_session, test_user, unshipped["id"])
