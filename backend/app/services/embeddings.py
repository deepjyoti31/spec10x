"""
Spec10x Backend — Text Chunking & Embedding Service

Splits transcripts into chunks and generates embeddings for RAG.
Mock mode uses random vectors; real mode uses text-embedding-004 via Gemini.
"""

import logging
import random
import math
import uuid

import google.generativeai as genai

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import Interview, TranscriptChunk

logger = logging.getLogger(__name__)


async def chunk_and_embed(
    db: AsyncSession,
    interview: Interview,
    transcript: str,
    use_mock: bool = True,
) -> int:
    """
    Chunk a transcript and store with embeddings.

    Args:
        db: Database session
        interview: Interview model instance
        transcript: Full transcript text
        use_mock: If True, use random embeddings

    Returns:
        Number of chunks created
    """
    # Split into chunks
    chunks = chunk_transcript(transcript)

    if not chunks:
        logger.warning(f"No chunks generated for interview {interview.id}")
        return 0

    # Generate embeddings
    if use_mock:
        embeddings = [_random_embedding(768) for _ in chunks]
    else:
        embeddings = _real_embeddings(chunks)

    # Store chunks in DB
    for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
        chunk = TranscriptChunk(
            interview_id=interview.id,
            chunk_index=i,
            content=chunk_text,
            embedding=embedding,
        )
        db.add(chunk)

    await db.flush()
    logger.info(f"Stored {len(chunks)} chunks for interview {interview.id}")
    return len(chunks)


def chunk_transcript(
    transcript: str,
    chunk_size: int = 500,
    overlap: int = 50,
) -> list[str]:
    """
    Split a transcript into overlapping chunks of ~chunk_size tokens.
    Uses a simple word-count approximation (1 token ≈ 1 word).

    Args:
        transcript: Full text
        chunk_size: Approximate tokens per chunk
        overlap: Overlap tokens between consecutive chunks

    Returns:
        List of text chunks
    """
    words = transcript.split()
    if not words:
        return []

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)

        if end >= len(words):
            break
        start = end - overlap

    return chunks


def _random_embedding(dim: int = 768) -> list[float]:
    """Generate a random normalized embedding vector (for mock mode)."""
    vec = [random.gauss(0, 1) for _ in range(dim)]
    magnitude = math.sqrt(sum(v * v for v in vec))
    return [v / magnitude for v in vec]


def _real_embeddings(chunks: list[str]) -> list[list[float]]:
    """
    Generate real embeddings using text-embedding-004 via Gemini.
    Processes in batches of 100 (API limit).
    """
    from app.services.analysis import _configure_genai
    _configure_genai()

    all_embeddings = []
    batch_size = 100

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        try:
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=batch,
                task_type="RETRIEVAL_DOCUMENT",
            )
            all_embeddings.extend(result["embedding"])
            logger.info(f"Embedded batch {i // batch_size + 1}: {len(batch)} chunks")
        except Exception as e:
            logger.error(f"Embedding batch {i // batch_size + 1} failed: {e}")
            # Fallback to random embeddings for this batch
            all_embeddings.extend([_random_embedding(768) for _ in batch])

    return all_embeddings

