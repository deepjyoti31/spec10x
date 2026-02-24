"""
Unit Tests — Theme Synthesis Helpers

Tests: theme name normalization, description generation.
"""

import pytest

from app.services.synthesis import (
    _normalize_theme_name,
    _generate_theme_description,
)


class TestNormalizeThemeName:
    """Test theme name normalization for grouping."""

    def test_lowercase(self):
        assert _normalize_theme_name("Onboarding Experience") == "onboarding experience"

    def test_strips_whitespace(self):
        assert _normalize_theme_name("  Search  ") == "search"

    def test_replaces_underscores(self):
        assert _normalize_theme_name("user_experience") == "user experience"

    def test_replaces_hyphens(self):
        assert _normalize_theme_name("mobile-app") == "mobile app"

    def test_combined(self):
        assert _normalize_theme_name("  User_Interface-Design  ") == "user interface design"


class TestGenerateThemeDescription:
    """Test theme description generation."""

    def test_description_mentions_count(self):
        """Description should mention the number of insights."""

        class MockInsight:
            def __init__(self, category, interview_id):
                self.category = category
                self.interview_id = interview_id

        insights = [
            MockInsight("pain_point", "id1"),
            MockInsight("pain_point", "id2"),
            MockInsight("feature_request", "id1"),
        ]
        desc = _generate_theme_description(insights)
        assert "3 mentions" in desc
        assert "2 interviews" in desc

    def test_description_includes_categories(self):
        class MockInsight:
            def __init__(self, category, interview_id):
                self.category = category
                self.interview_id = interview_id

        insights = [
            MockInsight("pain_point", "id1"),
            MockInsight("positive", "id2"),
        ]
        desc = _generate_theme_description(insights)
        assert "pain point" in desc.lower()
        assert "positive" in desc.lower()
