"""
Spec10x — CSV Import Connector

Handles survey and NPS CSV file validation and normalization.
Implements the BaseConnector contract for CSV-based imports.
"""

from __future__ import annotations

import csv
import io
import logging
from datetime import datetime
from typing import Any

from app.connectors import register_connector
from app.connectors.base import BaseConnector, ConnectorError, NormalizedSignal, SyncResult
from app.models import SourceConnectionStatus, SyncRun
from app.services.sources import transition_source_connection

logger = logging.getLogger(__name__)

# ── CSV Template Definition ──────────────────────────────

REQUIRED_COLUMNS = ["response_text", "submitted_at"]

OPTIONAL_COLUMNS = [
    "respondent_id",
    "nps_score",
    "question",
    "channel",
    "sentiment",
    "tags",
]

ALL_COLUMNS = REQUIRED_COLUMNS + OPTIONAL_COLUMNS

TEMPLATE_HEADER = ",".join(ALL_COLUMNS)
TEMPLATE_EXAMPLE_ROW = (
    '"I love the new dashboard but the search is slow",'
    '"2026-03-15T10:30:00Z",'
    '"resp-001",'
    '"8",'
    '"How satisfied are you with the product?",'
    '"email",'
    '"positive",'
    '"dashboard;search"'
)

TEMPLATE_CSV = f"{TEMPLATE_HEADER}\n{TEMPLATE_EXAMPLE_ROW}\n"


# ── Validation Logic ─────────────────────────────────────

def validate_csv_bytes(file_bytes: bytes) -> dict:
    """Parse and validate a CSV file.

    Returns a dict with:
        - valid: bool
        - errors: list of error strings
        - warnings: list of warning strings
        - preview_rows: list of dicts (first 10 rows)
        - total_rows: int
        - columns_found: list of column names
    """
    errors: list[str] = []
    warnings: list[str] = []
    preview_rows: list[dict[str, str]] = []

    try:
        text = file_bytes.decode("utf-8-sig")  # Handle BOM
    except UnicodeDecodeError:
        return {
            "valid": False,
            "errors": ["File is not valid UTF-8 text"],
            "warnings": [],
            "preview_rows": [],
            "total_rows": 0,
            "columns_found": [],
        }

    reader = csv.DictReader(io.StringIO(text))
    columns_found = reader.fieldnames or []

    # Check required columns
    missing = [col for col in REQUIRED_COLUMNS if col not in columns_found]
    if missing:
        errors.append(f"Missing required columns: {', '.join(missing)}")
        return {
            "valid": False,
            "errors": errors,
            "warnings": [],
            "preview_rows": [],
            "total_rows": 0,
            "columns_found": list(columns_found),
        }

    # Check for unknown columns
    known = set(ALL_COLUMNS)
    unknown = [col for col in columns_found if col not in known]
    if unknown:
        warnings.append(f"Unknown columns will be ignored: {', '.join(unknown)}")

    # Validate rows
    total_rows = 0
    for i, row in enumerate(reader, start=2):  # Row 1 is header
        total_rows += 1

        # Required field checks
        if not row.get("response_text", "").strip():
            errors.append(f"Row {i}: 'response_text' is empty")

        submitted_at = row.get("submitted_at", "").strip()
        if not submitted_at:
            errors.append(f"Row {i}: 'submitted_at' is empty")
        else:
            try:
                _parse_datetime(submitted_at)
            except ValueError:
                errors.append(
                    f"Row {i}: 'submitted_at' is not a valid date/time "
                    f"(got '{submitted_at}', expected ISO 8601 format)"
                )

        # Optional field warnings
        nps = row.get("nps_score", "").strip()
        if nps:
            try:
                score = int(nps)
                if score < 0 or score > 10:
                    warnings.append(f"Row {i}: 'nps_score' should be 0-10 (got {score})")
            except ValueError:
                warnings.append(f"Row {i}: 'nps_score' is not a valid number (got '{nps}')")

        # Collect preview (first 10 rows)
        if len(preview_rows) < 10:
            preview_rows.append(dict(row))

        # Stop early on too many errors
        if len(errors) > 20:
            errors.append("Too many errors — showing first 20 only")
            break

    if total_rows == 0:
        errors.append("CSV file has no data rows")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "preview_rows": preview_rows,
        "total_rows": total_rows,
        "columns_found": list(columns_found),
    }


def _parse_datetime(value: str) -> datetime:
    """Parse a flexible datetime string."""
    for fmt in [
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%m/%d/%Y %H:%M:%S",
    ]:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse datetime: {value}")


# ── Connector ─────────────────────────────────────────────

@register_connector(source_type="survey", provider="csv_import")
class CSVImportConnector(BaseConnector):
    """CSV-based survey and NPS import connector.

    Config expectations (stored in ``connection.config_json``):
        - ``import_name``: str (optional) — friendly name for the import
    """

    async def connect(self) -> None:
        """Mark connection as configured for CSV import."""
        transition_source_connection(
            self.connection,
            SourceConnectionStatus.configured,
        )
        logger.info("CSV import connection configured id=%s", self.connection.id)

    async def validate(self) -> bool:
        """CSV imports don't need credential validation — always valid."""
        transition_source_connection(
            self.connection,
            SourceConnectionStatus.connected,
        )
        return True

    async def backfill(
        self,
        sync_run: SyncRun,
        *,
        cursor_in: dict[str, Any] | None = None,
    ) -> SyncResult:
        """Backfill is the CSV import itself — handled by survey_import API."""
        return SyncResult(
            signals=[],
            cursor_out=None,
            records_seen=0,
            records_created=0,
            records_updated=0,
        )

    async def sync_incremental(
        self,
        sync_run: SyncRun,
        *,
        cursor_in: dict[str, Any] | None = None,
    ) -> SyncResult:
        """CSV imports don't support incremental sync."""
        return SyncResult(
            signals=[],
            cursor_out=None,
            records_seen=0,
            records_created=0,
            records_updated=0,
        )

    async def normalize(
        self,
        raw_records: list[dict[str, Any]],
    ) -> list[NormalizedSignal]:
        """Convert parsed CSV rows to NormalizedSignals."""
        signals: list[NormalizedSignal] = []
        for row in raw_records:
            submitted_at = row.get("submitted_at", "")
            try:
                occurred_at = _parse_datetime(submitted_at)
            except ValueError:
                occurred_at = datetime.utcnow()

            tags_str = row.get("tags", "")
            tags = [t.strip() for t in tags_str.split(";") if t.strip()] if tags_str else []

            metadata: dict[str, Any] = {}
            if row.get("nps_score"):
                metadata["nps_score"] = int(row["nps_score"])
            if row.get("question"):
                metadata["question"] = row["question"]
            if row.get("channel"):
                metadata["channel"] = row["channel"]
            if tags:
                metadata["tags"] = tags

            signals.append(
                NormalizedSignal(
                    external_id=row.get("respondent_id", ""),
                    source_record_type="survey_response",
                    signal_kind="survey_response",
                    occurred_at=occurred_at,
                    title=row.get("question", "Survey Response"),
                    content_text=row.get("response_text", ""),
                    sentiment=row.get("sentiment"),
                    metadata_json=metadata if metadata else None,
                )
            )
        return signals

    async def disconnect(self) -> None:
        """Disconnect CSV import connection."""
        transition_source_connection(
            self.connection,
            SourceConnectionStatus.disconnected,
        )
        logger.info("CSV import connection disconnected id=%s", self.connection.id)
