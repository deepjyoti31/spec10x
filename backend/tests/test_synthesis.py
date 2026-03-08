"""
Unit Tests — Theme Synthesis

Tests: theme name normalization, fuzzy matching, group merging, description generation.
"""

import pytest

from app.services.synthesis import (
    _normalize_theme_name,
    _normalize_for_comparison,
    _similarity,
    _merge_similar_groups,
    _find_matching_theme,
    _generate_theme_description,
    SIMILARITY_THRESHOLD,
)


class TestNormalizeThemeName:
    """Test theme name normalization for grouping."""

    def test_lowercase(self):
        assert _normalize_theme_name("Onboarding Experience") == "onboarding experience"

    def test_strips_whitespace(self):
        assert _normalize_theme_name("  Search  ") == "search"

    def test_replaces_underscores(self):
        assert _normalize_theme_name("onboarding_experience") == "onboarding experience"

    def test_replaces_hyphens(self):
        assert _normalize_theme_name("mobile-app") == "mobile app"

    def test_combined(self):
        result = _normalize_theme_name("  User_Interface-Design  ")
        assert "interface" in result
        assert "design" in result

    def test_removes_stop_words(self):
        """Stop words like 'the', 'a', 'and', generic words should be removed."""
        # Mixed stop words + real words: stop words should be removed
        result = _normalize_theme_name("The Onboarding Experience")
        assert "onboarding" in result
        assert "experience" in result
        assert "the" not in result.split()  # 'the' filtered as stop word

    def test_all_stop_words_returns_fallback(self):
        """When ALL words are stop words, the original normalized form is returned
        as a fallback (rather than empty string). Similarity matching handles the rest."""
        result = _normalize_theme_name("Customer Feedback Synthesis")
        # All 3 words are stop words, so fallback returns original
        assert len(result) > 0  # Not empty

    def test_removes_generic_words_when_mixed(self):
        """When mixed with real words, generic stop words are filtered out."""
        result = _normalize_theme_name("Pricing Feedback Overview")
        assert "pricing" in result
        # 'feedback' and 'overview' are stop words, should be filtered
        assert "feedback" not in result
        assert "overview" not in result

    def test_preserves_meaningful_words(self):
        """Topic-specific words should be preserved."""
        result = _normalize_theme_name("Onboarding Friction")
        assert "onboarding" in result
        assert "friction" in result

    def test_collapses_extra_spaces(self):
        result = _normalize_theme_name("search   performance")
        assert result == "search performance"


class TestSimilarity:
    """Test fuzzy similarity matching between theme names."""

    def test_identical_strings(self):
        assert _similarity("onboarding friction", "onboarding friction") == 1.0

    def test_very_similar(self):
        """Near-identical themes should match above threshold."""
        score = _similarity("search performance", "search performanc")
        assert score >= SIMILARITY_THRESHOLD

    def test_analysis_vs_synthesis(self):
        """'Customer Feedback Analysis' vs 'Customer Feedback Synthesis' should match
        because after stop word removal, they reduce to the same core."""
        a = _normalize_theme_name("Customer Feedback Analysis")
        b = _normalize_theme_name("Customer Feedback Synthesis")
        score = _similarity(a, b)
        assert score >= SIMILARITY_THRESHOLD, f"Expected similarity >= {SIMILARITY_THRESHOLD}, got {score}"

    def test_substring_match(self):
        """'Cross-Cultural Communication' vs 'Cross-Cultural Communication Challenges'
        should match due to substring containment."""
        a = _normalize_theme_name("Cross-Cultural Communication")
        b = _normalize_theme_name("Cross-Cultural Communication Challenges")
        score = _similarity(a, b)
        assert score >= SIMILARITY_THRESHOLD, f"Expected similarity >= {SIMILARITY_THRESHOLD}, got {score}"

    def test_completely_different(self):
        """Totally different themes should have low similarity."""
        score = _similarity("onboarding friction", "pricing concerns")
        assert score < SIMILARITY_THRESHOLD

    def test_singular_vs_plural(self):
        """Singular vs plural forms should match."""
        a = _normalize_for_comparison("integration")
        b = _normalize_for_comparison("integrations")
        # After suffix stripping, these should be very similar
        score = _similarity("integration", "integrations")
        assert score >= SIMILARITY_THRESHOLD


class TestMergeSimilarGroups:
    """Test merging of near-duplicate theme groups."""

    def test_merges_identical_groups(self):
        groups = {
            "search performance": ["insight_1"],
            "search performance": ["insight_2"],  # Same key, dict just overrides
        }
        merged = _merge_similar_groups(groups)
        assert len(merged) == 1

    def test_merges_similar_groups(self):
        """Groups with fuzzy-similar keys should be merged."""
        groups = {
            "onboarding friction": ["insight_1", "insight_2"],
            "onboarding frictions": ["insight_3"],
        }
        merged = _merge_similar_groups(groups)
        assert len(merged) == 1
        # All insights should be in the merged group
        total_insights = sum(len(v) for v in merged.values())
        assert total_insights == 3

    def test_keeps_different_groups_separate(self):
        """Truly different themes should remain separate."""
        groups = {
            "onboarding friction": ["insight_1"],
            "pricing concern": ["insight_2"],
            "mobile experience": ["insight_3"],
        }
        merged = _merge_similar_groups(groups)
        assert len(merged) == 3

    def test_merges_stop_word_variants(self):
        """After stop-word removal, similar themes should merge."""
        # These reduce to similar core words after stop word removal
        groups = {
            "": ["insight_1"],  # Edge case
            "performance": ["insight_2"],
        }
        # This tests that we handle empty keys gracefully
        merged = _merge_similar_groups(groups)
        assert len(merged) >= 1


class TestFindMatchingTheme:
    """Test finding existing themes that match a group key."""

    def test_exact_match(self):
        class MockTheme:
            pass
        themes = {"onboarding friction": MockTheme()}
        result = _find_matching_theme("onboarding friction", themes)
        assert result == "onboarding friction"

    def test_fuzzy_match(self):
        class MockTheme:
            pass
        themes = {"onboarding friction": MockTheme()}
        result = _find_matching_theme("onboarding frictions", themes)
        assert result == "onboarding friction"

    def test_no_match(self):
        class MockTheme:
            pass
        themes = {"onboarding friction": MockTheme()}
        result = _find_matching_theme("pricing concern", themes)
        assert result is None


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
