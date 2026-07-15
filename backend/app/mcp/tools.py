"""
MCP tool implementations (v1.1, PRD-11-01, EPIC-11-03).

SDK-free on purpose: everything here is a plain async function over the
database so it can be tested without an MCP transport, and the server
module stays a thin adapter (the `mcp` package may churn; this must not).

Identity: the operator names a user by email (SPEC10X_MCP_USER_EMAIL).
Access is exactly that user's own access — same pool, same rules.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import resolve_data_owner
from app.models import Spec, SpecGenerationStatus, SpecStatus, User
from app.services.outcomes import compute_spec_outcomes
from app.services.task_breakdown import render_spec_export


class McpToolError(ValueError):
    """User-facing tool failure (unknown spec, wrong state, bad input)."""


async def resolve_mcp_user(db: AsyncSession, email: str) -> User:
    """The acting user, honoring their active workspace (shared pool included)."""
    normalized = (email or "").strip().lower()
    if not normalized:
        raise McpToolError(
            "No user configured — set SPEC10X_MCP_USER_EMAIL to the email of an "
            "existing Spec10x user."
        )
    result = await db.execute(select(User).where(User.email == normalized))
    user = result.scalar_one_or_none()
    if user is None:
        raise McpToolError(f'No Spec10x user with email "{normalized}" exists.')
    return await resolve_data_owner(db, user)


def _parse_spec_id(raw: str) -> uuid.UUID:
    try:
        return uuid.UUID(raw)
    except (ValueError, AttributeError, TypeError):
        raise McpToolError(f'"{raw}" is not a valid spec id.')


async def _get_spec(db: AsyncSession, user: User, spec_id: str) -> Spec:
    result = await db.execute(
        select(Spec).where(Spec.id == _parse_spec_id(spec_id), Spec.user_id == user.id)
    )
    spec = result.scalar_one_or_none()
    if spec is None:
        raise McpToolError(f"Spec {spec_id} not found.")
    return spec


async def list_specs_tool(
    db: AsyncSession, user: User, status: str | None = None
) -> list[dict]:
    stmt = select(Spec).where(Spec.user_id == user.id)
    if status:
        try:
            stmt = stmt.where(Spec.status == SpecStatus(status))
        except ValueError:
            valid = ", ".join(s.value for s in SpecStatus)
            raise McpToolError(f'Unknown status "{status}". Valid: {valid}.')
    stmt = stmt.order_by(Spec.updated_at.desc(), Spec.created_at.desc())
    result = await db.execute(stmt)
    return [
        {
            "id": str(spec.id),
            "title": spec.title,
            "status": spec.status.value,
            "theme": spec.theme_name_snapshot,
            "task_count": len(spec.tasks_json or []),
            "has_ready_brief": spec.generation_status == SpecGenerationStatus.ready,
            "shipped_at": spec.shipped_at.isoformat() if spec.shipped_at else None,
        }
        for spec in result.scalars().all()
    ]


async def get_spec_bundle_tool(db: AsyncSession, user: User, spec_id: str) -> str:
    """The exact self-contained markdown bundle GET /api/specs/{id}/export serves."""
    spec = await _get_spec(db, user, spec_id)
    if spec.generation_status != SpecGenerationStatus.ready:
        raise McpToolError("The brief has no generated content to export yet.")
    return render_spec_export(spec)


async def get_spec_outcome_tool(db: AsyncSession, user: User, spec_id: str) -> dict:
    spec = await _get_spec(db, user, spec_id)
    if spec.shipped_at is None:
        raise McpToolError(
            "This spec has not shipped yet — outcomes exist only for shipped specs."
        )
    entries = await compute_spec_outcomes(db, user_id=user.id)
    for entry in entries:
        if entry["spec_id"] == spec.id:
            return {
                "spec_id": str(entry["spec_id"]),
                "title": entry["title"],
                "theme_name": entry["theme_name"],
                "shipped_at": entry["shipped_at"].isoformat(),
                "state": entry["state"],
                "pre_weekly_avg": entry["pre_weekly_avg"],
                "post_weekly_avg": entry["post_weekly_avg"],
                "caution": "Voice volume is supporting evidence, not proven impact.",
            }
    raise McpToolError(f"No outcome entry for spec {spec_id}.")


async def mark_spec_shipped_tool(db: AsyncSession, user: User, spec_id: str) -> dict:
    """Report a ship. Reuses the first-ship stamping rule (D-10-06): shipping
    an already-shipped spec is a no-op that reports the existing timestamp."""
    spec = await _get_spec(db, user, spec_id)
    if spec.status == SpecStatus.shipped:
        return {
            "spec_id": str(spec.id),
            "status": spec.status.value,
            "shipped_at": spec.shipped_at.isoformat() if spec.shipped_at else None,
            "changed": False,
        }
    if spec.status not in (SpecStatus.approved, SpecStatus.in_dev):
        raise McpToolError(
            f"A spec in {spec.status.value} cannot be marked shipped — it must be "
            "Approved or In Dev first (review happens in Spec Studio)."
        )
    spec.status = SpecStatus.shipped
    if spec.shipped_at is None:
        spec.shipped_at = datetime.now(timezone.utc)
    await db.flush()
    return {
        "spec_id": str(spec.id),
        "status": spec.status.value,
        "shipped_at": spec.shipped_at.isoformat(),
        "changed": True,
    }
