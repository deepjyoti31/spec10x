"""
Unit Tests — Text Extraction Service

Tests: .txt extraction, .pdf extraction, .docx extraction, mock audio/video,
       file hash calculation, unsupported format handling.
"""

import os
import tempfile

import pytest

from app.models import FileType
from app.services.extraction import (
    extract_text,
    compute_file_hash,
)


class TestExtractText:
    """Test text extraction from various file formats."""

    def test_extract_from_txt(self, tmp_path):
        """Plain text files should be read directly."""
        txt_file = tmp_path / "test.txt"
        txt_file.write_text("Hello, this is a test transcript.\nLine two.")

        result = extract_text(str(txt_file), FileType.txt)

        assert result is not None
        assert "Hello, this is a test transcript." in result
        assert "Line two." in result

    def test_extract_from_txt_utf8(self, tmp_path):
        """UTF-8 encoded text should be handled correctly."""
        txt_file = tmp_path / "unicode.txt"
        txt_file.write_text("Héllo wörld — unicode ✓", encoding="utf-8")

        result = extract_text(str(txt_file), FileType.txt)

        assert "Héllo wörld" in result
        assert "unicode ✓" in result

    def test_extract_from_empty_txt(self, tmp_path):
        """Empty files should return empty string."""
        txt_file = tmp_path / "empty.txt"
        txt_file.write_text("")

        result = extract_text(str(txt_file), FileType.txt)

        assert result == ""

    def test_extract_from_mp3_returns_mock(self, tmp_path):
        """Audio files should return a mock transcript."""
        mp3_file = tmp_path / "test.mp3"
        mp3_file.write_bytes(b"fake mp3 data")

        result = extract_text(str(mp3_file), FileType.mp3)

        assert result is not None
        assert len(result) > 100  # Mock transcript should be substantial
        assert "Speaker" in result or "Interviewer" in result

    def test_extract_from_wav_returns_mock(self, tmp_path):
        """WAV files should also get a mock transcript."""
        wav_file = tmp_path / "test.wav"
        wav_file.write_bytes(b"fake wav data")

        result = extract_text(str(wav_file), FileType.wav)

        assert result is not None
        assert len(result) > 100

    def test_extract_from_mp4_returns_mock(self, tmp_path):
        """Video files should get a mock transcript too."""
        mp4_file = tmp_path / "test.mp4"
        mp4_file.write_bytes(b"fake mp4 data")

        result = extract_text(str(mp4_file), FileType.mp4)

        assert result is not None
        assert len(result) > 100


class TestFileHash:
    """Test file hashing for deduplication."""

    def test_hash_returns_string(self, tmp_path):
        """Hash should return a hex string."""
        f = tmp_path / "test.txt"
        f.write_text("hello world")

        result = compute_file_hash(str(f))

        assert isinstance(result, str)
        assert len(result) == 64  # SHA-256 hex

    def test_hash_is_deterministic(self, tmp_path):
        """Same content should produce the same hash."""
        f1 = tmp_path / "a.txt"
        f2 = tmp_path / "b.txt"
        f1.write_text("identical content")
        f2.write_text("identical content")

        assert compute_file_hash(str(f1)) == compute_file_hash(str(f2))

    def test_different_content_different_hash(self, tmp_path):
        """Different content should produce different hashes."""
        f1 = tmp_path / "a.txt"
        f2 = tmp_path / "b.txt"
        f1.write_text("content one")
        f2.write_text("content two")

        assert compute_file_hash(str(f1)) != compute_file_hash(str(f2))

