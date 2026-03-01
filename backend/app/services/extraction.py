"""
Spec10x Backend — Text Extraction Service

Extracts raw text from uploaded files (.txt, .md, .pdf, .docx).
Audio/video files get mock transcripts until Vertex AI is configured.
"""

import logging
import hashlib
from pathlib import Path

from app.models import FileType

logger = logging.getLogger(__name__)





def extract_text(file_path: str, file_type: FileType) -> str:
    """
    Extract raw text content from a file.

    Args:
        file_path: Local path to the downloaded file
        file_type: Type of file (determines extraction method)

    Returns:
        Extracted text content
    """
    logger.info(f"Extracting text from {file_path} (type: {file_type.value})")

    if file_type in (FileType.txt, FileType.md):
        return _extract_plaintext(file_path)
    elif file_type == FileType.pdf:
        return _extract_pdf(file_path)
    elif file_type == FileType.docx:
        return _extract_docx(file_path)
    elif file_type in (FileType.mp3, FileType.wav, FileType.mp4):
        return _extract_audio_mock(file_path, file_type)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


def compute_file_hash(file_path: str) -> str:
    """Compute SHA-256 hash of a file for duplicate detection."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def _extract_plaintext(file_path: str) -> str:
    """Extract text from .txt or .md files."""
    path = Path(file_path)
    return path.read_text(encoding="utf-8", errors="replace")


def _extract_pdf(file_path: str) -> str:
    """Extract text from .pdf files using PyPDF2."""
    try:
        from PyPDF2 import PdfReader
    except ImportError:
        logger.error("PyPDF2 not installed — pip install PyPDF2")
        raise

    reader = PdfReader(file_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            pages.append(text.strip())
        else:
            pages.append(f"[Page {i + 1}: no extractable text]")

    result = "\n\n".join(pages)
    if not result.strip():
        return "[PDF contained no extractable text — it may be scanned/image-based]"
    return result


def _extract_docx(file_path: str) -> str:
    """Extract text from .docx files using python-docx."""
    try:
        from docx import Document
    except ImportError:
        logger.error("python-docx not installed — pip install python-docx")
        raise

    doc = Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]

    result = "\n\n".join(paragraphs)
    if not result.strip():
        return "[DOCX contained no extractable text]"
    return result


def _extract_audio_mock(file_path: str, file_type: FileType) -> str:
    """
    Placeholder for audio/video transcription.
    """
    logger.info(f"Audio/video transcription is not supported yet ({file_type.value})")
    raise NotImplementedError("Audio/video transcription via Chirp 3 is not supported yet.")
