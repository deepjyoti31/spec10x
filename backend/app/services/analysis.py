"""
Spec10x Backend — AI Analysis Service

Extracts structured insights from interview transcripts using Gemini.
"""

import json
import logging
import re
import random
from dataclasses import dataclass, field

from google import genai
from google.genai import types

from app.core.config import get_settings
from app.prompts.extraction import (
    SYSTEM_PROMPT, EXISTING_THEMES_CONTEXT, PRODUCT_CONTEXT_BLOCK,
    USER_PROMPT_TEMPLATE, OUTPUT_SCHEMA,
)

logger = logging.getLogger(__name__)


# ─── Data Classes ────────────────────────────────────────

@dataclass
class InsightData:
    """A single extracted insight from an interview."""
    category: str  # pain_point, feature_request, positive, suggestion
    title: str
    quote: str
    quote_start: int | None = None
    quote_end: int | None = None
    speaker: str | None = None
    theme_suggestion: str = ""
    sub_themes: list[str] = field(default_factory=list)
    sentiment: str = "neutral"  # positive, negative, neutral
    confidence: float = 0.85
    is_interviewer_voice: bool = False


@dataclass
class SpeakerData:
    """A detected speaker in the interview."""
    label: str
    name: str | None = None
    role: str | None = None
    company: str | None = None
    is_interviewer: bool = False


@dataclass
class AnalysisResult:
    """Complete analysis result for one interview."""
    insights: list[InsightData] = field(default_factory=list)
    speakers: list[SpeakerData] = field(default_factory=list)
    summary: str = ""
    language: str = "en"


# ─── Keyword Patterns ────────────────────────────────────

PAIN_PATTERNS = [
    (r"frustrat\w*", "Frustration"),
    (r"difficult|hard to|struggle\w*", "Difficulty"),
    (r"confus\w*", "Confusion"),
    (r"slow|takes? too long|time[- ]consuming", "Performance Issues"),
    (r"broken|doesn'?t work|bug\w*", "Bugs and Issues"),
    (r"overwhelm\w*|too many|clutter\w*", "Information Overload"),
    (r"can'?t find|search.*(doesn'?t|not).*work", "Search Problems"),
    (r"wrong|incorrect|error\w*", "Errors"),
    (r"annoying|bother\w*|irritat\w*", "Annoyance"),
]

FEATURE_PATTERNS = [
    (r"wish\w*|would be great|would love", "Desired Features"),
    (r"need\w*|should have|should be", "Requirements"),
    (r"want\w*|looking for", "User Wants"),
    (r"miss\w*|lacking", "Missing Features"),
    (r"integrat\w*|connect\w*", "Integrations"),
    (r"mobile|phone|app", "Mobile Support"),
    (r"collaborat\w*|share\w*|team", "Collaboration"),
    (r"export\w*|download\w*", "Export Features"),
]

POSITIVE_PATTERNS = [
    (r"love\w*|amazing|excellent", "Highly Positive"),
    (r"great|good|nice|helpful", "Positive"),
    (r"easy|simple|intuitive|straightforward", "Ease of Use"),
    (r"fast|quick|efficient", "Speed"),
    (r"recommend\w*", "Recommends"),
]

THEME_KEYWORDS = {
    "onboard": "Onboarding Experience",
    "search": "Search Functionality",
    "export": "Export & Data Access",
    "notif": "Notification System",
    "mobile": "Mobile Experience",
    "collaborat": "Team Collaboration",
    "dashboard": "Dashboard & Analytics",
    "pricing": "Pricing & Value",
    "support": "Customer Support",
    "document": "Documentation",
    "setup": "Setup & Configuration",
    "performance": "Performance",
    "ui": "User Interface",
    "ux": "User Experience",
    "report": "Reporting",
    "integrat": "Integrations",
}


# ─── Analysis Functions ──────────────────────────────────

def analyze_transcript(
    transcript: str,
    existing_themes: list[str] | None = None,
    product_context: str | None = None,
) -> AnalysisResult:
    """
    Analyze an interview transcript and extract structured insights.

    Args:
        transcript: Full text of the interview
        existing_themes: Optional list of existing theme names to encourage reuse
        product_context: Optional product context to help filter interviewer voice

    Returns:
        AnalysisResult with insights, speakers, summary, language
    """
    return _real_analyze(
        transcript,
        existing_themes=existing_themes,
        product_context=product_context,
    )


