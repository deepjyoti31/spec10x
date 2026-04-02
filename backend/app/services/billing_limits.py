"""
Shared billing plan limit definitions.
"""

from __future__ import annotations

from app.models import PlanType


PLAN_LIMITS = {
    PlanType.free: {
        "interviews_per_month": 10,
        "qa_queries_per_month": 20,
        "storage_bytes": 100 * 1024 * 1024,
    },
    PlanType.pro: {
        "interviews_per_month": 100,
        "qa_queries_per_month": 500,
        "storage_bytes": 5 * 1024 * 1024 * 1024,
    },
    PlanType.business: {
        "interviews_per_month": 999999,
        "qa_queries_per_month": 999999,
        "storage_bytes": 999 * 1024 * 1024 * 1024,
    },
}


def get_plan_limits(plan: PlanType) -> dict[str, int]:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS[PlanType.free]).copy()
