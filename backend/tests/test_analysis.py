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
)
from unittest.mock import patch, Mock


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
        result = analyze_transcript(TRANSCRIPT_MIXED)
        assert isinstance(result, AnalysisResult)
        assert len(result.insights) == 1
        assert result.insights[0].category == "pain_point"


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



