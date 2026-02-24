"""
Unit Tests — Mock AI Analysis Service

Tests: keyword detection, speaker detection, insight generation,
       sentiment assignment, theme guessing, title generation.
"""

import pytest

from app.services.analysis import (
    analyze_transcript,
    AnalysisResult,
    InsightData,
    _detect_speakers,
    _split_into_segments,
    _guess_theme,
    _generate_title,
)


# ─── Sample Transcripts ─────────────────────────────────

TRANSCRIPT_WITH_PAIN = """
Interviewer: How has your experience been so far?
Speaker 1: I'm really frustrated with the onboarding process. It takes forever to set up.
Speaker 1: The search doesn't work at all. I can never find what I'm looking for.
Speaker 2: I agree, it's very confusing when you first start.
"""

TRANSCRIPT_WITH_FEATURES = """
Interviewer: What improvements would you like to see?
Speaker 1: I wish we had a mobile app. That would be great.
Speaker 1: We need better team collaboration features.
Speaker 2: I would love to have an export option for our reports.
"""

TRANSCRIPT_WITH_POSITIVE = """
Interviewer: What do you like about the product?
Speaker 1: I love the dashboard design. It's amazing.
Speaker 1: The setup is really easy and intuitive.
Speaker 2: It's fast and efficient. I'd recommend it to anyone.
"""

TRANSCRIPT_MIXED = TRANSCRIPT_WITH_PAIN + "\n" + TRANSCRIPT_WITH_FEATURES + "\n" + TRANSCRIPT_WITH_POSITIVE


class TestAnalyzeTranscript:
    """Test the main analysis function."""

    def test_returns_analysis_result(self):
        result = analyze_transcript(TRANSCRIPT_MIXED, use_mock=True)
        assert isinstance(result, AnalysisResult)

    def test_detects_pain_points(self):
        result = analyze_transcript(TRANSCRIPT_WITH_PAIN, use_mock=True)
        pain_points = [i for i in result.insights if i.category == "pain_point"]
        assert len(pain_points) >= 1

    def test_detects_feature_requests(self):
        result = analyze_transcript(TRANSCRIPT_WITH_FEATURES, use_mock=True)
        features = [i for i in result.insights if i.category == "feature_request"]
        assert len(features) >= 1

    def test_detects_positive_feedback(self):
        result = analyze_transcript(TRANSCRIPT_WITH_POSITIVE, use_mock=True)
        positives = [i for i in result.insights if i.category == "positive"]
        assert len(positives) >= 1

    def test_mixed_transcript_has_multiple_categories(self):
        result = analyze_transcript(TRANSCRIPT_MIXED, use_mock=True)
        categories = set(i.category for i in result.insights)
        assert len(categories) >= 2  # At least 2 different categories

    def test_generates_summary(self):
        result = analyze_transcript(TRANSCRIPT_MIXED, use_mock=True)
        assert len(result.summary) > 20
        assert "insights" in result.summary.lower()

    def test_insights_have_required_fields(self):
        result = analyze_transcript(TRANSCRIPT_MIXED, use_mock=True)
        for insight in result.insights:
            assert insight.title
            assert insight.quote
            assert insight.category in ("pain_point", "feature_request", "positive", "suggestion")
            assert insight.sentiment in ("positive", "negative", "neutral")
            assert 0 <= insight.confidence <= 1

    def test_real_mode_raises(self):
        with pytest.raises(NotImplementedError):
            analyze_transcript("test", use_mock=False)


class TestSpeakerDetection:
    """Test speaker identification from transcripts."""

    def test_detects_speakers(self):
        speakers = _detect_speakers(TRANSCRIPT_WITH_PAIN)
        labels = {s.label for s in speakers}
        assert "Interviewer" in labels or "Speaker 1" in labels

    def test_identifies_interviewer(self):
        speakers = _detect_speakers(TRANSCRIPT_WITH_PAIN)
        interviewers = [s for s in speakers if s.is_interviewer]
        assert len(interviewers) >= 1

    def test_handles_empty_transcript(self):
        speakers = _detect_speakers("")
        assert speakers == []


class TestSegmentSplitting:
    """Test transcript splitting into analysis segments."""

    def test_splits_into_segments(self):
        segments = _split_into_segments(TRANSCRIPT_WITH_PAIN)
        assert len(segments) >= 2

    def test_segments_have_text(self):
        segments = _split_into_segments(TRANSCRIPT_WITH_PAIN)
        for seg in segments:
            assert "text" in seg
            assert len(seg["text"]) > 0

    def test_handles_empty_input(self):
        segments = _split_into_segments("")
        assert segments == []


class TestThemeGuessing:
    """Test keyword-based theme suggestion."""

    def test_search_keyword(self):
        assert "Search" in _guess_theme("the search feature is broken")

    def test_onboarding_keyword(self):
        assert "Onboard" in _guess_theme("onboarding was confusing")

    def test_mobile_keyword(self):
        assert "Mobile" in _guess_theme("we need a mobile app")

    def test_default_theme(self):
        result = _guess_theme("something totally generic and unrelated xyz123")
        assert result == "General Feedback"


class TestTitleGeneration:
    """Test insight title generation."""

    def test_short_text_kept_as_is(self):
        title = _generate_title("Short insight text", "pain_point", "label")
        assert title == "Short insight text"

    def test_long_text_truncated(self):
        long = "This is a very long insight title that goes on and on and definitely exceeds eighty characters in total length to test truncation behavior"
        title = _generate_title(long, "pain_point", "label")
        assert len(title) <= 85  # 80 + "..."
        assert title.endswith("...")

    def test_speaker_prefix_removed(self):
        title = _generate_title("Interviewer: The onboarding is bad", "pain_point", "label")
        assert not title.startswith("Interviewer:")
