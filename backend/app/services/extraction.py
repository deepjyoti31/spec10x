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


# Mock transcript used for audio/video files when Vertex AI is not configured
MOCK_AUDIO_TRANSCRIPT = """
Interviewer: Thank you for taking the time to talk with us today. Can you tell me about your experience with the product so far?

Speaker 1: Sure. Overall, I've been using it for about three months now, and I have some strong opinions.

Interviewer: Great, let's start with what's working well for you.

Speaker 1: The core functionality is really solid. I love how easy it is to set up initially — the onboarding flow was intuitive and I was up and running in maybe 15 minutes. The dashboard gives me a great overview of everything I need to see at a glance.

Interviewer: That's good to hear. What about the areas where you've had difficulties?

Speaker 1: Honestly, the search feature is really frustrating. It's slow, and half the time it doesn't find what I'm looking for even though I know the data is there. I've had to resort to manually scrolling through pages of results, which is incredibly time-consuming.

Interviewer: Can you give me a specific example?

Speaker 1: Sure. Last week I was looking for a report I created about two weeks ago. I searched for the title — exact title — and it returned zero results. I eventually found it by going through my recent items one by one. That took me about 20 minutes.

Interviewer: That sounds frustrating. Anything else that's been difficult?

Speaker 1: The export feature is confusing. I wish there was a simpler way to export data to PDF. Right now I have to go through like five steps, and the formatting always comes out wrong. I'd love a one-click export that just works.

Speaker 1: Oh, and the notification system is overwhelming. I get way too many notifications about things that aren't relevant to me. I've basically turned them all off, which means I miss the important ones too. There should be a way to customize which notifications I receive.

Interviewer: Those are really helpful insights. What features would you like to see added?

Speaker 1: I'd love to see a collaboration feature where I can share dashboards with my team and we can comment on specific data points. Right now we just take screenshots and paste them into Slack, which is not ideal.

Speaker 1: Also, mobile support would be amazing. I often need to check metrics on the go, but the web app isn't responsive at all on my phone.

Interviewer: Last question — would you recommend the product to a colleague?

Speaker 1: Despite the issues I mentioned, yes, I would. The core value is there. If you fix the search and make exports easier, it would be a no-brainer recommendation. Right now I'd say it's a 7 out of 10.
""".strip()


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
    Return a mock transcript for audio/video files.
    Will be replaced with Vertex AI Chirp 3 transcription.
    """
    logger.info(
        f"Using mock transcript for {file_type.value} file "
        f"(Vertex AI not configured)"
    )
    return MOCK_AUDIO_TRANSCRIPT
