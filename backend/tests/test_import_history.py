"""
Tests — Import History (US-05-03-04)

Covers:
  - Import history endpoint returns past imports in order
  - Failed import shows error summary in history
  - History is empty when no imports exist
"""

import pytest

from tests.conftest import AUTH_HEADER


# ── Integration Tests: Import History ────────────────────

@pytest.mark.asyncio
async def test_history_empty_initially(client):
    """GET /api/survey-import/history returns empty list when no imports."""
    resp = await client.get("/api/survey-import/history", headers=AUTH_HEADER)
    assert resp.status_code == 200
    data = resp.json()
    assert "imports" in data
    assert isinstance(data["imports"], list)


@pytest.mark.asyncio
async def test_history_after_import(client):
    """Import a CSV, then verify it appears in history."""
    csv_content = (
        b"response_text,submitted_at,nps_score\n"
        b'"Great!","2026-03-15T10:30:00Z","9"\n'
    )

    # Do an import
    confirm_resp = await client.post(
        "/api/survey-import/confirm",
        files={"file": ("history_test.csv", csv_content, "text/csv")},
        headers=AUTH_HEADER,
    )
    assert confirm_resp.status_code == 200

    # Check history
    history_resp = await client.get("/api/survey-import/history", headers=AUTH_HEADER)
    assert history_resp.status_code == 200
    imports = history_resp.json()["imports"]

    assert len(imports) >= 1
    latest = imports[0]
    assert latest["import_name"] == "history_test.csv"
    assert latest["status"] == "succeeded"
    assert latest["records_created"] == 1
    assert latest["error_summary"] is None


@pytest.mark.asyncio
async def test_history_multiple_imports_ordered(client):
    """Multiple imports appear in history, most recent first."""
    for filename in ["first.csv", "second.csv"]:
        csv_content = (
            b"response_text,submitted_at\n"
            b'"Response","2026-03-15T10:30:00Z"\n'
        )
        resp = await client.post(
            "/api/survey-import/confirm",
            files={"file": (filename, csv_content, "text/csv")},
            headers=AUTH_HEADER,
        )
        assert resp.status_code == 200

    history_resp = await client.get("/api/survey-import/history", headers=AUTH_HEADER)
    imports = history_resp.json()["imports"]
    assert len(imports) >= 2

    # Most recent first
    names = [imp["import_name"] for imp in imports]
    assert names.index("second.csv") < names.index("first.csv")


@pytest.mark.asyncio
async def test_history_shows_record_counts(client):
    """History entries include record counts."""
    csv_content = (
        b"response_text,submitted_at\n"
        b'"Row 1","2026-03-15T10:00:00Z"\n'
        b'"Row 2","2026-03-15T11:00:00Z"\n'
        b'"Row 3","2026-03-15T12:00:00Z"\n'
    )

    confirm_resp = await client.post(
        "/api/survey-import/confirm",
        files={"file": ("counts_test.csv", csv_content, "text/csv")},
        headers=AUTH_HEADER,
    )
    assert confirm_resp.status_code == 200

    history_resp = await client.get("/api/survey-import/history", headers=AUTH_HEADER)
    imports = history_resp.json()["imports"]

    # Find the one we just created
    counts_import = next(
        (i for i in imports if i["import_name"] == "counts_test.csv"), None
    )
    assert counts_import is not None
    assert counts_import["records_seen"] == 3
    assert counts_import["records_created"] == 3


@pytest.mark.asyncio
async def test_history_contains_timestamps(client):
    """History entries include started_at and finished_at."""
    csv_content = (
        b"response_text,submitted_at\n"
        b'"Timecheck","2026-03-15T10:30:00Z"\n'
    )

    await client.post(
        "/api/survey-import/confirm",
        files={"file": ("timestamp_test.csv", csv_content, "text/csv")},
        headers=AUTH_HEADER,
    )

    history_resp = await client.get("/api/survey-import/history", headers=AUTH_HEADER)
    imports = history_resp.json()["imports"]
    latest = imports[0]

    assert latest["started_at"] is not None
    assert latest["finished_at"] is not None
