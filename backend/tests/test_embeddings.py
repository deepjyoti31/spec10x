"""
Unit Tests — Text Chunking & Embedding Service

Tests: chunk size, overlap, edge cases, mock embedding dimensions.
"""

import pytest

from app.services.embeddings import (
    chunk_transcript,
    _random_embedding,
)


class TestChunkTranscript:
    """Test transcript chunking logic."""

    def test_short_text_single_chunk(self):
        """Text shorter than chunk_size should produce one chunk."""
        text = "Hello world this is a short text"
        chunks = chunk_transcript(text, chunk_size=100, overlap=10)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_respects_chunk_size(self):
        """Each chunk should be approximately chunk_size tokens."""
        # Create ~200 words of text
        text = " ".join(["word"] * 200)
        chunks = chunk_transcript(text, chunk_size=50, overlap=10)

        # Should have multiple chunks
        assert len(chunks) >= 3

        # Each chunk except last should have ~50 words
        for chunk in chunks[:-1]:
            word_count = len(chunk.split())
            assert word_count == 50

    def test_overlap_between_chunks(self):
        """Consecutive chunks should share overlap tokens."""
        words = [f"word{i}" for i in range(100)]
        text = " ".join(words)
        chunks = chunk_transcript(text, chunk_size=30, overlap=10)

        # Check that consecutive chunks share some content
        if len(chunks) >= 2:
            chunk1_words = set(chunks[0].split())
            chunk2_words = set(chunks[1].split())
            overlap = chunk1_words & chunk2_words
            assert len(overlap) >= 5  # Should have some overlapping words

    def test_empty_text_returns_empty(self):
        """Empty text should return no chunks."""
        chunks = chunk_transcript("")
        assert chunks == []

    def test_whitespace_only_returns_empty(self):
        """Whitespace-only text should return no chunks."""
        chunks = chunk_transcript("   \n  \t  ")
        assert chunks == []

    def test_default_parameters(self):
        """Default chunk_size=500, overlap=50 should work."""
        text = " ".join(["word"] * 1000)
        chunks = chunk_transcript(text)
        assert len(chunks) >= 2

    def test_all_words_preserved(self):
        """No words should be lost during chunking."""
        words = [f"unique{i}" for i in range(100)]
        text = " ".join(words)
        chunks = chunk_transcript(text, chunk_size=30, overlap=5)

        all_chunk_words = set()
        for chunk in chunks:
            all_chunk_words.update(chunk.split())

        for word in words:
            assert word in all_chunk_words


class TestRandomEmbedding:
    """Test mock embedding generation."""

    def test_correct_dimension(self):
        """Embedding should have the specified dimension."""
        vec = _random_embedding(768)
        assert len(vec) == 768

    def test_custom_dimension(self):
        """Custom dimensions should work."""
        vec = _random_embedding(128)
        assert len(vec) == 128

    def test_normalized(self):
        """Embedding should be approximately unit length."""
        import math
        vec = _random_embedding(768)
        magnitude = math.sqrt(sum(v * v for v in vec))
        assert abs(magnitude - 1.0) < 0.001

    def test_different_each_time(self):
        """Two calls should produce different embeddings."""
        v1 = _random_embedding(768)
        v2 = _random_embedding(768)
        assert v1 != v2
