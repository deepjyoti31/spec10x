"""
Tests — Survey CSV template and validation (US-05-03-01)
"""

import pytest

from app.connectors.csv_import import validate_csv_bytes, TEMPLATE_CSV, REQUIRED_COLUMNS
from tests.conftest import AUTH_HEADER


# ── Unit Tests: CSV Validation ─────────────────────────────

def test_template_has_required_columns():
    """Template CSV header includes all required columns."""
    header_line = TEMPLATE_CSV.split("\n")[0]
    for col in REQUIRED_COLUMNS:
        assert col in header_line


def test_validate_valid_csv():
    """Valid CSV passes validation with no errors."""
    csv_bytes = (
        b"response_text,submitted_at,nps_score,question\n"
        b'"Great product!","2026-03-15T10:30:00Z","9","How satisfied are you?"\n'
        b'"Needs work","2026-03-14T08:00:00Z","4","How satisfied are you?"\n'
    )
    result = validate_csv_bytes(csv_bytes)
    assert result["valid"] is True
    assert len(result["errors"]) == 0
    assert result["total_rows"] == 2
    assert len(result["preview_rows"]) == 2


def test_validate_missing_required_column():
    """CSV missing 'response_text' column → error."""
    csv_bytes = b"submitted_at,nps_score\n2026-03-15T10:30:00Z,8\n"
    result = validate_csv_bytes(csv_bytes)
    assert result["valid"] is False
    assert any("response_text" in e for e in result["errors"])


def test_validate_empty_response_text():
    """Row with empty response_text → error."""
    csv_bytes = (
        b"response_text,submitted_at\n"
        b'"","2026-03-15T10:30:00Z"\n'
    )
    result = validate_csv_bytes(csv_bytes)
    assert result["valid"] is False
    assert any("response_text" in e and "empty" in e for e in result["errors"])


def test_validate_invalid_date():
    """Row with bad date format → error."""
    csv_bytes = (
        b"response_text,submitted_at\n"
        b'"Good product","not-a-date"\n'
    )
    result = validate_csv_bytes(csv_bytes)
    assert result["valid"] is False
    assert any("submitted_at" in e and "not a valid" in e for e in result["errors"])


def test_validate_nps_score_range():
    """NPS score outside 0-10 → warning."""
    csv_bytes = (
        b"response_text,submitted_at,nps_score\n"
        b'"Good product","2026-03-15T10:30:00Z","15"\n'
    )
    result = validate_csv_bytes(csv_bytes)
    assert result["valid"] is True  # warnings don't block
    assert any("nps_score" in w and "0-10" in w for w in result["warnings"])


def test_validate_empty_file():
    """CSV with header only (no data rows) → error."""
    csv_bytes = b"response_text,submitted_at\n"
    result = validate_csv_bytes(csv_bytes)
    assert result["valid"] is False
    assert any("no data" in e.lower() for e in result["errors"])


def test_validate_unknown_columns():
    """CSV with unknown columns → warning (not error)."""
    csv_bytes = (
        b"response_text,submitted_at,custom_field\n"
        b'"Good","2026-03-15T10:30:00Z","custom_value"\n'
    )
    result = validate_csv_bytes(csv_bytes)
    assert result["valid"] is True
    assert any("Unknown columns" in w for w in result["warnings"])


def test_validate_utf8_bom():
    """CSV with UTF-8 BOM should be handled correctly."""
    csv_bytes = (
        b"\xef\xbb\xbfresponse_text,submitted_at\n"
        b'"Good","2026-03-15T10:30:00Z"\n'
    )
    result = validate_csv_bytes(csv_bytes)
    assert result["valid"] is True


def test_validate_flexible_dates():
    """Various common date formats should be accepted."""
    csv_bytes = (
        b"response_text,submitted_at\n"
        b'"Row1","2026-03-15"\n'
        b'"Row2","03/15/2026"\n'
        b'"Row3","2026-03-15 10:30:00"\n'
        b'"Row4","2026-03-15T10:30:00Z"\n'
    )
    result = validate_csv_bytes(csv_bytes)
    assert result["valid"] is True
    assert result["total_rows"] == 4


# ── Integration Tests: API Endpoints ──────────────────────

@pytest.mark.asyncio
async def test_template_download(client):
    """GET /api/survey-import/template returns a CSV file."""
    resp = await client.get("/api/survey-import/template", headers=AUTH_HEADER)
    assert resp.status_code == 200
    assert "text/csv" in resp.headers.get("content-type", "")
    content = resp.text
    assert "response_text" in content
    assert "submitted_at" in content


@pytest.mark.asyncio
async def test_validate_upload_valid(client):
    """POST /api/survey-import/validate with valid CSV returns valid=true."""
    csv_content = (
        b"response_text,submitted_at,nps_score\n"
        b'"Great product!","2026-03-15T10:30:00Z","9"\n'
    )

    resp = await client.post(
        "/api/survey-import/validate",
        files={"file": ("survey.csv", csv_content, "text/csv")},
        headers=AUTH_HEADER,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["total_rows"] == 1


@pytest.mark.asyncio
async def test_validate_upload_invalid(client):
    """POST /api/survey-import/validate with bad CSV returns valid=false."""
    csv_content = b"nps_score,channel\n8,email\n"

    resp = await client.post(
        "/api/survey-import/validate",
        files={"file": ("survey.csv", csv_content, "text/csv")},
        headers=AUTH_HEADER,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False
    assert len(data["errors"]) > 0


@pytest.mark.asyncio
async def test_validate_non_csv_file(client):
    """POST /api/survey-import/validate with non-CSV file → 400."""
    resp = await client.post(
        "/api/survey-import/validate",
        files={"file": ("data.json", b'{"key":"value"}', "application/json")},
        headers=AUTH_HEADER,
    )
    assert resp.status_code == 400
