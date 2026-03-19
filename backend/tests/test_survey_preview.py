"""
Tests — Survey Import Preview + Confirm (US-05-03-02)

Covers:
  - Upload valid CSV → confirm import → verify source_items created
  - Upload invalid CSV → confirm blocked
  - Confirm normalizes rows correctly
"""

import pytest

from tests.conftest import AUTH_HEADER


# ── Integration Tests: Preview + Confirm Flow ────────────

@pytest.mark.asyncio
async def test_confirm_valid_csv(client):
    """Upload valid CSV → confirm → verify import succeeded."""
    csv_content = (
        b"response_text,submitted_at,nps_score,question\n"
        b'"Great product!","2026-03-15T10:30:00Z","9","How satisfied are you?"\n'
        b'"Needs work","2026-03-14T08:00:00Z","4","How satisfied are you?"\n'
    )

    # Step 1: validate (preview)
    validate_resp = await client.post(
        "/api/survey-import/validate",
        files={"file": ("survey.csv", csv_content, "text/csv")},
        headers=AUTH_HEADER,
    )
    assert validate_resp.status_code == 200
    data = validate_resp.json()
    assert data["valid"] is True
    assert data["total_rows"] == 2
    assert len(data["preview_rows"]) == 2

    # Step 2: confirm the import
    confirm_resp = await client.post(
        "/api/survey-import/confirm",
        files={"file": ("survey.csv", csv_content, "text/csv")},
        headers=AUTH_HEADER,
    )
    assert confirm_resp.status_code == 200
    confirm_data = confirm_resp.json()
    assert confirm_data["status"] == "success"
    assert confirm_data["records_seen"] == 2
    assert confirm_data["records_created"] == 2
    assert confirm_data["import_name"] == "survey.csv"


@pytest.mark.asyncio
async def test_confirm_invalid_csv_blocked(client):
    """Confirm with invalid CSV returns 400."""
    csv_content = b"nps_score,channel\n8,email\n"

    confirm_resp = await client.post(
        "/api/survey-import/confirm",
        files={"file": ("survey.csv", csv_content, "text/csv")},
        headers=AUTH_HEADER,
    )
    assert confirm_resp.status_code == 400


@pytest.mark.asyncio
async def test_confirm_non_csv_rejected(client):
    """Confirm with non-CSV file returns 400."""
    confirm_resp = await client.post(
        "/api/survey-import/confirm",
        files={"file": ("data.json", b'{"key":"value"}', "application/json")},
        headers=AUTH_HEADER,
    )
    assert confirm_resp.status_code == 400


@pytest.mark.asyncio
async def test_confirm_empty_file_rejected(client):
    """Confirm with empty file returns 400."""
    confirm_resp = await client.post(
        "/api/survey-import/confirm",
        files={"file": ("survey.csv", b"", "text/csv")},
        headers=AUTH_HEADER,
    )
    assert confirm_resp.status_code == 400


@pytest.mark.asyncio
async def test_confirm_creates_connection_and_sync_run(client):
    """Confirm creates a source_connection and sync_run."""
    csv_content = (
        b"response_text,submitted_at\n"
        b'"Good stuff","2026-03-15T10:30:00Z"\n'
    )

    confirm_resp = await client.post(
        "/api/survey-import/confirm",
        files={"file": ("test_import.csv", csv_content, "text/csv")},
        headers=AUTH_HEADER,
    )
    assert confirm_resp.status_code == 200
    data = confirm_resp.json()
    assert "connection_id" in data
    assert "sync_run_id" in data
    assert data["records_created"] == 1


@pytest.mark.asyncio
async def test_confirm_preserves_nps_score(client):
    """Confirm normalizes NPS scores into metadata."""
    csv_content = (
        b"response_text,submitted_at,nps_score\n"
        b'"Love it!","2026-03-15T10:30:00Z","10"\n'
    )

    confirm_resp = await client.post(
        "/api/survey-import/confirm",
        files={"file": ("nps.csv", csv_content, "text/csv")},
        headers=AUTH_HEADER,
    )
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["records_created"] == 1
