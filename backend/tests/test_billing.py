"""
Unit Tests — Billing Plan Limits

Tests: plan limit definitions, limit calculations.
"""

import pytest

from app.models import PlanType
from app.api.billing import PLAN_LIMITS


class TestPlanLimits:
    """Test plan limit definitions."""

    def test_free_plan_exists(self):
        assert PlanType.free in PLAN_LIMITS

    def test_pro_plan_exists(self):
        assert PlanType.pro in PLAN_LIMITS

    def test_business_plan_exists(self):
        assert PlanType.business in PLAN_LIMITS

    def test_free_limits(self):
        free = PLAN_LIMITS[PlanType.free]
        assert free["interviews_per_month"] == 5
        assert free["qa_queries_per_month"] == 20
        assert free["storage_bytes"] == 500 * 1024 * 1024  # 500 MB

    def test_pro_higher_than_free(self):
        free = PLAN_LIMITS[PlanType.free]
        pro = PLAN_LIMITS[PlanType.pro]
        assert pro["interviews_per_month"] > free["interviews_per_month"]
        assert pro["qa_queries_per_month"] > free["qa_queries_per_month"]
        assert pro["storage_bytes"] > free["storage_bytes"]

    def test_business_higher_than_pro(self):
        pro = PLAN_LIMITS[PlanType.pro]
        biz = PLAN_LIMITS[PlanType.business]
        assert biz["interviews_per_month"] > pro["interviews_per_month"]
        assert biz["qa_queries_per_month"] > pro["qa_queries_per_month"]
        assert biz["storage_bytes"] > pro["storage_bytes"]

    def test_all_plans_have_required_keys(self):
        required = {"interviews_per_month", "qa_queries_per_month", "storage_bytes"}
        for plan_type, limits in PLAN_LIMITS.items():
            assert required.issubset(limits.keys()), f"{plan_type} missing keys"