def _real_analyze(
    transcript: str,
    existing_themes: list[str] | None = None,
    product_context: str | None = None,
) -> AnalysisResult:
    """
    Real analysis using Gemini. Sends the transcript with the extraction
    prompt and parses structured JSON output into AnalysisResult.
    """
    settings = get_settings()
    client = genai.Client(
        vertexai=True,
        project=settings.gcp_project_id,
        location=settings.gcp_location
    )

    try:
        prompt = USER_PROMPT_TEMPLATE.format(transcript=transcript[:50000])  # Limit transcript length

        # Build system prompt with existing theme context and product context
        system_prompt = SYSTEM_PROMPT
        if existing_themes:
            themes_list = "\n".join(f"- {t}" for t in existing_themes)
            system_prompt += EXISTING_THEMES_CONTEXT.format(themes_list=themes_list)
        if product_context:
            system_prompt += PRODUCT_CONTEXT_BLOCK.format(product_context=product_context)

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=OUTPUT_SCHEMA,
                temperature=0.2,
                system_instruction=system_prompt,
            ),
        )

        # Parse JSON response
        data = json.loads(response.text)

        # Build AnalysisResult from parsed JSON
        result = AnalysisResult(
            summary=data.get("summary", ""),
            language=data.get("language", "en"),
        )

        # Parse speakers
        for s in data.get("speakers", []):
            result.speakers.append(SpeakerData(
                label=s.get("label", "Unknown"),
                name=s.get("name"),
                role=s.get("role"),
                company=s.get("company"),
                is_interviewer=s.get("is_interviewer", False),
            ))

        # Parse insights
        for i in data.get("insights", []):
            # Find quote position in transcript
            quote = i.get("quote", "")
            quote_start = transcript.find(quote) if quote else None
            quote_end = (quote_start + len(quote)) if quote_start and quote_start >= 0 else None

            result.insights.append(InsightData(
                category=i.get("category", "suggestion"),
                title=i.get("title", ""),
                quote=quote,
                quote_start=quote_start if quote_start and quote_start >= 0 else None,
                quote_end=quote_end,
                speaker=i.get("speaker"),
                theme_suggestion=i.get("theme_suggestion", "General Feedback"),
                sub_themes=i.get("sub_themes", []),
                sentiment=i.get("sentiment", "neutral"),
                confidence=i.get("confidence", 0.85),
                is_interviewer_voice=i.get("is_interviewer_voice", False),
            ))

        logger.info(
            f"Vertex AI analysis complete: {len(result.insights)} insights, "
            f"{len(result.speakers)} speakers"
        )
        return result

    except Exception as e:
        logger.error(f"Vertex AI analysis failed: {e}")
        raise


# ─── Helper Functions ────────────────────────────────────

def _detect_speakers(transcript: str) -> list[SpeakerData]:
    """Detect speaker labels from transcript patterns."""
    speakers = {}
    # Match patterns like "Speaker 1:", "Interviewer:", "Sarah:", "SPEAKER 1:"
    pattern = r'^((?:Speaker\s*\d+|Interviewer|[\w]+)):\s'
    for match in re.finditer(pattern, transcript, re.MULTILINE | re.IGNORECASE):
        label = match.group(1).strip()
        if label not in speakers:
            is_interviewer = "interviewer" in label.lower()
            speakers[label] = SpeakerData(
                label=label,
                name=None if label.startswith("Speaker") else label,
                is_interviewer=is_interviewer,
            )
    return list(speakers.values())


def _split_into_segments(transcript: str) -> list[dict]:
    """Split transcript into segments for analysis."""
    segments = []
    current_speaker = None
    current_pos = 0

    lines = transcript.split("\n")
    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Detect speaker change
        speaker_match = re.match(
            r'^((?:Speaker\s*\d+|Interviewer|[\w]+)):\s*(.*)',
            line,
            re.IGNORECASE,
        )
        if speaker_match:
            current_speaker = speaker_match.group(1).strip()
            text = speaker_match.group(2).strip()
        else:
            text = line

        if text:
            # Split long text into sentences
            sentences = re.split(r'(?<=[.!?])\s+', text)
            for sentence in sentences:
                sentence = sentence.strip()
                if len(sentence) > 20:  # Skip very short fragments
                    pos = transcript.find(sentence, current_pos)
                    segments.append({
                        "text": sentence,
                        "speaker": current_speaker,
                        "start": pos if pos >= 0 else None,
                        "end": (pos + len(sentence)) if pos >= 0 else None,
                    })
                    if pos >= 0:
                        current_pos = pos + len(sentence)

    return segments



def _generate_title(text: str, category: str, label: str) -> str:
    """Generate a concise insight title from the quote text."""
    # Take first 80 chars and clean up
    title = text[:80].strip()
    if len(text) > 80:
        # Cut at last space
        last_space = title.rfind(" ")
        if last_space > 40:
            title = title[:last_space]
        title += "..."

    # Remove speaker prefix if present
    title = re.sub(r'^(?:Speaker\s*\d+|Interviewer):\s*', '', title, flags=re.IGNORECASE)

    return title
